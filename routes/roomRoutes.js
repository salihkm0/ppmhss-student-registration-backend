const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const roomController = require('../controllers/roomController');
const { generateRoomRegisterRange } = require('../controllers/examInvigilatorController');

// @desc    Get all rooms with their stats (using the new roomController)
// @route   GET /api/rooms/status
router.get('/status', auth(['admin', 'superadmin']), roomController.getAllRooms);

// @desc    Get available rooms for invigilator duty
// @route   GET /api/rooms/available-for-duty
router.get('/available-for-duty', auth(['admin', 'superadmin']), roomController.getAvailableForDuty);

// @desc    Generate room register range PDF (existing endpoint)
// @route   GET /api/rooms/register-range/pdf
router.get('/register-range/pdf', generateRoomRegisterRange);

// Basic CRUD and Sync Routes
// @desc    Get all rooms
// @route   GET /api/rooms
router.get('/', auth(['admin', 'superadmin']), roomController.getAllRooms);

// @desc    Create a new room
// @route   POST /api/rooms
router.post('/', auth(['admin', 'superadmin']), roomController.createRoom);

// @desc    Get room details
// @route   GET /api/rooms/:roomNo
router.get('/:roomNo', auth(['admin', 'superadmin']), roomController.getRoomDetails);

// @desc    Update room details
// @route   PUT /api/rooms/:roomNo
router.put('/:roomNo', auth(['admin', 'superadmin']), roomController.updateRoom);

// @desc    Sync Room collection with active student seat allocations
// @route   POST /api/rooms/sync
router.post('/sync', auth(['admin', 'superadmin']), roomController.syncRooms);

module.exports = router;