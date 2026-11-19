const MONEY_PATTERN = /^\d{1,8}(\.\d{1,2})?$/;
const POSITIVE_INT_PATTERN = /^[1-9]\d{0,9}$/;

function text({ min = 1, max, pattern, patternMessage, transform = (v) => v }) {
  return (raw, field) => {
    if (typeof raw !== 'string') return { error: `${field} must be a string` };
    const value = transform(raw.trim());
    if (value.length < min) return { error: `${field} must be at least ${min} characters` };
    if (value.length > max) return { error: `${field} must be at most ${max} characters` };
    if (pattern && !pattern.test(value)) return { error: `${field} ${patternMessage}` };
    return { value };
  };
}

function money() {
  return (raw, field) => {
    const candidate = typeof raw === 'number' ? String(raw) : raw;
    if (typeof candidate !== 'string' || !MONEY_PATTERN.test(candidate.trim())) {
      return { error: `${field} must be a non-negative amount with at most 2 decimal places` };
    }
    return { value: Number(candidate).toFixed(2) };
  };
}

function positiveInt() {
  return (raw, field) => {
    const candidate = typeof raw === 'number' ? String(raw) : raw;
    if (typeof candidate !== 'string' || !POSITIVE_INT_PATTERN.test(candidate)) {
      return { error: `${field} must be a positive integer` };
    }
    return { value: Number(candidate) };
  };
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function validateFields(input, schema, { partial = false } = {}) {
  if (!isPlainObject(input)) {
    return { value: {}, errors: ['Request body must be a JSON object'] };
  }
  const value = {};
  const errors = Object.keys(input)
    .filter((key) => !Object.hasOwn(schema, key))
    .map((key) => `${key} is not an allowed field`);

  for (const [field, rule] of Object.entries(schema)) {
    if (input[field] === undefined) {
      if (!partial) errors.push(`${field} is required`);
      continue;
    }
    const result = rule(input[field], field);
    if (result.error) errors.push(result.error);
    else value[field] = result.value;
  }

  if (partial && errors.length === 0 && Object.keys(value).length === 0) {
    errors.push('Provide at least one field to update');
  }
  return { value, errors };
}

module.exports = { text, money, positiveInt, validateFields };
