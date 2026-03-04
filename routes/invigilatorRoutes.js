// const express = require('express');
// const router = express.Router();
// const invigilatorController = require('../controllers/invigilatorController');
// const auth = require('../middleware/auth');

// // Public routes
// router.post('/login', invigilatorController.login);

// // Protected routes (invigilator only)
// router.get('/dashboard', auth(['invigilator']), invigilatorController.getDashboard);
// router.get('/profile', auth(['invigilator']), invigilatorController.getProfile);
// router.put('/profile', auth(['invigilator']), invigilatorController.updateProfile);

// // Room management routes
// router.get('/rooms/:roomNo/students', auth(['invigilator']), invigilatorController.getRoomStudents);
// router.post('/students/:studentId/marks', auth(['invigilator']), invigilatorController.enterMarks);
// router.post('/rooms/:roomNo/bulk-marks', auth(['invigilator']), invigilatorController.bulkEnterMarks);

// module.exports = router;

const express = require('express');
const router = express.Router();
const invigilatorController = require('../controllers/invigilatorController');
const auth = require('../middleware/auth');

// Public route
router.post('/login', invigilatorController.login);

// Protected routes
router.get('/dashboard', auth(['invigilator']), invigilatorController.getDashboard);
router.get('/profile', auth(['invigilator']), invigilatorController.getProfile);
router.put('/profile', auth(['invigilator']), invigilatorController.updateProfile);

// Room management
router.get('/rooms/:roomNo/students', auth(['invigilator']), invigilatorController.getRoomStudents);

// Mark entry routes
router.post('/students/:studentId/marks', auth(['invigilator']), invigilatorController.enterMarks);
router.post('/students/:studentId/submit', auth(['invigilator']), invigilatorController.submitMarks);
router.post('/rooms/:roomNo/bulk-marks', auth(['invigilator']), invigilatorController.bulkEnterMarks);
router.post('/rooms/:roomNo/submit-all', auth(['invigilator']), invigilatorController.submitRoomMarks);

// History and pending submissions
router.get('/pending-submissions', auth(['invigilator']), invigilatorController.getPendingSubmissions);
router.get('/students/:studentId/history', auth(['invigilator']), invigilatorController.getStudentMarkHistory);

module.exports = router;