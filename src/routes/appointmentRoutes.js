const { Router } = require('express');
const appointmentController = require('../controllers/appointmentController');

const router = Router();

router.get('/', appointmentController.list);
router.post('/', appointmentController.book);
router.get('/:id', appointmentController.getOne);
router.delete('/:id', appointmentController.cancel);

module.exports = router;
