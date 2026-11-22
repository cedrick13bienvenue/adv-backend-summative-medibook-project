const { AppError } = require('../utils/errors');
const { MYSQL_ERRNO, constraintNameFrom } = require('../utils/dbErrors');

const CONSTRAINT_ERRORS = Object.freeze({
  uq_patients_email: { status: 409, code: 'EMAIL_TAKEN', message: 'A patient with this email already exists' },
  uq_doctor_active_slot: { status: 409, code: 'SLOT_TAKEN', message: 'The doctor already has an appointment at that time' },
  fk_appointments_patient: {
    status: 409,
    code: 'PATIENT_HAS_APPOINTMENTS',
    message: 'This patient has appointment history and cannot be deleted',
  },
  fk_appointments_doctor: {
    status: 409,
    code: 'DOCTOR_HAS_APPOINTMENTS',
    message: 'This doctor has appointment history and cannot be deleted',
  },
});

function fromDatabaseError(err) {
  const constraint = constraintNameFrom(err);
  if (err.errno === MYSQL_ERRNO.DUPLICATE_ENTRY || err.errno === MYSQL_ERRNO.ROW_IS_REFERENCED) {
    return CONSTRAINT_ERRORS[constraint] ?? { status: 409, code: 'CONFLICT', message: 'The request conflicts with existing data' };
  }
  if (err.errno === MYSQL_ERRNO.CHECK_CONSTRAINT_VIOLATED) {
    return { status: 422, code: 'CONSTRAINT_VIOLATED', message: `Business rule violated: ${constraint}` };
  }
  return null;
}

function toResponse(err) {
  if (err instanceof AppError) {
    return { status: err.status, code: err.code, message: err.message, details: err.details };
  }
  if (err.type === 'entity.parse.failed') {
    return { status: 400, code: 'MALFORMED_JSON', message: 'Request body is not valid JSON' };
  }
  if (err.type === 'entity.too.large') {
    return { status: 413, code: 'PAYLOAD_TOO_LARGE', message: 'Request body is too large' };
  }
  return fromDatabaseError(err);
}

function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    next(err);
    return;
  }
  const known = toResponse(err);
  if (!known) {
    console.error(`[error] ${req.method} ${req.originalUrl}`, err);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } });
    return;
  }
  const { status, code, message, details } = known;
  res.status(status).json({ error: { code, message, ...(details === undefined ? {} : { details }) } });
}

module.exports = errorHandler;
