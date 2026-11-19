const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { createAuditLogger } = require('../src/utils/auditLogger');

describe('createAuditLogger', () => {
  let workDir;

  beforeEach(async () => {
    workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'medibook-audit-'));
  });

  afterEach(async () => {
    await fs.rm(workDir, { recursive: true, force: true });
  });

  test('creates the log directory on first write and appends one JSON line per event', async () => {
    const logger = createAuditLogger({ dir: path.join(workDir, 'logs') });

    await expect(logger.record('appointment_booked', { appointment_id: 1 })).resolves.toBe(true);
    await expect(logger.record('appointment_cancelled', { appointment_id: 1 })).resolves.toBe(true);

    const lines = (await fs.readFile(logger.filePath, 'utf8')).trim().split('\n').map(JSON.parse);
    expect(lines).toHaveLength(2);
    expect(lines[0]).toMatchObject({ event: 'appointment_booked', appointment_id: 1 });
    expect(lines[1]).toMatchObject({ event: 'appointment_cancelled', appointment_id: 1 });
    expect(typeof lines[0].timestamp).toBe('string');
  });

  test('recreates the log directory if it is deleted while the app is running', async () => {
    const logDir = path.join(workDir, 'logs');
    const logger = createAuditLogger({ dir: logDir });

    await logger.record('appointment_booked', { appointment_id: 1 });
    await fs.rm(logDir, { recursive: true, force: true });
    await expect(logger.record('appointment_booked', { appointment_id: 2 })).resolves.toBe(true);

    const lines = (await fs.readFile(logger.filePath, 'utf8')).trim().split('\n').map(JSON.parse);
    expect(lines).toEqual([expect.objectContaining({ appointment_id: 2 })]);
  });

  test('a logging failure resolves to false instead of throwing', async () => {
    const blockingFile = path.join(workDir, 'not-a-directory');
    await fs.writeFile(blockingFile, 'x');
    const onError = jest.fn();
    const logger = createAuditLogger({ dir: blockingFile, onError });

    await expect(logger.record('appointment_booked', {})).resolves.toBe(false);
    expect(onError).toHaveBeenCalledTimes(1);
  });
});
