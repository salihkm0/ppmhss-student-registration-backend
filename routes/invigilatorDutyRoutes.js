// routes/invigilatorDutyRoutes.js
const express = require('express');
const router = express.Router();
const invigilatorDutyController = require('../controllers/invigilatorDutyController');
const auth = require('../middleware/auth');

// Duty routes
router.post('/duties/bulk', auth(['admin', 'superadmin']), invigilatorDutyController.bulkAssignDuties);
router.get('/duties/by-date/:examDate', auth(['admin', 'superadmin']), invigilatorDutyController.getDutiesByDate);
router.get('/duties/batch/:batchId', auth(['admin', 'superadmin']), invigilatorDutyController.getDutiesByBatch);
router.get('/duties/attendance-sheet/:examDate', auth(['admin', 'superadmin']), invigilatorDutyController.getAttendanceSheetData);
router.put('/duties/:id/attendance', auth(['admin', 'superadmin']), invigilatorDutyController.markAttendance);
router.delete('/duties/:id', auth(['admin', 'superadmin']), invigilatorDutyController.deleteDuty);
router.delete('/duties/batch/:batchId', auth(['admin', 'superadmin']), invigilatorDutyController.deleteBatch);

// PDF generation route
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

module.exports = router;