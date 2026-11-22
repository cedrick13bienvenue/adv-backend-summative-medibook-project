const { resolveLocale, getMessages, formatToday } = require('../src/i18n');

describe('i18n', () => {
  test.each([
    ['fr', 'fr'],
    ['FR', 'fr'],
    ['en', 'en'],
    ['de', 'en'],
    ['__proto__', 'en'],
    [undefined, 'en'],
    [['fr', 'en'], 'en'],
  ])('resolveLocale(%p) -> %p', (requested, expected) => {
    expect(resolveLocale(requested)).toBe(expected);
  });

  test('every locale has a title, instructions and exactly 5 questions', () => {
    for (const locale of ['en', 'fr']) {
      const messages = getMessages(locale);
      expect(messages.page_title).toEqual(expect.any(String));
      expect(messages.instructions).toEqual(expect.any(String));
      expect(messages.questions).toHaveLength(5);
    }
  });

  test('formats the date for the active locale', () => {
    const date = new Date(2026, 11, 1, 12, 0, 0);
    expect(formatToday('en', date)).toMatch(/December/);
    expect(formatToday('fr', date)).toMatch(/décembre/);
  });
});
