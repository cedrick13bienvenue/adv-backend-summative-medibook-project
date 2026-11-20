const keys = require('./keys');
const { CLOSING_HOUR } = require('../config/rules');
const { requireRedis } = require('../redis/client');
const { parseLocalDate } = require('../utils/datetime');

function expiryTimestamp(date) {
  const closing = parseLocalDate(date);
  closing.setHours(CLOSING_HOUR);
  return Math.floor(closing.getTime() / 1000);
}

function parseEntries(rawEntries) {
  return rawEntries.map((raw, index) => ({ position: index + 1, ...JSON.parse(raw) }));
}

async function list(doctorId, date) {
  const rawEntries = await requireRedis().lRange(keys.waitlist(doctorId, date), 0, -1);
  return parseEntries(rawEntries);
}

async function join(entry) {
  const key = keys.waitlist(entry.doctor_id, entry.date);
  const [length] = await requireRedis()
    .multi()
    .rPush(key, JSON.stringify(entry))
    .expireAt(key, expiryTimestamp(entry.date))
    .exec();
  return length;
}

async function claimNext(doctorId, date) {
  const raw = await requireRedis().lMove(keys.waitlist(doctorId, date), keys.WAITLIST_PROCESSING, 'LEFT', 'RIGHT');
  return raw ? { raw, entry: JSON.parse(raw) } : null;
}

async function complete(claimed) {
  await requireRedis().lRem(keys.WAITLIST_PROCESSING, 1, claimed.raw);
}

async function returnToFront(claimed) {
  const { doctor_id: doctorId, date } = claimed.entry;
  const key = keys.waitlist(doctorId, date);
  await requireRedis()
    .multi()
    .lRem(keys.WAITLIST_PROCESSING, 1, claimed.raw)
    .lPush(key, claimed.raw)
    .expireAt(key, expiryTimestamp(date))
    .exec();
}

async function moveToFailed(claimed, reason) {
  await requireRedis()
    .multi()
    .lRem(keys.WAITLIST_PROCESSING, 1, claimed.raw)
    .rPush(keys.WAITLIST_FAILED, JSON.stringify({ ...claimed.entry, reason, failed_at: new Date().toISOString() }))
    .exec();
}

async function recoverInFlight() {
  const redis = requireRedis();
  const stranded = await redis.lRange(keys.WAITLIST_PROCESSING, 0, -1);
  for (const raw of stranded.reverse()) {
    await returnToFront({ raw, entry: JSON.parse(raw) });
  }
  return stranded.length;
}

module.exports = { list, join, claimNext, complete, returnToFront, moveToFailed, recoverInFlight };
