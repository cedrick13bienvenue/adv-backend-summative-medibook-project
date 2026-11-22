const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);
}

const STYLES = `
  :root { color-scheme: light; --ink: #1f2430; --muted: #5b6475; --accent: #6b46c1; --line: #d8dde6; }
  * { box-sizing: border-box; }
  body { margin: 0; background: #f4f6fa; color: var(--ink); font: 16px/1.55 -apple-system, "Segoe UI", Helvetica, Arial, sans-serif; }
  main { max-width: 760px; margin: 0 auto; padding: 32px 16px 48px; }
  header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap; }
  h1 { margin: 0 0 4px; font-size: 1.6rem; }
  .date { color: var(--muted); margin: 0; }
  nav a { margin-left: 8px; color: var(--accent); }
  nav a[aria-current="true"] { font-weight: 700; text-decoration: none; color: var(--ink); }
  .intro { background: #fff; border: 1px solid var(--line); border-radius: 8px; padding: 14px 16px; margin: 20px 0; }
  ol { padding-left: 1.2rem; }
  li { margin-bottom: 20px; }
  label { display: block; font-weight: 600; margin-bottom: 6px; }
  textarea { width: 100%; min-height: 110px; padding: 10px; border: 1px solid var(--line); border-radius: 6px; font: inherit; resize: vertical; }
  button { background: var(--accent); color: #fff; border: 0; border-radius: 6px; padding: 10px 18px; font: inherit; font-weight: 600; cursor: pointer; }
  .error { background: #fdecec; color: #9b2c2c; border: 1px solid #f5c2c2; border-radius: 6px; padding: 10px 14px; }
`;

function languageNav(locale, messages, locales) {
  const links = locales
    .map(({ code, name }) => {
      const current = code === locale ? ' aria-current="true"' : '';
      return `<a href="/feedback?lang=${escapeHtml(code)}" hreflang="${escapeHtml(code)}"${current}>${escapeHtml(name)}</a>`;
    })
    .join('');
  return `<nav aria-label="${escapeHtml(messages.language_label)}">${escapeHtml(messages.language_prompt)}${links}</nav>`;
}

function layout({ locale, messages, today, locales, heading, body }) {
  return `<!doctype html>
<html lang="${escapeHtml(locale)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(messages.page_title)}</title>
<style>${STYLES}</style>
</head>
<body>
<main>
<header>
  <div>
    <h1>${escapeHtml(heading)}</h1>
    <p class="date">${escapeHtml(messages.date_prompt)} <time>${escapeHtml(today)}</time></p>
  </div>
  ${languageNav(locale, messages, locales)}
</header>
${body}
</main>
</body>
</html>`;
}

function renderFeedbackForm({ locale, messages, today, locales, answers = [], showError = false }) {
  const questions = messages.questions
    .map(
      (question, index) => `
    <li>
      <label for="answer-${index + 1}">${escapeHtml(question)}</label>
      <textarea id="answer-${index + 1}" name="answer_${index + 1}" placeholder="${escapeHtml(messages.answer_placeholder)}" required>${escapeHtml(answers[index] ?? '')}</textarea>
    </li>`,
    )
    .join('');

  const body = `
<p class="intro">${escapeHtml(messages.instructions)}</p>
${showError ? `<p class="error" role="alert">${escapeHtml(messages.missing_answers)}</p>` : ''}
<form method="post" action="/feedback?lang=${escapeHtml(locale)}">
  <ol>${questions}
  </ol>
  <button type="submit">${escapeHtml(messages.submit)}</button>
</form>`;
  return layout({ locale, messages, today, locales, heading: messages.heading, body });
}

function renderThankYou({ locale, messages, today, locales }) {
  const body = `
<p class="intro">${escapeHtml(messages.thanks_body)}</p>
<p><a href="/feedback?lang=${escapeHtml(locale)}">${escapeHtml(messages.back_link)}</a></p>`;
  return layout({ locale, messages, today, locales, heading: messages.thanks_heading, body });
}

module.exports = { renderFeedbackForm, renderThankYou, escapeHtml };
