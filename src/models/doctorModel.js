const { getPool } = require('./db');

async function findAll({ limit, offset, specialty = null }, db = getPool()) {
  const [rows] = await db.execute(
    `SELECT id, full_name, specialty, consultation_fee, room, created_at
       FROM doctors
      WHERE (? IS NULL OR specialty = ?)
      ORDER BY id
      LIMIT ? OFFSET ?`,
    [specialty, specialty, String(limit), String(offset)],
  );
  const [[{ total }]] = await db.execute(
    'SELECT COUNT(*) AS total FROM doctors WHERE (? IS NULL OR specialty = ?)',
    [specialty, specialty],
  );
  return { rows, total };
}

async function findById(id, db = getPool()) {
  const [rows] = await db.execute(
    `SELECT id, full_name, specialty, consultation_fee, room, created_at
       FROM doctors
      WHERE id = ?`,
    [id],
  );
  return rows[0] ?? null;
}

async function findByIdForUpdate(id, connection) {
  const [rows] = await connection.execute(
    `SELECT id, full_name, specialty, consultation_fee, room
       FROM doctors
      WHERE id = ?
        FOR UPDATE`,
    [id],
  );
  return rows[0] ?? null;
}

async function create({ full_name, specialty, consultation_fee, room }, db = getPool()) {
  const [result] = await db.execute(
    'INSERT INTO doctors (full_name, specialty, consultation_fee, room) VALUES (?, ?, ?, ?)',
    [full_name, specialty, consultation_fee, room],
  );
  return result.insertId;
}

async function update(
  id,
  { full_name = null, specialty = null, consultation_fee = null, room = null },
  db = getPool(),
) {
  const [result] = await db.execute(
    `UPDATE doctors
        SET full_name        = COALESCE(?, full_name),
            specialty        = COALESCE(?, specialty),
            consultation_fee = COALESCE(?, consultation_fee),
            room             = COALESCE(?, room)
      WHERE id = ?`,
    [full_name, specialty, consultation_fee, room, id],
  );
  return result.affectedRows > 0;
}

async function remove(id, db = getPool()) {
  const [result] = await db.execute('DELETE FROM doctors WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

module.exports = { findAll, findById, findByIdForUpdate, create, update, remove };
