const express = require('express');
const router = express.Router();
const invigilatorController = require('../controllers/invigilatorController');
const auth = require('../middleware/auth');

// Public routes
router.post('/login', invigilatorController.login);

// Protected routes (invigilator only)
router.get('/dashboard', auth(['invigilator']), invigilatorController.getDashboard);
router.get('/profile', auth(['invigilator']), invigilatorController.getProfile);
router.put('/profile', auth(['invigilator']), invigilatorController.updateProfile);

// Room management routes
router.get('/rooms/:roomNo/students', auth(['invigilator']), invigilatorController.getRoomStudents);
router.post('/students/:studentId/marks', auth(['invigilator']), invigilatorController.enterMarks);
router.post('/rooms/:roomNo/bulk-marks', auth(['invigilator']), invigilatorController.bulkEnterMarks);

module.exports = router;