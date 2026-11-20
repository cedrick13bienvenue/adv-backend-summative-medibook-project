const PREFIX = 'medibook';

module.exports = Object.freeze({
  waitlist: (doctorId, date) => `${PREFIX}:waitlist:doctor:${doctorId}:${date}`,
  WAITLIST_PROCESSING: `${PREFIX}:waitlist:processing`,
  WAITLIST_FAILED: `${PREFIX}:waitlist:failed`,
  SLOT_FREED: `${PREFIX}:queue:slot-freed`,
  NOTIFICATIONS: `${PREFIX}:queue:notifications`,
});
