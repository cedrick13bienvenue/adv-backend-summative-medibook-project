const { DAILY_APPOINTMENT_CAP, BUSY_DAY_THRESHOLD } = require('../config/rules');
const reportModel = require('../models/reportModel');

async function doctorsReport(req, res) {
  res.json({ data: await reportModel.getDoctorsReport() });
}

async function busyDays(req, res) {
  const rows = await reportModel.getBusyDays({ dailyCap: DAILY_APPOINTMENT_CAP, threshold: BUSY_DAY_THRESHOLD });
  res.json({
    criteria: {
      daily_cap: DAILY_APPOINTMENT_CAP,
      threshold_pct: BUSY_DAY_THRESHOLD * 100,
      rule: `more than ${BUSY_DAY_THRESHOLD * 100}% of ${DAILY_APPOINTMENT_CAP} slots booked`,
    },
    data: rows.map((row) => ({ ...row, utilization_pct: Number(row.utilization_pct) })),
  });
}

module.exports = { doctorsReport, busyDays };
