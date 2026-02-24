const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Import routes
const studentRoutes = require('./routes/studentRoutes');
const adminRoutes = require('./routes/adminRoutes');
const invigilatorRoutes = require('./routes/invigilatorRoutes'); // This is different from exam invigilator
const examInvigilatorRoutes = require('./routes/examInvigilatorRoutes'); // Make sure this path is correct
const roomRoutes = require('./routes/roomRoutes');
const resultRoutes = require('./routes/resultRoutes');

dotenv.config();

const app = express();

// Middleware
app.use(cors({
    origin: [
        'http://localhost:5173', 
        'https://ppmhss-student-registration.vercel.app',
        'https://nmea.oxiumev.com', 
        'http://nmea.ppmhsskottukkara.com',
        'https://nmea.ppmhsskottukkara.com'
    ],
    credentials: true
}));

// Add this to ensure OPTIONS requests are handled
app.options('*', cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Set view engine for EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Database connection
const connectDB = require('./config/database');
connectDB();

// Test routes
app.get('/api/test', (req, res) => {
    res.json({ 
        success: true,
        message: 'API is working',
        timestamp: new Date().toISOString()
    });
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        success: true,
        status: 'OK',
        database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
    });
});

// API Routes - Make sure these paths are correct
app.use('/api/students', studentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/invigilator', invigilatorRoutes); // Regular invigilator routes
app.use('/api/exam-invigilator', examInvigilatorRoutes); // Exam invigilator routes
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
        fatherName: 'Test Father 1'
      },
      {
        name: 'Test Student 2',
        registrationCode: 'PPM1002',
        studyingClass: '8',
        seatNo: '2',
        fatherName: 'Test Father 2'
      }
    ]],
    totalStudents: 2,
    generationDate: new Date().toLocaleDateString('en-GB')
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
            medium: 'English',
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
            studyingClass: '7'
        });
    }
    
    const templateData = {
        roomNo: 1,
        studentPages: [testStudents],
        totalStudents: 110,
        generationDate: new Date().toLocaleDateString('en-IN'),
        isPreview: true,
        autoPrint: false
    };
    
    res.render('simple-exam-slips', templateData);
});

app.get('/update', (req, res) => {
    res.send('Welcome to the Student Registration API, added invigilator login feature');
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('❌ Error:', err.stack);
    res.status(500).json({ 
        success: false,
        error: 'Something went wrong!' 
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ 
        success: false,
        error: 'Route not found' 
    });
});

const PORT = process.env.PORT || 5010;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📝 API available at http://localhost:${PORT}/api`);
    console.log(`📄 Test templates available at:`);
    console.log(`   - Attendance: http://localhost:${PORT}/test-attendance-template`);
    console.log(`   - Hall ticket: http://localhost:${PORT}/test-hallticket`);
    console.log(`   - Exam slips: http://localhost:${PORT}/test-exam-slips`);
    console.log(`   - Simple slips: http://localhost:${PORT}/test-simple-slips`);
});