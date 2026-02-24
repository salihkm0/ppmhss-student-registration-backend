// routes/invigilatorRoutes.js
const express = require('express');
const router = express.Router();
const invigilatorController = require('../controllers/examInvigilator');
const invigilatorDutyController = require('../controllers/invigilatorDutyController');
const auth = require('../middleware/auth');

// IMPORTANT: Place specific routes BEFORE dynamic :id routes

// Dashboard/Stats routes (specific)
router.get('/stats/summary', auth(['admin', 'superadmin']), invigilatorController.getInvigilatorStats);

// Search routes (specific)
router.get('/search/:query', auth(['admin', 'superadmin']), invigilatorController.searchInvigilators);

// Deleted routes (specific)
router.get('/deleted/all', auth(['admin', 'superadmin']), invigilatorController.getDeletedInvigilators);

// Duty routes (specific)
router.post('/duties/bulk', auth(['admin', 'superadmin']), invigilatorDutyController.bulkAssignDuties);
router.get('/duties/by-date/:examDate', auth(['admin', 'superadmin']), invigilatorDutyController.getDutiesByDate);
router.get('/duties/batch/:batchId', auth(['admin', 'superadmin']), invigilatorDutyController.getDutiesByBatch);
router.get('/duties/attendance-sheet/:examDate', auth(['admin', 'superadmin']), invigilatorDutyController.getAttendanceSheetData);
router.put('/duties/:id/attendance', auth(['admin', 'superadmin']), invigilatorDutyController.markAttendance);
router.delete('/duties/:id', auth(['admin', 'superadmin']), invigilatorDutyController.deleteDuty);
router.delete('/duties/batch/:batchId', auth(['admin', 'superadmin']), invigilatorDutyController.deleteBatch);

// PDF generation route (specific)
router.get("/invigilator-attendance/:examDate/pdf", async (req, res) => {
  try {
    const examDate = req.params.examDate;
    console.log('Generating PDF for date:', examDate);
    
    // Parse date - handle different formats
    let startDate, endDate;
    
    if (examDate.includes('-')) {
      const [day, month, year] = examDate.split('-');
      startDate = new Date(year, month - 1, day);
      endDate = new Date(year, month - 1, day);
    } else {
      startDate = new Date(examDate);
      endDate = new Date(examDate);
    }
    
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    const InvigilatorDuty = require("../models/InvigilatorDuty");
    const duties = await InvigilatorDuty.find({
      examDate: { $gte: startDate, $lte: endDate }
    })
    .populate('invigilatorId', 'shortName name mobileNo')
    .sort({ roomNo: 1 });

    const formattedDuties = duties.map(duty => ({
      shortName: duty.invigilatorId?.shortName || '',
      name: duty.invigilatorId?.name || '',
      mobileNo: duty.invigilatorId?.mobileNo || '',
      dutyFrom: duty.dutyFrom,
      dutyTo: duty.dutyTo,
      roomNo: duty.roomNo
    }));

    const displayDate = examDate.includes('-') ? examDate : 
      new Date(examDate).toLocaleDateString('en-IN').split('/').reverse().join('-');

    const templateData = {
      examDate: displayDate,
      duties: formattedDuties,
      totalInvigilators: formattedDuties.length,
      isPreview: req.query.preview !== "false",
      autoPrint: req.query.print === "true",
    };

    res.render("invigilator-attendance", templateData);
  } catch (error) {
    console.error("Error generating invigilator attendance sheet:", error);
    res.status(500).json({
      success: false,
      error: "Failed to generate attendance sheet: " + error.message,
    });
  }
});

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