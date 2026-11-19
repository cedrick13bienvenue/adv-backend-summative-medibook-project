const { PAGINATION } = require('../config/rules');
const { parseLocalDate } = require('../utils/datetime');
const { badRequest } = require('../utils/errors');
const { validateFields, positiveInt } = require('./fieldRules');

const isPositiveInt = positiveInt();

function parseId(raw, name = 'id') {
  const result = isPositiveInt(raw, name);
  if (result.error) throw badRequest(result.error);
  return result.value;
}

function parseBody(body, schema, options) {
  const { value, errors } = validateFields(body ?? {}, schema, options);
  if (errors.length > 0) throw badRequest('Invalid request body', errors);
  return value;
}

function parseNonNegativeInt(raw, name, fallback) {
  if (raw === undefined) return fallback;
  if (typeof raw !== 'string' || !/^\d{1,9}$/.test(raw)) {
    throw badRequest(`${name} must be a non-negative integer`);
  }
  return Number(raw);
}

function parsePagination(query) {
  const limit = parseNonNegativeInt(query.limit, 'limit', PAGINATION.DEFAULT_LIMIT);
  const offset = parseNonNegativeInt(query.offset, 'offset', 0);
  if (limit < 1 || limit > PAGINATION.MAX_LIMIT) {
    throw badRequest(`limit must be between 1 and ${PAGINATION.MAX_LIMIT}`);
  }
  return { limit, offset };
}

function parseDateParam(raw, name) {
  const date = parseLocalDate(raw);
  if (!date) throw badRequest(`${name} must be a valid date formatted YYYY-MM-DD`);
  return date;
}

function parseOptionalText(raw, name, maxLength) {
  if (raw === undefined) return null;
  if (typeof raw !== 'string' || raw.trim() === '' || raw.length > maxLength) {
    throw badRequest(`${name} must be a non-empty string of at most ${maxLength} characters`);
  }
  return raw.trim();
}

module.exports = {
  parseId,
  parseBody,
  parsePagination,
  parseDateParam,
  parseOptionalText,
};
