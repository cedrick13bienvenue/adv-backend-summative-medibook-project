const { text, money, positiveInt } = require('./fieldRules');

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\+?[0-9][0-9 -]{5,18}$/;
const ROOM_PATTERN = /^[A-Za-z0-9-]+$/;
const DATE_INPUT_MAX_LENGTH = 25;

const patientSchema = Object.freeze({
  full_name: text({ min: 2, max: 100 }),
  email: text({
    min: 5,
    max: 150,
    pattern: EMAIL_PATTERN,
    patternMessage: 'must be a valid email address',
    transform: (v) => v.toLowerCase(),
  }),
  phone: text({
    min: 7,
    max: 20,
    pattern: PHONE_PATTERN,
    patternMessage: 'may only contain digits, spaces, dashes and a leading +',
  }),
});

const doctorSchema = Object.freeze({
  full_name: text({ min: 2, max: 100 }),
  specialty: text({ min: 2, max: 60 }),
  consultation_fee: money(),
  room: text({
    min: 1,
    max: 10,
    pattern: ROOM_PATTERN,
    patternMessage: 'may only contain letters, digits and dashes',
  }),
});

const bookingSchema = Object.freeze({
  patient_id: positiveInt(),
  doctor_id: positiveInt(),
  appt_datetime: text({ min: 1, max: DATE_INPUT_MAX_LENGTH }),
});

const waitlistSchema = Object.freeze({
  patient_id: positiveInt(),
  appt_datetime: text({ min: 1, max: DATE_INPUT_MAX_LENGTH }),
});

module.exports = { patientSchema, doctorSchema, bookingSchema, waitlistSchema };
