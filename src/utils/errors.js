class AppError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function badRequest(message, details) {
  return new AppError(400, 'VALIDATION_ERROR', message, details);
}

function notFound(resource, id) {
  return new AppError(404, `${resource.toUpperCase()}_NOT_FOUND`, `${resource} ${id} not found`);
}

function conflict(code, message, details) {
  return new AppError(409, code, message, details);
}

function unprocessable(code, message, details) {
  return new AppError(422, code, message, details);
}

function serviceUnavailable(code, message) {
  return new AppError(503, code, message);
}

module.exports = { AppError, badRequest, notFound, conflict, unprocessable, serviceUnavailable };
