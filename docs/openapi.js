const { addDays, startOfDay, toSqlDate } = require('../src/utils/datetime');

const ref = (name) => ({ $ref: `#/components/schemas/${name}` });

const jsonContent = (schema, example) => ({
  'application/json': example === undefined ? { schema } : { schema, example },
});

const ok = (description, schema, example) => ({ description, content: jsonContent(schema, example) });

const fail = (description, code, message) => ({
  description,
  content: jsonContent(ref('Error'), { error: { code, message } }),
});

const idParam = (entity) => ({
  name: 'id',
  in: 'path',
  required: true,
  description: `${entity} id`,
  schema: { type: 'integer', minimum: 1 },
});

const queryParam = (name, description, schema) => ({ name, in: 'query', required: false, description, schema });

const paginationParams = [
  queryParam('limit', 'Results per page, 1 to 100 (default 20)', { type: 'integer', minimum: 1, maximum: 100 }),
  queryParam('offset', 'Results to skip (default 0)', { type: 'integer', minimum: 0 }),
];

const NEAR_CAP_DAY = 3;
const BELOW_BUSY_DAY = 4;
const FREE_DAY = 5;

function buildSpec(now = new Date()) {
  const day = (offset) => toSqlDate(addDays(startOfDay(now), offset));
  const slot = (offset, time) => `${day(offset)}T${time}`;

  const examplePatient = {
    id: 1,
    full_name: 'Ama Mensah',
    email: 'ama@mail.com',
    phone: '0244-111-222',
    created_at: '2026-11-24 18:43:23',
  };

  const exampleDoctor = {
    id: 1,
    full_name: 'Dr. Kwabena Boateng',
    specialty: 'Dermatology',
    consultation_fee: '150.00',
    room: 'R-12',
    created_at: '2026-11-24 18:43:23',
  };

  const exampleAppointment = {
    id: 38,
    appt_ref: 'AP-7E285349',
    appt_datetime: `${day(NEAR_CAP_DAY)} 14:30:00`,
    status: 'booked',
    amount_paid: '150.00',
    booked_on: '2026-11-24 19:08:58',
    cancelled_at: null,
    refund_amount: null,
    patient: { id: 6, full_name: 'Kwame Appiah', email: 'kwame.appiah@mail.com', phone: '0501-123-456' },
    doctor: { id: 1, full_name: 'Dr. Kwabena Boateng', specialty: 'Dermatology', room: 'R-12' },
  };

  const exampleWaitlistEntry = {
    position: 1,
    patient_id: 2,
    doctor_id: 1,
    date: day(NEAR_CAP_DAY),
    requested_slot: `${day(NEAR_CAP_DAY)} 15:00:00`,
    reason: 'DOCTOR_DAY_FULL',
    joined_at: '2026-11-24 19:09:01',
  };

  const waitlistOffer = (patientId, doctorId, when) => ({
    waitlist: {
      available: true,
      message: 'Join the waitlist to be booked automatically when a slot that day is freed',
      method: 'POST',
      path: `/doctors/${doctorId}/waitlist`,
      body: { patient_id: patientId, appt_datetime: when },
    },
  });

  const malformedId = fail('Malformed id', 'VALIDATION_ERROR', 'id must be a positive integer');
  const invalidBody = fail('Missing, unknown or invalid fields', 'VALIDATION_ERROR', 'Invalid request body');
  const patientNotFound = fail('No patient with that id', 'PATIENT_NOT_FOUND', 'Patient 999 not found');
  const doctorNotFound = fail('No doctor with that id', 'DOCTOR_NOT_FOUND', 'Doctor 999 not found');
  const appointmentNotFound = fail('No appointment with that id', 'APPOINTMENT_NOT_FOUND', 'Appointment 999 not found');
  const queueDown = fail('Redis is unavailable', 'QUEUE_UNAVAILABLE', 'The waitlist service is temporarily unavailable');

  const listOf = (schema) => ({
    type: 'object',
    properties: { data: { type: 'array', items: ref(schema) }, pagination: ref('Pagination') },
  });

  const one = (schema) => ({ type: 'object', properties: { data: ref(schema) } });

  return {
    openapi: '3.0.3',
    info: { title: 'MediBook API', version: '1.0.0' },
    servers: [{ url: '/', description: 'This server' }],
    tags: [
      { name: 'Health' },
      { name: 'Patients' },
      { name: 'Doctors' },
      { name: 'Appointments' },
      { name: 'Waitlist' },
      { name: 'Reports' },
      { name: 'Feedback' },
    ],
    paths: {
      '/health': {
        get: {
          tags: ['Health'],
          summary: 'MySQL and Redis status',
          responses: {
            200: ok('Both reachable', ref('Health'), { status: 'ok', mysql: 'up', redis: 'up' }),
            503: ok('One of them is down', ref('Health'), { status: 'degraded', mysql: 'up', redis: 'down' }),
          },
        },
      },

      '/patients': {
        get: {
          tags: ['Patients'],
          summary: 'Get all patients',
          parameters: paginationParams,
          responses: {
            200: ok('A page of patients', listOf('Patient'), {
              data: [examplePatient],
              pagination: { limit: 20, offset: 0, total: 6 },
            }),
            400: fail('Invalid limit or offset', 'VALIDATION_ERROR', 'limit must be between 1 and 100'),
          },
        },
        post: {
          tags: ['Patients'],
          summary: 'Create a patient',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: ref('PatientInput'),
                examples: {
                  valid: {
                    summary: 'Valid patient (201)',
                    value: { full_name: 'Adwoa Sarpong', email: 'adwoa@mail.com', phone: '0243-222-333' },
                  },
                  duplicateEmail: {
                    summary: 'Email already registered (409)',
                    value: { full_name: 'Ama Duplicate', email: 'ama@mail.com', phone: '0244-111-222' },
                  },
                  invalid: {
                    summary: 'Invalid fields (400)',
                    value: { full_name: 'A', email: 'not-an-email' },
                  },
                },
              },
            },
          },
          responses: {
            201: ok('Patient created', one('Patient'), { data: examplePatient }),
            400: invalidBody,
            409: fail('Email already registered', 'EMAIL_TAKEN', 'A patient with this email already exists'),
          },
        },
      },

      '/patients/{id}': {
        parameters: [idParam('Patient')],
        get: {
          tags: ['Patients'],
          summary: 'Get one patient',
          responses: {
            200: ok('The patient', one('Patient'), { data: examplePatient }),
            400: malformedId,
            404: patientNotFound,
          },
        },
        patch: {
          tags: ['Patients'],
          summary: 'Update a patient',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: ref('PatientUpdate'),
                examples: {
                  phone: { summary: 'Change the phone (200)', value: { phone: '0244-000-111' } },
                  empty: { summary: 'No fields (400)', value: {} },
                },
              },
            },
          },
          responses: {
            200: ok('Updated patient', one('Patient'), { data: examplePatient }),
            400: invalidBody,
            404: patientNotFound,
            409: fail('Email already registered', 'EMAIL_TAKEN', 'A patient with this email already exists'),
          },
        },
        delete: {
          tags: ['Patients'],
          summary: 'Delete a patient (blocked while they have appointments)',
          responses: {
            204: { description: 'Patient deleted' },
            400: malformedId,
            404: patientNotFound,
            409: fail(
              'The patient has appointments',
              'PATIENT_HAS_APPOINTMENTS',
              'This patient has appointment history and cannot be deleted',
            ),
          },
        },
      },

      '/doctors': {
        get: {
          tags: ['Doctors'],
          summary: 'Get all doctors',
          parameters: [queryParam('specialty', 'Only this specialty', { type: 'string' }), ...paginationParams],
          responses: {
            200: ok('A page of doctors', listOf('Doctor'), {
              data: [exampleDoctor],
              pagination: { limit: 20, offset: 0, total: 4 },
            }),
            400: fail('Invalid query parameter', 'VALIDATION_ERROR', 'limit must be between 1 and 100'),
          },
        },
        post: {
          tags: ['Doctors'],
          summary: 'Create a doctor',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: ref('DoctorInput'),
                examples: {
                  valid: {
                    summary: 'Valid doctor (201)',
                    value: { full_name: 'Dr. Yaa Owusu', specialty: 'Ophthalmology', consultation_fee: 180, room: 'R-09' },
                  },
                  invalid: {
                    summary: 'Negative fee and bad room (400)',
                    value: { full_name: 'Dr. Test', specialty: 'Ophthalmology', consultation_fee: -5, room: 'R 9' },
                  },
                },
              },
            },
          },
          responses: {
            201: ok('Doctor created', one('Doctor'), { data: exampleDoctor }),
            400: invalidBody,
          },
        },
      },

      '/doctors/{id}': {
        parameters: [idParam('Doctor')],
        get: {
          tags: ['Doctors'],
          summary: 'Get one doctor',
          responses: {
            200: ok('The doctor', one('Doctor'), { data: exampleDoctor }),
            400: malformedId,
            404: doctorNotFound,
          },
        },
        patch: {
          tags: ['Doctors'],
          summary: 'Update a doctor',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: ref('DoctorUpdate'),
                examples: {
                  fee: { summary: 'Change fee and room (200)', value: { consultation_fee: '175.00', room: 'R-14' } },
                  empty: { summary: 'No fields (400)', value: {} },
                },
              },
            },
          },
          responses: {
            200: ok('Updated doctor', one('Doctor'), { data: exampleDoctor }),
            400: invalidBody,
            404: doctorNotFound,
          },
        },
        delete: {
          tags: ['Doctors'],
          summary: 'Delete a doctor (blocked while they have appointments)',
          responses: {
            204: { description: 'Doctor deleted' },
            400: malformedId,
            404: doctorNotFound,
            409: fail(
              'The doctor has appointments',
              'DOCTOR_HAS_APPOINTMENTS',
              'This doctor has appointment history and cannot be deleted',
            ),
          },
        },
      },

      '/doctors/{id}/stats': {
        parameters: [idParam('Doctor')],
        get: {
          tags: ['Doctors'],
          summary: 'Get statistics for a doctor',
          responses: {
            200: ok('Revenue, upcoming appointments and the next 7 days', ref('DoctorStats')),
            400: malformedId,
            404: doctorNotFound,
          },
        },
      },

      '/doctors/{id}/waitlist': {
        parameters: [idParam('Doctor')],
        get: {
          tags: ['Waitlist'],
          summary: "Get a doctor's waitlist for a day",
          parameters: [
            {
              name: 'date',
              in: 'query',
              required: true,
              description: 'YYYY-MM-DD',
              schema: { type: 'string', format: 'date', example: day(NEAR_CAP_DAY) },
            },
          ],
          responses: {
            200: ok('Waiting patients, first in line first', {
              type: 'object',
              properties: { data: { type: 'array', items: ref('WaitlistEntry') } },
            }, { data: [exampleWaitlistEntry] }),
            400: fail('Missing or invalid date', 'VALIDATION_ERROR', 'date must be a valid date formatted YYYY-MM-DD'),
            404: doctorNotFound,
            503: queueDown,
          },
        },
        post: {
          tags: ['Waitlist'],
          summary: 'Join the waitlist for a full slot or day',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: ref('WaitlistInput'),
                examples: {
                  dayFull: {
                    summary: 'Doctor 1, full day (201, send after booking the 12th slot)',
                    value: { patient_id: 2, appt_datetime: slot(NEAR_CAP_DAY, '15:00') },
                  },
                  slotFree: {
                    summary: 'Slot is still free (422)',
                    value: { patient_id: 2, appt_datetime: slot(FREE_DAY, '15:00') },
                  },
                },
              },
            },
          },
          responses: {
            201: ok('Added to the waitlist', {
              type: 'object',
              properties: { message: { type: 'string' }, data: ref('WaitlistEntry') },
            }, {
              message: `Patient 2 is number 1 on the waitlist for ${day(NEAR_CAP_DAY)}`,
              data: exampleWaitlistEntry,
            }),
            400: invalidBody,
            404: patientNotFound,
            409: fail('Already waiting for that day', 'ALREADY_WAITLISTED', 'Patient 2 is already on the waitlist'),
            422: fail('The slot can be booked directly', 'SLOT_AVAILABLE', 'The slot is still free; book it directly'),
            503: queueDown,
          },
        },
      },

      '/appointments': {
        get: {
          tags: ['Appointments'],
          summary: 'Get appointments',
          parameters: [
            queryParam('doctor_id', 'Only this doctor', { type: 'integer', minimum: 1 }),
            queryParam('patient_id', 'Only this patient', { type: 'integer', minimum: 1 }),
            queryParam('date', 'Only this day (YYYY-MM-DD)', { type: 'string', format: 'date' }),
            queryParam('status', 'Only this status', { type: 'string', enum: ['booked', 'cancelled'] }),
            ...paginationParams,
          ],
          responses: {
            200: ok('A page of appointments', listOf('Appointment'), {
              data: [exampleAppointment],
              pagination: { limit: 20, offset: 0, total: 1 },
            }),
            400: fail('Invalid query parameter', 'VALIDATION_ERROR', 'status must be one of: booked, cancelled'),
          },
        },
        post: {
          tags: ['Appointments'],
          summary: 'Book an appointment',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: ref('BookingInput'),
                examples: {
                  offBoundary: {
                    summary: 'Doctor 1 at 09:15, not on a 30-minute boundary (422)',
                    value: { patient_id: 6, doctor_id: 1, appt_datetime: slot(NEAR_CAP_DAY, '09:15') },
                  },
                  twelfthSlot: {
                    summary: 'Doctor 1: 12th booking of the day (201)',
                    value: { patient_id: 6, doctor_id: 1, appt_datetime: slot(NEAR_CAP_DAY, '14:30') },
                  },
                  dayFull: {
                    summary: 'Doctor 1: 13th booking, day full (409)',
                    value: { patient_id: 2, doctor_id: 1, appt_datetime: slot(NEAR_CAP_DAY, '15:00') },
                  },
                  valid: {
                    summary: 'Valid booking on a free day (201)',
                    value: { patient_id: 1, doctor_id: 2, appt_datetime: slot(FREE_DAY, '11:00') },
                  },
                  slotTaken: {
                    summary: 'Slot already taken (409)',
                    value: { patient_id: 2, doctor_id: 2, appt_datetime: slot(BELOW_BUSY_DAY, '09:00') },
                  },
                  afterHours: {
                    summary: 'Outside working hours (422)',
                    value: { patient_id: 1, doctor_id: 2, appt_datetime: slot(FREE_DAY, '17:00') },
                  },
                  inPast: {
                    summary: 'In the past (422)',
                    value: { patient_id: 1, doctor_id: 2, appt_datetime: slot(-1, '10:00') },
                  },
                  malformed: {
                    summary: 'Malformed date (400)',
                    value: { patient_id: 1, doctor_id: 2, appt_datetime: '2026-02-30T10:00' },
                  },
                },
              },
            },
          },
          responses: {
            201: ok('Appointment booked', one('Appointment'), { data: exampleAppointment }),
            400: invalidBody,
            404: patientNotFound,
            409: {
              description: 'Slot taken or doctor fully booked that day, with a waitlist offer',
              content: jsonContent(ref('Error'), {
                error: {
                  code: 'DOCTOR_DAY_FULL',
                  message: `Dr. Kwabena Boateng already has 12 appointments on ${day(NEAR_CAP_DAY)}`,
                  details: waitlistOffer(2, 1, `${day(NEAR_CAP_DAY)} 15:00:00`),
                },
              }),
            },
            422: fail(
              'In the past, off a 30-minute boundary or outside working hours',
              'SLOT_NOT_ON_BOUNDARY',
              'Appointments must start on a 30-minute slot boundary',
            ),
          },
        },
      },

      '/appointments/{id}': {
        parameters: [idParam('Appointment')],
        get: {
          tags: ['Appointments'],
          summary: 'Get one appointment',
          responses: {
            200: ok('The appointment', one('Appointment'), { data: exampleAppointment }),
            400: malformedId,
            404: appointmentNotFound,
          },
        },
        delete: {
          tags: ['Appointments'],
          summary: 'Cancel an appointment',
          responses: {
            200: ok('Appointment cancelled with its refund', ref('Cancellation'), {
              message: 'Appointment AP-7E285349 cancelled. Refund: 150.00 (100%).',
              data: {
                appointment: {
                  ...exampleAppointment,
                  status: 'cancelled',
                  cancelled_at: '2026-11-24 19:09:02',
                  refund_amount: '150.00',
                },
                refund: { amount: '150.00', percent: 100, notice_hours: 67.35, amount_paid: '150.00' },
              },
            }),
            400: malformedId,
            404: appointmentNotFound,
            409: fail('Already cancelled', 'ALREADY_CANCELLED', 'Appointment 38 is already cancelled'),
            422: fail(
              'The appointment has already started',
              'APPOINTMENT_ALREADY_STARTED',
              'Appointments that have already started cannot be cancelled',
            ),
          },
        },
      },

      '/reports/doctors': {
        get: {
          tags: ['Reports'],
          summary: 'Appointments and revenue for every doctor',
          responses: {
            200: ok('One row per doctor, including doctors with no appointments', {
              type: 'object',
              properties: { data: { type: 'array', items: ref('DoctorReportRow') } },
            }),
          },
        },
      },

      '/reports/busy-days': {
        get: {
          tags: ['Reports'],
          summary: 'Doctor-days more than 80% booked',
          responses: {
            200: ok('Busy doctor-days', {
              type: 'object',
              properties: {
                criteria: {
                  type: 'object',
                  properties: {
                    daily_cap: { type: 'integer' },
                    threshold_pct: { type: 'number' },
                    rule: { type: 'string' },
                  },
                },
                data: { type: 'array', items: ref('BusyDay') },
              },
            }),
          },
        },
      },

      '/feedback': {
        get: {
          tags: ['Feedback'],
          summary: 'Course feedback page (open it in the browser)',
          parameters: [queryParam('lang', 'Page language (default en)', { type: 'string', enum: ['en', 'fr'] })],
          responses: {
            200: { description: 'HTML page', content: { 'text/html': { schema: { type: 'string' } } } },
          },
        },
        post: {
          tags: ['Feedback'],
          summary: 'Submit the feedback form',
          parameters: [queryParam('lang', 'Page language (default en)', { type: 'string', enum: ['en', 'fr'] })],
          requestBody: {
            required: true,
            content: { 'application/x-www-form-urlencoded': { schema: ref('FeedbackForm') } },
          },
          responses: {
            201: { description: 'Thank-you page', content: { 'text/html': { schema: { type: 'string' } } } },
            400: { description: 'Form shown again with an error', content: { 'text/html': { schema: { type: 'string' } } } },
          },
        },
      },
    },
    components: {
      schemas: {
        Health: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['ok', 'degraded'] },
            mysql: { type: 'string', enum: ['up', 'down'] },
            redis: { type: 'string', enum: ['up', 'down'] },
          },
        },
        Pagination: {
          type: 'object',
          properties: { limit: { type: 'integer' }, offset: { type: 'integer' }, total: { type: 'integer' } },
        },
        PatientInput: {
          type: 'object',
          required: ['full_name', 'email', 'phone'],
          properties: {
            full_name: { type: 'string' },
            email: { type: 'string', format: 'email' },
            phone: { type: 'string' },
          },
        },
        PatientUpdate: {
          type: 'object',
          properties: {
            full_name: { type: 'string' },
            email: { type: 'string', format: 'email' },
            phone: { type: 'string' },
          },
        },
        Patient: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            full_name: { type: 'string' },
            email: { type: 'string' },
            phone: { type: 'string' },
            created_at: { type: 'string' },
          },
        },
        DoctorInput: {
          type: 'object',
          required: ['full_name', 'specialty', 'consultation_fee', 'room'],
          properties: {
            full_name: { type: 'string' },
            specialty: { type: 'string' },
            consultation_fee: { type: 'number' },
            room: { type: 'string' },
          },
        },
        DoctorUpdate: {
          type: 'object',
          properties: {
            full_name: { type: 'string' },
            specialty: { type: 'string' },
            consultation_fee: { type: 'number' },
            room: { type: 'string' },
          },
        },
        Doctor: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            full_name: { type: 'string' },
            specialty: { type: 'string' },
            consultation_fee: { type: 'string' },
            room: { type: 'string' },
            created_at: { type: 'string' },
          },
        },
        DoctorStats: {
          type: 'object',
          properties: {
            data: {
              type: 'object',
              properties: {
                doctor: {
                  type: 'object',
                  properties: { id: { type: 'integer' }, full_name: { type: 'string' }, specialty: { type: 'string' } },
                },
                revenue_collected: { type: 'string' },
                upcoming_appointments: { type: 'integer' },
                daily_cap: { type: 'integer' },
                upcoming_window: {
                  type: 'object',
                  properties: {
                    length_days: { type: 'integer' },
                    utilization_pct: { type: 'number' },
                    days: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          date: { type: 'string', format: 'date' },
                          booked: { type: 'integer' },
                          utilization_pct: { type: 'number' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        BookingInput: {
          type: 'object',
          required: ['patient_id', 'doctor_id', 'appt_datetime'],
          properties: {
            patient_id: { type: 'integer' },
            doctor_id: { type: 'integer' },
            appt_datetime: { type: 'string', example: slot(FREE_DAY, '11:00') },
          },
        },
        Appointment: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            appt_ref: { type: 'string' },
            appt_datetime: { type: 'string' },
            status: { type: 'string', enum: ['booked', 'cancelled'] },
            amount_paid: { type: 'string' },
            booked_on: { type: 'string' },
            cancelled_at: { type: 'string', nullable: true },
            refund_amount: { type: 'string', nullable: true },
            patient: {
              type: 'object',
              properties: {
                id: { type: 'integer' },
                full_name: { type: 'string' },
                email: { type: 'string' },
                phone: { type: 'string' },
              },
            },
            doctor: {
              type: 'object',
              properties: {
                id: { type: 'integer' },
                full_name: { type: 'string' },
                specialty: { type: 'string' },
                room: { type: 'string' },
              },
            },
          },
        },
        Cancellation: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                appointment: ref('Appointment'),
                refund: {
                  type: 'object',
                  properties: {
                    amount: { type: 'string' },
                    percent: { type: 'integer', enum: [0, 50, 100] },
                    notice_hours: { type: 'number' },
                    amount_paid: { type: 'string' },
                  },
                },
              },
            },
          },
        },
        WaitlistInput: {
          type: 'object',
          required: ['patient_id', 'appt_datetime'],
          properties: {
            patient_id: { type: 'integer' },
            appt_datetime: { type: 'string', example: slot(NEAR_CAP_DAY, '15:00') },
          },
        },
        WaitlistEntry: {
          type: 'object',
          properties: {
            position: { type: 'integer' },
            patient_id: { type: 'integer' },
            doctor_id: { type: 'integer' },
            date: { type: 'string', format: 'date' },
            requested_slot: { type: 'string' },
            reason: { type: 'string', enum: ['SLOT_TAKEN', 'DOCTOR_DAY_FULL'] },
            joined_at: { type: 'string' },
          },
        },
        DoctorReportRow: {
          type: 'object',
          properties: {
            doctor_id: { type: 'integer' },
            full_name: { type: 'string' },
            specialty: { type: 'string' },
            total_appointments: { type: 'integer' },
            cancelled_appointments: { type: 'integer' },
            gross_paid: { type: 'string' },
            refunds_issued: { type: 'string' },
            revenue_collected: { type: 'string' },
          },
        },
        BusyDay: {
          type: 'object',
          properties: {
            doctor_id: { type: 'integer' },
            full_name: { type: 'string' },
            date: { type: 'string', format: 'date' },
            booked: { type: 'integer' },
            utilization_pct: { type: 'number' },
          },
        },
        FeedbackForm: {
          type: 'object',
          required: ['answer_1', 'answer_2', 'answer_3', 'answer_4', 'answer_5'],
          properties: {
            answer_1: { type: 'string' },
            answer_2: { type: 'string' },
            answer_3: { type: 'string' },
            answer_4: { type: 'string' },
            answer_5: { type: 'string' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                code: { type: 'string' },
                message: { type: 'string' },
                details: { type: 'object' },
              },
            },
          },
        },
      },
    },
  };
}

module.exports = buildSpec;
