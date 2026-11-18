const LOCAL_DATETIME_PATTERN = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/;
const LOCAL_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_PER_HOUR = 60 * 60 * 1000;

function pad(value) {
  return String(value).padStart(2, '0');
}

function buildLocalDate(year, month, day, hour = 0, minute = 0, second = 0) {
  const date = new Date(year, month - 1, day, hour, minute, second);
  const matches =
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day &&
    date.getHours() === hour &&
    date.getMinutes() === minute &&
    date.getSeconds() === second;
  return matches ? date : null;
}

function parseLocalDateTime(value) {
  if (typeof value !== 'string') return null;
  const match = LOCAL_DATETIME_PATTERN.exec(value.trim());
  if (!match) return null;
  const [year, month, day, hour, minute] = match.slice(1, 6).map(Number);
  const second = match[6] === undefined ? 0 : Number(match[6]);
  return buildLocalDate(year, month, day, hour, minute, second);
}

function parseLocalDate(value) {
  if (typeof value !== 'string') return null;
  const match = LOCAL_DATE_PATTERN.exec(value.trim());
  if (!match) return null;
  const [year, month, day] = match.slice(1, 4).map(Number);
  return buildLocalDate(year, month, day);
}

function toSqlDate(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function toSqlDateTime(date) {
  return `${toSqlDate(date)} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date, days) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function hoursBetween(from, to) {
  return (to.getTime() - from.getTime()) / MS_PER_HOUR;
}

function formatClock(totalMinutes) {
  return `${pad(Math.floor(totalMinutes / 60))}:${pad(totalMinutes % 60)}`;
}

module.exports = {
  parseLocalDateTime,
  parseLocalDate,
  toSqlDate,
  toSqlDateTime,
  startOfDay,
  addDays,
  hoursBetween,
  formatClock,
};
