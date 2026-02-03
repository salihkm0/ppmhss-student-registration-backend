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
        const totalStudents = await Student.countDocuments();
        const totalInvigilators = await Invigilator.countDocuments();

        const recentStudents = await Student.find()
            .sort({ createdAt: -1 })
            .limit(10)
            .select('name registrationCode applicationNo roomNo seatNo createdAt examMarks');

        const genderStats = await Student.aggregate([
            { $group: { _id: '$gender', count: { $sum: 1 } } },
        ]);

        const classStats = await Student.aggregate([
            { $group: { _id: '$studyingClass', count: { $sum: 1 } } },
            { $sort: { _id: 1 } },
        ]);

        const roomStats = await Student.aggregate([
            { $group: { _id: '$roomNo', count: { $sum: 1 } } },
            { $sort: { _id: 1 } },
        ]);

        const resultStats = await Student.aggregate([
            { $group: { _id: '$resultStatus', count: { $sum: 1 } } },
        ]);

        const topPerformers = await Student.find({ examMarks: { $gt: 0 } })
            .sort({ examMarks: -1 })
            .limit(5)
            .select('name registrationCode examMarks rank scholarship');

        res.json({
            success: true,
            stats: {
                totalStudents,
                totalInvigilators,
                gender: genderStats,
                class: classStats,
                rooms: roomStats,
                results: resultStats,
            },
            recent: recentStudents,
            topPerformers,
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

        res.status(201).json({
            success: true,
            message: 'Invigilator created successfully',
            data: {
                id: invigilator._id,
                name: invigilator.name,
                email: invigilator.email,
                phone: invigilator.phone,
                assignedRooms: invigilator.assignedRooms,
            },
        });
    } catch (error) {
        console.error('Create invigilator error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error',
        });
    }
};

// Get all invigilators
const getAllInvigilators = async (req, res) => {
    try {
        const invigilators = await Invigilator.find()
            .select('-password -__v')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            data: invigilators,
            count: invigilators.length,
        });
    } catch (error) {
        console.error('Get invigilators error:', error);
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

        // Assign rooms
        rooms.forEach(roomNo => {
            invigilator.assignRoom(roomNo);
        });

        await invigilator.save();

        res.json({
            success: true,
            message: 'Rooms assigned successfully',
            data: {
                invigilator: invigilator.name,
                assignedRooms: invigilator.assignedRooms,
            },
        });
    } catch (error) {
        console.error('Assign rooms error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error',
        });
    }
};

// Update invigilator
const updateInvigilator = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        // Don't allow role change
        if (updateData.role) {
            delete updateData.role;
        }

        const invigilator = await Invigilator.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        ).select('-password -__v');

        if (!invigilator) {
            return res.status(404).json({
                success: false,
                error: 'Invigilator not found',
            });
        }

        res.json({
            success: true,
            message: 'Invigilator updated successfully',
            data: invigilator,
        });
    } catch (error) {
        console.error('Update invigilator error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error',
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
            error: 'Server error',
        });
    }
};

// Update ranks and scholarships (admin only)
const updateRanksAndScholarships = async (req, res) => {
    try {
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
            error: 'Server error',
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

module.exports = {
    login,
    setupAdmin,
    getDashboardStats,
    createInvigilator,
    getAllInvigilators,
    assignRoomsToInvigilator,
    updateInvigilator,
    deleteInvigilator,
    updateRanksAndScholarships,
    getTopPerformers
};