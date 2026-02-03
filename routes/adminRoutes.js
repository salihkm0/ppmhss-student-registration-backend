const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const studentController = require('../controllers/studentController');
const auth = require('../middleware/auth');

// Public routes
router.post('/login', adminController.login);
router.post('/setup', adminController.setupAdmin);

// Protected routes (admin only)
router.get('/dashboard/stats', auth(['admin', 'superadmin']), adminController.getDashboardStats);
router.get('/students', auth(['admin', 'superadmin']), studentController.getAllStudents);
router.get('/students/:id', auth(['admin', 'superadmin']), studentController.getStudentById);

// Soft delete routes
router.delete('/students/soft-delete/:studentId', auth(['admin', 'superadmin']), studentController.softDeleteStudent);
router.post('/students/restore/:studentId', auth(['admin', 'superadmin']), studentController.restoreStudent);
router.get('/students/deleted', auth(['admin', 'superadmin']), studentController.getDeletedStudents);
router.delete('/students/hard-delete/:studentId', auth(['superadmin']), studentController.hardDeleteStudent);

router.get('/export', auth(['admin', 'superadmin']), studentController.exportStudents);

// Invigilator management routes (admin only)
router.post('/invigilators', auth(['admin', 'superadmin']), adminController.createInvigilator);
router.get('/invigilators', auth(['admin', 'superadmin']), adminController.getAllInvigilators);
router.put('/invigilators/:id', auth(['admin', 'superadmin']), adminController.updateInvigilator);
router.delete('/invigilators/:id', auth(['admin', 'superadmin']), adminController.deleteInvigilator);
router.post('/invigilators/:invigilatorId/assign-rooms', auth(['admin', 'superadmin']), adminController.assignRoomsToInvigilator);

// Results management routes (admin only)
router.post('/results/update-ranks', auth(['admin', 'superadmin']), adminController.updateRanksAndScholarships);
router.get('/results/top-performers', auth(['admin', 'superadmin']), adminController.getTopPerformers);

// Generate attendance sheet (HTML for browser printing)
router.get('/room-attendance/:roomNo/pdf', async (req, res) => {
    try {
        const roomNo = parseInt(req.params.roomNo);

        if (isNaN(roomNo) || roomNo < 1) {
            return res.status(400).json({
                success: false,
                error: 'Invalid room number',
            });
        }

        const Student = require('../models/Student');
        const students = await Student.find({ roomNo })
            .select('name registrationCode seatNo studyingClass fatherName')
            .sort({ seatNo: 1 });

        if (!students || students.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'No students found in this room',
            });
        }

        const studentsPerPage = 20;
        const studentPages = [];
        for (let i = 0; i < students.length; i += studentsPerPage) {
            studentPages.push(students.slice(i, i + studentsPerPage));
        }

        const templateData = {
            roomNo,
            studentPages: studentPages,
            totalStudents: students.length,
            generationDate: new Date().toLocaleDateString('en-IN'),
            examDate: '01-03-2026',
            examTime: '10:00 AM - 11:30 PM',
            isPreview: req.query.preview !== 'false',
            autoPrint: req.query.print === 'true',
        };

        res.render('attendance-sheet', templateData);
    } catch (error) {
        console.error('Error generating attendance sheet:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate attendance sheet: ' + error.message,
        });
    }
});

// Generate exam slips
router.get('/exam-slips/:roomNo', async (req, res) => {
    try {
        const roomNo = parseInt(req.params.roomNo);

        if (isNaN(roomNo) || roomNo < 1) {
            return res.status(400).json({
                success: false,
                error: 'Invalid room number',
            });
        }

        const Student = require('../models/Student');
        const students = await Student.find({ roomNo })
            .select('name registrationCode seatNo studyingClass fatherName gender medium aadhaarNo schoolName phoneNo address')
            .sort({ seatNo: 1 });

        if (!students || students.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'No students found in this room',
            });
        }

        const studentsPerPage = 16;
        const studentPages = [];
        for (let i = 0; i < students.length; i += studentsPerPage) {
            studentPages.push(students.slice(i, i + studentsPerPage));
        }

        const templateData = {
            roomNo,
            studentPages: studentPages,
            totalStudents: students.length,
            generationDate: new Date().toLocaleDateString('en-IN'),
            examDate: '01-03-2026',
            examTime: '10:00 AM - 11:30 PM',
            examCenter: 'PPM HSS Kottukkara',
            isPreview: req.query.preview !== 'false',
            autoPrint: req.query.print === 'true',
        };

        res.render('exam-slips', templateData);
    } catch (error) {
        console.error('Error generating exam slips:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate exam slips: ' + error.message,
        });
    }
});

// Generate simple exam slips
router.get('/simple-exam-slips/:roomNo', async (req, res) => {
    try {
        const roomNo = parseInt(req.params.roomNo);

        if (isNaN(roomNo) || roomNo < 1) {
            return res.status(400).json({
                success: false,
                error: 'Invalid room number',
            });
        }

        const Student = require('../models/Student');
        const students = await Student.find({ roomNo })
            .select('name registrationCode seatNo studyingClass')
            .sort({ seatNo: 1 });

        if (!students || students.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'No students found in this room',
            });
        }

        const studentsPerPage = 21;
        const studentPages = [];
        for (let i = 0; i < students.length; i += studentsPerPage) {
            studentPages.push(students.slice(i, i + studentsPerPage));
        }

        const templateData = {
            roomNo,
            studentPages: studentPages,
            totalStudents: students.length,
            generationDate: new Date().toLocaleDateString('en-IN'),
            isPreview: req.query.preview !== 'false',
            autoPrint: req.query.print === 'true',
        };

        res.render('simple-exam-slips', templateData);
    } catch (error) {
        console.error('Error generating exam slips:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate exam slips: ' + error.message,
        });
    }
});

module.exports = router;