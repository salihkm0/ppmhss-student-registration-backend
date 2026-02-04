const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const studentController = require("../controllers/studentController");
const auth = require("../middleware/auth");
const Student = require("../models/Student");

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

// Soft delete routes - also put before parameterized routes
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

// Invigilator management routes (admin only)
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

// Results management routes (admin only)
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
    // Get all rooms that have active students (excluding deleted)
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

    // Format the response
    const formattedRooms = studentRooms.map((room) => {
      // Count gender distribution
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
        capacity: 20, // Default capacity
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

// Generate attendance sheet (HTML for browser printing)
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
      .select("name registrationCode seatNo studyingClass fatherName gender")
      .sort({ seatNo: 1 });

    if (!students || students.length === 0) {
      return res.status(404).json({
        success: false,
        error: "No students found in this room",
      });
    }

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
    };

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
      .select("name registrationCode seatNo studyingClass")
      .sort({ seatNo: 1 });

    if (!students || students.length === 0) {
      return res.status(404).json({
        success: false,
        error: "No students found in this room",
      });
    }

    const studentsPerPage = 21;
    const studentPages = [];
    for (let i = 0; i < students.length; i += studentsPerPage) {
      studentPages.push(students.slice(i, i + studentsPerPage));
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

module.exports = router;
