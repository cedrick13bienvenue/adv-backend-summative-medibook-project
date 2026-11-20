const { getPool } = require('./db');

function toAppointment(row) {
  return {
    id: row.id,
    appt_ref: row.appt_ref,
    appt_datetime: row.appt_datetime,
    status: row.status,
    amount_paid: row.amount_paid,
    booked_on: row.booked_on,
    cancelled_at: row.cancelled_at,
    refund_amount: row.refund_amount,
    patient: {
      id: row.patient_id,
      full_name: row.patient_name,
      email: row.patient_email,
      phone: row.patient_phone,
    },
    doctor: {
      id: row.doctor_id,
      full_name: row.doctor_name,
      specialty: row.specialty,
      room: row.room,
    },
  };
}

async function findById(id, db = getPool()) {
  const [rows] = await db.execute(
    `SELECT a.id, a.appt_ref, a.appt_datetime, a.status, a.amount_paid,
            a.booked_on, a.cancelled_at, a.refund_amount,
            p.id AS patient_id, p.full_name AS patient_name,
            p.email AS patient_email, p.phone AS patient_phone,
            d.id AS doctor_id, d.full_name AS doctor_name, d.specialty, d.room
       FROM appointments a
       JOIN patients p ON p.id = a.patient_id
       JOIN doctors  d ON d.id = a.doctor_id
      WHERE a.id = ?`,
    [id],
  );
  return rows[0] ? toAppointment(rows[0]) : null;
}

async function findAll({ doctorId = null, patientId = null, status = null, from = null, to = null, limit, offset }, db = getPool()) {
  const filters = [doctorId, doctorId, patientId, patientId, status, status, from, from, to, to];
  const [rows] = await db.execute(
    `SELECT a.id, a.appt_ref, a.appt_datetime, a.status, a.amount_paid,
            a.booked_on, a.cancelled_at, a.refund_amount,
            p.id AS patient_id, p.full_name AS patient_name,
            p.email AS patient_email, p.phone AS patient_phone,
            d.id AS doctor_id, d.full_name AS doctor_name, d.specialty, d.room
       FROM appointments a
       JOIN patients p ON p.id = a.patient_id
       JOIN doctors  d ON d.id = a.doctor_id
      WHERE (? IS NULL OR a.doctor_id = ?)
        AND (? IS NULL OR a.patient_id = ?)
        AND (? IS NULL OR a.status = ?)
        AND (? IS NULL OR a.appt_datetime >= ?)
        AND (? IS NULL OR a.appt_datetime < ?)
      ORDER BY a.appt_datetime, a.doctor_id
      LIMIT ? OFFSET ?`,
    [...filters, String(limit), String(offset)],
  );
  const [[{ total }]] = await db.execute(
    `SELECT COUNT(*) AS total
       FROM appointments a
      WHERE (? IS NULL OR a.doctor_id = ?)
        AND (? IS NULL OR a.patient_id = ?)
        AND (? IS NULL OR a.status = ?)
        AND (? IS NULL OR a.appt_datetime >= ?)
        AND (? IS NULL OR a.appt_datetime < ?)`,
    filters,
  );
  return { rows: rows.map(toAppointment), total };
}

async function findByIdForUpdate(id, connection) {
  const [rows] = await connection.execute(
    `SELECT id, doctor_id, patient_id, appt_datetime, amount_paid, status
       FROM appointments
      WHERE id = ?
        FOR UPDATE`,
    [id],
  );
  return rows[0] ?? null;
}

async function countActiveForDoctorBetween(doctorId, from, to, db = getPool()) {
  const [[{ total }]] = await db.execute(
    `SELECT COUNT(*) AS total
       FROM appointments
      WHERE doctor_id = ?
        AND status = 'booked'
        AND appt_datetime >= ?
        AND appt_datetime < ?`,
    [doctorId, from, to],
  );
  return total;
}

async function isSlotActive(doctorId, apptDatetime, db = getPool()) {
  const [rows] = await db.execute(
    'SELECT 1 FROM appointments WHERE doctor_id = ? AND active_slot = ?',
    [doctorId, apptDatetime],
  );
  return rows.length > 0;
}

async function create({ apptRef, patientId, doctorId, apptDatetime, amountPaid, bookedOn }, db = getPool()) {
  const [result] = await db.execute(
    `INSERT INTO appointments
       (appt_ref, patient_id, doctor_id, appt_datetime, amount_paid, booked_on)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [apptRef, patientId, doctorId, apptDatetime, amountPaid, bookedOn],
  );
  return result.insertId;
}

async function markCancelled({ id, cancelledAt, refundAmount }, connection) {
  const [result] = await connection.execute(
    `UPDATE appointments
        SET status = 'cancelled',
            cancelled_at = ?,
            refund_amount = ?
      WHERE id = ?
        AND status = 'booked'`,
    [cancelledAt, refundAmount, id],
  );
  return result.affectedRows > 0;
}

module.exports = {
  findById,
  findAll,
  findByIdForUpdate,
  countActiveForDoctorBetween,
  isSlotActive,
  create,
  markCancelled,
};
