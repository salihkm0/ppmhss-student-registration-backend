const express = require('express');
const router = express.Router();
const Student = require('../models/Student');
const { body, validationResult } = require('express-validator');
const dotenv = require('dotenv');

dotenv.config();

// Initialize Twilio client for WhatsApp only
let twilioClient = null;
let whatsappEnabled = false;

try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    
    console.log("Twilio Account SID:", accountSid ? "Provided" : "Not provided");
    console.log("Twilio Auth Token:", authToken ? "Provided" : "Not provided");
    
    if (accountSid && authToken && 
        accountSid !== 'your_account_sid' && 
        authToken !== 'your_auth_token_here') {
        
        const twilio = require('twilio');
        twilioClient = twilio(accountSid, authToken);
        
        // Check if WhatsApp number is configured
        if (process.env.TWILIO_WHATSAPP_NUMBER) {
            whatsappEnabled = true;
            console.log('✅ WhatsApp notifications enabled');
            console.log('📱 WhatsApp Number:', process.env.TWILIO_WHATSAPP_NUMBER);
        } else {
            console.log('⚠️ WhatsApp number not configured in .env');
        }
    } else {
        console.log('⚠️ Twilio credentials not properly configured.');
        console.log('ℹ️ WhatsApp notifications will be simulated.');
    }
} catch (error) {
    console.log('❌ Twilio initialization error:', error.message);
    twilioClient = null;
    whatsappEnabled = false;
}

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

// Helper function to send WhatsApp notifications
const sendWhatsAppNotification = async (student) => {
    if (!whatsappEnabled || !twilioClient) {
        // Simulate WhatsApp notification for development
        console.log('='.repeat(60));
        console.log('💬 WHATSAPP NOTIFICATION (SIMULATED)');
        console.log('='.repeat(60));
        console.log(`To: +91${student.phoneNo}`);
        console.log(`Student: ${student.name}`);
        console.log(`Application No: ${student.applicationNo}`);
        console.log(`Registration Code: ${student.registrationCode}`);
        console.log('='.repeat(60));
        
        // Log to file
        const fs = require('fs');
        const logEntry = {
            timestamp: new Date().toISOString(),
            type: 'WhatsApp',
            status: 'simulated',
            student: {
                name: student.name,
                phone: student.phoneNo,
                applicationNo: student.applicationNo,
                registrationCode: student.registrationCode
            }
        };
        
        fs.appendFileSync('whatsapp_notifications.log', JSON.stringify(logEntry) + '\n');
        return;
    }

    // Real WhatsApp message using Twilio
    const messageBody = `Dear ${student.name}, your registration is successful! 

📝 Application No: ${student.applicationNo}
🔑 Registration Code: ${student.registrationCode}

Keep this information safe for future reference.`;

    try {
        console.log(`📤 Sending WhatsApp to: +91${student.phoneNo}`);
        
        const message = await twilioClient.messages.create({
            body: messageBody,
            from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
            to: `whatsapp:+91${student.phoneNo}`
        });
        
        console.log(`✅ WhatsApp message sent! Message SID: ${message.sid}`);
        
        // Log success
        const fs = require('fs');
        const logEntry = {
            timestamp: new Date().toISOString(),
            type: 'WhatsApp',
            status: 'sent',
            messageSid: message.sid,
            student: {
                name: student.name,
                phone: student.phoneNo,
                applicationNo: student.applicationNo,
                registrationCode: student.registrationCode
            }
        };
        
        fs.appendFileSync('whatsapp_notifications.log', JSON.stringify(logEntry) + '\n');
        
    } catch (error) {
        console.error('❌ WhatsApp sending failed:', error.message);
        
        // Log error
        const fs = require('fs');
        const logEntry = {
            timestamp: new Date().toISOString(),
            type: 'WhatsApp',
            status: 'failed',
            error: error.message,
            student: {
                name: student.name,
                phone: student.phoneNo,
                applicationNo: student.applicationNo,
                registrationCode: student.registrationCode
            }
        };
        
        fs.appendFileSync('whatsapp_notifications.log', JSON.stringify(logEntry) + '\n');
        
        // Don't throw error - registration should succeed even if WhatsApp fails
        console.log('⚠️ Registration saved but WhatsApp notification failed');
    }
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

        // Check if phone already exists
        const existingPhone = await Student.findOne({ phoneNo: req.body.phoneNo });
        if (existingPhone) {
            return res.status(400).json({ 
                success: false,
                error: 'Phone number already registered' 
            });
        }

        // Create new student
        const studentData = { ...req.body };
        const student = new Student(studentData);
        await student.save();

        console.log('✅ Student saved successfully:', {
            applicationNo: student.applicationNo,
            registrationCode: student.registrationCode,
            name: student.name,
            phone: student.phoneNo
        });

        // Send WhatsApp notification in background
        sendWhatsAppNotification(student).catch(err => {
            console.log('Background WhatsApp error:', err.message);
        });

        res.status(201).json({
            success: true,
            message: 'Registration successful',
            data: {
                applicationNo: student.applicationNo,
                registrationCode: student.registrationCode,
                name: student.name
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        
        // Handle duplicate key errors
        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern)[0];
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

// Get all students (for testing/debugging)
router.get('/', async (req, res) => {
    try {
        const students = await Student.find().select('-__v').limit(10);
        res.json({
            success: true,
            count: students.length,
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
        timestamp: new Date().toISOString(),
        whatsapp: whatsappEnabled ? 'Enabled' : 'Disabled/Simulated'
    });
});

module.exports = router;