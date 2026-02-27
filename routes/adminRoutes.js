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

router.get(
  "/results/top-performers",
  auth(["admin", "superadmin"]),
  adminController.getTopPerformers,
);

router.get("/rooms/stats", auth(["admin", "superadmin"]), async (req, res) => {
  try {
    const studentRooms = await Student.aggregate([
      { $match: { isDeleted: false } },
      {
        $group: {
          _id: "$roomNo",
          studentCount: { $sum: 1 },
          genderCounts: {
            $push: "$gender",
          },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const formattedRooms = studentRooms.map((room) => {
      const genderStats = {};
      room.genderCounts.forEach((gender) => {
        genderStats[gender] = (genderStats[gender] || 0) + 1;
      });

      const genderCountsArray = Object.entries(genderStats).map(
        ([gender, count]) => ({
          _id: gender,
          count: count,
        }),
      );

      return {
        roomNo: room._id,
        studentCount: room.studentCount,
        capacity: 20,
        availableSeats: 20 - room.studentCount,
        genderCounts: genderCountsArray,
      };
    });

    res.json({
      success: true,
      count: formattedRooms.length,
      data: formattedRooms,
    });
  } catch (error) {
    console.error("Error fetching room stats:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch room statistics",
    });
  }
});

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
      .select("name registrationCode seatNo aadhaarNo medium gender") // Added gender to select fields
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
    
    // Gender counts
    let maleCount = 0;
    let femaleCount = 0;
    let otherCount = 0;

    students.forEach((student, index) => {
      const qpType = (index % 2 === 0) ? 'A' : 'B'; // Alternate A/B based on seat order
      
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

    const studentsPerPage = 20;
    const studentPages = [];
    for (let i = 0; i < students.length; i += studentsPerPage) {
      studentPages.push(students.slice(i, i + studentsPerPage));
    }

    const templateData = {
      roomNo,
      studentPages: studentPages,
      totalStudents: students.length,
      generationDate: new Date().toLocaleDateString("en-IN"),
      examDate: "01-03-2026",
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
        otherCount
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
        "name registrationCode seatNo studyingClass fatherName gender medium aadhaarNo schoolName phoneNo address",
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
      examDate: "01-03-2026",
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
      .select("name registrationCode seatNo studyingClass medium") // Include medium
      .sort({ seatNo: 1 });

    if (!students || students.length === 0) {
      return res.status(404).json({
        success: false,
        error: "No students found in this room",
      });
    }

    // Add qpType to each student based on seat number (odd = A, even = B)
    const studentsWithQPType = students.map(student => {
      const studentObj = student.toObject();
      // Determine QP Type: odd seat numbers get 'A', even get 'B'
      studentObj.qpType = (student.seatNo % 2 === 1) ? 'A' : 'B';
      return studentObj;
    });

    const studentsPerPage = 20; // Changed from 21 to 20
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
      .select("medium gender registrationCode name seatNo roomNo");

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
    
    // For QP type calculation (alternating by student order)
    let englishTypeA = 0;
    let englishTypeB = 0;
    let malayalamTypeA = 0;
    let malayalamTypeB = 0;
    
    // Room wise distribution with QP types
    const roomDistribution = {};

    allStudents.forEach((student, index) => {
      const qpType = (index % 2 === 0) ? 'A' : 'B';
      
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
            malayalamTypeB: 0
          };
        }
        roomDistribution[student.roomNo].total++;
        
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
        totalOther: englishOther + malayalamOther
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