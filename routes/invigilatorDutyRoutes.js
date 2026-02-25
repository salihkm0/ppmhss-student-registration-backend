// // routes/invigilatorDutyRoutes.js
// const express = require('express');
// const router = express.Router();
// const invigilatorDutyController = require('../controllers/invigilatorDutyController');
// const auth = require('../middleware/auth');

// // Duty routes
// router.post('/bulk', auth(['admin', 'superadmin']), async (req, res) => {
//     try {
//         await invigilatorDutyController.bulkAssignDuties(req, res);
//     } catch (error) {
//         console.error('Error in bulk assign duties:', error);
//         res.status(500).json({
//             success: false,
//             error: 'Failed to bulk assign duties'
//         });
//     }
// });

// router.get('/by-date/:examDate', auth(['admin', 'superadmin']), async (req, res) => {
//     try {
//         await invigilatorDutyController.getDutiesByDate(req, res);
//     } catch (error) {
//         console.error('Error in get duties by date:', error);
//         res.status(500).json({
//             success: false,
//             error: 'Failed to fetch duties by date'
//         });
//     }
// });

// router.get('/batch/:batchId', auth(['admin', 'superadmin']), async (req, res) => {
//     try {
//         await invigilatorDutyController.getDutiesByBatch(req, res);
//     } catch (error) {
//         console.error('Error in get duties by batch:', error);
//         res.status(500).json({
//             success: false,
//             error: 'Failed to fetch duties by batch'
//         });
//     }
// });

// router.get('/attendance-sheet/:examDate', auth(['admin', 'superadmin']), async (req, res) => {
//     try {
//         await invigilatorDutyController.getAttendanceSheetData(req, res);
//     } catch (error) {
//         console.error('Error in get attendance sheet:', error);
//         res.status(500).json({
//             success: false,
//             error: 'Failed to fetch attendance sheet data'
//         });
//     }
// });

// router.put('/:id/attendance', auth(['admin', 'superadmin']), async (req, res) => {
//     try {
//         await invigilatorDutyController.markAttendance(req, res);
//     } catch (error) {
//         console.error('Error in mark attendance:', error);
//         res.status(500).json({
//             success: false,
//             error: 'Failed to mark attendance'
//         });
//     }
// });

// router.delete('/:id', auth(['admin', 'superadmin']), async (req, res) => {
//     try {
//         await invigilatorDutyController.deleteDuty(req, res);
//     } catch (error) {
//         console.error('Error in delete duty:', error);
//         res.status(500).json({
//             success: false,
//             error: 'Failed to delete duty'
//         });
//     }
// });

// router.delete('/batch/:batchId', auth(['admin', 'superadmin']), async (req, res) => {
//     try {
//         await invigilatorDutyController.deleteBatch(req, res);
//     } catch (error) {
//         console.error('Error in delete batch:', error);
//         res.status(500).json({
//             success: false,
//             error: 'Failed to delete batch'
//         });
//     }
// });

// // PDF generation route
// router.get("/attendance/:examDate/pdf", async (req, res) => {
//   try {
//     const examDate = req.params.examDate;
//     console.log('Generating PDF for date:', examDate);
    
//     // Parse date - handle different formats
//     let startDate, endDate;
    
//     if (examDate.includes('-')) {
//       const [day, month, year] = examDate.split('-');
//       startDate = new Date(year, month - 1, day);
//       endDate = new Date(year, month - 1, day);
//     } else {
//       startDate = new Date(examDate);
//       endDate = new Date(examDate);
//     }
    
//     startDate.setHours(0, 0, 0, 0);
//     endDate.setHours(23, 59, 59, 999);

//     const InvigilatorDuty = require("../models/InvigilatorDuty");
//     const duties = await InvigilatorDuty.find({
//       examDate: { $gte: startDate, $lte: endDate }
//     })
//     .populate('invigilatorId', 'shortName name mobileNo')
//     .sort({ roomNo: 1 });

//     const formattedDuties = duties.map(duty => ({
//       shortName: duty.invigilatorId?.shortName || '',
//       name: duty.invigilatorId?.name || '',
//       mobileNo: duty.invigilatorId?.mobileNo || '',
//       dutyFrom: duty.dutyFrom,
//       dutyTo: duty.dutyTo,
//       roomNo: duty.roomNo
//     }));

//     const displayDate = examDate.includes('-') ? examDate : 
//       new Date(examDate).toLocaleDateString('en-IN').split('/').reverse().join('-');

//     const templateData = {
//       examDate: displayDate,
//       duties: formattedDuties,
//       totalInvigilators: formattedDuties.length,
//       isPreview: req.query.preview !== "false",
//       autoPrint: req.query.print === "true",
//     };

//     res.render("invigilator-attendance", templateData);
//   } catch (error) {
//     console.error("Error generating invigilator attendance sheet:", error);
//     res.status(500).json({
//       success: false,
//       error: "Failed to generate attendance sheet: " + error.message,
//     });
//   }
// });

// module.exports = router;