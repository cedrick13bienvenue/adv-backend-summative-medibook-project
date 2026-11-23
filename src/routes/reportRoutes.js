const { Router } = require('express');
const reportController = require('../controllers/reportController');

const router = Router();

router.get('/doctors', reportController.doctorsReport);
router.get('/busy-days', reportController.busyDays);

module.exports = router;
