const waitlistService = require('../services/waitlistService');
const { waitlistSchema } = require('../validators/schemas');
const { parseId, parseBody, parseDateParam } = require('../validators/requestParsers');

async function join(req, res) {
  const doctorId = parseId(req.params.id);
  const { patient_id: patientId, appt_datetime: apptDatetime } = parseBody(req.body, waitlistSchema);
  const entry = await waitlistService.joinWaitlist({ doctorId, patientId, apptDatetime });
  res.status(201).json({
    message: `Patient ${patientId} is number ${entry.position} on the waitlist for ${entry.date}`,
    data: entry,
  });
}

async function list(req, res) {
  const doctorId = parseId(req.params.id);
  const date = parseDateParam(req.query.date, 'date');
  res.json({ data: await waitlistService.listWaitlist(doctorId, date) });
}

module.exports = { join, list };
