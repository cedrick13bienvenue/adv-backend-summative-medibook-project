const { Router } = require('express');
const doctorController = require('../controllers/doctorController');
const waitlistController = require('../controllers/waitlistController');

const router = Router();

router.get('/', doctorController.list);
router.post('/', doctorController.create);
router.get('/:id', doctorController.getOne);
router.patch('/:id', doctorController.update);
router.delete('/:id', doctorController.remove);

router.get('/:id/stats', doctorController.getStats);
router.get('/:id/waitlist', waitlistController.list);
router.post('/:id/waitlist', waitlistController.join);

module.exports = router;
