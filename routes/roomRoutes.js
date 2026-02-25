const express = require('express');
const router = express.Router();
const Student = require('../models/Student');
const InvigilatorDuty = require('../models/InvigilatorDuty');
const auth = require('../middleware/auth');
const { generateRoomRegisterRange } = require('../controllers/examInvigilatorController');

// @desc    Get all rooms with their status
// @route   GET /api/rooms/status
router.get('/status', auth(['admin', 'superadmin']), async (req, res) => {
  try {
    const rooms = [];
    for (let i = 1; i <= 20; i++) {
      const studentCount = await Student.countDocuments({ 
        roomNo: i, 
        isDeleted: false 
      });
      
      rooms.push({
        roomNo: i,
        totalSeats: 20,
        occupiedSeats: studentCount,
        availableSeats: 20 - studentCount,
        isFull: studentCount >= 20,
        hasStudents: studentCount > 0
      });
    }
    
    res.json({
      success: true,
      data: rooms
    });
  } catch (error) {
    console.error('Error fetching room status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch room status'
    });
  }
});

// @desc    Get available rooms for invigilator duty on a specific date
// @route   GET /api/rooms/available-for-duty
router.get('/available-for-duty', auth(['admin', 'superadmin']), async (req, res) => {
  try {
    const { date } = req.query;
    
    if (!date) {
      return res.status(400).json({
        success: false,
        error: 'Date is required'
      });
    }
    
    // Parse date (expected format: YYYY-MM-DD or DD-MM-YYYY)
    let selectedDate;
    if (date.includes('-')) {
      const parts = date.split('-');
      if (parts[0].length === 4) {
        // YYYY-MM-DD format
        selectedDate = new Date(parts[0], parts[1] - 1, parts[2]);
      } else {
        // DD-MM-YYYY format
        selectedDate = new Date(parts[2], parts[1] - 1, parts[0]);
      }
    } else {
      selectedDate = new Date(date);
    }
    
    selectedDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(selectedDate);
    nextDay.setDate(nextDay.getDate() + 1);
    
    // Get all rooms that have students
    const roomsWithStudents = await Student.aggregate([
      { $match: { isDeleted: false } },
      { $group: {
        _id: '$roomNo',
        studentCount: { $sum: 1 }
      }},
      { $sort: { _id: 1 } }
    ]);
    
    // Get rooms already assigned to invigilators on this date
    const assignedRooms = await InvigilatorDuty.find({
      examDate: { $gte: selectedDate, $lt: nextDay }
    })
    .populate('invigilatorId', 'shortName name')
    .lean();
    
    const assignedRoomNumbers = assignedRooms.map(r => r.roomNo);
    
    // Format available rooms (only rooms with students and not assigned)
    const availableRooms = roomsWithStudents
      .filter(room => !assignedRoomNumbers.includes(room._id))
      .map(room => ({
        roomNo: room._id,
        studentCount: room.studentCount,
        label: `Room ${room._id} (${room.studentCount} students)`
      }));
    
    // Format assigned rooms with invigilator details
    const formattedAssigned = assignedRooms.map(duty => ({
      roomNo: duty.roomNo,
      invigilator: {
        id: duty.invigilatorId._id,
        shortName: duty.invigilatorId.shortName,
        name: duty.invigilatorId.name
      },
      dutyFrom: duty.dutyFrom,
      dutyTo: duty.dutyTo,
      dutyId: duty._id
    }));
    
    res.json({
      success: true,
      data: {
        available: availableRooms,
        assigned: formattedAssigned,
        allRooms: roomsWithStudents.map(r => r._id).sort((a, b) => a - b)
      }
    });
  } catch (error) {
    console.error('Error fetching available rooms:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch available rooms'
    });
  }
});

// @desc    Generate room register range PDF
// @route   GET /api/rooms/register-range/pdf
router.get('/register-range/pdf', generateRoomRegisterRange);

module.exports = router;