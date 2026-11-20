const { requireRedis } = require('../redis/client');

function createReliableQueue(name) {
  const processingKey = `${name}:processing`;
  const failedKey = `${name}:failed`;

  async function push(payload) {
    await requireRedis().lPush(name, JSON.stringify(payload));
  }

  async function take(blockingClient, timeoutSeconds) {
    const raw = await blockingClient.blMove(name, processingKey, 'RIGHT', 'LEFT', timeoutSeconds);
    return raw ? { raw, payload: JSON.parse(raw) } : null;
  }

  async function ack(job) {
    await requireRedis().lRem(processingKey, 1, job.raw);
  }

  async function retry(job, attempt) {
    await requireRedis()
      .multi()
      .lRem(processingKey, 1, job.raw)
      .lPush(name, JSON.stringify({ ...job.payload, attempt }))
      .exec();
  }

  async function fail(job, reason) {
    await requireRedis()
      .multi()
      .lRem(processingKey, 1, job.raw)
      .rPush(failedKey, JSON.stringify({ job: job.payload, reason, failed_at: new Date().toISOString() }))
      .exec();
  }

  async function recoverInFlight() {
    const redis = requireRedis();
    let recovered = 0;
    while (await redis.lMove(processingKey, name, 'RIGHT', 'RIGHT')) recovered += 1;
    return recovered;
  }

  return { name, push, take, ack, retry, fail, recoverInFlight };
}

module.exports = { createReliableQueue };
