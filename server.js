const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Import routes
const studentRoutes = require('./routes/studentRoutes');
const adminRoutes = require('./routes/adminRoutes');
const invigilatorRoutes = require('./routes/invigilatorRoutes');
const examInvigilatorRoutes = require('./routes/examInvigilator');
const roomRoutes = require('./routes/roomRoutes');
const resultRoutes = require('./routes/resultRoutes');

dotenv.config();

const app = express();

// Allowed origins
const allowedOrigins = [
    'http://localhost:5173', 
    'https://ppmhss-student-registration.vercel.app',
    'https://nmea.oxiumev.com', 
    'http://nmea.ppmhsskottukkara.com',
    'https://nmea.ppmhsskottukkara.com'
];

// MANUAL CORS MIDDLEWARE - Place this BEFORE any other middleware
app.use((req, res, next) => {
    const origin = req.headers.origin;
    
    // Check if origin is allowed
    if (allowedOrigins.includes(origin) || !origin) {
        res.setHeader('Access-Control-Allow-Origin', origin || '*');
    }
    
    // Set other CORS headers
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-HTTP-Method-Override');
    res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
    
    // Handle preflight requests immediately
    if (req.method === 'OPTIONS') {
        console.log('Handling OPTIONS preflight request for:', req.url);
        return res.status(200).end();
    }
    
    next();
});

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Set view engine for EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Database connection
const connectDB = require('./config/database');
connectDB();

// Request logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url} - Origin: ${req.headers.origin || 'No Origin'}`);
    next();
});

// Test routes
app.get('/api/test', (req, res) => {
    res.json({ 
        success: true,
        message: 'API is working',
        timestamp: new Date().toISOString(),
        origin: req.headers.origin || 'No origin'
    });
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        success: true,
        status: 'OK',
        database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
        timestamp: new Date().toISOString()
    });
});

// API Routes
app.use('/api/students', studentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/invigilator', invigilatorRoutes);
app.use('/api/exam-invigilator', examInvigilatorRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/results', resultRoutes);

// Test EJS templates
app.get('/test-attendance-template', async (req, res) => {
  const templateData = {
    roomNo: 1,
    studentPages: [[
      {
        name: 'Test Student 1',
        registrationCode: 'PPM1001',
        studyingClass: '7',
        seatNo: '1',
        fatherName: 'Test Father 1',
        aadhaarNo: '123456789012',
        medium: 'English'
      },
      {
        name: 'Test Student 2',
        registrationCode: 'PPM1002',
        studyingClass: '8',
        seatNo: '2',
        fatherName: 'Test Father 2',
        aadhaarNo: '123456789013',
        medium: 'Malayalam'
      }
    ]],
    totalStudents: 2,
    generationDate: new Date().toLocaleDateString('en-IN'),
    examDate: '01-03-2026',
    examTime: '10:00 AM - 11:30 PM',
    isPreview: true,
    autoPrint: false
  };
  
  res.render('attendance-sheet', templateData);
});

// Test hall ticket
app.get('/test-hallticket', (req, res) => {
    res.render('hallticket', {
        student: {
            name: 'Muhammed Salih KM',
            fatherName: 'Abdulla Km',
            gender: 'Male',
            studyingClass: '7',
            medium: 'English',
            aadhaarNo: '123456789012',
            schoolName: 'PPM HSS Kottukkara',
            registrationCode: 'PPM1001',
            applicationNo: 'APP26020010',
            roomNo: 1,
            seatNo: 1
        },
        issueDate: '01-02-2026',
        isPreview: true,
        backUrl: '/',
        autoPrint: false
    });
});

// Test exam slips
app.get('/test-exam-slips', async (req, res) => {
    const testStudents = [];
    for (let i = 1; i <= 23; i++) {
        testStudents.push({
            name: `Muhammed Salih KM ${i}`,
            fatherName: `Abdulla Km ${i}`,
            gender: 'Male',
            studyingClass: '7',
            medium: i % 2 === 0 ? 'English' : 'Malayalam',
            aadhaarNo: '123456789012',
            schoolName: 'PPM HSS Kottukkara',
            registrationCode: `PPM100${i}`,
            applicationNo: `APP260200${i}`,
            roomNo: 1,
            seatNo: i
        });
    }
    
    const templateData = {
        roomNo: 1,
        studentPages: [testStudents],
        totalStudents: 23,
        generationDate: new Date().toLocaleDateString('en-IN'),
        examDate: '01-03-2026',
        examTime: '10:00 AM - 11:30 PM',
        examCenter: 'PPM HSS Kottukkara',
        isPreview: true,
        autoPrint: false
    };
    
    res.render('exam-slips', templateData);
});

// Test simple exam slips
app.get('/test-simple-slips', async (req, res) => {
    const testStudents = [];
    for (let i = 1; i <= 110; i++) {
        testStudents.push({
            name: `Muhammed Salih KM ${i}`,
            registrationCode: `PPM100${i}`,
            roomNo: 1,
            seatNo: i,
            studyingClass: '7',
            medium: i % 2 === 0 ? 'English' : 'Malayalam'
        });
    }
    
    // Split students into pages of 21
    const studentsPerPage = 21;
    const studentPages = [];
    for (let i = 0; i < testStudents.length; i += studentsPerPage) {
        studentPages.push(testStudents.slice(i, i + studentsPerPage));
    }
    
    const templateData = {
        roomNo: 1,
        studentPages: studentPages,
        totalStudents: testStudents.length,
        generationDate: new Date().toLocaleDateString('en-IN'),
        isPreview: true,
        autoPrint: false
    };
    
    res.render('simple-exam-slips', templateData);
});

// Route to test attendance sheet with real data
app.get('/test-room-attendance/:roomNo', async (req, res) => {
    try {
        const roomNo = parseInt(req.params.roomNo);
        
        const Student = require('./models/Student');
        const students = await Student.find({
            roomNo,
            isDeleted: false
        }).select('name registrationCode seatNo aadhaarNo medium')
          .sort({ seatNo: 1 });
        
        const studentsPerPage = 20;
        const studentPages = [];
        for (let i = 0; i < students.length; i += studentsPerPage) {
            studentPages.push(students.slice(i, i + studentsPerPage));
        }
        
        const templateData = {
            roomNo,
            studentPages: studentPages,
            totalStudents: students.length,
            generationDate: new Date().toLocaleDateString('en-IN'),
            examDate: '01-03-2026',
            examTime: '10:00 AM - 11:30 PM',
            isPreview: true,
            autoPrint: false
        };
        
        res.render('attendance-sheet', templateData);
    } catch (error) {
        res.status(500).send('Error generating attendance sheet: ' + error.message);
    }
});

// Route to test simple exam slips with real data
app.get('/test-room-slips/:roomNo', async (req, res) => {
    try {
        const roomNo = parseInt(req.params.roomNo);
        
        const Student = require('./models/Student');
        const students = await Student.find({
            roomNo,
            isDeleted: false
        }).select('name registrationCode seatNo studyingClass medium')
          .sort({ seatNo: 1 });
        
        const studentsPerPage = 21;
        const studentPages = [];
        for (let i = 0; i < students.length; i += studentsPerPage) {
            studentPages.push(students.slice(i, i + studentsPerPage));
        }
        
        const templateData = {
            roomNo,
            studentPages: studentPages,
            totalStudents: students.length,
            generationDate: new Date().toLocaleDateString('en-IN'),
            isPreview: true,
            autoPrint: false
        };
        
        res.render('simple-exam-slips', templateData);
    } catch (error) {
        res.status(500).send('Error generating exam slips: ' + error.message);
    }
});

app.get('/update', (req, res) => {
    res.send('Welcome to the Student Registration API, added invigilator login feature, CORS fixes, and question paper type A/B alternation');
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('❌ Error:', err.stack);
    
    // Handle CORS errors specifically
    if (err.message.includes('CORS')) {
        return res.status(403).json({ 
            success: false,
            error: 'CORS error: ' + err.message,
            origin: req.headers.origin
        });
    }
    
    res.status(500).json({ 
        success: false,
        error: 'Something went wrong!',
        message: err.message
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ 
        success: false,
        error: 'Route not found',
        path: req.url
    });
});

const PORT = process.env.PORT || 5010;
app.listen(PORT, () => {
    console.log('=================================');
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📝 API available at http://localhost:${PORT}/api`);
    console.log('=================================');
    console.log('📄 Test templates available at:');
    console.log(`   - Attendance: http://localhost:${PORT}/test-attendance-template`);
    console.log(`   - Hall ticket: http://localhost:${PORT}/test-hallticket`);
    console.log(`   - Exam slips: http://localhost:${PORT}/test-exam-slips`);
    console.log(`   - Simple slips: http://localhost:${PORT}/test-simple-slips`);
    console.log(`   - Room Attendance (real data): http://localhost:${PORT}/test-room-attendance/1`);
    console.log(`   - Room Slips (real data): http://localhost:${PORT}/test-room-slips/1`);
    console.log('=================================');
});