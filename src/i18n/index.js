const en = require('../../locales/en.json');
const fr = require('../../locales/fr.json');

const DEFAULT_LOCALE = 'en';
const LOCALES = Object.freeze({ en, fr });

function resolveLocale(requested) {
  const code = typeof requested === 'string' ? requested.trim().toLowerCase() : '';
  return Object.hasOwn(LOCALES, code) ? code : DEFAULT_LOCALE;
}

function getMessages(locale) {
  return LOCALES[resolveLocale(locale)];
}

function supportedLocales() {
  return Object.entries(LOCALES).map(([code, messages]) => ({ code, name: messages.language_name }));
}

function formatToday(locale, now = new Date()) {
  return new Intl.DateTimeFormat(getMessages(locale).intl_locale, { dateStyle: 'full' }).format(now);
}

module.exports = { DEFAULT_LOCALE, resolveLocale, getMessages, supportedLocales, formatToday };
