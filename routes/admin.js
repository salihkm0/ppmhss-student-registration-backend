const express = require("express");
const router = express.Router();
const Student = require("../models/Student");
const Admin = require("../models/Admin");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { default: puppeteer } = require("puppeteer");

// Authentication middleware
const auth = (req, res, next) => {
  // Get token from header
  const token = req.header("x-auth-token");

  // Check if no token
  if (!token) {
    return res.status(401).json({
      success: false,
      error: "No token, authorization denied",
    });
  }

  try {
    // Verify token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your-secret-key",
    );

    // Add admin from payload
    req.admin = decoded;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      error: "Token is not valid",
    });
  }
};

// Admin login (updated to allow login with username OR email)
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: "Username/Email and password are required",
      });
    }

    // Find admin by username OR email
    const admin = await Admin.findOne({
      $or: [{ username: username }, { email: username.toLowerCase() }],
    });

    if (!admin) {
      return res.status(401).json({
        success: false,
        error: "Invalid credentials",
      });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: "Invalid credentials",
      });
    }

    // Create token
    const token = jwt.sign(
      { id: admin._id, username: admin.username, role: admin.role },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "24h" },
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
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      error: "Server error",
    });
  }
});

// Create default admin if doesn't exist (for initial setup)
router.post("/setup", async (req, res) => {
  try {
    const { username, password, email } = req.body;

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ username });
    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        error: "Admin already exists",
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create admin
    const admin = new Admin({
      username,
      password: hashedPassword,
      email,
      role: "superadmin",
    });

    await admin.save();

    res.json({
      success: true,
      message: "Admin created successfully",
    });
  } catch (error) {
    console.error("Setup error:", error);
    res.status(500).json({
      success: false,
      error: "Server error",
    });
  }
});

// Get dashboard stats (protected)
router.get("/dashboard/stats", auth, async (req, res) => {
  try {
    const totalStudents = await Student.countDocuments();

    // Get recent registrations
    const recentStudents = await Student.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .select("name registrationCode applicationNo roomNo seatNo createdAt");

    // Get gender distribution
    const genderStats = await Student.aggregate([
      { $group: { _id: "$gender", count: { $sum: 1 } } },
    ]);

    // Get class-wise distribution
    const classStats = await Student.aggregate([
      { $group: { _id: "$studyingClass", count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    // Get room-wise distribution
    const roomStats = await Student.aggregate([
      { $group: { _id: "$roomNo", count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    // Get registration count by date (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const dailyStats = await Student.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json({
      success: true,
      stats: {
        total: totalStudents,
        gender: genderStats,
        class: classStats,
        rooms: roomStats,
        daily: dailyStats,
      },
      recent: recentStudents,
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    res.status(500).json({
      success: false,
      error: "Server error",
    });
  }
});

// Get all students with pagination (protected)
router.get("/students", auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const search = req.query.search || "";
    const classFilter = req.query.class || "";
    const roomFilter = req.query.room || "";

    // Build query
    let query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { registrationCode: { $regex: search, $options: "i" } },
        { applicationNo: { $regex: search, $options: "i" } },
        { phoneNo: { $regex: search, $options: "i" } },
        { "address.village": { $regex: search, $options: "i" } },
        { fatherName: { $regex: search, $options: "i" } },
      ];
    }

    if (classFilter) {
      query.studyingClass = classFilter;
    }

    if (roomFilter) {
      query.roomNo = parseInt(roomFilter);
    }

    const students = await Student.find(query)
      .sort({ roomNo: 1, seatNo: 1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select("-__v");

    const total = await Student.countDocuments(query);

    res.json({
      success: true,
      data: students,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get students error:", error);
    res.status(500).json({
      success: false,
      error: "Server error",
    });
  }
});

// Delete student (protected)
router.delete("/students/:id", auth, async (req, res) => {
  try {
    const student = await Student.findByIdAndDelete(req.params.id);

    if (!student) {
      return res.status(404).json({
        success: false,
        error: "Student not found",
      });
    }

    res.json({
      success: true,
      message: "Student deleted successfully",
    });
  } catch (error) {
    console.error("Delete error:", error);
    res.status(500).json({
      success: false,
      error: "Server error",
    });
  }
});

// Export data (protected)
router.get("/export", auth, async (req, res) => {
  try {
    const students = await Student.find()
      .select("-__v")
      .sort({ roomNo: 1, seatNo: 1 });

    // Set headers for CSV download
    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=students_${Date.now()}.csv`,
    );

    // CSV header
    const headers = [
      "Registration Code",
      "Application No",
      "Name",
      "Gender",
      "Father Name",
      "Aadhaar No",
      "Phone No",
      "School",
      "Class",
      "Medium",
      "Room No",
      "Seat No",
      "House Name",
      "Place",
      "Post Office",
      "PIN Code",
      "Local Body Type",
      "Local Body Name",
      "Village",
      "Registration Date",
    ].join(",");

    // CSV rows
    const rows = students
      .map((student) => {
        return [
          student.registrationCode,
          student.applicationNo,
          student.name,
          student.gender,
          student.fatherName,
          student.aadhaarNo,
          student.phoneNo,
          student.schoolName,
          student.studyingClass,
          student.medium,
          student.roomNo,
          student.seatNo,
          student.address.houseName,
          student.address.place,
          student.address.postOffice,
          student.address.pinCode,
          student.address.localBodyType,
          student.address.localBodyName,
          student.address.village,
          new Date(student.createdAt).toLocaleDateString("en-IN"),
        ]
          .map((field) => {
            // Escape quotes and wrap in quotes
            const fieldStr = String(field || "").replace(/"/g, '""');
            return `"${fieldStr}"`;
          })
          .join(",");
      })
      .join("\n");

    res.send(headers + "\n" + rows);
  } catch (error) {
    console.error("Export error:", error);
    res.status(500).json({
      success: false,
      error: "Server error",
    });
  }
});

// Generate PDF for room-wise attendance sheet
router.get("/room-attendance/:roomNo/pdf", auth, async (req, res) => {
  try {
    const roomNo = parseInt(req.params.roomNo);
    
    if (isNaN(roomNo) || roomNo < 1) {
      return res.status(400).json({
        success: false,
        error: 'Invalid room number'
      });
    }

    // Get students in room, sorted by seat number
    const students = await Student.find({ roomNo })
      .select('name registrationCode seatNo studyingClass fatherName')
      .sort({ seatNo: 1 });

    if (!students || students.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No students found in this room'
      });
    }

    // Split students into pages of 20
    const studentsPerPage = 20;
    const studentPages = [];
    for (let i = 0; i < students.length; i += studentsPerPage) {
      studentPages.push(students.slice(i, i + studentsPerPage));
    }

    // Prepare data for EJS template
    const templateData = {
      roomNo,
      studentPages: studentPages,
      totalStudents: students.length,
      generationDate: new Date().toLocaleDateString('en-GB') + ' ' + 
                     new Date().toLocaleTimeString('en-GB', { 
                       hour: '2-digit', 
                       minute: '2-digit' 
                     })
    };

    // Render HTML using EJS
    const html = await new Promise((resolve, reject) => {
      req.app.render('attendance-sheet', templateData, (err, html) => {
        if (err) {
          console.error('EJS rendering error:', err);
          reject(err);
        } else {
          resolve(html);
        }
      });
    });

    // Try to generate PDF with Puppeteer
    try {
      const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const page = await browser.newPage();
      
      // Set HTML content
      await page.setContent(html, { waitUntil: 'networkidle0' });
      
      // Generate PDF
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          right: '15mm',
          bottom: '15mm',
          left: '15mm'
        }
      });

      await browser.close();

      // Send PDF
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="Room-${roomNo}-Attendance.pdf"`);
      res.send(pdfBuffer);

    } catch (puppeteerError) {
      console.error('Puppeteer error, falling back to HTML:', puppeteerError);
      
      // Fallback: Send HTML if PDF generation fails
      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    }

  } catch (error) {
    console.error('Error generating attendance sheet:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate attendance sheet: ' + error.message
    });
  }
});

// Get registration code sequence (protected)
router.get("/registration-sequence", auth, async (req, res) => {
  try {
    const students = await Student.find()
      .select("registrationCode name applicationNo roomNo seatNo createdAt")
      .sort({ registrationCode: 1 });

    res.json({
      success: true,
      data: students,
    });
  } catch (error) {
    console.error("Get sequence error:", error);
    res.status(500).json({
      success: false,
      error: "Server error",
    });
  }
});

module.exports = router;