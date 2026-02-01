const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const studentRoutes = require('./routes/students');
const adminRoutes = require('./routes/admin');
const path = require('path');

dotenv.config();

const app = express();

// Middleware
app.use(cors({
    origin: ['http://localhost:5173', 'https://ppmhss-student-registration.vercel.app'],
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Set view engine for EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/student_registration', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('✅ Connected to MongoDB'))
.catch(err => console.error('❌ MongoDB connection error:', err));

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

// Routes
app.use('/api/students', studentRoutes);
app.use('/api/admin', adminRoutes);

// Test EJS template
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

// Direct PDF test endpoint
app.get('/test-pdf/:roomNo', async (req, res) => {
  try {
    const templateData = {
      roomNo: req.params.roomNo,
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
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Test-Room-${req.params.roomNo}.pdf"`);
    
    // Render HTML first
    const html = await new Promise((resolve, reject) => {
      res.app.render('attendance-sheet', templateData, (err, html) => {
        if (err) reject(err);
        else resolve(html);
      });
    });
    
    // For testing, just send HTML
    res.send(html);
  } catch (error) {
    console.error('Test PDF error:', error);
    res.status(500).send('Error generating PDF');
  }
});

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
            roomNo: 1
        },
        issueDate: '01-02-2026',
        isPreview: true,
        backUrl: '/',
        autoPrint: false
    });
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
    console.log(`📄 Test attendance sheet: http://localhost:${PORT}/test-attendance-template`);
    console.log(`📄 Test PDF: http://localhost:${PORT}/test-pdf/1`);
    console.log(`📄 Test hall ticket: http://localhost:${PORT}/test-hallticket`);
});