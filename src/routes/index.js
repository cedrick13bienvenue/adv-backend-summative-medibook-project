const { Router } = require('express');
const healthController = require('../controllers/healthController');
const patientRoutes = require('./patientRoutes');
const doctorRoutes = require('./doctorRoutes');
const appointmentRoutes = require('./appointmentRoutes');
const reportRoutes = require('./reportRoutes');
const feedbackRoutes = require('./feedbackRoutes');
const docsRoutes = require('./docsRoutes');

const router = Router();

router.get('/', (req, res) => res.redirect('/docs'));
router.use('/docs', docsRoutes);
router.get('/health', healthController.check);
router.use('/patients', patientRoutes);
router.use('/doctors', doctorRoutes);
router.use('/appointments', appointmentRoutes);
router.use('/reports', reportRoutes);
router.use('/feedback', feedbackRoutes);

module.exports = router;
