const appointmentModel = require('../models/appointmentModel');
const appointmentService = require('../services/appointmentService');
const { bookingSchema } = require('../validators/schemas');
const { parseId, parseBody, parsePagination, parseDateParam } = require('../validators/requestParsers');
const { badRequest, notFound } = require('../utils/errors');
const { toSqlDateTime, addDays } = require('../utils/datetime');

const STATUSES = ['booked', 'cancelled'];

function parseListFilters(query) {
  if (query.status !== undefined && !STATUSES.includes(query.status)) {
    throw badRequest(`status must be one of: ${STATUSES.join(', ')}`);
  }
  const date = query.date === undefined ? null : parseDateParam(query.date, 'date');
  return {
    doctorId: query.doctor_id === undefined ? null : parseId(query.doctor_id, 'doctor_id'),
    patientId: query.patient_id === undefined ? null : parseId(query.patient_id, 'patient_id'),
    status: query.status ?? null,
    from: date ? toSqlDateTime(date) : null,
    to: date ? toSqlDateTime(addDays(date, 1)) : null,
  };
}

async function list(req, res) {
  const { limit, offset } = parsePagination(req.query);
  const { rows, total } = await appointmentModel.findAll({ ...parseListFilters(req.query), limit, offset });
  res.json({ data: rows, pagination: { limit, offset, total } });
}

async function getOne(req, res) {
  const id = parseId(req.params.id);
  const appointment = await appointmentModel.findById(id);
  if (!appointment) throw notFound('Appointment', id);
  res.json({ data: appointment });
}

async function book(req, res) {
  const { patient_id: patientId, doctor_id: doctorId, appt_datetime: apptDatetime } = parseBody(req.body, bookingSchema);
  const appointment = await appointmentService.bookAppointment({ patientId, doctorId, apptDatetime });
  res.status(201).location(`/appointments/${appointment.id}`).json({ data: appointment });
}

async function cancel(req, res) {
  const id = parseId(req.params.id);
  const { appointment, refund } = await appointmentService.cancelAppointment(id);
  res.json({
    message: `Appointment ${appointment.appt_ref} cancelled. Refund: ${refund.amount} (${refund.percent}%).`,
    data: { appointment, refund },
  });
}

module.exports = { list, getOne, book, cancel };
