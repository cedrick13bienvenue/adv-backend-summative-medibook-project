const { getPool } = require('./db');

async function getDoctorSummary(doctorId, now, db = getPool()) {
  const [rows] = await db.execute(
    `SELECT d.id AS doctor_id,
            d.full_name,
            d.specialty,
            COALESCE(SUM(a.amount_paid - COALESCE(a.refund_amount, 0)), 0) AS revenue_collected,
            COUNT(CASE WHEN a.status = 'booked' AND a.appt_datetime > ? THEN 1 END) AS upcoming_appointments
       FROM doctors d
       LEFT JOIN appointments a ON a.doctor_id = d.id
      WHERE d.id = ?
      GROUP BY d.id, d.full_name, d.specialty`,
    [now, doctorId],
  );
  return rows[0] ?? null;
}

async function getDoctorDailyLoad(doctorId, { fromDate, days, dailyCap }, db = getPool()) {
  const [rows] = await db.execute(
    `WITH RECURSIVE calendar (day, day_number) AS (
       SELECT CAST(? AS DATE), 1
       UNION ALL
       SELECT day + INTERVAL 1 DAY, day_number + 1
         FROM calendar
        WHERE day_number < ?
     )
     SELECT c.day AS date,
            COUNT(a.id) AS booked,
            ROUND(COUNT(a.id) * 100 / ?, 1) AS utilization_pct,
            ROUND(SUM(COUNT(a.id)) OVER () * 100 / (? * ?), 1) AS window_utilization_pct
       FROM calendar c
       LEFT JOIN appointments a
              ON a.doctor_id = ?
             AND a.status = 'booked'
             AND a.appt_datetime >= c.day
             AND a.appt_datetime < c.day + INTERVAL 1 DAY
      GROUP BY c.day
      ORDER BY c.day`,
    [fromDate, String(days), String(dailyCap), String(dailyCap), String(days), doctorId],
  );
  return rows;
}

async function getDoctorsReport(db = getPool()) {
  const [rows] = await db.execute(
    `SELECT d.id AS doctor_id,
            d.full_name,
            d.specialty,
            COUNT(CASE WHEN a.status = 'booked' THEN 1 END) AS total_appointments,
            COUNT(CASE WHEN a.status = 'cancelled' THEN 1 END) AS cancelled_appointments,
            COALESCE(SUM(a.amount_paid), 0) AS gross_paid,
            COALESCE(SUM(a.refund_amount), 0) AS refunds_issued,
            COALESCE(SUM(a.amount_paid - COALESCE(a.refund_amount, 0)), 0) AS revenue_collected
       FROM doctors d
       LEFT JOIN appointments a ON a.doctor_id = d.id
      GROUP BY d.id, d.full_name, d.specialty
      ORDER BY revenue_collected DESC, d.id`,
  );
  return rows;
}

async function getBusyDays({ dailyCap, threshold }, db = getPool()) {
  const [rows] = await db.execute(
    `SELECT d.id AS doctor_id,
            d.full_name,
            DATE(a.appt_datetime) AS date,
            COUNT(*) AS booked,
            ROUND(COUNT(*) * 100 / ?, 1) AS utilization_pct
       FROM appointments a
       JOIN doctors d ON d.id = a.doctor_id
      WHERE a.status = 'booked'
      GROUP BY d.id, d.full_name, DATE(a.appt_datetime)
     HAVING COUNT(*) > ? * ?
      ORDER BY date, d.id`,
    [String(dailyCap), String(dailyCap), String(threshold)],
  );
  return rows;
}

module.exports = { getDoctorSummary, getDoctorDailyLoad, getDoctorsReport, getBusyDays };
