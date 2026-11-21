const { DAILY_APPOINTMENT_CAP } = require('../config/rules');
const appointmentModel = require('../models/appointmentModel');
const doctorModel = require('../models/doctorModel');
const patientModel = require('../models/patientModel');
const waitlistQueue = require('../queues/waitlistQueue');
const appointmentService = require('./appointmentService');
const { toSqlDate, toSqlDateTime } = require('../utils/datetime');
const { AppError, notFound, conflict, unprocessable } = require('../utils/errors');
const auditLog = require('../utils/auditLog');

const PATIENT_GONE_CODE = 'PATIENT_NOT_FOUND';

async function joinWaitlist({ doctorId, patientId, apptDatetime }, now = new Date()) {
  const slot = appointmentService.validateSlot(apptDatetime, now);
  const slotText = toSqlDateTime(slot);
  const date = toSqlDate(slot);

  const [doctor, patient] = await Promise.all([doctorModel.findById(doctorId), patientModel.findById(patientId)]);
  if (!doctor) throw notFound('Doctor', doctorId);
  if (!patient) throw notFound('Patient', patientId);

  const { from, to } = appointmentService.dayBounds(slot);
  const [slotTaken, bookedThatDay] = await Promise.all([
    appointmentModel.isSlotActive(doctorId, slotText),
    appointmentModel.countActiveForDoctorBetween(doctorId, from, to),
  ]);
  if (!slotTaken && bookedThatDay < DAILY_APPOINTMENT_CAP) {
    throw unprocessable('SLOT_AVAILABLE', `${slotText} is still free with ${doctor.full_name}; book it directly`);
  }

  const waiting = await waitlistQueue.list(doctorId, date);
  if (waiting.some((entry) => entry.patient_id === patientId)) {
    throw conflict('ALREADY_WAITLISTED', `Patient ${patientId} is already on the waitlist for ${doctor.full_name} on ${date}`);
  }

  const entry = {
    patient_id: patientId,
    doctor_id: doctorId,
    date,
    requested_slot: slotText,
    reason: slotTaken ? 'SLOT_TAKEN' : 'DOCTOR_DAY_FULL',
    joined_at: toSqlDateTime(now),
  };
  const position = await waitlistQueue.join(entry);
  void auditLog.record('waitlist_joined', { ...entry, position });
  return { ...entry, position };
}

async function listWaitlist(doctorId, date) {
  const doctor = await doctorModel.findById(doctorId);
  if (!doctor) throw notFound('Doctor', doctorId);
  return waitlistQueue.list(doctorId, toSqlDate(date));
}

async function promoteFromWaitlist({ doctor_id: doctorId, appt_datetime: apptDatetime }) {
  const date = apptDatetime.slice(0, 10);

  for (;;) {
    const claimed = await waitlistQueue.claimNext(doctorId, date);
    if (!claimed) return { outcome: 'WAITLIST_EMPTY' };

    const { patient_id: patientId } = claimed.entry;
    try {
      const appointment = await appointmentService.bookAppointment({
        patientId,
        doctorId,
        apptDatetime,
        source: 'waitlist',
      });
      await waitlistQueue.complete(claimed);
      void auditLog.record('waitlist_promoted', {
        patient_id: patientId,
        doctor_id: doctorId,
        appointment_id: appointment.id,
        appt_datetime: appointment.appt_datetime,
      });
      return { outcome: 'PROMOTED', appointment };
    } catch (err) {
      if (err instanceof AppError && err.code === PATIENT_GONE_CODE) {
        await waitlistQueue.moveToFailed(claimed, err.message);
        void auditLog.record('waitlist_promotion_failed', { patient_id: patientId, doctor_id: doctorId, reason: err.message });
        continue;
      }

      await waitlistQueue.returnToFront(claimed);
      void auditLog.record('waitlist_promotion_deferred', {
        patient_id: patientId,
        doctor_id: doctorId,
        appt_datetime: apptDatetime,
        reason: err.code ?? err.message,
      });
      if (err instanceof AppError) return { outcome: 'SLOT_UNAVAILABLE', reason: err.code };
      throw err;
    }
  }
}

module.exports = { joinWaitlist, listWaitlist, promoteFromWaitlist };
