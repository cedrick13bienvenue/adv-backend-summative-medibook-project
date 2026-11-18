const { SLOT_MINUTES, OPENING_HOUR, CLOSING_HOUR } = require('../config/rules');
const { parseLocalDateTime, formatClock } = require('../utils/datetime');

const SLOT_ERRORS = Object.freeze({
  MALFORMED: 'MALFORMED_DATETIME',
  IN_PAST: 'SLOT_IN_PAST',
  OFF_BOUNDARY: 'SLOT_NOT_ON_BOUNDARY',
  OUTSIDE_HOURS: 'SLOT_OUTSIDE_WORKING_HOURS',
});

const OPENING_MINUTE = OPENING_HOUR * 60;
const LAST_SLOT_MINUTE = CLOSING_HOUR * 60 - SLOT_MINUTES;

function failure(code, message) {
  return { ok: false, code, message };
}

function checkAppointmentSlot(value, now) {
  const slot = parseLocalDateTime(value);
  if (!slot) {
    return failure(
      SLOT_ERRORS.MALFORMED,
      'appt_datetime must be a valid clinic-local date-time formatted YYYY-MM-DDTHH:mm',
    );
  }
  if (slot.getTime() <= now.getTime()) {
    return failure(SLOT_ERRORS.IN_PAST, 'Appointments can only be booked in the future');
  }
  if (slot.getSeconds() !== 0 || slot.getMinutes() % SLOT_MINUTES !== 0) {
    return failure(
      SLOT_ERRORS.OFF_BOUNDARY,
      `Appointments must start on a ${SLOT_MINUTES}-minute slot boundary`,
    );
  }
  const minuteOfDay = slot.getHours() * 60 + slot.getMinutes();
  if (minuteOfDay < OPENING_MINUTE || minuteOfDay > LAST_SLOT_MINUTE) {
    return failure(
      SLOT_ERRORS.OUTSIDE_HOURS,
      `Appointments must start between ${formatClock(OPENING_MINUTE)} and ${formatClock(LAST_SLOT_MINUTE)} (clinic hours ${formatClock(OPENING_MINUTE)}-${formatClock(CLOSING_HOUR * 60)})`,
    );
  }
  return { ok: true, slot };
}

module.exports = { checkAppointmentSlot, SLOT_ERRORS };
