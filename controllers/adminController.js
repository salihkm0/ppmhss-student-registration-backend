// const Admin = require('../models/Admin');
// const Student = require('../models/Student');
// const Invigilator = require('../models/Invigilator');
// const bcrypt = require('bcryptjs');
// const jwt = require('jsonwebtoken');

// // Admin login
// const login = async (req, res) => {
//     try {
//         const { username, password } = req.body;

//         if (!username || !password) {
//             return res.status(400).json({
//                 success: false,
//                 error: 'Username/Email and password are required',
//             });
//         }

//         const admin = await Admin.findOne({
//             $or: [{ username: username }, { email: username.toLowerCase() }],
//         });

//         if (!admin) {
//             return res.status(401).json({
//                 success: false,
//                 error: 'Invalid credentials',
//             });
//         }

//         const isMatch = await bcrypt.compare(password, admin.password);
//         if (!isMatch) {
//             return res.status(401).json({
//                 success: false,
//                 error: 'Invalid credentials',
//             });
//         }

//         const token = jwt.sign(
//             { id: admin._id, username: admin.username, role: admin.role },
//             process.env.JWT_SECRET || 'your-secret-key',
//             { expiresIn: '24h' }
//         );

//         res.json({
//             success: true,
//             token,
//             admin: {
//                 id: admin._id,
//                 username: admin.username,
//                 email: admin.email,
//                 role: admin.role,
//             },
//         });
//     } catch (error) {
//         console.error('Login error:', error);
//         res.status(500).json({
//             success: false,
//             error: 'Server error',
//         });
//     }
// };

// // Create default admin
// const setupAdmin = async (req, res) => {
//     try {
//         const { username, password, email } = req.body;

//         const existingAdmin = await Admin.findOne({ username });
//         if (existingAdmin) {
//             return res.status(400).json({
//                 success: false,
//                 error: 'Admin already exists',
//             });
//         }

//         const admin = new Admin({
//             username,
//             password,
//             email,
//             role: 'superadmin',
//         });

//         await admin.save();

//         res.json({
//             success: true,
//             message: 'Admin created successfully',
//         });
//     } catch (error) {
//         console.error('Setup error:', error);
//         res.status(500).json({
//             success: false,
//             error: 'Server error',
//         });
//     }
// };

// // Get dashboard stats
// const getDashboardStats = async (req, res) => {
//     try {
//         // Get today's date range (start and end of day)
//         const today = new Date();
//         today.setHours(0, 0, 0, 0);
//         const tomorrow = new Date(today);
//         tomorrow.setDate(tomorrow.getDate() + 1);

//         // Get total students count (excluding deleted)
//         const totalStudents = await Student.countDocuments({ isDeleted: false });
        
//         // Get today's registrations count
//         const todaysRegistrations = await Student.countDocuments({
//             createdAt: { $gte: today, $lt: tomorrow },
//             isDeleted: false
//         });
        
//         const totalInvigilators = await Invigilator.countDocuments();

//         const recentStudents = await Student.find({ isDeleted: false })
//             .sort({ createdAt: -1 })
//             .limit(10)
//             .select('name registrationCode applicationNo roomNo seatNo createdAt examMarks');

//         const genderStats = await Student.aggregate([
//             { $match: { isDeleted: false } },
//             { $group: { _id: '$gender', count: { $sum: 1 } } },
//         ]);

//         const classStats = await Student.aggregate([
//             { $match: { isDeleted: false } },
//             { $group: { _id: '$studyingClass', count: { $sum: 1 } } },
//             { $sort: { _id: 1 } },
//         ]);

//         // Medium-wise statistics
//         const mediumStats = await Student.aggregate([
//             { $match: { isDeleted: false } },
//             { $group: { _id: '$medium', count: { $sum: 1 } } },
//             { $sort: { _id: 1 } },
//         ]);

//         const roomStats = await Student.aggregate([
//             { $match: { isDeleted: false } },
//             { $group: { _id: '$roomNo', count: { $sum: 1 } } },
//             { $sort: { _id: 1 } },
//         ]);

//         const resultStats = await Student.aggregate([
//             { $match: { isDeleted: false } },
//             { $group: { _id: '$resultStatus', count: { $sum: 1 } } },
//         ]);

//         const topPerformers = await Student.find({ examMarks: { $gt: 0 }, isDeleted: false })
//             .sort({ examMarks: -1 })
//             .limit(5)
//             .select('name registrationCode examMarks rank scholarship');

//         // Get day-wise registration trend for the last 7 days
//         const last7Days = [];
//         const registrationTrend = [];
        
//         for (let i = 6; i >= 0; i--) {
//             const date = new Date();
//             date.setDate(date.getDate() - i);
//             date.setHours(0, 0, 0, 0);
            
//             const nextDate = new Date(date);
//             nextDate.setDate(nextDate.getDate() + 1);
            
//             const count = await Student.countDocuments({
//                 createdAt: { $gte: date, $lt: nextDate },
//                 isDeleted: false
//             });
            
//             // Format date as DD MMM (e.g., "24 Feb")
//             const dayName = date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
            
//             last7Days.push(dayName);
//             registrationTrend.push(count);
//         }

//         // Get registration trend for the last 30 days (for detailed chart)
//         const last30Days = [];
//         const registrationTrend30 = [];
        
//         for (let i = 29; i >= 0; i--) {
//             const date = new Date();
//             date.setDate(date.getDate() - i);
//             date.setHours(0, 0, 0, 0);
            
//             const nextDate = new Date(date);
//             nextDate.setDate(nextDate.getDate() + 1);
            
//             const count = await Student.countDocuments({
//                 createdAt: { $gte: date, $lt: nextDate },
//                 isDeleted: false
//             });
            
//             // Format date as DD MMM (e.g., "24 Feb")
//             const dayName = date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
            
//             last30Days.push(dayName);
//             registrationTrend30.push(count);
//         }

//         // Get hourly registration distribution for today
//         const hourlyDistribution = [];
//         for (let hour = 0; hour < 24; hour++) {
//             const hourStart = new Date(today);
//             hourStart.setHours(hour, 0, 0, 0);
            
//             const hourEnd = new Date(today);
//             hourEnd.setHours(hour + 1, 0, 0, 0);
            
//             const count = await Student.countDocuments({
//                 createdAt: { $gte: hourStart, $lt: hourEnd },
//                 isDeleted: false
//             });
            
//             hourlyDistribution.push({
//                 hour: hour.toString().padStart(2, '0') + ':00',
//                 count
//             });
//         }

//         res.json({
//             success: true,
//             stats: {
//                 totalStudents,
//                 todaysRegistrations,
//                 totalInvigilators,
//                 gender: genderStats,
//                 class: classStats,
//                 medium: mediumStats,
//                 rooms: roomStats,
//                 results: resultStats,
//             },
//             recent: recentStudents,
//             topPerformers,
//             trends: {
//                 last7Days,
//                 registrationTrend,
//                 last30Days,
//                 registrationTrend30,
//                 hourlyDistribution
//             }
//         });
//     } catch (error) {
//         console.error('Dashboard error:', error);
//         res.status(500).json({
//             success: false,
//             error: 'Server error',
//         });
//     }
// };

// // Create invigilator (admin only)
// const createInvigilator = async (req, res) => {
//     try {
//         const { name, email, phone, password } = req.body;

//         // Check if invigilator already exists
//         const existingInvigilator = await Invigilator.findOne({ email });
//         if (existingInvigilator) {
//             return res.status(400).json({
//                 success: false,
//                 error: 'Invigilator with this email already exists',
//             });
//         }

//         const invigilator = new Invigilator({
//             name,
//             email,
//             phone,
//             password,
//             role: 'invigilator',
//         });

//         await invigilator.save();

//         // Remove password from response
//         invigilator.password = undefined;

//         res.status(201).json({
//             success: true,
//             message: 'Invigilator created successfully',
//             data: invigilator,
//         });
//     } catch (error) {
//         console.error('Create invigilator error:', error);
//         res.status(500).json({
//             success: false,
//             error: error.message || 'Server error',
//         });
//     }
// };

// // Get all invigilators with search and pagination
// const getAllInvigilators = async (req, res) => {
//     try {
//         const { search, page = 1, limit = 10 } = req.query;
//         const query = {};

//         // Add search functionality
//         if (search) {
//             query.$or = [
//                 { name: { $regex: search, $options: 'i' } },
//                 { email: { $regex: search, $options: 'i' } },
//                 { phone: { $regex: search, $options: 'i' } }
//             ];
//         }

//         const skip = (page - 1) * limit;

//         const invigilators = await Invigilator.find(query)
//             .select('-password -__v')
//             .sort({ createdAt: -1 })
//             .skip(skip)
//             .limit(parseInt(limit));

//         const total = await Invigilator.countDocuments(query);

//         res.json({
//             success: true,
//             data: invigilators,
//             pagination: {
//                 total,
//                 page: parseInt(page),
//                 limit: parseInt(limit),
//                 pages: Math.ceil(total / limit)
//             }
//         });
//     } catch (error) {
//         console.error('Get invigilators error:', error);
//         res.status(500).json({
//             success: false,
//             error: 'Server error',
//         });
//     }
// };

// // Get single invigilator by ID
// const getInvigilatorById = async (req, res) => {
//     try {
//         const { id } = req.params;

//         const invigilator = await Invigilator.findById(id)
//             .select('-password -__v');

//         if (!invigilator) {
//             return res.status(404).json({
//                 success: false,
//                 error: 'Invigilator not found',
//             });
//         }

//         res.json({
//             success: true,
//             data: invigilator,
//         });
//     } catch (error) {
//         console.error('Get invigilator error:', error);
//         res.status(500).json({
//             success: false,
//             error: 'Server error',
//         });
//     }
// };

// // Assign rooms to invigilator
// const assignRoomsToInvigilator = async (req, res) => {
//     try {
//         const { invigilatorId } = req.params;
//         const { rooms } = req.body; // Array of room numbers

//         if (!Array.isArray(rooms) || rooms.length === 0) {
//             return res.status(400).json({
//                 success: false,
//                 error: 'Please provide room numbers array',
//             });
//         }

//         const invigilator = await Invigilator.findById(invigilatorId);
//         if (!invigilator) {
//             return res.status(404).json({
//                 success: false,
//                 error: 'Invigilator not found',
//             });
//         }

//         // Clear existing rooms and assign new ones
//         invigilator.assignedRooms = [];
//         rooms.forEach(roomNo => {
//             invigilator.assignRoom(roomNo);
//         });

//         await invigilator.save();

//         res.json({
//             success: true,
//             message: 'Rooms assigned successfully',
//             data: {
//                 id: invigilator._id,
//                 name: invigilator.name,
//                 assignedRooms: invigilator.assignedRooms,
//             },
//         });
//     } catch (error) {
//         console.error('Assign rooms error:', error);
//         res.status(500).json({
//             success: false,
//             error: error.message || 'Server error',
//         });
//     }
// };

// // Update invigilator
// const updateInvigilator = async (req, res) => {
//     try {
//         const { id } = req.params;
//         const { name, email, phone, password, isActive } = req.body;

//         // Find invigilator first
//         const invigilator = await Invigilator.findById(id);
//         if (!invigilator) {
//             return res.status(404).json({
//                 success: false,
//                 error: 'Invigilator not found',
//             });
//         }

//         // Check if email already exists (for other invigilators)
//         if (email && email !== invigilator.email) {
//             const existingInvigilator = await Invigilator.findOne({ 
//                 email,
//                 _id: { $ne: id }
//             });
//             if (existingInvigilator) {
//                 return res.status(400).json({
//                     success: false,
//                     error: 'Email already in use by another invigilator',
//                 });
//             }
//         }

//         // Update fields
//         if (name) invigilator.name = name;
//         if (email) invigilator.email = email.toLowerCase();
//         if (phone) invigilator.phone = phone;
//         if (password) invigilator.password = password; // Will be hashed by pre-save hook
//         if (typeof isActive === 'boolean') invigilator.isActive = isActive;

//         await invigilator.save();

//         // Remove password from response
//         invigilator.password = undefined;

//         res.json({
//             success: true,
//             message: 'Invigilator updated successfully',
//             data: invigilator,
//         });
//     } catch (error) {
//         console.error('Update invigilator error:', error);
//         res.status(500).json({
//             success: false,
//             error: error.message || 'Server error',
//         });
//     }
// };

// // Delete invigilator
// const deleteInvigilator = async (req, res) => {
//     try {
//         const { id } = req.params;

//         const invigilator = await Invigilator.findByIdAndDelete(id);

//         if (!invigilator) {
//             return res.status(404).json({
//                 success: false,
//                 error: 'Invigilator not found',
//             });
//         }

//         res.json({
//             success: true,
//             message: 'Invigilator deleted successfully',
//         });
//     } catch (error) {
//         console.error('Delete invigilator error:', error);
//         res.status(500).json({
//             success: false,
//             error: error.message || 'Server error',
//         });
//     }
// };

// // Remove room from invigilator
// const removeRoomFromInvigilator = async (req, res) => {
//     try {
//         const { invigilatorId } = req.params;
//         const { roomNo } = req.body;

//         if (!roomNo) {
//             return res.status(400).json({
//                 success: false,
//                 error: 'Room number is required',
//             });
//         }

//         const invigilator = await Invigilator.findById(invigilatorId);
//         if (!invigilator) {
//             return res.status(404).json({
//                 success: false,
//                 error: 'Invigilator not found',
//             });
//         }

//         // Remove the room
//         invigilator.removeRoom(roomNo);
//         await invigilator.save();

//         res.json({
//             success: true,
//             message: 'Room removed successfully',
//             data: {
//                 id: invigilator._id,
//                 name: invigilator.name,
//                 assignedRooms: invigilator.assignedRooms,
//             },
//         });
//     } catch (error) {
//         console.error('Remove room error:', error);
//         res.status(500).json({
//             success: false,
//             error: error.message || 'Server error',
//         });
//     }
// };

// // Get available rooms for assignment (rooms that have students but aren't fully assigned)
// const getAvailableRooms = async (req, res) => {
//     try {
//         // Get all rooms that have students
//         const studentRooms = await Student.aggregate([
//             { $match: { isDeleted: false } },
//             { $group: { _id: '$roomNo', studentCount: { $sum: 1 } } },
//             { $sort: { _id: 1 } }
//         ]);

//         // Get all assigned rooms from invigilators
//         const invigilators = await Invigilator.find({}, 'assignedRooms');
//         const assignedRooms = new Set();
        
//         invigilators.forEach(invigilator => {
//             invigilator.assignedRooms.forEach(room => {
//                 assignedRooms.add(room.roomNo);
//             });
//         });

//         // Filter available rooms (rooms with students but not assigned)
//         const availableRooms = studentRooms
//             .filter(room => !assignedRooms.has(room._id.toString()))
//             .map(room => ({
//                 roomNo: room._id,
//                 studentCount: room.studentCount,
//                 available: true
//             }));

//         // Also include assigned rooms with their invigilator info
//         const assignedRoomsInfo = [];
//         invigilators.forEach(invigilator => {
//             invigilator.assignedRooms.forEach(room => {
//                 const roomInfo = studentRooms.find(r => r._id === parseInt(room.roomNo));
//                 assignedRoomsInfo.push({
//                     roomNo: room.roomNo,
//                     studentCount: roomInfo ? roomInfo.studentCount : 0,
//                     assignedTo: {
//                         id: invigilator._id,
//                         name: invigilator.name,
//                         email: invigilator.email
//                     },
//                     available: false
//                 });
//             });
//         });

//         res.json({
//             success: true,
//             data: {
//                 available: availableRooms,
//                 assigned: assignedRoomsInfo,
//                 allRooms: studentRooms.map(room => room._id).sort((a, b) => a - b)
//             }
//         });
//     } catch (error) {
//         console.error('Get available rooms error:', error);
//         res.status(500).json({
//             success: false,
//             error: error.message || 'Server error',
//         });
//     }
// };

// // Update ranks and scholarships (admin only)
// const updateRanksAndScholarships = async (req, res) => {
//     try {
//         const result = await Student.updateRanksAndScholarships();

//         res.json({
//             success: true,
//             message: result.message,
//             data: {
//                 updatedCount: result.updatedCount,
//             },
//         });
//     } catch (error) {
//         console.error('Update ranks error:', error);
//         res.status(500).json({
//             success: false,
//             error: 'Server error',
//         });
//     }
// };

// // Get top performers
// const getTopPerformers = async (req, res) => {
//     try {
//         const limit = parseInt(req.query.limit) || 10;
//         const topPerformers = await Student.getTopPerformers(limit);

//         res.json({
//             success: true,
//             data: topPerformers,
//             count: topPerformers.length,
//         });
//     } catch (error) {
//         console.error('Get top performers error:', error);
//         res.status(500).json({
//             success: false,
//             error: 'Server error',
//         });
//     }
// };

// module.exports = {
//     login,
//     setupAdmin,
//     getDashboardStats,
//     createInvigilator,
//     getAllInvigilators,
//     getInvigilatorById,
//     assignRoomsToInvigilator,
//     removeRoomFromInvigilator,
//     updateInvigilator,
//     deleteInvigilator,
//     getAvailableRooms,
//     updateRanksAndScholarships,
//     getTopPerformers
// };

// //hhu



const Admin = require('../models/Admin');
const Student = require('../models/Student');
const Invigilator = require('../models/Invigilator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Admin login
const login = async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                error: 'Username/Email and password are required',
            });
        }

        const admin = await Admin.findOne({
            $or: [{ username: username }, { email: username.toLowerCase() }],
        });

        if (!admin) {
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials',
            });
        }

        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials',
            });
        }

        const token = jwt.sign(
            { id: admin._id, username: admin.username, role: admin.role },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            token,
            admin: {
                id: admin._id,
                username: admin.username,
                email: admin.email,
                role: admin.role,
            },
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error',
        });
    }
};

// Create default admin
const setupAdmin = async (req, res) => {
    try {
        const { username, password, email } = req.body;

        const existingAdmin = await Admin.findOne({ username });
        if (existingAdmin) {
            return res.status(400).json({
                success: false,
                error: 'Admin already exists',
            });
        }

        const admin = new Admin({
            username,
            password,
            email,
            role: 'superadmin',
        });

        await admin.save();

        res.json({
            success: true,
            message: 'Admin created successfully',
        });
    } catch (error) {
        console.error('Setup error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error',
        });
    }
};

// Get dashboard stats
const getDashboardStats = async (req, res) => {
    try {
        // Get today's date range (start and end of day)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Get total students count (excluding deleted)
        const totalStudents = await Student.countDocuments({ isDeleted: false });
        
        // Get today's registrations count
        const todaysRegistrations = await Student.countDocuments({
            createdAt: { $gte: today, $lt: tomorrow },
            isDeleted: false
        });
        
        const totalInvigilators = await Invigilator.countDocuments();

        // Get mark entry statistics
        const markEntryStats = await Student.aggregate([
            { $match: { isDeleted: false } },
            { $group: {
                _id: '$markEntryStatus',
                count: { $sum: 1 }
            }}
        ]);

        const markEntrySummary = {
            pending: 0,
            draft: 0,
            submitted: 0,
            final: 0
        };

        markEntryStats.forEach(stat => {
            if (stat._id === 'pending') markEntrySummary.pending = stat.count;
            else if (stat._id === 'draft') markEntrySummary.draft = stat.count;
            else if (stat._id === 'submitted') markEntrySummary.submitted = stat.count;
            else if (stat._id === 'final') markEntrySummary.final = stat.count;
        });

        const recentStudents = await Student.find({ isDeleted: false })
            .sort({ createdAt: -1 })
            .limit(10)
            .select('name registrationCode applicationNo roomNo seatNo createdAt examMarks markEntryStatus');

        const genderStats = await Student.aggregate([
            { $match: { isDeleted: false } },
            { $group: { _id: '$gender', count: { $sum: 1 } } },
        ]);

        const classStats = await Student.aggregate([
            { $match: { isDeleted: false } },
            { $group: { _id: '$studyingClass', count: { $sum: 1 } } },
            { $sort: { _id: 1 } },
        ]);

        // Medium-wise statistics
        const mediumStats = await Student.aggregate([
            { $match: { isDeleted: false } },
            { $group: { _id: '$medium', count: { $sum: 1 } } },
            { $sort: { _id: 1 } },
        ]);

        const roomStats = await Student.aggregate([
            { $match: { isDeleted: false } },
            { $group: { _id: '$roomNo', count: { $sum: 1 } } },
            { $sort: { _id: 1 } },
        ]);

        const resultStats = await Student.aggregate([
            { $match: { isDeleted: false } },
            { $group: { _id: '$resultStatus', count: { $sum: 1 } } },
        ]);

        const topPerformers = await Student.find({ examMarks: { $gt: 0 }, isDeleted: false, markEntryStatus: { $in: ['submitted', 'final'] } })
            .sort({ examMarks: -1 })
            .limit(5)
            .select('name registrationCode examMarks rank scholarship markEntryStatus');

        // Get day-wise registration trend for the last 7 days
        const last7Days = [];
        const registrationTrend = [];
        
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            date.setHours(0, 0, 0, 0);
            
            const nextDate = new Date(date);
            nextDate.setDate(nextDate.getDate() + 1);
            
            const count = await Student.countDocuments({
                createdAt: { $gte: date, $lt: nextDate },
                isDeleted: false
            });
            
            // Format date as DD MMM (e.g., "24 Feb")
            const dayName = date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
            
            last7Days.push(dayName);
            registrationTrend.push(count);
        }

        // Get registration trend for the last 30 days (for detailed chart)
        const last30Days = [];
        const registrationTrend30 = [];
        
        for (let i = 29; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            date.setHours(0, 0, 0, 0);
            
            const nextDate = new Date(date);
            nextDate.setDate(nextDate.getDate() + 1);
            
            const count = await Student.countDocuments({
                createdAt: { $gte: date, $lt: nextDate },
                isDeleted: false
            });
            
            // Format date as DD MMM (e.g., "24 Feb")
            const dayName = date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
            
            last30Days.push(dayName);
            registrationTrend30.push(count);
        }

        // Get hourly registration distribution for today
        const hourlyDistribution = [];
        for (let hour = 0; hour < 24; hour++) {
            const hourStart = new Date(today);
            hourStart.setHours(hour, 0, 0, 0);
            
            const hourEnd = new Date(today);
            hourEnd.setHours(hour + 1, 0, 0, 0);
            
            const count = await Student.countDocuments({
                createdAt: { $gte: hourStart, $lt: hourEnd },
                isDeleted: false
            });
            
            hourlyDistribution.push({
                hour: hour.toString().padStart(2, '0') + ':00',
                count
            });
        }

        res.json({
            success: true,
            stats: {
                totalStudents,
                todaysRegistrations,
                totalInvigilators,
                gender: genderStats,
                class: classStats,
                medium: mediumStats,
                rooms: roomStats,
                results: resultStats,
                markEntry: markEntrySummary,
            },
            recent: recentStudents,
            topPerformers,
            trends: {
                last7Days,
                registrationTrend,
                last30Days,
                registrationTrend30,
                hourlyDistribution
            }
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error',
        });
    }
};

// Create invigilator (admin only)
const createInvigilator = async (req, res) => {
    try {
        const { name, email, phone, password } = req.body;

        // Check if invigilator already exists
        const existingInvigilator = await Invigilator.findOne({ email });
        if (existingInvigilator) {
            return res.status(400).json({
                success: false,
                error: 'Invigilator with this email already exists',
            });
        }

        const invigilator = new Invigilator({
            name,
            email,
            phone,
            password,
            role: 'invigilator',
        });

        await invigilator.save();

        // Remove password from response
        invigilator.password = undefined;

        res.status(201).json({
            success: true,
            message: 'Invigilator created successfully',
            data: invigilator,
        });
    } catch (error) {
        console.error('Create invigilator error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Server error',
        });
    }
};

// Get all invigilators with search and pagination
const getAllInvigilators = async (req, res) => {
    try {
        const { search, page = 1, limit = 10 } = req.query;
        const query = {};

        // Add search functionality
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } }
            ];
        }

        const skip = (page - 1) * limit;

        const invigilators = await Invigilator.find(query)
            .select('-password -__v')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Invigilator.countDocuments(query);

        res.json({
            success: true,
            data: invigilators,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Get invigilators error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error',
        });
    }
};

// Get single invigilator by ID
const getInvigilatorById = async (req, res) => {
    try {
        const { id } = req.params;

        const invigilator = await Invigilator.findById(id)
            .select('-password -__v');

        if (!invigilator) {
            return res.status(404).json({
                success: false,
                error: 'Invigilator not found',
            });
        }

        res.json({
            success: true,
            data: invigilator,
        });
    } catch (error) {
        console.error('Get invigilator error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error',
        });
    }
};

// Assign rooms to invigilator
const assignRoomsToInvigilator = async (req, res) => {
    try {
        const { invigilatorId } = req.params;
        const { rooms } = req.body; // Array of room numbers

        if (!Array.isArray(rooms) || rooms.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Please provide room numbers array',
            });
        }

        const invigilator = await Invigilator.findById(invigilatorId);
        if (!invigilator) {
            return res.status(404).json({
                success: false,
                error: 'Invigilator not found',
            });
        }

        // Clear existing rooms and assign new ones
        invigilator.assignedRooms = [];
        rooms.forEach(roomNo => {
            invigilator.assignRoom(roomNo);
        });

        await invigilator.save();

        res.json({
            success: true,
            message: 'Rooms assigned successfully',
            data: {
                id: invigilator._id,
                name: invigilator.name,
                assignedRooms: invigilator.assignedRooms,
            },
        });
    } catch (error) {
        console.error('Assign rooms error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Server error',
        });
    }
};

// Update invigilator
const updateInvigilator = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, phone, password, isActive } = req.body;

        // Find invigilator first
        const invigilator = await Invigilator.findById(id);
        if (!invigilator) {
            return res.status(404).json({
                success: false,
                error: 'Invigilator not found',
            });
        }

        // Check if email already exists (for other invigilators)
        if (email && email !== invigilator.email) {
            const existingInvigilator = await Invigilator.findOne({ 
                email,
                _id: { $ne: id }
            });
            if (existingInvigilator) {
                return res.status(400).json({
                    success: false,
                    error: 'Email already in use by another invigilator',
                });
            }
        }

        // Update fields
        if (name) invigilator.name = name;
        if (email) invigilator.email = email.toLowerCase();
        if (phone) invigilator.phone = phone;
        if (password) invigilator.password = password; // Will be hashed by pre-save hook
        if (typeof isActive === 'boolean') invigilator.isActive = isActive;

        await invigilator.save();

        // Remove password from response
        invigilator.password = undefined;

        res.json({
            success: true,
            message: 'Invigilator updated successfully',
            data: invigilator,
        });
    } catch (error) {
        console.error('Update invigilator error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Server error',
        });
    }
};

// Delete invigilator
const deleteInvigilator = async (req, res) => {
    try {
        const { id } = req.params;

        const invigilator = await Invigilator.findByIdAndDelete(id);

        if (!invigilator) {
            return res.status(404).json({
                success: false,
                error: 'Invigilator not found',
            });
        }

        res.json({
            success: true,
            message: 'Invigilator deleted successfully',
        });
    } catch (error) {
        console.error('Delete invigilator error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Server error',
        });
    }
};

// Remove room from invigilator
const removeRoomFromInvigilator = async (req, res) => {
    try {
        const { invigilatorId } = req.params;
        const { roomNo } = req.body;

        if (!roomNo) {
            return res.status(400).json({
                success: false,
                error: 'Room number is required',
            });
        }

        const invigilator = await Invigilator.findById(invigilatorId);
        if (!invigilator) {
            return res.status(404).json({
                success: false,
                error: 'Invigilator not found',
            });
        }

        // Remove the room
        invigilator.removeRoom(roomNo);
        await invigilator.save();

        res.json({
            success: true,
            message: 'Room removed successfully',
            data: {
                id: invigilator._id,
                name: invigilator.name,
                assignedRooms: invigilator.assignedRooms,
            },
        });
    } catch (error) {
        console.error('Remove room error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Server error',
        });
    }
};

// Get available rooms for assignment (rooms that have students but aren't fully assigned)
const getAvailableRooms = async (req, res) => {
    try {
        // Get all rooms that have students
        const studentRooms = await Student.aggregate([
            { $match: { isDeleted: false } },
            { $group: { _id: '$roomNo', studentCount: { $sum: 1 } } },
            { $sort: { _id: 1 } }
        ]);

        // Get all assigned rooms from invigilators
        const invigilators = await Invigilator.find({}, 'assignedRooms');
        const assignedRooms = new Set();
        
        invigilators.forEach(invigilator => {
            invigilator.assignedRooms.forEach(room => {
                assignedRooms.add(room.roomNo);
            });
        });

        // Filter available rooms (rooms with students but not assigned)
        const availableRooms = studentRooms
            .filter(room => !assignedRooms.has(room._id.toString()))
            .map(room => ({
                roomNo: room._id,
                studentCount: room.studentCount,
                available: true
            }));

        // Also include assigned rooms with their invigilator info
        const assignedRoomsInfo = [];
        invigilators.forEach(invigilator => {
            invigilator.assignedRooms.forEach(room => {
                const roomInfo = studentRooms.find(r => r._id === parseInt(room.roomNo));
                assignedRoomsInfo.push({
                    roomNo: room.roomNo,
                    studentCount: roomInfo ? roomInfo.studentCount : 0,
                    assignedTo: {
                        id: invigilator._id,
                        name: invigilator.name,
                        email: invigilator.email
                    },
                    available: false
                });
            });
        });

        res.json({
            success: true,
            data: {
                available: availableRooms,
                assigned: assignedRoomsInfo,
                allRooms: studentRooms.map(room => room._id).sort((a, b) => a - b)
            }
        });
    } catch (error) {
        console.error('Get available rooms error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Server error',
        });
    }
};

// Update ranks and scholarships (admin only) with name-based tie-breaking
const updateRanksAndScholarships = async (req, res) => {
    try {
        // Check if there are any submitted marks
        const submittedCount = await Student.countDocuments({ 
            markEntryStatus: 'submitted',
            isDeleted: false 
        });

        if (submittedCount === 0) {
            return res.status(400).json({
                success: false,
                error: 'No submitted marks found. Please ensure marks are submitted by invigilators first.',
            });
        }

        // Check for draft marks
        const draftCount = await Student.countDocuments({ 
            markEntryStatus: 'draft',
            isDeleted: false 
        });

        if (draftCount > 0) {
            return res.status(400).json({
                success: false,
                error: `${draftCount} students still have draft marks. Please ensure all marks are submitted before generating ranks.`,
            });
        }

        const result = await Student.updateRanksAndScholarships();

        res.json({
            success: true,
            message: result.message,
            data: {
                updatedCount: result.updatedCount,
            },
        });
    } catch (error) {
        console.error('Update ranks error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error: ' + error.message,
        });
    }
};

// Get top performers
const getTopPerformers = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const topPerformers = await Student.getTopPerformers(limit);

        res.json({
            success: true,
            data: topPerformers,
            count: topPerformers.length,
        });
    } catch (error) {
        console.error('Get top performers error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error',
        });
    }
};

// Admin edit marks (before rank generation)
const adminEditMarks = async (req, res) => {
    try {
        const { studentId } = req.params;
        const { marks } = req.body;

        console.log('Admin edit marks request:', {
            studentId,
            marks,
            adminId: req.user
        });

        if (!marks || marks < 0 || marks > 100) {
            return res.status(400).json({
                success: false,
                error: 'Please enter valid marks between 0 and 100',
            });
        }

        // Check if admin exists
        const admin = await Admin.findById(req.user.id);
        console.log("admin : ", admin);

        if (!admin) {
            return res.status(401).json({
                success: false,
                error: 'Admin not found',
            });
        }

        // Find student
        const student = await Student.findById(studentId);
        if (!student) {
            return res.status(404).json({
                success: false,
                error: 'Student not found',
            });
        }

        // Check if marks are already finalized
        if (student.markEntryStatus === 'final') {
            return res.status(403).json({
                success: false,
                error: 'Marks are finalized and cannot be edited. Generate ranks again to update.',
            });
        }

        // Determine action for history
        let action = 'entered';
        if (student.examMarks > 0) {
            action = 'updated';
        }

        // Store previous marks for history
        const previousMarks = student.examMarks;

        // Update marks
        const updateResult = await Student.updateOne(
            { _id: studentId },
            {
                $set: {
                    examMarks: marks,
                    markEntryStatus: student.markEntryStatus === 'final' ? 'final' : 'submitted',
                    resultStatus: marks >= 40 ? 'Passed' : 'Failed',
                    lastEditedAt: new Date(),
                    currentEditor: admin._id,
                    currentEditorModel: 'Admin',
                    currentEditorName: admin.username
                }
            }
        );

        if (updateResult.modifiedCount === 0) {
            return res.status(400).json({
                success: false,
                error: 'Failed to update marks',
            });
        }

        // Add to mark history
        const updatedStudent = await Student.findById(studentId);
        await updatedStudent.addMarkHistory(
            marks,
            admin._id,
            'Admin',
            admin.username,
            action,
            previousMarks,
            'Marks edited by admin'
        );

        // Get updated student data
        const finalStudent = await Student.findById(studentId)
            .select('name registrationCode roomNo seatNo examMarks resultStatus markEntryStatus');

        res.json({
            success: true,
            message: 'Marks updated successfully',
            data: {
                student: {
                    name: finalStudent.name,
                    registrationCode: finalStudent.registrationCode,
                    roomNo: finalStudent.roomNo,
                    seatNo: finalStudent.seatNo,
                    examMarks: finalStudent.examMarks,
                    resultStatus: finalStudent.resultStatus,
                    markEntryStatus: finalStudent.markEntryStatus,
                },
                editedBy: {
                    name: admin.username,
                    role: admin.role,
                },
            },
        });
    } catch (error) {
        console.error('Admin edit marks error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error: ' + error.message,
        });
    }
};

// Get all students with mark entry status
const getStudentsByMarkStatus = async (req, res) => {
    try {
        const { status, roomNo } = req.query;

        const query = { isDeleted: false };
        
        if (status && ['pending', 'draft', 'submitted', 'final'].includes(status)) {
            query.markEntryStatus = status;
        }
        
        if (roomNo) {
            query.roomNo = parseInt(roomNo);
        }

        const students = await Student.find(query)
            .sort({ roomNo: 1, seatNo: 1 })
            .select('name registrationCode roomNo seatNo examMarks markEntryStatus submittedAt submittedBy currentEditor lastEditedAt');

        // Get room-wise summary
        const roomSummary = await Student.aggregate([
            { $match: { isDeleted: false } },
            { $group: {
                _id: { roomNo: '$roomNo', status: '$markEntryStatus' },
                count: { $sum: 1 }
            }},
            { $group: {
                _id: '$_id.roomNo',
                statuses: {
                    $push: {
                        status: '$_id.status',
                        count: '$count'
                    }
                },
                total: { $sum: '$count' }
            }},
            { $sort: { _id: 1 } }
        ]);

        res.json({
            success: true,
            data: {
                summary: roomSummary,
                students
            }
        });
    } catch (error) {
        console.error('Get students by mark status error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error: ' + error.message,
        });
    }
};

// Get mark history for a student
const getStudentMarkHistory = async (req, res) => {
    try {
        const { studentId } = req.params;

        const student = await Student.findById(studentId)
            .select('name registrationCode examMarks markHistory markEntryStatus')
            .populate('markHistory.editedBy', 'name email username');

        if (!student) {
            return res.status(404).json({
                success: false,
                error: 'Student not found',
            });
        }

        // Format history for response
        const formattedHistory = student.markHistory.map(entry => ({
            marks: entry.marks,
            editedBy: entry.editedByName,
            editedAt: entry.editedAt,
            status: entry.status,
            previousMarks: entry.previousMarks,
            action: entry.action,
            notes: entry.notes,
            editedByModel: entry.editedByModel
        }));

        res.json({
            success: true,
            data: {
                student: {
                    name: student.name,
                    registrationCode: student.registrationCode,
                    currentMarks: student.examMarks,
                    currentStatus: student.markEntryStatus
                },
                history: formattedHistory
            }
        });
    } catch (error) {
        console.error('Get mark history error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error: ' + error.message,
        });
    }
};

// Finalize marks for rank generation
const finalizeMarks = async (req, res) => {
    try {
        const { studentId } = req.params;

        const admin = await Admin.findById(req.user.id);
        if (!admin) {
            return res.status(401).json({
                success: false,
                error: 'Admin not found',
            });
        }

        const student = await Student.findById(studentId);
        if (!student) {
            return res.status(404).json({
                success: false,
                error: 'Student not found',
            });
        }

        if (student.markEntryStatus !== 'submitted') {
            return res.status(400).json({
                success: false,
                error: 'Only submitted marks can be finalized',
            });
        }

        await student.finalizeMarks(admin._id, admin.username);

        res.json({
            success: true,
            message: 'Marks finalized successfully',
            data: student
        });
    } catch (error) {
        console.error('Finalize marks error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error: ' + error.message,
        });
    }
};

// Bulk update marks for multiple students
const bulkUpdateMarks = async (req, res) => {
    try {
        const { updates } = req.body; // Array of { studentId, marks }

        if (!Array.isArray(updates) || updates.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Please provide an array of updates'
            });
        }

        const admin = await Admin.findById(req.user.id);
        if (!admin) {
            return res.status(401).json({
                success: false,
                error: 'Admin not found'
            });
        }

        const results = [];
        const errors = [];

        for (const update of updates) {
            try {
                const { studentId, marks } = update;

                if (!studentId || marks === undefined || marks < 0 || marks > 100) {
                    errors.push({
                        studentId,
                        error: 'Invalid marks (must be between 0-100)'
                    });
                    continue;
                }

                const student = await Student.findById(studentId);
                if (!student) {
                    errors.push({
                        studentId,
                        error: 'Student not found'
                    });
                    continue;
                }

                // Check if marks are already finalized
                if (student.markEntryStatus === 'final') {
                    errors.push({
                        studentId,
                        error: 'Marks are finalized and cannot be edited'
                    });
                    continue;
                }

                const previousMarks = student.examMarks;

                // Update marks
                await Student.updateOne(
                    { _id: studentId },
                    {
                        $set: {
                            examMarks: marks,
                            markEntryStatus: student.markEntryStatus === 'final' ? 'final' : 'submitted',
                            resultStatus: marks >= 40 ? 'Passed' : 'Failed',
                            lastEditedAt: new Date(),
                            currentEditor: admin._id,
                            currentEditorModel: 'Admin',
                            currentEditorName: admin.username
                        }
                    }
                );

                // Add to mark history
                const updatedStudent = await Student.findById(studentId);
                await updatedStudent.addMarkHistory(
                    marks,
                    admin._id,
                    'Admin',
                    admin.username,
                    previousMarks > 0 ? 'updated' : 'entered',
                    previousMarks,
                    'Bulk update by admin'
                );

                results.push({
                    studentId,
                    registrationCode: student.registrationCode,
                    name: student.name,
                    success: true
                });

            } catch (error) {
                console.error('Error in bulk update item:', error);
                errors.push({
                    studentId: update.studentId,
                    error: error.message
                });
            }
        }

        res.json({
            success: true,
            message: `Bulk update completed. Success: ${results.length}, Failed: ${errors.length}`,
            data: {
                successful: results,
                errors: errors
            }
        });

    } catch (error) {
        console.error('Bulk update marks error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error: ' + error.message
        });
    }
};

module.exports = {
    login,
    setupAdmin,
    getDashboardStats,
    createInvigilator,
    getAllInvigilators,
    getInvigilatorById,
    assignRoomsToInvigilator,
    removeRoomFromInvigilator,
    updateInvigilator,
    deleteInvigilator,
    getAvailableRooms,
    updateRanksAndScholarships,
    getTopPerformers,
    adminEditMarks,
    getStudentsByMarkStatus,
    getStudentMarkHistory,
    finalizeMarks,
    bulkUpdateMarks
};