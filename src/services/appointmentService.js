const crypto = require('node:crypto');
const { DAILY_APPOINTMENT_CAP } = require('../config/rules');
const { withTransaction } = require('../models/db');
const appointmentModel = require('../models/appointmentModel');
const doctorModel = require('../models/doctorModel');
const patientModel = require('../models/patientModel');
const { checkAppointmentSlot, SLOT_ERRORS } = require('../validators/slotValidator');
const { calculateRefund } = require('../utils/refundCalculator');
const { toSqlDate, toSqlDateTime, addDays, startOfDay, parseLocalDateTime } = require('../utils/datetime');
const { badRequest, notFound, conflict, unprocessable } = require('../utils/errors');
const { isDuplicateKey } = require('../utils/dbErrors');
const auditLog = require('../utils/auditLog');
const { slotFreedQueue, notificationQueue } = require('../queues/jobQueues');

function generateReference() {
  return `AP-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

function validateSlot(apptDatetime, now) {
  const check = checkAppointmentSlot(apptDatetime, now);
  if (check.ok) return check.slot;
  if (check.code === SLOT_ERRORS.MALFORMED) throw badRequest(check.message);
  throw unprocessable(check.code, check.message);
}

function dayBounds(slot) {
  const day = startOfDay(slot);
  return { from: toSqlDateTime(day), to: toSqlDateTime(addDays(day, 1)) };
}

function waitlistOffer(doctorId, patientId, slotText) {
  return {
    waitlist: {
      available: true,
      message: 'Join the waitlist to be booked automatically when a slot that day is freed',
      method: 'POST',
      path: `/doctors/${doctorId}/waitlist`,
      body: { patient_id: patientId, appt_datetime: slotText },
    },
  };
}

function publishSideEffect(promise, label) {
  promise.catch((err) => console.error(`[${label}] ${err.message}`));
}

async function bookAppointment({ patientId, doctorId, apptDatetime, source = 'api' }, now = new Date()) {
  const slot = validateSlot(apptDatetime, now);
  const slotText = toSqlDateTime(slot);
  const { from, to } = dayBounds(slot);

  const appointmentId = await withTransaction(async (connection) => {
    const doctor = await doctorModel.findByIdForUpdate(doctorId, connection);
    if (!doctor) throw notFound('Doctor', doctorId);

    const patient = await patientModel.findById(patientId, connection);
    if (!patient) throw notFound('Patient', patientId);

    const bookedThatDay = await appointmentModel.countActiveForDoctorBetween(doctorId, from, to, connection);
    if (bookedThatDay >= DAILY_APPOINTMENT_CAP) {
      throw conflict(
        'DOCTOR_DAY_FULL',
        `${doctor.full_name} already has ${DAILY_APPOINTMENT_CAP} appointments on ${toSqlDate(slot)}`,
        waitlistOffer(doctorId, patientId, slotText),
      );
    }

    try {
      return await appointmentModel.create(
        {
          apptRef: generateReference(),
          patientId,
          doctorId,
          apptDatetime: slotText,
          amountPaid: doctor.consultation_fee,
          bookedOn: toSqlDateTime(now),
        },
        connection,
      );
    } catch (err) {
      if (isDuplicateKey(err, 'uq_doctor_active_slot')) {
        throw conflict(
          'SLOT_TAKEN',
          `${doctor.full_name} already has an appointment at ${slotText}`,
          waitlistOffer(doctorId, patientId, slotText),
        );
      }
      throw err;
    }
  });

  const appointment = await appointmentModel.findById(appointmentId);
  void auditLog.record('appointment_booked', {
    source,
    appointment_id: appointment.id,
    appt_ref: appointment.appt_ref,
    patient_id: appointment.patient.id,
    doctor_id: appointment.doctor.id,
    appt_datetime: appointment.appt_datetime,
    amount_paid: appointment.amount_paid,
  });
  publishSideEffect(
    notificationQueue.push({ type: 'appointment_confirmation', appointment_id: appointment.id }),
    'notification-queue',
  );
  return appointment;
}

async function cancelAppointment(appointmentId, now = new Date()) {
  const { booking, refund } = await withTransaction(async (connection) => {
    const existing = await appointmentModel.findByIdForUpdate(appointmentId, connection);
    if (!existing) throw notFound('Appointment', appointmentId);
    if (existing.status === 'cancelled') {
      throw conflict('ALREADY_CANCELLED', `Appointment ${appointmentId} is already cancelled`);
    }

    const startsAt = parseLocalDateTime(existing.appt_datetime);
    if (startsAt.getTime() <= now.getTime()) {
      throw unprocessable('APPOINTMENT_ALREADY_STARTED', 'Appointments that have already started cannot be cancelled');
    }

    const computed = calculateRefund({ amountPaid: existing.amount_paid, appointmentAt: startsAt, cancelledAt: now });
    await appointmentModel.markCancelled(
      { id: appointmentId, cancelledAt: toSqlDateTime(now), refundAmount: computed.amount },
      connection,
    );
    return { booking: existing, refund: computed };
  });

  const appointment = await appointmentModel.findById(appointmentId);
  void auditLog.record('appointment_cancelled', {
    appointment_id: appointment.id,
    appt_ref: appointment.appt_ref,
    patient_id: appointment.patient.id,
    doctor_id: appointment.doctor.id,
    appt_datetime: appointment.appt_datetime,
    notice_hours: refund.noticeHours,
    refund_percent: refund.percent,
    refund_amount: refund.amount,
  });
  publishSideEffect(
    slotFreedQueue.push({ doctor_id: booking.doctor_id, appt_datetime: booking.appt_datetime, attempt: 1 }),
    'slot-freed-queue',
  );
  return {
    appointment,
    refund: {
      amount: refund.amount,
      percent: refund.percent,
      notice_hours: refund.noticeHours,
      amount_paid: appointment.amount_paid,
    },
  };
}

module.exports = { bookAppointment, cancelAppointment, validateSlot, dayBounds };
