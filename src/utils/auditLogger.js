const fs = require('node:fs/promises');
const path = require('node:path');

function reportLoggingFailure(err) {
  console.error(`[audit] could not write audit log entry: ${err.message}`);
}

function createAuditLogger({ dir, fileName = 'audit.log', onError = reportLoggingFailure }) {
  const filePath = path.join(dir, fileName);

  async function append(line) {
    try {
      await fs.appendFile(filePath, line, 'utf8');
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
      await fs.mkdir(dir, { recursive: true });
      await fs.appendFile(filePath, line, 'utf8');
    }
  }

  async function record(event, details = {}) {
    try {
      const line = JSON.stringify({ timestamp: new Date().toISOString(), event, ...details });
      await append(`${line}\n`);
      return true;
    } catch (err) {
      onError(err);
      return false;
    }
  }

  return { record, filePath };
}

module.exports = { createAuditLogger };
