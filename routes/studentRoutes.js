const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const studentController = require('../controllers/studentController');
const auth = require('../middleware/auth');

// Validation middleware
const validateStudent = [
    body('name').notEmpty().withMessage('Name is required').trim(),
    body('gender').isIn(['Male', 'Female', 'Other']).withMessage('Invalid gender'),
    body('fatherName').notEmpty().withMessage("Father's name is required").trim(),
    body('aadhaarNo')
        .matches(/^\d{12}$/)
        .withMessage('Invalid Aadhaar number. Must be 12 digits'),
    body('schoolName').notEmpty().withMessage('School name is required').trim(),
    body('studyingClass')
        .isIn(['7', '8', '9', '10', '11', '12'])
        .withMessage('Invalid class. Must be between 7 and 12'),
    body('medium')
        .isIn(['English', 'Malayalam', 'Hindi', 'Other'])
        .withMessage('Invalid medium'),
    body('phoneNo')
        .matches(/^\d{10}$/)
        .withMessage('Invalid phone number. Must be 10 digits'),
    body('address.houseName').notEmpty().withMessage('House name is required').trim(),
    body('address.place').notEmpty().withMessage('Place is required').trim(),
    body('address.postOffice').notEmpty().withMessage('Post office is required').trim(),
    body('address.pinCode')
        .matches(/^\d{6}$/)
        .withMessage('Invalid PIN code. Must be 6 digits'),
    body('address.localBodyType')
        .isIn(['Municipality', 'Corporation', 'Panchayat'])
        .withMessage('Invalid local body type'),
    body('address.localBodyName').notEmpty().withMessage('Local body name is required').trim(),
    body('address.village').notEmpty().withMessage('Village name is required').trim(),
];

// Public routes
router.get('/health', studentController.healthCheck);

router.get('/next-application-no', studentController.getNextApplicationNo);
router.get('/next-registration-code', studentController.getNextRegistrationCode);
router.get('/next-room-allocation', studentController.getNextRoomAllocation);

router.get('/phone/:phoneNo', studentController.getStudentsByPhone);
router.get('/rooms/distribution', studentController.getRoomDistribution);
router.get('/rooms/:roomNo', studentController.getStudentsByRoom);

router.post('/register', validateStudent, studentController.registerStudent);
router.get('/:code', studentController.getStudentByCode);


// Hall ticket routes
router.get('/:code/hallticket/preview', studentController.hallTicketPreview);
router.get('/:code/hallticket/download', (req, res) => {
    req.query.print = 'true';
    studentController.hallTicketPreview(req, res);
});

// Protected routes (admin only)
router.get('/', auth(['admin', 'superadmin']), studentController.getAllStudents);
router.get('/export/csv', auth(['admin', 'superadmin']), studentController.exportStudents);

module.exports = router;