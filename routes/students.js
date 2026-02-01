const express = require('express');
const router = express.Router();
const Student = require('../models/Student');
const { body, validationResult } = require('express-validator');

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

// Helper function to log registration notification
const logRegistrationNotification = async (student) => {
    console.log('='.repeat(60));
    console.log('📋 REGISTRATION NOTIFICATION');
    console.log('='.repeat(60));
    console.log(`Student: ${student.name}`);
    console.log(`Phone: ${student.phoneNo}`);
    console.log(`Application No: ${student.applicationNo}`);
    console.log(`Registration Code: ${student.registrationCode}`);
    console.log(`Room No: ${student.roomNo}`);
    console.log(`Seat No: ${student.seatNo}`);
    console.log(`Aadhaar: ${student.aadhaarNo}`);
    console.log('='.repeat(60));
    
    // Log to file
    const fs = require('fs');
    const logEntry = {
        timestamp: new Date().toISOString(),
        type: 'Registration',
        student: {
            name: student.name,
            phone: student.phoneNo,
            applicationNo: student.applicationNo,
            registrationCode: student.registrationCode,
            roomNo: student.roomNo,
            seatNo: student.seatNo,
            aadhaarNo: student.aadhaarNo
        }
    };
    
    fs.appendFileSync('registration_log.json', JSON.stringify(logEntry) + '\n');
};

// Get next application number
router.get('/next-application-no', async (req, res) => {
    try {
        const nextAppNo = await Student.getNextApplicationNo();
        res.json({
            success: true,
            data: {
                nextApplicationNo: nextAppNo
            }
        });
    } catch (error) {
        console.error('Error getting next application number:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get next application number'
        });
    }
});

// Get next registration code (for preview)
router.get('/next-registration-code', async (req, res) => {
    try {
        const nextRegCode = await Student.getNextRegistrationCode();
        res.json({
            success: true,
            data: {
                nextRegistrationCode: nextRegCode
            }
        });
    } catch (error) {
        console.error('Error getting next registration code:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get next registration code'
        });
    }
});

// Get next room allocation (for preview)
router.get('/next-room-allocation', async (req, res) => {
    try {
        const allocation = await Student.getNextRoomAllocation();
        res.json({
            success: true,
            data: allocation
        });
    } catch (error) {
        console.error('Error getting next room allocation:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get next room allocation'
        });
    }
});

// Get all students for a phone number
router.get('/phone/:phoneNo', async (req, res) => {
    try {
        const { phoneNo } = req.params;
        
        // Validate phone number format
        if (!/^\d{10}$/.test(phoneNo)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid phone number format. Must be 10 digits.'
            });
        }
        
        const students = await Student.find({ phoneNo }).select('-__v').sort({ createdAt: -1 });
        
        if (!students || students.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'No students found for this phone number'
            });
        }
        
        res.json({
            success: true,
            count: students.length,
            data: students
        });
    } catch (error) {
        console.error('Error fetching students by phone:', error);
        res.status(500).json({
            success: false,
            error: 'Server error'
        });
    }
});

// Get room distribution
router.get('/rooms/distribution', async (req, res) => {
    try {
        const distribution = await Student.getRoomDistribution();
        const totalStudents = await Student.countDocuments();
        
        res.json({
            success: true,
            data: {
                distribution,
                totalStudents,
                roomsOccupied: distribution.length,
                studentsPerRoom: 20
            }
        });
    } catch (error) {
        console.error('Error getting room distribution:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get room distribution'
        });
    }
});

// Get students by room number
router.get('/rooms/:roomNo', async (req, res) => {
    try {
        const roomNo = parseInt(req.params.roomNo);
        
        if (isNaN(roomNo) || roomNo < 1) {
            return res.status(400).json({
                success: false,
                error: 'Invalid room number'
            });
        }
        
        const students = await Student.find({ roomNo })
            .select('name registrationCode applicationNo seatNo studyingClass phoneNo')
            .sort({ seatNo: 1 });
        
        if (!students || students.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'No students found in this room'
            });
        }
        
        res.json({
            success: true,
            data: {
                roomNo,
                studentCount: students.length,
                capacity: 20,
                availableSeats: 20 - students.length,
                students
            }
        });
    } catch (error) {
        console.error('Error getting students by room:', error);
        res.status(500).json({
            success: false,
            error: 'Server error'
        });
    }
});

// Register new student
router.post('/register', validateStudent, async (req, res) => {
    try {
        console.log('Registration request received');
        
        // Check for validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            console.log('Validation errors:', errors.array());
            return res.status(400).json({ 
                success: false,
                errors: errors.array() 
            });
        }

        // Check if Aadhaar already exists
        const existingAadhaar = await Student.findOne({ aadhaarNo: req.body.aadhaarNo });
        if (existingAadhaar) {
            return res.status(400).json({ 
                success: false,
                error: 'Aadhaar number already registered' 
            });
        }

        // Get room allocation for preview
        const allocation = await Student.getNextRoomAllocation();
        
        // Create new student
        const studentData = { ...req.body };
        const student = new Student(studentData);
        await student.save();

        console.log('✅ Student saved successfully:', {
            applicationNo: student.applicationNo,
            registrationCode: student.registrationCode,
            name: student.name,
            phone: student.phoneNo,
            roomNo: student.roomNo,
            seatNo: student.seatNo,
            aadhaarNo: student.aadhaarNo
        });

        // Count registrations from this phone number
        const registrationsFromPhone = await Student.countDocuments({ 
            phoneNo: student.phoneNo 
        });

        // Log registration notification
        logRegistrationNotification(student).catch(err => {
            console.log('Background logging error:', err.message);
        });

        res.status(201).json({
            success: true,
            message: 'Registration successful',
            data: {
                applicationNo: student.applicationNo,
                registrationCode: student.registrationCode,
                name: student.name,
                fatherName: student.fatherName,
                phoneNo: student.phoneNo,
                roomNo: student.roomNo,
                seatNo: student.seatNo,
                studyingClass: student.studyingClass,
                medium: student.medium,
                schoolName: student.schoolName,
                aadhaarNo: student.aadhaarNo,
                registrationsFromPhone: registrationsFromPhone,
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        
        // Handle duplicate key errors
        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern)[0];
            if (field === 'applicationNo') {
                return res.status(400).json({
                    success: false,
                    error: 'Application number already exists'
                });
            } else if (field === 'registrationCode') {
                return res.status(400).json({
                    success: false,
                    error: 'Registration code already exists'
                });
            } else if (field === 'aadhaarNo') {
                return res.status(400).json({
                    success: false,
                    error: 'Aadhaar number already registered'
                });
            }
            return res.status(400).json({
                success: false,
                error: `${field} already exists`
            });
        }
        
        // Handle validation errors
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                error: errors.join(', ')
            });
        }
        
        res.status(500).json({ 
            success: false,
            error: 'Server error during registration: ' + error.message
        });
    }
});

// Get student by registration code or application number
router.get('/:code', async (req, res) => {
    try {
        const student = await Student.findOne({ 
            $or: [
                { registrationCode: req.params.code },
                { applicationNo: req.params.code }
            ]
        }).select('-__v');
        
        if (!student) {
            return res.status(404).json({ 
                success: false,
                error: 'Student not found' 
            });
        }
        
        res.json({
            success: true,
            data: student
        });
    } catch (error) {
        console.error('Student lookup error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Server error' 
        });
    }
});

// Verify registration code
router.post('/verify', async (req, res) => {
    try {
        const { registrationCode } = req.body;
        
        if (!registrationCode) {
            return res.status(400).json({ 
                success: false, 
                error: 'Registration code is required' 
            });
        }
        
        const student = await Student.findOne({ registrationCode }).select('-__v');
        
        if (!student) {
            return res.status(404).json({ 
                success: false, 
                error: 'Invalid registration code' 
            });
        }
        
        res.json({
            success: true,
            message: 'Code verified successfully',
            data: student
        });
    } catch (error) {
        console.error('Verification error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Server error' 
        });
    }
});

// ==================== HALL TICKET ROUTES ====================

// Update the hall ticket routes in studentRouter.js:

// Preview hall ticket
router.get('/:code/hallticket/preview', async (req, res) => {
    try {
        const student = await Student.findOne({ 
            $or: [
                { registrationCode: req.params.code },
                { applicationNo: req.params.code }
            ]
        }).select('-__v').lean(); // Use lean() for plain JavaScript object
        
        if (!student) {
            return res.status(404).json({ 
                success: false,
                error: 'Student not found' 
            });
        }
        
        // Format dates
        const issueDate = new Date().toLocaleDateString('en-GB');
        
        // Ensure address exists
        if (!student.address) {
            student.address = {
                houseName: 'Not provided',
                place: 'Not provided',
                postOffice: 'Not provided',
                pinCode: 'XXXXXX',
                localBodyType: '',
                localBodyName: 'Not provided'
            };
        }
        
        // Ensure roomNo and seatNo exist
        student.roomNo = student.roomNo || 'To be assigned';
        student.seatNo = student.seatNo || 'To be assigned';
        
        // Render the hall ticket
        res.render('hallticket', {
            student: student,
            issueDate: issueDate,
            isPreview: true,
            backUrl: '/',
            autoPrint: req.query.print === 'true'
        });
        
    } catch (error) {
        console.error('Hall ticket preview error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Server error' 
        });
    }
});

// Download hall ticket (auto-print)
router.get('/:code/hallticket/download', async (req, res) => {
    try {
        const student = await Student.findOne({ 
            $or: [
                { registrationCode: req.params.code },
                { applicationNo: req.params.code }
            ]
        }).select('-__v').lean(); // Use lean() for plain JavaScript object
        
        if (!student) {
            return res.status(404).json({ 
                success: false,
                error: 'Student not found' 
            });
        }
        
        // Format dates
        const issueDate = new Date().toLocaleDateString('en-GB');
        
        // Ensure address exists
        if (!student.address) {
            student.address = {
                houseName: 'Not provided',
                place: 'Not provided',
                postOffice: 'Not provided',
                pinCode: 'XXXXXX',
                localBodyType: '',
                localBodyName: 'Not provided'
            };
        }
        
        // Ensure roomNo and seatNo exist
        student.roomNo = student.roomNo || 'To be assigned';
        student.seatNo = student.seatNo || 'To be assigned';
        
        // Render the hall ticket with auto-print
        res.render('hallticket', {
            student: student,
            issueDate: issueDate,
            isPreview: false,
            autoPrint: true
        });
        
    } catch (error) {
        console.error('Hall ticket download error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Server error' 
        });
    }
});
// Get hall ticket by phone number (for students who don't remember code)
router.post('/hallticket/by-phone', async (req, res) => {
    try {
        const { phoneNo } = req.body;
        
        if (!phoneNo) {
            return res.status(400).json({ 
                success: false,
                error: 'Phone number is required' 
            });
        }
        
        const students = await Student.find({ phoneNo }).select('-__v').sort({ createdAt: -1 });
        
        if (!students || students.length === 0) {
            return res.status(404).json({ 
                success: false,
                error: 'No registrations found for this phone number' 
            });
        }
        
        // Return list of registrations with hall ticket links
        const registrations = students.map(student => ({
            name: student.name,
            applicationNo: student.applicationNo,
            registrationCode: student.registrationCode,
            class: student.studyingClass,
            roomNo: student.roomNo,
            seatNo: student.seatNo,
            hallticketPreview: `/api/students/${student.registrationCode}/hallticket/preview`,
            hallticketDownload: `/api/students/${student.registrationCode}/hallticket/download`
        }));
        
        res.json({
            success: true,
            message: 'Registrations found',
            count: students.length,
            data: registrations
        });
        
    } catch (error) {
        console.error('Hall ticket by phone error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Server error' 
        });
    }
});

// ==================== END HALL TICKET ROUTES ====================

// Get all students (for testing/debugging)
router.get('/', async (req, res) => {
    try {
        const { roomNo, page = 1, limit = 50 } = req.query;
        const query = {};
        
        if (roomNo && !isNaN(roomNo)) {
            query.roomNo = parseInt(roomNo);
        }
        
        const skip = (parseInt(page) - 1) * parseInt(limit);
        
        const students = await Student.find(query)
            .select('-__v')
            .sort({ registrationDate: -1 })
            .skip(skip)
            .limit(parseInt(limit));
            
        const total = await Student.countDocuments(query);
        
        res.json({
            success: true,
            count: students.length,
            total,
            page: parseInt(page),
            pages: Math.ceil(total / parseInt(limit)),
            data: students
        });
    } catch (error) {
        console.error('Get students error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Server error' 
        });
    }
});

// Health check endpoint
router.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'Student registration API is running',
        timestamp: new Date().toISOString()
    });
});

module.exports = router;