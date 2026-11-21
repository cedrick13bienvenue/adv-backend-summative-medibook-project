const { pingDatabase } = require('../models/db');
const { getRedis } = require('../redis/client');

async function check(req, res) {
  const mysql = await pingDatabase().then(
    () => 'up',
    () => 'down',
  );
  const redis = getRedis().isReady ? 'up' : 'down';
  const healthy = mysql === 'up' && redis === 'up';
  res.status(healthy ? 200 : 503).json({ status: healthy ? 'ok' : 'degraded', mysql, redis });
}

module.exports = { check };
