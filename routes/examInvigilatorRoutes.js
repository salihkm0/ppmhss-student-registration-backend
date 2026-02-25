// routes/examInvigilatorRoutes.js
const express = require('express');
const router = express.Router();
const auth = require("../middleware/auth");
const {
    getAllInvigilators,
    getInvigilatorById,
    createInvigilator,
    updateInvigilator,
    toggleInvigilatorStatus,
    softDeleteInvigilator,
    restoreInvigilator,
    getDeletedInvigilators,
    bulkCreateInvigilators,
    getInvigilatorStats
} = require('../controllers/examInvigilatorController');

// Stats route
router.get('/stats/summary', auth(["admin", "superadmin"]), getInvigilatorStats);

// Deleted invigilators route
router.get('/deleted/all', auth(["admin", "superadmin"]), getDeletedInvigilators);

// Bulk operations
router.post('/bulk', auth(["admin", "superadmin"]), bulkCreateInvigilators);

// CRUD operations
router.route('/')
    .get(auth(["admin", "superadmin"]), getAllInvigilators)
    .post(auth(["admin", "superadmin"]), createInvigilator);

router.route('/:id')
    .get(auth(["admin", "superadmin"]), getInvigilatorById)
    .put(auth(["admin", "superadmin"]), updateInvigilator)
    .delete(auth(["admin", "superadmin"]), softDeleteInvigilator);

// Status toggle
router.patch('/:id/toggle-status', auth(["admin", "superadmin"]), toggleInvigilatorStatus);

// Restore deleted invigilator
router.post('/:id/restore', auth(["admin", "superadmin"]), restoreInvigilator);

module.exports = router;