const { checkAppointmentSlot, SLOT_ERRORS } = require('../src/validators/slotValidator');

const NOW = new Date(2026, 11, 1, 8, 0, 0);

function codeFor(value, now = NOW) {
  const result = checkAppointmentSlot(value, now);
  return result.ok ? 'OK' : result.code;
}

describe('checkAppointmentSlot', () => {
  test('accepts the first slot of the day (09:00)', () => {
    const result = checkAppointmentSlot('2026-12-02T09:00', NOW);
    expect(result.ok).toBe(true);
    expect(result.slot).toEqual(new Date(2026, 11, 2, 9, 0, 0));
  });

  test('accepts the last slot of the day (16:30) and a space separator with seconds', () => {
    expect(codeFor('2026-12-02 16:30:00')).toBe('OK');
  });

  test('rejects 17:00 exactly because the slot would end after closing', () => {
    expect(codeFor('2026-12-02T17:00')).toBe(SLOT_ERRORS.OUTSIDE_HOURS);
  });

  test('rejects a slot before opening (08:30)', () => {
    expect(codeFor('2026-12-02T08:30')).toBe(SLOT_ERRORS.OUTSIDE_HOURS);
  });

  test('rejects times that are not on a 30-minute boundary', () => {
    expect(codeFor('2026-12-02T09:15')).toBe(SLOT_ERRORS.OFF_BOUNDARY);
    expect(codeFor('2026-12-02T09:30:30')).toBe(SLOT_ERRORS.OFF_BOUNDARY);
  });

  test('rejects slots in the past and the current instant', () => {
    expect(codeFor('2026-11-30T10:00')).toBe(SLOT_ERRORS.IN_PAST);
    expect(codeFor('2026-12-02T10:00', new Date(2026, 11, 2, 10, 0, 0))).toBe(SLOT_ERRORS.IN_PAST);
  });

  test.each([
    ['impossible calendar date', '2026-02-30T10:00'],
    ['hour out of range', '2026-12-02T25:00'],
    ['free text', 'tomorrow morning'],
    ['date without time', '2026-12-02'],
    ['timezone suffix', '2026-12-02T10:00Z'],
    ['non-string input', 1764662400000],
    ['missing value', undefined],
  ])('rejects a malformed value (%s)', (_label, value) => {
    expect(codeFor(value)).toBe(SLOT_ERRORS.MALFORMED);
  });
});
