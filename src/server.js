const config = require('./config/env');

config.assertRequiredEnv();

const app = require('./app');
const { pingDatabase, closePool } = require('./models/db');
const { connectRedis, disconnectRedis } = require('./redis/client');

async function start() {
  await pingDatabase();
  connectRedis().catch((err) => console.error(`[redis] not connected yet: ${err.message}`));

  const server = app.listen(config.port, () => {
    console.log(`MediBook API listening on http://localhost:${config.port}`);
  });

  async function shutdown(signal) {
    console.log(`${signal} received, shutting down`);
    server.close();
    await Promise.allSettled([closePool(), disconnectRedis()]);
    process.exit(0);
  }

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start().catch((err) => {
  console.error(`Failed to start MediBook API: ${err.message}`);
  process.exit(1);
});
