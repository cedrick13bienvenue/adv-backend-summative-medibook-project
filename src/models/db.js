const mysql = require('mysql2/promise');
const config = require('../config/env');

let pool;

function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      ...config.db,
      connectionLimit: 10,
      waitForConnections: true,
      dateStrings: true,
      decimalNumbers: false,
    });
  }
  return pool;
}

async function withTransaction(work) {
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    const result = await work(connection);
    await connection.commit();
    return result;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

async function pingDatabase() {
  await getPool().execute('SELECT 1');
}

async function closePool() {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}

module.exports = { getPool, withTransaction, pingDatabase, closePool };
