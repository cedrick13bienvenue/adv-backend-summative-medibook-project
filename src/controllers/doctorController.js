const { DAILY_APPOINTMENT_CAP, STATS_WINDOW_DAYS } = require('../config/rules');
const doctorModel = require('../models/doctorModel');
const reportModel = require('../models/reportModel');
const { doctorSchema } = require('../validators/schemas');
const { parseId, parseOptionalText } = require('../validators/requestParsers');
const { notFound } = require('../utils/errors');
const { toSqlDate, toSqlDateTime } = require('../utils/datetime');
const { createCrudController } = require('./crudControllerFactory');

const SPECIALTY_MAX_LENGTH = 60;

const crud = createCrudController({
  resource: 'Doctor',
  basePath: '/doctors',
  model: doctorModel,
  schema: doctorSchema,
  parseListFilters: (query) => ({ specialty: parseOptionalText(query.specialty, 'specialty', SPECIALTY_MAX_LENGTH) }),
});

async function getStats(req, res) {
  const id = parseId(req.params.id);
  const now = new Date();
  const summary = await reportModel.getDoctorSummary(id, toSqlDateTime(now));
  if (!summary) throw notFound('Doctor', id);

  const days = await reportModel.getDoctorDailyLoad(id, {
    fromDate: toSqlDate(now),
    days: STATS_WINDOW_DAYS,
    dailyCap: DAILY_APPOINTMENT_CAP,
  });

  res.json({
    data: {
      doctor: { id: summary.doctor_id, full_name: summary.full_name, specialty: summary.specialty },
      revenue_collected: summary.revenue_collected,
      upcoming_appointments: summary.upcoming_appointments,
      daily_cap: DAILY_APPOINTMENT_CAP,
      upcoming_window: {
        length_days: STATS_WINDOW_DAYS,
        utilization_pct: Number(days[0]?.window_utilization_pct ?? 0),
        days: days.map(({ date, booked, utilization_pct: pct }) => ({
          date,
          booked,
          utilization_pct: Number(pct),
        })),
      },
    },
  });
}

module.exports = { ...crud, getStats };
