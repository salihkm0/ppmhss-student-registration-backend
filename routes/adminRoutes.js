const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const studentController = require("../controllers/studentController");
const auth = require("../middleware/auth");
const Student = require("../models/Student");
const { body } = require('express-validator');

// Public routes
router.post("/login", adminController.login);
router.post("/setup", adminController.setupAdmin);

// Protected routes (admin only)
router.get(
  "/dashboard/stats",
  auth(["admin", "superadmin"]),
  adminController.getDashboardStats,
);

// SPECIAL ROUTES MUST COME BEFORE PARAMETERIZED ROUTES
router.get(
  "/students/deleted",
  auth(["admin", "superadmin"]),
  studentController.getDeletedStudents,
);
router.get(
  "/students/room-distribution",
  auth(["admin", "superadmin"]),
  studentController.getRoomDistribution,
);
router.get(
  "/export",
  auth(["admin", "superadmin"]),
  studentController.exportStudents,
);

// Soft delete routes
router.delete(
  "/students/soft-delete/:studentId",
  auth(["admin", "superadmin"]),
  studentController.softDeleteStudent,
);
router.post(
  "/students/restore/:studentId",
  auth(["admin", "superadmin"]),
  studentController.restoreStudent,
);
router.delete(
  "/students/hard-delete/:studentId",
  auth(["superadmin"]),
  studentController.hardDeleteStudent,
);

// Student routes
router.get(
  "/students",
  auth(["admin", "superadmin"]),
  studentController.getAllStudents,
);
router.get(
  "/students/:id",
  auth(["admin", "superadmin"]),
  studentController.getStudentById,
);

// UPDATE STUDENT ROUTE - With validation for editable fields only
router.put(
  '/students/:id', 
  auth(["admin", "superadmin"]),
  [
    body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
    body('fatherName').optional().trim().notEmpty().withMessage('Father name cannot be empty'),
    body('aadhaarNo').optional().matches(/^\d{12}$/).withMessage('Aadhaar number must be 12 digits'),
    body('phoneNo').optional().matches(/^\d{10}$/).withMessage('Phone number must be 10 digits'),
    body('gender').optional().isIn(['Male', 'Female', 'Other']).withMessage('Invalid gender'),
    body('schoolName').optional().isString(),
    body('studyingClass').optional().isIn(['7', '8', '9', '10', '11', '12']).withMessage('Invalid class'),
    body('medium').optional().isIn(['Malayalam', 'English', 'Hindi', 'Tamil', 'Kannada', 'Other']),
    body('subDistrict').optional().isString(),
    body('address.houseName').optional().isString(),
    body('address.place').optional().isString(),
    body('address.postOffice').optional().isString(),
    body('address.pinCode').optional().matches(/^\d{6}$/).withMessage('PIN code must be 6 digits'),
    body('address.village').optional().isString(),
    body('address.localBodyType').optional().isIn(['Panchayath', 'Municipality', 'Corporation', '']),
    body('address.localBodyName').optional().isString()
  ],
  studentController.updateStudent
);

// Invigilator management routes
router.post(
  "/invigilators",
  auth(["admin", "superadmin"]),
  adminController.createInvigilator,
);
router.get(
  "/invigilators",
  auth(["admin", "superadmin"]),
  adminController.getAllInvigilators,
);
router.get(
  "/invigilators/:id",
  auth(["admin", "superadmin"]),
  adminController.getInvigilatorById,
);
router.put(
  "/invigilators/:id",
  auth(["admin", "superadmin"]),
  adminController.updateInvigilator,
);
router.delete(
  "/invigilators/:id",
  auth(["admin", "superadmin"]),
  adminController.deleteInvigilator,
);
router.post(
  "/invigilators/:invigilatorId/assign-rooms",
  auth(["admin", "superadmin"]),
  adminController.assignRoomsToInvigilator,
);
router.post(
  "/invigilators/:invigilatorId/remove-room",
  auth(["admin", "superadmin"]),
  adminController.removeRoomFromInvigilator,
);
router.get(
  "/rooms/available",
  auth(["admin", "superadmin"]),
  adminController.getAvailableRooms,
);

// Results management routes
router.post(
  "/results/update-ranks",
  auth(["admin", "superadmin"]),
  adminController.updateRanksAndScholarships,
);

router.put(
  "/results/students/:studentId/rank",
  auth(["admin", "superadmin"]),
  [
    body('rank')
      .isInt({ min: 1 })
      .withMessage('Rank must be a positive integer')
      .toInt()
  ],
  adminController.adminEditRank,
);

router.get(
  "/results/top-performers",
  auth(["admin", "superadmin"]),
  adminController.getTopPerformers,
);

// MARK MANAGEMENT ROUTES (Admin edit before rank generation)
// These must come before parameterized routes like /students/:id

// Get students by mark status (pending/draft/submitted/final)
router.get(
  "/marks/students",
  auth(["admin", "superadmin"]),
  adminController.getStudentsByMarkStatus,
);

// Admin edit marks for a student
router.put(
  "/marks/students/:studentId",
  auth(["admin", "superadmin"]),
  [
    body('marks')
      .isInt({ min: 0, max: 50 })
      .withMessage('Marks must be between 0 and 50')
      .toInt() // Ensure it's converted to integer
  ],
  adminController.adminEditMarks,
);

// Get mark history for a student
router.get(
  "/marks/students/:studentId/history",
  auth(["admin", "superadmin"]),
  adminController.getStudentMarkHistory,
);

// Finalize marks for a student (marks become final before rank generation)
router.post(
  "/marks/students/:studentId/finalize",
  auth(["admin", "superadmin"]),
  adminController.finalizeMarks,
);

// Bulk mark operations
router.post(
  "/marks/bulk-update",
  auth(["admin", "superadmin"]),
  adminController.bulkUpdateMarks,
);

// Get mark entry summary by room
router.get(
  "/marks/room-summary",
  auth(["admin", "superadmin"]),
  async (req, res) => {
    try {
      const summary = await Student.aggregate([
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
        data: summary
      });
    } catch (error) {
      console.error('Error getting mark summary:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get mark summary'
      });
    }
  }
);

// Get rooms with pending/draft/submitted marks
router.get(
  "/marks/pending-rooms",
  auth(["admin", "superadmin"]),
  async (req, res) => {
    try {
      const rooms = await Student.aggregate([
        { $match: { isDeleted: false } },
        { $group: {
          _id: '$roomNo',
          totalStudents: { $sum: 1 },
          pending: { $sum: { $cond: [{ $eq: ['$markEntryStatus', 'pending'] }, 1, 0] } },
          draft: { $sum: { $cond: [{ $eq: ['$markEntryStatus', 'draft'] }, 1, 0] } },
          submitted: { $sum: { $cond: [{ $eq: ['$markEntryStatus', 'submitted'] }, 1, 0] } },
          final: { $sum: { $cond: [{ $eq: ['$markEntryStatus', 'final'] }, 1, 0] } }
        }},
        { $sort: { _id: 1 } }
      ]);

      res.json({
        success: true,
        data: rooms
      });
    } catch (error) {
      console.error('Error getting pending rooms:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get pending rooms'
      });
    }
  }
);

router.get("/rooms/stats", auth(["admin", "superadmin"]), require("../controllers/roomController").getAllRooms);

// Generate attendance sheet
router.get("/room-attendance/:roomNo/pdf", async (req, res) => {
  try {
    const roomNo = parseInt(req.params.roomNo);

    if (isNaN(roomNo) || roomNo < 1) {
      return res.status(400).json({
        success: false,
        error: "Invalid room number",
      });
    }

    const Student = require("../models/Student");
    const students = await Student.find({
      roomNo,
      isDeleted: false,
    })
      .select("name registrationCode seatNo aadhaarNo medium gender examType studyingClass")
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

    const templateData = {
      roomNo,
      studentPages: studentPages,
      totalStudents: students.length,
      maxRows,
      separateSummaryPage,
      generationDate: new Date().toLocaleDateString("en-IN"),
      examDate: "28-06-2026",
      examTime: "10:00 AM - 11:30 PM",
      isPreview: req.query.preview !== "false",
      autoPrint: req.query.print === "true",
      // Summary statistics
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

    // Render the EJS template
    res.render("attendance-sheet", templateData);
  } catch (error) {
    console.error("Error generating attendance sheet:", error);
    res.status(500).json({
      success: false,
      error: "Failed to generate attendance sheet: " + error.message,
    });
  }
});

// Generate exam slips
router.get("/exam-slips/:roomNo", async (req, res) => {
  try {
    const roomNo = parseInt(req.params.roomNo);

    if (isNaN(roomNo) || roomNo < 1) {
      return res.status(400).json({
        success: false,
        error: "Invalid room number",
      });
    }

    const Student = require("../models/Student");
    const students = await Student.find({
      roomNo,
      isDeleted: false,
    })
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

    const studentsPerPage = 16;
    const studentPages = [];
    for (let i = 0; i < students.length; i += studentsPerPage) {
      studentPages.push(students.slice(i, i + studentsPerPage));
    }

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

    res.render("exam-slips", templateData);
  } catch (error) {
    console.error("Error generating exam slips:", error);
    res.status(500).json({
      success: false,
      error: "Failed to generate exam slips: " + error.message,
    });
  }
});

// Generate simple exam slips
router.get("/simple-exam-slips/:roomNo", async (req, res) => {
  try {
    const roomNo = parseInt(req.params.roomNo);

    if (isNaN(roomNo) || roomNo < 1) {
      return res.status(400).json({
        success: false,
        error: "Invalid room number",
      });
    }

    const Student = require("../models/Student");
    const students = await Student.find({
      roomNo,
      isDeleted: false,
    })
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

    const studentsPerPage = 21;
    const studentPages = [];
    for (let i = 0; i < studentsWithQPType.length; i += studentsPerPage) {
      studentPages.push(studentsWithQPType.slice(i, i + studentsPerPage));
    }

    const templateData = {
      roomNo,
      studentPages: studentPages,
      totalStudents: students.length,
      generationDate: new Date().toLocaleDateString("en-IN"),
      isPreview: req.query.preview !== "false",
      autoPrint: req.query.print === "true",
    };

    res.render("simple-exam-slips", templateData);
  } catch (error) {
    console.error("Error generating exam slips:", error);
    res.status(500).json({
      success: false,
      error: "Failed to generate exam slips: " + error.message,
    });
  }
});

// Generate overall summary PDF (all students)
router.get("/overall-summary/pdf", async (req, res) => {
  try {
    const Student = require("../models/Student");
    
    // Get ALL students (excluding deleted)
    const allStudents = await Student.find({
      isDeleted: false,
    })
      .select("medium gender registrationCode name seatNo roomNo examType studyingClass");

    if (!allStudents || allStudents.length === 0) {
      return res.status(404).json({
        success: false,
        error: "No students found",
      });
    }

    // Calculate overall statistics
    let englishCount = 0;
    let malayalamCount = 0;
    let englishMale = 0;
    let englishFemale = 0;
    let englishOther = 0;
    let malayalamMale = 0;
    let malayalamFemale = 0;
    let malayalamOther = 0;
    
    // Class counts
    let class10Count = 0;
    let class12Count = 0;
    
    // For QP type calculation (alternating by student order)
    let englishTypeA = 0;
    let englishTypeB = 0;
    let malayalamTypeA = 0;
    let malayalamTypeB = 0;
    
    // Room wise distribution with QP types
    const roomDistribution = {};

    allStudents.forEach((student) => {
      const qpType = student.examType || 'A';
      
      // Count overall class
      if (student.studyingClass === '10') {
        class10Count++;
      } else if (student.studyingClass === '12') {
        class12Count++;
      }
      
      // Track room distribution
      if (student.roomNo) {
        if (!roomDistribution[student.roomNo]) {
          roomDistribution[student.roomNo] = {
            total: 0,
            english: 0,
            malayalam: 0,
            male: 0,
            female: 0,
            other: 0,
            typeA: 0,
            typeB: 0,
            englishTypeA: 0,
            englishTypeB: 0,
            malayalamTypeA: 0,
            malayalamTypeB: 0,
            class10: 0,
            class12: 0
          };
        }
        roomDistribution[student.roomNo].total++;
        
        if (student.studyingClass === '10') {
          roomDistribution[student.roomNo].class10++;
        } else if (student.studyingClass === '12') {
          roomDistribution[student.roomNo].class12++;
        }
        
        // Track QP Type per room
        if (qpType === 'A') {
          roomDistribution[student.roomNo].typeA++;
        } else {
          roomDistribution[student.roomNo].typeB++;
        }
      }
      
      // English medium stats
      if (student.medium === 'English') {
        englishCount++;
        
        if (qpType === 'A') {
          englishTypeA++;
          if (student.roomNo) roomDistribution[student.roomNo].englishTypeA++;
        } else {
          englishTypeB++;
          if (student.roomNo) roomDistribution[student.roomNo].englishTypeB++;
        }
        
        if (student.gender === 'Male') {
          englishMale++;
          if (student.roomNo) {
            roomDistribution[student.roomNo].english++;
            roomDistribution[student.roomNo].male++;
          }
        } else if (student.gender === 'Female') {
          englishFemale++;
          if (student.roomNo) {
            roomDistribution[student.roomNo].english++;
            roomDistribution[student.roomNo].female++;
          }
        } else if (student.gender === 'Other') {
          englishOther++;
          if (student.roomNo) {
            roomDistribution[student.roomNo].english++;
            roomDistribution[student.roomNo].other++;
          }
        }
      } 
      // Malayalam medium stats
      else if (student.medium === 'Malayalam') {
        malayalamCount++;
        
        if (qpType === 'A') {
          malayalamTypeA++;
          if (student.roomNo) roomDistribution[student.roomNo].malayalamTypeA++;
        } else {
          malayalamTypeB++;
          if (student.roomNo) roomDistribution[student.roomNo].malayalamTypeB++;
        }
        
        if (student.gender === 'Male') {
          malayalamMale++;
          if (student.roomNo) {
            roomDistribution[student.roomNo].malayalam++;
            roomDistribution[student.roomNo].male++;
          }
        } else if (student.gender === 'Female') {
          malayalamFemale++;
          if (student.roomNo) {
            roomDistribution[student.roomNo].malayalam++;
            roomDistribution[student.roomNo].female++;
          }
        } else if (student.gender === 'Other') {
          malayalamOther++;
          if (student.roomNo) {
            roomDistribution[student.roomNo].malayalam++;
            roomDistribution[student.roomNo].other++;
          }
        }
      }
    });

    // Convert room distribution to array for easier template handling
    const rooms = Object.keys(roomDistribution).sort((a, b) => parseInt(a) - parseInt(b)).map(roomNo => ({
      roomNo,
      ...roomDistribution[roomNo]
    }));

    const templateData = {
      generationDate: new Date().toLocaleDateString("en-IN"),
      generationTime: new Date().toLocaleTimeString("en-IN"),
      totalStudents: allStudents.length,
      isPreview: req.query.preview !== "false",
      autoPrint: req.query.print === "true",
      // Overall statistics
      summary: {
        englishCount,
        malayalamCount,
        englishMale,
        englishFemale,
        englishOther,
        malayalamMale,
        malayalamFemale,
        malayalamOther,
        englishTypeA,
        englishTypeB,
        malayalamTypeA,
        malayalamTypeB,
        totalTypeA: englishTypeA + malayalamTypeA,
        totalTypeB: englishTypeB + malayalamTypeB,
        totalEnglishStudents: englishMale + englishFemale + englishOther,
        totalMalayalamStudents: malayalamMale + malayalamFemale + malayalamOther,
        totalMale: englishMale + malayalamMale,
        totalFemale: englishFemale + malayalamFemale,
        totalOther: englishOther + malayalamOther,
        class10Count,
        class12Count
      },
      rooms: rooms,
      totalRooms: rooms.length
    };

    // Render the separate overall summary template
    res.render("overall-summary", templateData);
  } catch (error) {
    console.error("Error generating overall summary:", error);
    res.status(500).json({
      success: false,
      error: "Failed to generate overall summary: " + error.message,
    });
  }
});

module.exports = router;