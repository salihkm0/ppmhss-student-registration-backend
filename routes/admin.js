const express = require("express");
const router = express.Router();
const Student = require("../models/Student");
const Admin = require("../models/Admin");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const puppeteer = require("puppeteer");
const path = require("path");

const auth = (req, res, next) => {
  const token = req.header("x-auth-token");

  if (!token) {
    return res.status(401).json({
      success: false,
      error: "No token, authorization denied",
    });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your-secret-key",
    );
    req.admin = decoded;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      error: "Token is not valid",
    });
  }
};

// Admin login
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: "Username/Email and password are required",
      });
    }

    const admin = await Admin.findOne({
      $or: [{ username: username }, { email: username.toLowerCase() }],
    });

    if (!admin) {
      return res.status(401).json({
        success: false,
        error: "Invalid credentials",
      });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: "Invalid credentials",
      });
    }

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

// Create default admin
router.post("/setup", async (req, res) => {
  try {
    const { username, password, email } = req.body;

    const existingAdmin = await Admin.findOne({ username });
    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        error: "Admin already exists",
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

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

// Get dashboard stats
router.get("/dashboard/stats", auth, async (req, res) => {
  try {
    const totalStudents = await Student.countDocuments();

    const recentStudents = await Student.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .select("name registrationCode applicationNo roomNo seatNo createdAt");

    const genderStats = await Student.aggregate([
      { $group: { _id: "$gender", count: { $sum: 1 } } },
    ]);

    const classStats = await Student.aggregate([
      { $group: { _id: "$studyingClass", count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    const roomStats = await Student.aggregate([
      { $group: { _id: "$roomNo", count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

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

// Get all students with pagination
router.get("/students", auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const search = req.query.search || "";
    const classFilter = req.query.class || "";
    const roomFilter = req.query.room || "";

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

// Delete student
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

// Export data
router.get("/export", auth, async (req, res) => {
  try {
    const students = await Student.find()
      .select("-__v")
      .sort({ roomNo: 1, seatNo: 1 });

    const templateData = {
        students,
        generationDate: new Date().toLocaleDateString("en-IN"),
        autoPrint: req.query.print === "true"
    };
    
    return res.render("student-export", templateData);
  } catch (error) {
    console.error("Export error:", error);
    res.status(500).json({
      success: false,
      error: "Server error",
    });
  }
});

// Generate attendance sheet (HTML for browser printing)
router.get("/room-attendance/:roomNo/pdf", auth, async (req, res) => {
  try {
    const roomNo = parseInt(req.params.roomNo);

    if (isNaN(roomNo) || roomNo < 1) {
      return res.status(400).json({
        success: false,
        error: "Invalid room number",
      });
    }

    // Get students in room, sorted by seat number
    const students = await Student.find({ roomNo })
      .select("name registrationCode seatNo studyingClass fatherName examType medium gender")
      .sort({ seatNo: 1 });

    if (!students || students.length === 0) {
      return res.status(404).json({
        success: false,
        error: "No students found in this room",
      });
    }

    // Calculate statistics for the summary table
    let englishCount = 0;
    let malayalamCount = 0;
    let englishTypeA = 0;
    let englishTypeB = 0;
    let malayalamTypeA = 0;
    let malayalamTypeB = 0;
    
    // Class-specific medium and QP type counts
    let class10EnglishCount = 0;
    let class10MalayalamCount = 0;
    let class10EnglishTypeA = 0;
    let class10EnglishTypeB = 0;
    let class10MalayalamTypeA = 0;
    let class10MalayalamTypeB = 0;

    let class12EnglishCount = 0;
    let class12MalayalamCount = 0;
    let class12EnglishTypeA = 0;
    let class12EnglishTypeB = 0;
    let class12MalayalamTypeA = 0;
    let class12MalayalamTypeB = 0;

    // Class counts
    let class10Count = 0;
    let class12Count = 0;
    
    // Gender counts
    let maleCount = 0;
    let femaleCount = 0;
    let otherCount = 0;

    students.forEach((student) => {
      const qpType = student.examType || 'A';
      
      // Count class
      if (student.studyingClass === '10') {
        class10Count++;
        if (student.medium === 'English') {
          class10EnglishCount++;
          if (qpType === 'A') class10EnglishTypeA++;
          else class10EnglishTypeB++;
        } else if (student.medium === 'Malayalam') {
          class10MalayalamCount++;
          if (qpType === 'A') class10MalayalamTypeA++;
          else class10MalayalamTypeB++;
        }
      } else if (student.studyingClass === '12') {
        class12Count++;
        if (student.medium === 'English') {
          class12EnglishCount++;
          if (qpType === 'A') class12EnglishTypeA++;
          else class12EnglishTypeB++;
        } else if (student.medium === 'Malayalam') {
          class12MalayalamCount++;
          if (qpType === 'A') class12MalayalamTypeA++;
          else class12MalayalamTypeB++;
        }
      }
      
      // Count gender
      if (student.gender === 'Male') {
        maleCount++;
      } else if (student.gender === 'Female') {
        femaleCount++;
      } else if (student.gender === 'Other') {
        otherCount++;
      }
      
      // Count medium and QP type
      if (student.medium === 'English') {
        englishCount++;
        if (qpType === 'A') englishTypeA++;
        else englishTypeB++;
      } else if (student.medium === 'Malayalam') {
        malayalamCount++;
        if (qpType === 'A') malayalamTypeA++;
        else malayalamTypeB++;
      }
    });

    let maxRows = 20;
    let separateSummaryPage = false;
    const studentPages = [];

    if (students.length <= 20) {
      studentPages.push(students);
    } else {
      studentPages.push(students.slice(0, 20));
      for (let i = 20; i < students.length; i += 20) {
        studentPages.push(students.slice(i, i + 20));
      }
    }

    // Prepare data for EJS template - SIMILAR TO HALL TICKET
    const templateData = {
      roomNo,
      studentPages: studentPages,
      totalStudents: students.length,
      maxRows,
      separateSummaryPage,
      generationDate: new Date().toLocaleDateString("en-IN"),
      examDate: "28-06-2026", // Make sure this is defined
      examTime: "10:00 AM - 11:30 PM", // Make sure this is defined
      isPreview: req.query.preview !== "false",
      autoPrint: req.query.print === "true",
      summary: {
        englishCount,
        malayalamCount,
        englishTypeA,
        englishTypeB,
        malayalamTypeA,
        malayalamTypeB,
        totalTypeA: englishTypeA + malayalamTypeA,
        totalTypeB: englishTypeB + malayalamTypeB,
        maleCount,
        femaleCount,
        otherCount,
        class10Count,
        class12Count,
        // Class 10 details
        class10EnglishCount,
        class10MalayalamCount,
        class10EnglishTypeA,
        class10EnglishTypeB,
        class10MalayalamTypeA,
        class10MalayalamTypeB,
        class10TotalTypeA: class10EnglishTypeA + class10MalayalamTypeA,
        class10TotalTypeB: class10EnglishTypeB + class10MalayalamTypeB,
        // Class 12 details
        class12EnglishCount,
        class12MalayalamCount,
        class12EnglishTypeA,
        class12EnglishTypeB,
        class12MalayalamTypeA,
        class12MalayalamTypeB,
        class12TotalTypeA: class12EnglishTypeA + class12MalayalamTypeA,
        class12TotalTypeB: class12EnglishTypeB + class12MalayalamTypeB
      }
    };

    // Render HTML template - let browser handle PDF conversion
    res.render("attendance-sheet", templateData);
  } catch (error) {
    console.error("Error generating attendance sheet:", error);
    res.status(500).json({
      success: false,
      error: "Failed to generate attendance sheet: " + error.message,
    });
  }
});

// Generate exam student slips (16 per A4 page)
router.get("/exam-slips/:roomNo", auth, async (req, res) => {
  try {
    const roomNo = parseInt(req.params.roomNo);

    if (isNaN(roomNo) || roomNo < 1) {
      return res.status(400).json({
        success: false,
        error: "Invalid room number",
      });
    }

    // Get students in room, sorted by seat number
    const students = await Student.find({ roomNo })
      .select(
        "name registrationCode seatNo studyingClass fatherName gender medium aadhaarNo schoolName phoneNo address examType",
      )
      .sort({ seatNo: 1 });

    if (!students || students.length === 0) {
      return res.status(404).json({
        success: false,
        error: "No students found in this room",
      });
    }

    // Split students into pages of 16 (for 4x4 grid per A4 page)
    const studentsPerPage = 16;
    const studentPages = [];
    for (let i = 0; i < students.length; i += studentsPerPage) {
      studentPages.push(students.slice(i, i + studentsPerPage));
    }

    // Prepare data for EJS template
    const templateData = {
      roomNo,
      studentPages: studentPages,
      totalStudents: students.length,
      generationDate: new Date().toLocaleDateString("en-IN"),
      examDate: "28-06-2026",
      examTime: "10:00 AM - 11:30 PM",
      examCenter: "PPM HSS Kottukkara",
      isPreview: req.query.preview !== "false",
      autoPrint: req.query.print === "true",
    };

    // Render HTML template
    res.render("exam-slips", templateData);
  } catch (error) {
    console.error("Error generating exam slips:", error);
    res.status(500).json({
      success: false,
      error: "Failed to generate exam slips: " + error.message,
    });
  }
});

// Generate exam slips for multiple/all rooms
router.get("/exam-slips", auth, async (req, res) => {
  try {
    const rooms = req.query.rooms; // Comma-separated room numbers
    const allRooms = req.query.all === "true";

    let roomFilter = {};

    if (allRooms) {
      // Get all rooms with students
      const roomsWithStudents = await Student.distinct("roomNo", {
        roomNo: { $exists: true, $ne: "" },
      });
      roomFilter = { roomNo: { $in: roomsWithStudents } };
    } else if (rooms) {
      const roomNumbers = rooms
        .split(",")
        .map((r) => parseInt(r.trim()))
        .filter((r) => !isNaN(r));
      roomFilter = { roomNo: { $in: roomNumbers } };
    } else {
      return res.status(400).json({
        success: false,
        error: "Please specify rooms or set all=true",
      });
    }

    // Get all students in selected rooms, sorted by room then seat
    const students = await Student.find(roomFilter)
      .select(
        "name registrationCode seatNo studyingClass fatherName gender medium aadhaarNo schoolName phoneNo address roomNo",
      )
      .sort({ roomNo: 1, seatNo: 1 });

    if (!students || students.length === 0) {
      return res.status(404).json({
        success: false,
        error: "No students found in the specified rooms",
      });
    }

    // Group students by room
    const studentsByRoom = {};
    students.forEach((student) => {
      if (!studentsByRoom[student.roomNo]) {
        studentsByRoom[student.roomNo] = [];
      }
      studentsByRoom[student.roomNo].push(student);
    });

    // Prepare template data with room-wise grouping
    const templateData = {
      studentsByRoom: studentsByRoom,
      allRooms: true,
      roomNumbers: Object.keys(studentsByRoom).sort((a, b) => a - b),
      totalStudents: students.length,
      generationDate: new Date().toLocaleDateString("en-IN"),
      examDate: "28-06-2026",
      examTime: "10:00 AM - 11:30 PM",
      examCenter: "PPM HSS Kottukkara",
      isPreview: req.query.preview !== "false",
      autoPrint: req.query.print === "true",
    };

    // Render HTML template (you'll need to create a different template for multiple rooms)
    res.render("exam-slips-multi", templateData);
  } catch (error) {
    console.error("Error generating exam slips for multiple rooms:", error);
    res.status(500).json({
      success: false,
      error: "Failed to generate exam slips: " + error.message,
    });
  }
});

// Generate simple exam slips (16 per A4 page) - Minimalist version
router.get("/simple-exam-slips/:roomNo", auth, async (req, res) => {
  try {
    const roomNo = parseInt(req.params.roomNo);

    if (isNaN(roomNo) || roomNo < 1) {
      return res.status(400).json({
        success: false,
        error: "Invalid room number",
      });
    }

    // Get students in room, sorted by seat number
    const students = await Student.find({ roomNo })
      .select("name registrationCode seatNo studyingClass medium examType")
      .sort({ seatNo: 1 });

    if (!students || students.length === 0) {
      return res.status(404).json({
        success: false,
        error: "No students found in this room",
      });
    }

    // Add qpType to each student based on database-saved examType
    const studentsWithQPType = students.map(student => {
      const studentObj = student.toObject();
      studentObj.qpType = student.examType || 'A';
      return studentObj;
    });

    // Split students into pages of 21 (7 rows × 3 columns)
    const studentsPerPage = 21;
    const studentPages = [];
    for (let i = 0; i < studentsWithQPType.length; i += studentsPerPage) {
      studentPages.push(studentsWithQPType.slice(i, i + studentsPerPage));
    }

    // Prepare data for EJS template
    const templateData = {
      roomNo,
      studentPages: studentPages,
      totalStudents: students.length,
      generationDate: new Date().toLocaleDateString("en-IN"),
      isPreview: req.query.preview !== "false",
      autoPrint: req.query.print === "true",
    };

    // Render HTML template
    res.render("simple-exam-slips", templateData);
  } catch (error) {
    console.error("Error generating exam slips:", error);
    res.status(500).json({
      success: false,
      error: "Failed to generate exam slips: " + error.message,
    });
  }
});

// Generate slips for all rooms
router.get("/simple-exam-slips", auth, async (req, res) => {
  try {
    const roomFilter = { roomNo: { $exists: true, $ne: "" } };

    // Get all students sorted by room then seat
    const students = await Student.find(roomFilter)
      .select("name registrationCode seatNo studyingClass roomNo medium examType")
      .sort({ roomNo: 1, seatNo: 1 });

    if (!students || students.length === 0) {
      return res.status(404).json({
        success: false,
        error: "No students found",
      });
    }

    // Group students by room and map qpType
    const studentsByRoom = {};
    students.forEach((student) => {
      const studentObj = student.toObject();
      studentObj.qpType = student.examType || 'A';
      if (!studentsByRoom[student.roomNo]) {
        studentsByRoom[student.roomNo] = [];
      }
      studentsByRoom[student.roomNo].push(studentObj);
    });

    // Prepare template data
    const templateData = {
      studentsByRoom: studentsByRoom,
      roomNumbers: Object.keys(studentsByRoom).sort((a, b) => a - b),
      totalStudents: students.length,
      generationDate: new Date().toLocaleDateString("en-IN"),
      isPreview: req.query.preview !== "false",
      autoPrint: req.query.print === "true",
    };

    // Render multi-room template
    res.render("simple-exam-slips-multi", templateData);
  } catch (error) {
    console.error("Error generating exam slips for all rooms:", error);
    res.status(500).json({
      success: false,
      error: "Failed to generate exam slips: " + error.message,
    });
  }
});

// Get registration code sequence
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
