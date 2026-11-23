const config = require('./config/env');

config.assertRequiredEnv();

const { QUEUE } = require('./config/rules');
const { closePool } = require('./models/db');
const { connectRedis, createBlockingClient, disconnectRedis } = require('./redis/client');
const { slotFreedQueue, notificationQueue } = require('./queues/jobQueues');
const waitlistQueue = require('./queues/waitlistQueue');
const waitlistService = require('./services/waitlistService');
const notificationService = require('./services/notificationService');
const auditLog = require('./utils/auditLog');

let stopping = false;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function handleSlotFreed(job) {
  const result = await waitlistService.promoteFromWaitlist(job.payload);
  console.log(`[worker] slot ${job.payload.doctor_id}@${job.payload.appt_datetime}: ${result.outcome}`);
}

async function handleNotification(job) {
  await notificationService.sendConfirmation(job.payload);
  console.log(`[worker] confirmation sent for appointment ${job.payload.appointment_id}`);
}

async function handleFailure(queue, job, err) {
  const attempt = job.payload.attempt ?? 1;
  console.error(`[worker] ${queue.name} job failed (attempt ${attempt}): ${err.message}`);
  if (attempt < QUEUE.MAX_EVENT_ATTEMPTS) {
    await sleep(QUEUE.RETRY_DELAY_MS);
    await queue.retry(job, attempt + 1);
    return;
  }
  await queue.fail(job, err.message);
  await auditLog.record('job_failed', { queue: queue.name, payload: job.payload, reason: err.message });
}

async function consume(queue, blockingClient, handler) {
  while (!stopping) {
    let job;
    try {
      job = await queue.take(blockingClient, QUEUE.BLOCK_TIMEOUT_SECONDS);
      if (!job) continue;
      await handler(job);
      await queue.ack(job);
    } catch (err) {
      if (stopping) break;
      if (job) await handleFailure(queue, job, err).catch((e) => console.error(`[worker] ${e.message}`));
      else {
        console.error(`[worker] ${queue.name} unavailable: ${err.message}`);
        await sleep(QUEUE.RETRY_DELAY_MS);
      }
    }
  }
}

async function main() {
  await connectRedis();
  const recovered = {
    waitlist: await waitlistQueue.recoverInFlight(),
    slotFreed: await slotFreedQueue.recoverInFlight(),
    notifications: await notificationQueue.recoverInFlight(),
  };
  console.log(`[worker] started; recovered in-flight jobs ${JSON.stringify(recovered)}`);

  const [slotClient, notificationClient] = await Promise.all([
    createBlockingClient('worker-slots'),
    createBlockingClient('worker-notifications'),
  ]);

  async function shutdown(signal) {
    console.log(`[worker] ${signal} received, finishing current jobs`);
    stopping = true;
  }
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  await Promise.all([
    consume(slotFreedQueue, slotClient, handleSlotFreed),
    consume(notificationQueue, notificationClient, handleNotification),
  ]);

  await Promise.allSettled([slotClient.close(), notificationClient.close(), disconnectRedis(), closePool()]);
  console.log('[worker] stopped');
}

main().catch((err) => {
  console.error(`[worker] fatal: ${err.message}`);
  process.exit(1);
});
