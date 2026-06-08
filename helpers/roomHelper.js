const Student = require('../models/Student');
const Room = require('../models/Room');

/**
 * Get statistics for a single room
 * @param {number} roomNo - Room number
 * @returns {Promise<object>} Room statistics
 */
const getRoomStats = async (roomNo) => {
    const students = await Student.find({ roomNo: parseInt(roomNo), isDeleted: false });
    
    let class10Count = 0;
    let class12Count = 0;
    let maleCount = 0;
    let femaleCount = 0;
    let otherCount = 0;
    let englishCount = 0;
    let malayalamCount = 0;
    let typeACount = 0;
    let typeBCount = 0;
    
    const statuses = {
        pending: 0,
        draft: 0,
        submitted: 0,
        final: 0
    };
    
    students.forEach(student => {
        if (student.studyingClass === '10') class10Count++;
        else if (student.studyingClass === '12') class12Count++;
        
        if (student.gender === 'Male') maleCount++;
        else if (student.gender === 'Female') femaleCount++;
        else otherCount++;
        
        if (student.medium === 'English') englishCount++;
        else if (student.medium === 'Malayalam') malayalamCount++;
        
        if (student.examType === 'A') typeACount++;
        else if (student.examType === 'B') typeBCount++;
        
        const status = student.markEntryStatus || 'pending';
        statuses[status] = (statuses[status] || 0) + 1;
    });
    
    const room = await Room.findOne({ roomNo: parseInt(roomNo) });
    const totalSeats = room ? room.totalSeats : 30;
    
    return {
        roomNo: parseInt(roomNo),
        totalSeats,
        occupiedSeats: students.length,
        availableSeats: totalSeats - students.length,
        class10Count,
        class12Count,
        genderCounts: {
            male: maleCount,
            female: femaleCount,
            other: otherCount
        },
        mediumCounts: {
            english: englishCount,
            malayalam: malayalamCount
        },
        examTypeCounts: {
            A: typeACount,
            B: typeBCount
        },
        markStatusCounts: statuses,
        blockName: room ? room.blockName : '',
        status: room ? room.status : 'Active'
    };
};

/**
 * Get statistics for all active rooms
 * @returns {Promise<Array<object>>} List of room statistics
 */
const getAllRoomsStats = async () => {
    // Find all distinct room numbers that have active students
    const activeRoomNumbers = await Student.distinct('roomNo', { isDeleted: false, roomNo: { $ne: null } });
    
    // Also find all room numbers defined in the Room collection
    const definedRooms = await Room.find({ status: 'Active' }).select('roomNo');
    const definedRoomNumbers = definedRooms.map(r => r.roomNo);
    
    // Combine and deduplicate
    const allRoomNumbers = Array.from(new Set([
        ...activeRoomNumbers.map(Number),
        ...definedRoomNumbers.map(Number)
    ])).sort((a, b) => a - b);
    
    const roomStatsPromises = allRoomNumbers.map(roomNo => getRoomStats(roomNo));
    return Promise.all(roomStatsPromises);
};

/**
 * Sync Room collection with current active students allocations.
 * Ensures Room documents exist for all allocated rooms.
 * @returns {Promise<object>} Sync summary
 */
const syncRooms = async () => {
    const activeRoomNumbers = await Student.distinct('roomNo', { isDeleted: false, roomNo: { $ne: null } });
    
    let createdCount = 0;
    const syncedRooms = [];
    
    for (const roomNoVal of activeRoomNumbers) {
        const roomNo = parseInt(roomNoVal);
        if (isNaN(roomNo)) continue;
        
        let room = await Room.findOne({ roomNo });
        if (!room) {
            room = new Room({
                roomNo,
                totalSeats: 30,
                status: 'Active'
            });
            await room.save();
            createdCount++;
        }
        syncedRooms.push(room);
    }
    
    return {
        success: true,
        message: `Synchronization completed. Created ${createdCount} room(s).`,
        activeRooms: activeRoomNumbers.length,
        createdRooms: createdCount
    };
};

module.exports = {
    getRoomStats,
    getAllRoomsStats,
    syncRooms
};
