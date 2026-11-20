const keys = require('./keys');
const { createReliableQueue } = require('./reliableQueue');

module.exports = {
  slotFreedQueue: createReliableQueue(keys.SLOT_FREED),
  notificationQueue: createReliableQueue(keys.NOTIFICATIONS),
};
