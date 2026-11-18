const { calculateRefund, refundPercentForNotice } = require('../src/utils/refundCalculator');

const APPOINTMENT_AT = new Date('2026-12-10T10:00:00Z');
const HOUR_MS = 60 * 60 * 1000;

function cancelledHoursBefore(hours) {
  return new Date(APPOINTMENT_AT.getTime() - hours * HOUR_MS);
}

function refundFor(hoursNotice, amountPaid = '150.00') {
  return calculateRefund({
    amountPaid,
    appointmentAt: APPOINTMENT_AT,
    cancelledAt: cancelledHoursBefore(hoursNotice),
  });
}

describe('calculateRefund', () => {
  test('more than 48 hours notice refunds 100%', () => {
    expect(refundFor(72)).toEqual({ noticeHours: 72, percent: 100, amount: '150.00' });
  });

  test('exactly 48 hours notice is the 24-48h tier and refunds 50%', () => {
    expect(refundFor(48)).toEqual({ noticeHours: 48, percent: 50, amount: '75.00' });
  });

  test('one second over 48 hours notice already refunds 100%', () => {
    const result = calculateRefund({
      amountPaid: '150.00',
      appointmentAt: APPOINTMENT_AT,
      cancelledAt: new Date(cancelledHoursBefore(48).getTime() - 1000),
    });
    expect(result.percent).toBe(100);
  });

  test('between 24 and 48 hours notice refunds 50%', () => {
    expect(refundFor(36)).toEqual({ noticeHours: 36, percent: 50, amount: '75.00' });
  });

  test('exactly 24 hours notice still refunds 50%', () => {
    expect(refundFor(24)).toEqual({ noticeHours: 24, percent: 50, amount: '75.00' });
  });

  test('one second under 24 hours notice refunds nothing', () => {
    const result = calculateRefund({
      amountPaid: '150.00',
      appointmentAt: APPOINTMENT_AT,
      cancelledAt: new Date(cancelledHoursBefore(24).getTime() + 1000),
    });
    expect(result).toMatchObject({ percent: 0, amount: '0.00' });
  });

  test('less than 24 hours notice refunds 0%', () => {
    expect(refundFor(2)).toEqual({ noticeHours: 2, percent: 0, amount: '0.00' });
  });

  test('refund is a percentage of what was actually paid, rounded to cents', () => {
    expect(refundFor(30, '120.00').amount).toBe('60.00');
    expect(refundFor(30, '99.99').amount).toBe('50.00');
  });
});

describe('refundPercentForNotice', () => {
  test.each([
    [100, 100],
    [48.01, 100],
    [48, 50],
    [24, 50],
    [23.99, 0],
    [0, 0],
  ])('%p hours notice -> %p%%', (hours, percent) => {
    expect(refundPercentForNotice(hours)).toBe(percent);
  });
});
