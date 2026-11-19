const { logDir } = require('../config/env');
const { createAuditLogger } = require('./auditLogger');

module.exports = createAuditLogger({ dir: logDir });
