const MYSQL_ERRNO = Object.freeze({
  DUPLICATE_ENTRY: 1062,
  ROW_IS_REFERENCED: 1451,
  NO_REFERENCED_ROW: 1452,
  CHECK_CONSTRAINT_VIOLATED: 3819,
});

function isDuplicateKey(err, constraintName) {
  return err?.errno === MYSQL_ERRNO.DUPLICATE_ENTRY && String(err.sqlMessage).includes(constraintName);
}

function constraintNameFrom(err) {
  const match = /(?:key|constraint) [`'](?:\w+\.)?(\w+)[`']/i.exec(String(err?.sqlMessage));
  return match ? match[1] : null;
}

module.exports = { MYSQL_ERRNO, isDuplicateKey, constraintNameFrom };
