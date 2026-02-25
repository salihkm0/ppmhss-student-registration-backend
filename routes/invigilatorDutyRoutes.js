// routes/invigilatorDutyRoutes.js
const express = require('express');
const router = express.Router();
const auth = require("../middleware/auth");
const {
    getDutiesByDate,
    getDutyById,
    bulkCreateDuties,
    updateDuty,
    deleteDuty,
    deleteBatchDuties,
    markAttendance,
    generateAttendanceSheet,
    getAvailableRoomsForDuty
} = require('../controllers/invigilatorDutyController');

// Available rooms for duty assignment
router.get('/available-rooms', auth(["admin", "superadmin"]), getAvailableRoomsForDuty);

// Duties by date
router.get('/by-date/:date', auth(["admin", "superadmin"]), getDutiesByDate);

// Attendance sheet PDF - Note: This might need special handling for PDF generation
// You might want to allow access with token in query params for PDF viewing
router.get('/attendance/:date/pdf',generateAttendanceSheet);

// Batch operations
router.delete('/batch/:batchId', auth(["admin", "superadmin"]), deleteBatchDuties);

// Bulk operations
router.post('/bulk', auth(["admin", "superadmin"]), bulkCreateDuties);

// CRUD operations
router.route('/:id')
    .get(auth(["admin", "superadmin"]), getDutyById)
    .put(auth(["admin", "superadmin"]), updateDuty)
    .delete(auth(["admin", "superadmin"]), deleteDuty);

// Mark attendance
router.put('/:id/attendance', auth(["admin", "superadmin"]), markAttendance);

module.exports = router;