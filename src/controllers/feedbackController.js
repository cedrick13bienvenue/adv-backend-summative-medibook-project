const { resolveLocale, getMessages, supportedLocales, formatToday } = require('../i18n');
const { renderFeedbackForm, renderThankYou } = require('../views/feedbackPage');
const auditLog = require('../utils/auditLog');

const MAX_ANSWER_LENGTH = 2000;

function pageContext(req) {
  const locale = resolveLocale(req.query.lang);
  return { locale, messages: getMessages(locale), today: formatToday(locale), locales: supportedLocales() };
}

function showForm(req, res) {
  res.type('html').send(renderFeedbackForm(pageContext(req)));
}

function submit(req, res) {
  const context = pageContext(req);
  const answers = context.messages.questions.map((_, index) => {
    const raw = req.body?.[`answer_${index + 1}`];
    return typeof raw === 'string' ? raw.trim().slice(0, MAX_ANSWER_LENGTH) : '';
  });

  if (answers.some((answer) => answer === '')) {
    res.status(400).type('html').send(renderFeedbackForm({ ...context, answers, showError: true }));
    return;
  }

  void auditLog.record('course_feedback_submitted', { locale: context.locale, answers });
  res.status(201).type('html').send(renderThankYou(context));
}

module.exports = { showForm, submit };
