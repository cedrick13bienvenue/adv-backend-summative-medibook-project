const { createClient } = require('redis');
const config = require('../config/env');
const { serviceUnavailable } = require('../utils/errors');

let client;

function logRedisError(label) {
  return (err) => console.error(`[redis:${label}] ${err.message}`);
}

function getRedis() {
  if (!client) {
    client = createClient({
      socket: { host: config.redis.host, port: config.redis.port },
      disableOfflineQueue: true,
    });
    client.on('error', logRedisError('main'));
  }
  return client;
}

async function connectRedis() {
  const redis = getRedis();
  if (!redis.isOpen) await redis.connect();
  return redis;
}

function requireRedis() {
  const redis = getRedis();
  if (!redis.isReady) {
    throw serviceUnavailable('QUEUE_UNAVAILABLE', 'The waitlist service is temporarily unavailable');
  }
  return redis;
}

async function createBlockingClient(label) {
  const blocking = getRedis().duplicate();
  blocking.on('error', logRedisError(label));
  await blocking.connect();
  return blocking;
}

async function disconnectRedis() {
  if (client?.isOpen) await client.close();
  client = undefined;
}

module.exports = { getRedis, connectRedis, requireRedis, createBlockingClient, disconnectRedis };
