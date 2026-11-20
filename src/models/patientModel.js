const { getPool } = require('./db');

async function findAll({ limit, offset }, db = getPool()) {
  const [rows] = await db.execute(
    `SELECT id, full_name, email, phone, created_at
       FROM patients
      ORDER BY id
      LIMIT ? OFFSET ?`,
    [String(limit), String(offset)],
  );
  const [[{ total }]] = await db.execute('SELECT COUNT(*) AS total FROM patients');
  return { rows, total };
}

async function findById(id, db = getPool()) {
  const [rows] = await db.execute(
    `SELECT id, full_name, email, phone, created_at
       FROM patients
      WHERE id = ?`,
    [id],
  );
  return rows[0] ?? null;
}

async function create({ full_name, email, phone }, db = getPool()) {
  const [result] = await db.execute(
    'INSERT INTO patients (full_name, email, phone) VALUES (?, ?, ?)',
    [full_name, email, phone],
  );
  return result.insertId;
}

async function update(id, { full_name = null, email = null, phone = null }, db = getPool()) {
  const [result] = await db.execute(
    `UPDATE patients
        SET full_name = COALESCE(?, full_name),
            email     = COALESCE(?, email),
            phone     = COALESCE(?, phone)
      WHERE id = ?`,
    [full_name, email, phone, id],
  );
  return result.affectedRows > 0;
}

async function remove(id, db = getPool()) {
  const [result] = await db.execute('DELETE FROM patients WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

module.exports = { findAll, findById, create, update, remove };
