const patientModel = require('../models/patientModel');
const { patientSchema } = require('../validators/schemas');
const { createCrudController } = require('./crudControllerFactory');

module.exports = createCrudController({
  resource: 'Patient',
  basePath: '/patients',
  model: patientModel,
  schema: patientSchema,
});
