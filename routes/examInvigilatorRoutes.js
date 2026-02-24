// routes/examInvigilatorRoutes.js
const express = require('express');
const router = express.Router();
const invigilatorController = require('../controllers/examInvigilator');
const auth = require('../middleware/auth');

// IMPORTANT: Place specific routes BEFORE dynamic :id routes

// Dashboard/Stats routes (specific)
router.get('/stats/summary', auth(['admin', 'superadmin']), invigilatorController.getInvigilatorStats);

// Search routes (specific)
router.get('/search/:query', auth(['admin', 'superadmin']), invigilatorController.searchInvigilators);

// Deleted routes (specific)
router.get('/deleted/all', auth(['admin', 'superadmin']), invigilatorController.getDeletedInvigilators);

// CRUD routes (generic - place these LAST)
router.get('/', auth(['admin', 'superadmin']), invigilatorController.getAllInvigilators);
router.get('/:id', auth(['admin', 'superadmin']), invigilatorController.getInvigilatorById);

router.post('/', auth(['admin', 'superadmin']), invigilatorController.createInvigilator);
router.post('/bulk', auth(['admin', 'superadmin']), invigilatorController.bulkCreateInvigilators);

router.put('/:id', auth(['admin', 'superadmin']), invigilatorController.updateInvigilator);
router.patch('/:id/toggle-status', auth(['admin', 'superadmin']), invigilatorController.toggleInvigilatorStatus);

router.delete('/:id', auth(['admin', 'superadmin']), invigilatorController.deleteInvigilator);
router.post('/:id/restore', auth(['admin', 'superadmin']), invigilatorController.restoreInvigilator);

module.exports = router;