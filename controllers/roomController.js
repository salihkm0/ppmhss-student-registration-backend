const Room = require('../models/Room');
const Student = require('../models/Student');
const InvigilatorDuty = require('../models/InvigilatorDuty');
const roomHelper = require('../helpers/roomHelper');

/**
 * Get all rooms with their statistics
 */
const getAllRooms = async (req, res) => {
    try {
        const stats = await roomHelper.getAllRoomsStats();
        
        // Format to include both new stats and legacy properties for frontend compatibility
        const formattedStats = stats.map(room => {
            const genderCountsArray = [
                { _id: 'Male', count: room.genderCounts.male || 0 },
                { _id: 'Female', count: room.genderCounts.female || 0 },
                { _id: 'Other', count: room.genderCounts.other || 0 }
            ].filter(g => g.count > 0);

            return {
                ...room,
                studentCount: room.occupiedSeats,
                capacity: room.totalSeats,
                genderCounts: genderCountsArray
            };
        });

        res.json({
            success: true,
            data: formattedStats
        });
    } catch (error) {
        console.error('Error in getAllRooms:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch rooms'
        });
    }
};

/**
 * Get detailed stats and student list for a single room
 */
const getRoomDetails = async (req, res) => {
    try {
        const roomNo = parseInt(req.params.roomNo);
        if (isNaN(roomNo)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid room number'
            });
        }

        const room = await Room.findOne({ roomNo });
        const students = await Student.find({ roomNo, isDeleted: false })
            .select('name registrationCode seatNo gender studyingClass fatherName examType')
            .sort({ seatNo: 1 });

        const stats = await roomHelper.getRoomStats(roomNo);

        const genderCountsArray = [
            { _id: 'Male', count: stats.genderCounts.male || 0 },
            { _id: 'Female', count: stats.genderCounts.female || 0 },
            { _id: 'Other', count: stats.genderCounts.other || 0 }
        ].filter(g => g.count > 0);

        res.json({
            success: true,
            data: {
                roomNo,
                blockName: room ? room.blockName : '',
                status: room ? room.status : 'Active',
                totalSeats: stats.totalSeats,
                capacity: stats.totalSeats,
                studentCount: students.length,
                occupiedSeats: students.length,
                availableSeats: stats.availableSeats,
                class10Count: stats.class10Count,
                class12Count: stats.class12Count,
                genderCounts: genderCountsArray,
                mediumCounts: stats.mediumCounts,
                examTypeCounts: stats.examTypeCounts,
                markStatusCounts: stats.markStatusCounts,
                students: students
            }
        });
    } catch (error) {
        console.error('Error in getRoomDetails:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch room details'
        });
    }
};

/**
 * Create a new room
 */
const createRoom = async (req, res) => {
    try {
        const { roomNo, totalSeats, blockName, status } = req.body;

        if (!roomNo || isNaN(roomNo)) {
            return res.status(400).json({
                success: false,
                error: 'Valid Room Number is required'
            });
        }

        const existingRoom = await Room.findOne({ roomNo: parseInt(roomNo) });
        if (existingRoom) {
            return res.status(400).json({
                success: false,
                error: `Room ${roomNo} already exists`
            });
        }

        const room = new Room({
            roomNo: parseInt(roomNo),
            totalSeats: totalSeats ? parseInt(totalSeats) : 30,
            blockName: blockName || '',
            status: status || 'Active'
        });

        await room.save();

        res.status(201).json({
            success: true,
            message: 'Room created successfully',
            data: room
        });
    } catch (error) {
        console.error('Error in createRoom:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create room'
        });
    }
};

/**
 * Update an existing room
 */
const updateRoom = async (req, res) => {
    try {
        const roomNo = parseInt(req.params.roomNo);
        const { totalSeats, blockName, status } = req.body;

        if (isNaN(roomNo)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid room number'
            });
        }

        let room = await Room.findOne({ roomNo });
        if (!room) {
            // Auto create if they are trying to update but it doesn't exist in Room collection yet
            room = new Room({ roomNo });
        }

        if (totalSeats !== undefined) room.totalSeats = parseInt(totalSeats);
        if (blockName !== undefined) room.blockName = blockName;
        if (status !== undefined) room.status = status;

        await room.save();

        res.json({
            success: true,
            message: 'Room updated successfully',
            data: room
        });
    } catch (error) {
        console.error('Error in updateRoom:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update room'
        });
    }
};

/**
 * Sync Room collection with current active student seating allocations
 */
const syncRooms = async (req, res) => {
    try {
        const syncResult = await roomHelper.syncRooms();
        res.json(syncResult);
    } catch (error) {
        console.error('Error in syncRooms:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to sync rooms'
        });
    }
};

/**
 * Get available rooms for invigilator duty on a specific date
 */
const getAvailableForDuty = async (req, res) => {
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
        const assignedDuties = await InvigilatorDuty.find({
            examDate: { $gte: selectedDate, $lt: nextDay }
        })
        .populate('invigilatorId', 'shortName name')
        .lean();
        
        const assignedRoomNumbers = assignedDuties.map(d => d.roomNo);
        
        // Format available rooms
        const availableRooms = roomsWithStudents
            .filter(room => !assignedRoomNumbers.includes(room._id))
            .map(room => ({
                roomNo: room._id,
                studentCount: room.studentCount,
                label: `Room ${room._id} (${room.studentCount} students)`
            }));
            
        // Format assigned rooms
        const formattedAssigned = assignedDuties.map(duty => ({
            roomNo: duty.roomNo,
            invigilator: {
                id: duty.invigilatorId?._id,
                shortName: duty.invigilatorId?.shortName,
                name: duty.invigilatorId?.name
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
        console.error('Error fetching available rooms for duty:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch available rooms'
        });
    }
};

module.exports = {
    getAllRooms,
    getRoomDetails,
    createRoom,
    updateRoom,
    syncRooms,
    getAvailableForDuty
};
