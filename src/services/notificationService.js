const appointmentModel = require('../models/appointmentModel');
const auditLog = require('../utils/auditLog');

function confirmationMessage(appointment) {
  const { patient, doctor } = appointment;
  return (
    `Hello ${patient.full_name}, your appointment ${appointment.appt_ref} with ${doctor.full_name} ` +
    `(${doctor.specialty}, room ${doctor.room}) is confirmed for ${appointment.appt_datetime}. ` +
    `Amount paid: ${appointment.amount_paid}.`
  );
}

async function sendConfirmation({ appointment_id: appointmentId }) {
  const appointment = await appointmentModel.findById(appointmentId);
  if (!appointment) {
    await auditLog.record('notification_skipped', { appointment_id: appointmentId, reason: 'appointment not found' });
    return;
  }
  await auditLog.record('notification_sent', {
    type: 'appointment_confirmation',
    appointment_id: appointment.id,
    channels: ['sms', 'email'],
    to: { phone: appointment.patient.phone, email: appointment.patient.email },
    message: confirmationMessage(appointment),
  });
}

module.exports = { sendConfirmation, confirmationMessage };
