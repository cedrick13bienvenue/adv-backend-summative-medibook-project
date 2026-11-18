const { REFUND_POLICY } = require('../config/rules');
const { hoursBetween } = require('./datetime');

function refundPercentForNotice(noticeHours) {
  if (noticeHours > REFUND_POLICY.FULL_REFUND_ABOVE_HOURS) return REFUND_POLICY.FULL_PERCENT;
  if (noticeHours >= REFUND_POLICY.PARTIAL_REFUND_FROM_HOURS) return REFUND_POLICY.PARTIAL_PERCENT;
  return REFUND_POLICY.NO_REFUND_PERCENT;
}

function calculateRefund({ amountPaid, appointmentAt, cancelledAt }) {
  const noticeHours = hoursBetween(cancelledAt, appointmentAt);
  const percent = refundPercentForNotice(noticeHours);
  const paidCents = Math.round(Number(amountPaid) * 100);
  const refundCents = Math.round((paidCents * percent) / 100);
  return {
    noticeHours: Math.round(noticeHours * 100) / 100,
    percent,
    amount: (refundCents / 100).toFixed(2),
  };
}

module.exports = { calculateRefund, refundPercentForNotice };
