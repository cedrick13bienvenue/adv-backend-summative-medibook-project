require('dotenv').config({ quiet: true });

const REQUIRED_VARIABLES = [
  'DB_HOST',
  'DB_PORT',
  'DB_USER',
  'DB_PASSWORD',
  'DB_NAME',
  'REDIS_HOST',
  'REDIS_PORT',
];

function assertRequiredEnv() {
  const missing = REQUIRED_VARIABLES.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    throw new Error(
      `Missing environment variables: ${missing.join(', ')}. Copy .env.example to .env and fill it in.`,
    );
  }
}

module.exports = Object.freeze({
  port: Number(process.env.PORT || 3000),
  db: Object.freeze({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  }),
  redis: Object.freeze({
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT),
  }),
  logDir: process.env.LOG_DIR || 'logs',
  assertRequiredEnv,
});
