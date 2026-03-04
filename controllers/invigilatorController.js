// const Invigilator = require('../models/Invigilator');
// const Student = require('../models/Student');
// const bcrypt = require('bcryptjs');
// const jwt = require('jsonwebtoken');

// // Invigilator login
// exports.login = async (req, res) => {
//     try {
//         const { email, password } = req.body;

//         if (!email || !password) {
//             return res.status(400).json({
//                 success: false,
//                 error: 'Email and password are required',
//             });
//         }

//         const invigilator = await Invigilator.findOne({ email: email.toLowerCase() });

//         if (!invigilator) {
//             return res.status(401).json({
//                 success: false,
//                 error: 'Invalid credentials',
//             });
//         }

//         if (!invigilator.isActive) {
//             return res.status(401).json({
//                 success: false,
//                 error: 'Account is deactivated',
//             });
//         }

//         const isMatch = await bcrypt.compare(password, invigilator.password);
//         if (!isMatch) {
//             return res.status(401).json({
//                 success: false,
//                 error: 'Invalid credentials',
//             });
//         }

//         // Update last login
//         invigilator.lastLogin = new Date();
//         await invigilator.save();

//         const token = jwt.sign(
//             {
//                 id: invigilator._id,
//                 name: invigilator.name,
//                 email: invigilator.email,
//                 role: invigilator.role,
//             },
//             process.env.JWT_SECRET || 'your-secret-key',
//             { expiresIn: '12h' }
//         );

//         res.json({
//             success: true,
//             token,
//             invigilator: {
//                 id: invigilator._id,
//                 name: invigilator.name,
//                 email: invigilator.email,
//                 phone: invigilator.phone,
//                 assignedRooms: invigilator.assignedRooms,
//             },
//         });
//     } catch (error) {
//         console.error('Invigilator login error:', error);
//         res.status(500).json({
//             success: false,
//             error: 'Server error',
//         });
//     }
// };

// // Get invigilator dashboard
// exports.getDashboard = async (req, res) => {
//     try {
//         const invigilator = await Invigilator.findById(req.user.id)
//             .select('-password -__v');

//         if (!invigilator) {
//             return res.status(404).json({
//                 success: false,
//                 error: 'Invigilator not found',
//             });
//         }

//         // Get assigned rooms details
//         const roomDetails = [];
//         for (const room of invigilator.assignedRooms) {
//             const students = await Student.find({ roomNo: room.roomNo })
//                 .select('name registrationCode seatNo studyingClass examMarks resultStatus')
//                 .sort({ seatNo: 1 });

//             const totalStudents = students.length;
//             const marksEntered = students.filter(s => s.examMarks > 0).length;
//             const marksPending = totalStudents - marksEntered;

//             roomDetails.push({
//                 roomNo: room.roomNo,
//                 examDate: room.examDate,
//                 totalStudents,
//                 marksEntered,
//                 marksPending,
//                 students,
//             });
//         }

//         // Get summary stats
//         const totalAssignedRooms = invigilator.assignedRooms.length;
//         const totalStudents = roomDetails.reduce((sum, room) => sum + room.totalStudents, 0);
//         const totalMarksEntered = roomDetails.reduce((sum, room) => sum + room.marksEntered, 0);

//         res.json({
//             success: true,
//             dashboard: {
//                 invigilator: {
//                     name: invigilator.name,
//                     email: invigilator.email,
//                     lastLogin: invigilator.lastLogin,
//                 },
//                 stats: {
//                     totalAssignedRooms,
//                     totalStudents,
//                     totalMarksEntered,
//                     totalMarksPending: totalStudents - totalMarksEntered,
//                 },
//                 assignedRooms: roomDetails,
//             },
//         });
//     } catch (error) {
//         console.error('Get dashboard error:', error);
//         res.status(500).json({
//             success: false,
//             error: 'Server error',
//         });
//     }
// };

// // Get students in assigned room
// exports.getRoomStudents = async (req, res) => {
//     try {
//         const { roomNo } = req.params;

//         // Check if invigilator is assigned to this room
//         const invigilator = await Invigilator.findById(req.user.id);
//         const isAssigned = invigilator.assignedRooms.some(room => room.roomNo === roomNo);

//         if (!isAssigned) {
//             return res.status(403).json({
//                 success: false,
//                 error: 'You are not assigned to this room',
//             });
//         }

//         const students = await Student.find({ roomNo })
//             .select('name registrationCode seatNo studyingClass fatherName phoneNo examMarks resultStatus')
//             .sort({ seatNo: 1 });

//         if (!students || students.length === 0) {
//             return res.status(404).json({
//                 success: false,
//                 error: 'No students found in this room',
//             });
//         }

//         const roomStats = {
//             roomNo,
//             totalStudents: students.length,
//             marksEntered: students.filter(s => s.examMarks > 0).length,
//             marksPending: students.filter(s => s.examMarks === 0).length,
//         };

//         res.json({
//             success: true,
//             data: {
//                 roomStats,
//                 students,
//             },
//         });
//     } catch (error) {
//         console.error('Get room students error:', error);
//         res.status(500).json({
//             success: false,
//             error: 'Server error',
//         });
//     }
// };

// // Enter marks for single student
// exports.enterMarks = async (req, res) => {
//     try {
//         const { studentId } = req.params;
//         const { marks } = req.body;

//         console.log('Enter marks request received:', {
//             studentId,
//             marks,
//             invigilatorId: req.user.id
//         });

//         if (!marks || marks < 0 || marks > 100) {
//             return res.status(400).json({
//                 success: false,
//                 error: 'Please enter valid marks between 0 and 100',
//             });
//         }

//         // Check if invigilator is assigned to this room
//         const invigilator = await Invigilator.findById(req.user.id);
//         if (!invigilator) {
//             return res.status(401).json({
//                 success: false,
//                 error: 'Invigilator not found',
//             });
//         }

//         console.log('Invigilator:', invigilator.name);
//         console.log('Assigned rooms:', invigilator.assignedRooms);

//         // Find student and check room assignment
//         const student = await Student.findById(studentId)
//             .select('name registrationCode roomNo seatNo examMarks');
        
//         if (!student) {
//             return res.status(404).json({
//                 success: false,
//                 error: 'Student not found',
//             });
//         }

//         console.log('Student found:', {
//             name: student.name,
//             registrationCode: student.registrationCode,
//             roomNo: student.roomNo,
//             seatNo: student.seatNo
//         });

//         // Check if invigilator is assigned to student's room
//         const isAssigned = invigilator.assignedRooms.some(room => room.roomNo.toString() === student.roomNo.toString());
        
//         if (!isAssigned) {
//             return res.status(403).json({
//                 success: false,
//                 error: 'You are not assigned to this student\'s room',
//             });
//         }

//         // Check if marks are already entered and same
//         if (student.examMarks === marks) {
//             return res.status(400).json({
//                 success: false,
//                 error: 'Marks already entered for this student',
//             });
//         }

//         // Update student marks
//         const updateResult = await Student.updateOne(
//             { _id: studentId },
//             {
//                 $set: {
//                     examMarks: marks,
//                     status: 'Exam Completed',
//                     resultStatus: marks >= 40 ? 'Passed' : 'Failed'
//                 }
//             }
//         );

//         console.log('Update result:', updateResult);

//         if (updateResult.modifiedCount === 0) {
//             return res.status(400).json({
//                 success: false,
//                 error: 'Failed to update marks',
//             });
//         }

//         // Get updated student info
//         const updatedStudent = await Student.findById(studentId)
//             .select('name registrationCode roomNo seatNo examMarks resultStatus');

//         res.json({
//             success: true,
//             message: 'Marks entered successfully',
//             data: {
//                 student: {
//                     name: updatedStudent.name,
//                     registrationCode: updatedStudent.registrationCode,
//                     roomNo: updatedStudent.roomNo,
//                     seatNo: updatedStudent.seatNo,
//                     examMarks: updatedStudent.examMarks,
//                     resultStatus: updatedStudent.resultStatus,
//                 },
//                 enteredBy: {
//                     name: invigilator.name,
//                     email: invigilator.email,
//                 },
//             },
//         });
//     } catch (error) {
//         console.error('Enter marks error:', error);
//         res.status(500).json({
//             success: false,
//             error: 'Server error: ' + error.message,
//         });
//     }
// };

// // Alternative version using studentId parameter
// exports.enterMarksById = async (req, res) => {
//     try {
//         const { studentId } = req.params;
//         const { marks } = req.body;

//         console.log('Enter marks by ID request:', {
//             studentId,
//             marks,
//             invigilatorId: req.user.id
//         });

//         if (!marks || marks < 0 || marks > 100) {
//             return res.status(400).json({
//                 success: false,
//                 error: 'Please enter valid marks between 0 and 100',
//             });
//         }

//         // Check if invigilator exists
//         const invigilator = await Invigilator.findById(req.user.id);
//         if (!invigilator) {
//             return res.status(401).json({
//                 success: false,
//                 error: 'Invigilator not found',
//             });
//         }

//         // Find student by ID
//         const student = await Student.findById(studentId);
//         if (!student) {
//             return res.status(404).json({
//                 success: false,
//                 error: 'Student not found',
//             });
//         }

//         // Check if invigilator is assigned to student's room
//         const isAssigned = invigilator.assignedRooms.some(room => 
//             room.roomNo === student.roomNo
//         );

//         if (!isAssigned) {
//             return res.status(403).json({
//                 success: false,
//                 error: `You are not assigned to Room ${student.roomNo} where this student is located`,
//             });
//         }

//         // Check if marks are already entered and same
//         if (student.examMarks === marks) {
//             return res.status(400).json({
//                 success: false,
//                 error: 'Marks already entered for this student',
//             });
//         }

//         // Update marks
//         const updateResult = await Student.updateOne(
//             { _id: studentId },
//             {
//                 $set: {
//                     examMarks: marks,
//                     status: 'Exam Completed',
//                     resultStatus: marks >= 40 ? 'Passed' : 'Failed',
//                     updatedAt: new Date()
//                 }
//             }
//         );

//         if (updateResult.modifiedCount === 0) {
//             return res.status(400).json({
//                 success: false,
//                 error: 'Failed to update marks',
//             });
//         }

//         // Get updated student data
//         const updatedStudent = await Student.findById(studentId)
//             .select('name registrationCode roomNo seatNo examMarks resultStatus');

//         res.json({
//             success: true,
//             message: 'Marks entered successfully',
//             data: {
//                 student: {
//                     name: updatedStudent.name,
//                     registrationCode: updatedStudent.registrationCode,
//                     roomNo: updatedStudent.roomNo,
//                     seatNo: updatedStudent.seatNo,
//                     examMarks: updatedStudent.examMarks,
//                     resultStatus: updatedStudent.resultStatus,
//                 },
//                 enteredBy: {
//                     name: invigilator.name,
//                     email: invigilator.email,
//                 },
//             },
//         });
//     } catch (error) {
//         console.error('Enter marks by ID error:', error);
//         res.status(500).json({
//             success: false,
//             error: 'Server error: ' + error.message,
//         });
//     }
// };

// // Bulk enter marks for room
// exports.bulkEnterMarks = async (req, res) => {
//     try {
//         const { roomNo } = req.params;
//         const { marksData } = req.body;

//         console.log('Bulk marks request received:', {
//             roomNo,
//             marksData,
//             invigilatorId: req.user.id
//         });

//         if (!Array.isArray(marksData) || marksData.length === 0) {
//             return res.status(400).json({
//                 success: false,
//                 error: 'Please provide marks data array',
//             });
//         }

//         // Check if invigilator is assigned to this room
//         const invigilator = await Invigilator.findById(req.user.id);
//         console.log('Invigilator found:', invigilator?.name);
        
//         const isAssigned = invigilator?.assignedRooms?.some(room => room.roomNo === roomNo);
//         console.log('Is assigned to room?', isAssigned);

//         if (!isAssigned) {
//             return res.status(403).json({
//                 success: false,
//                 error: 'You are not assigned to this room',
//             });
//         }

//         const results = [];
//         const errors = [];

//         for (const item of marksData) {
//             try {
//                 console.log('Processing student:', {
//                     registrationCode: item.registrationCode,
//                     roomNo,
//                     marks: item.marks
//                 });

//                 // First, let's check if student exists at all
//                 const allStudents = await Student.find({ 
//                     registrationCode: item.registrationCode 
//                 });
//                 console.log('Found students with this code:', allStudents.length);

//                 // Try finding student with exact room number
//                 const student = await Student.findOne({
//                     registrationCode: item.registrationCode,
//                     roomNo: roomNo
//                 });

//                 console.log('Student found in room?', !!student);
                
//                 if (!student) {
//                     // Let's find where the student actually is
//                     const studentAnywhere = await Student.findOne({
//                         registrationCode: item.registrationCode
//                     });
                    
//                     if (studentAnywhere) {
//                         errors.push({
//                             registrationCode: item.registrationCode,
//                             error: `Student found but in Room ${studentAnywhere.roomNo}, not Room ${roomNo}`,
//                             actualRoom: studentAnywhere.roomNo
//                         });
//                     } else {
//                         errors.push({
//                             registrationCode: item.registrationCode,
//                             error: 'Student not found with this registration code'
//                         });
//                     }
//                     continue;
//                 }

//                 if (item.marks < 0 || item.marks > 100) {
//                     errors.push({
//                         registrationCode: item.registrationCode,
//                         error: 'Invalid marks (must be 0-100)',
//                     });
//                     continue;
//                 }

//                 // Use updateOne instead of save() to avoid validation issues
//                 const updateResult = await Student.updateOne(
//                     { 
//                         _id: student._id,
//                         registrationCode: item.registrationCode,
//                         roomNo: roomNo
//                     },
//                     {
//                         $set: {
//                             examMarks: item.marks,
//                             status: 'Exam Completed',
//                             resultStatus: item.marks >= 40 ? 'Passed' : 'Failed',
//                             updatedAt: new Date()
//                         }
//                     }
//                 );

//                 console.log('Update result:', updateResult);

//                 if (updateResult.modifiedCount > 0) {
//                     results.push({
//                         registrationCode: student.registrationCode,
//                         name: student.name,
//                         marks: item.marks,
//                         success: true,
//                         roomNo: student.roomNo
//                     });
//                 } else {
//                     errors.push({
//                         registrationCode: item.registrationCode,
//                         error: 'Failed to update marks'
//                     });
//                 }
//             } catch (error) {
//                 console.error('Error processing student:', error);
//                 errors.push({
//                     registrationCode: item.registrationCode || 'Unknown',
//                     error: error.message,
//                 });
//             }
//         }

//         res.json({
//             success: true,
//             message: `Bulk marks entry completed. Success: ${results.length}, Failed: ${errors.length}`,
//             data: {
//                 processed: marksData.length,
//                 successful: results.length,
//                 failed: errors.length,
//                 results,
//                 errors,
//             },
//         });
//     } catch (error) {
//         console.error('Bulk enter marks error:', error);
//         res.status(500).json({
//             success: false,
//             error: 'Server error: ' + error.message,
//         });
//     }
// };

// // Get invigilator profile
// exports.getProfile = async (req, res) => {
//     try {
//         const invigilator = await Invigilator.findById(req.user.id)
//             .select('-password -__v');

//         if (!invigilator) {
//             return res.status(404).json({
//                 success: false,
//                 error: 'Invigilator not found',
//             });
//         }

//         res.json({
//             success: true,
//             data: invigilator,
//         });
//     } catch (error) {
//         console.error('Get profile error:', error);
//         res.status(500).json({
//             success: false,
//             error: 'Server error',
//         });
//     }
// };

// // Update invigilator profile
// exports.updateProfile = async (req, res) => {
//     try {
//         const { name, phone, currentPassword, newPassword } = req.body;
//         const updateData = {};

//         if (name) updateData.name = name;
//         if (phone) updateData.phone = phone;

//         // Handle password change
//         if (currentPassword && newPassword) {
//             const invigilator = await Invigilator.findById(req.user.id);
//             const isMatch = await bcrypt.compare(currentPassword, invigilator.password);

//             if (!isMatch) {
//                 return res.status(400).json({
//                     success: false,
//                     error: 'Current password is incorrect',
//                 });
//             }

//             if (newPassword.length < 6) {
//                 return res.status(400).json({
//                     success: false,
//                     error: 'New password must be at least 6 characters',
//                 });
//             }

//             updateData.password = newPassword;
//         }

//         const updatedInvigilator = await Invigilator.findByIdAndUpdate(
//             req.user.id,
//             updateData,
//             { new: true, runValidators: true }
//         ).select('-password -__v');

//         res.json({
//             success: true,
//             message: 'Profile updated successfully',
//             data: updatedInvigilator,
//         });
//     } catch (error) {
//         console.error('Update profile error:', error);
//         res.status(500).json({
//             success: false,
//             error: 'Server error',
//         });
//     }
// };


const Invigilator = require('../models/Invigilator');
const Student = require('../models/Student');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Invigilator login
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Email and password are required',
            });
        }

        const invigilator = await Invigilator.findOne({ email: email.toLowerCase() });

        if (!invigilator) {
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials',
            });
        }

        if (!invigilator.isActive) {
            return res.status(401).json({
                success: false,
                error: 'Account is deactivated',
            });
        }

        const isMatch = await bcrypt.compare(password, invigilator.password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials',
            });
        }

        // Update last login
        invigilator.lastLogin = new Date();
        await invigilator.save();

        const token = jwt.sign(
            {
                id: invigilator._id,
                name: invigilator.name,
                email: invigilator.email,
                role: invigilator.role,
            },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '12h' }
        );

        res.json({
            success: true,
            token,
            invigilator: {
                id: invigilator._id,
                name: invigilator.name,
                email: invigilator.email,
                phone: invigilator.phone,
                assignedRooms: invigilator.assignedRooms,
            },
        });
    } catch (error) {
        console.error('Invigilator login error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error',
        });
    }
};

// Get invigilator dashboard
exports.getDashboard = async (req, res) => {
    try {
        const invigilator = await Invigilator.findById(req.user.id)
            .select('-password -__v');

        if (!invigilator) {
            return res.status(404).json({
                success: false,
                error: 'Invigilator not found',
            });
        }

        // Get assigned rooms details
        const roomDetails = [];
        for (const room of invigilator.assignedRooms) {
            const students = await Student.find({ roomNo: room.roomNo })
                .select('name registrationCode seatNo studyingClass examMarks resultStatus markEntryStatus submittedAt')
                .sort({ seatNo: 1 });

            const totalStudents = students.length;
            const marksEntered = students.filter(s => s.examMarks > 0).length;
            const marksDraft = students.filter(s => s.markEntryStatus === 'draft').length;
            const marksSubmitted = students.filter(s => s.markEntryStatus === 'submitted').length;
            const marksPending = students.filter(s => s.examMarks === 0).length;

            roomDetails.push({
                roomNo: room.roomNo,
                examDate: room.examDate,
                totalStudents,
                marksEntered,
                marksDraft,
                marksSubmitted,
                marksPending,
                students,
            });
        }

        // Get summary stats
        const totalAssignedRooms = invigilator.assignedRooms.length;
        const totalStudents = roomDetails.reduce((sum, room) => sum + room.totalStudents, 0);
        const totalMarksEntered = roomDetails.reduce((sum, room) => sum + room.marksEntered, 0);
        const totalMarksDraft = roomDetails.reduce((sum, room) => sum + room.marksDraft, 0);
        const totalMarksSubmitted = roomDetails.reduce((sum, room) => sum + room.marksSubmitted, 0);

        res.json({
            success: true,
            dashboard: {
                invigilator: {
                    name: invigilator.name,
                    email: invigilator.email,
                    lastLogin: invigilator.lastLogin,
                },
                stats: {
                    totalAssignedRooms,
                    totalStudents,
                    totalMarksEntered,
                    totalMarksDraft,
                    totalMarksSubmitted,
                    totalMarksPending: totalStudents - totalMarksEntered,
                },
                assignedRooms: roomDetails,
            },
        });
    } catch (error) {
        console.error('Get dashboard error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error',
        });
    }
};

// Get students in assigned room
exports.getRoomStudents = async (req, res) => {
    try {
        const { roomNo } = req.params;
        const requestedRoom = parseInt(roomNo); // Ensure it's a number

        // Check if invigilator is assigned to this room
        const invigilator = await Invigilator.findById(req.user.id);
        
        console.log('GetRoomStudents Debug:', {
            requestedRoom,
            requestedRoomType: typeof requestedRoom,
            invigilatorRooms: invigilator.assignedRooms.map(r => ({
                roomNo: r.roomNo,
                type: typeof r.roomNo,
                examDate: r.examDate
            }))
        });

        const isAssigned = invigilator.assignedRooms.some(room => {
            // Convert both to numbers for comparison
            const assignedRoomNo = parseInt(room.roomNo);
            return assignedRoomNo === requestedRoom;
        });

        console.log('Assignment check result:', {
            isAssigned,
            requestedRoom,
            requestedRoomType: typeof requestedRoom
        });

        if (!isAssigned) {
            return res.status(403).json({
                success: false,
                error: `You are not assigned to Room ${requestedRoom}`,
                debug: {
                    yourAssignedRooms: invigilator.assignedRooms.map(r => r.roomNo),
                    requestedRoom
                }
            });
        }

        const students = await Student.find({ roomNo: requestedRoom })
            .select('name registrationCode seatNo studyingClass fatherName phoneNo examMarks resultStatus markEntryStatus submittedAt')
            .sort({ seatNo: 1 });

        if (!students || students.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'No students found in this room',
            });
        }

        const roomStats = {
            roomNo: requestedRoom,
            totalStudents: students.length,
            marksEntered: students.filter(s => s.examMarks > 0).length,
            marksDraft: students.filter(s => s.markEntryStatus === 'draft').length,
            marksSubmitted: students.filter(s => s.markEntryStatus === 'submitted').length,
            marksPending: students.filter(s => s.examMarks === 0).length,
        };

        res.json({
            success: true,
            data: {
                roomStats,
                students,
            },
        });
    } catch (error) {
        console.error('Get room students error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error',
        });
    }
};

// Enter or update marks for single student (draft mode)
exports.enterMarks = async (req, res) => {
    try {
        const { studentId } = req.params;
        const { marks } = req.body;

        console.log('Enter marks request received:', {
            studentId,
            marks,
            invigilatorId: req.user.id
        });

        if (!marks || marks < 0 || marks > 100) {
            return res.status(400).json({
                success: false,
                error: 'Please enter valid marks between 0 and 100',
            });
        }

        // Check if invigilator is assigned to this room
        const invigilator = await Invigilator.findById(req.user.id);
        if (!invigilator) {
            return res.status(401).json({
                success: false,
                error: 'Invigilator not found',
            });
        }

        // Find student and check room assignment
        const student = await Student.findById(studentId)
            .select('name registrationCode roomNo seatNo examMarks markEntryStatus submittedAt');
        
        if (!student) {
            return res.status(404).json({
                success: false,
                error: 'Student not found',
            });
        }

        console.log('Assignment Debug - Enter Marks:', {
            invigilatorId: invigilator._id.toString(),
            invigilatorName: invigilator.name,
            invigilatorRooms: invigilator.assignedRooms.map(r => ({
                roomNo: r.roomNo,
                type: typeof r.roomNo,
                examDate: r.examDate
            })),
            studentRoomNo: student.roomNo,
            studentRoomNoType: typeof student.roomNo,
            studentId: student._id.toString(),
            studentName: student.name
        });

        // Check if student marks are already submitted
        if (student.markEntryStatus === 'submitted') {
            return res.status(403).json({
                success: false,
                error: 'Marks have already been submitted and cannot be edited',
            });
        }

        // Check if invigilator is assigned to student's room - convert both to numbers for comparison
        const studentRoomNum = parseInt(student.roomNo);
        const isAssigned = invigilator.assignedRooms.some(room => {
            const assignedRoomNum = parseInt(room.roomNo);
            return assignedRoomNum === studentRoomNum;
        });

        console.log('Assignment check result:', {
            isAssigned,
            studentRoomNum,
            studentRoomNumType: typeof studentRoomNum,
            assignedRoomsNumbers: invigilator.assignedRooms.map(r => parseInt(r.roomNo))
        });
        
        if (!isAssigned) {
            return res.status(403).json({
                success: false,
                error: `You are not assigned to Room ${student.roomNo} where this student is located`,
                debug: {
                    yourAssignedRooms: invigilator.assignedRooms.map(r => r.roomNo),
                    studentRoom: student.roomNo
                }
            });
        }

        // Determine action for history
        let action = 'entered';
        if (student.examMarks > 0) {
            action = 'updated';
        }

        // Store previous marks for history
        const previousMarks = student.examMarks;

        // Update student marks
        const updateResult = await Student.updateOne(
            { _id: studentId },
            {
                $set: {
                    examMarks: marks,
                    markEntryStatus: 'draft',
                    resultStatus: marks >= 40 ? 'Passed' : 'Failed',
                    lastEditedAt: new Date(),
                    currentEditor: invigilator._id,
                    currentEditorModel: 'Invigilator',
                    currentEditorName: invigilator.name
                }
            }
        );

        console.log('Update result:', updateResult);

        if (updateResult.modifiedCount === 0) {
            return res.status(400).json({
                success: false,
                error: 'Failed to update marks',
            });
        }

        // Add to mark history
        const updatedStudent = await Student.findById(studentId);
        await updatedStudent.addMarkHistory(
            marks,
            invigilator._id,
            'Invigilator',
            invigilator.name,
            action,
            previousMarks,
            'Marks saved as draft'
        );

        // Get updated student info
        const finalStudent = await Student.findById(studentId)
            .select('name registrationCode roomNo seatNo examMarks resultStatus markEntryStatus');

        res.json({
            success: true,
            message: 'Marks saved as draft',
            data: {
                student: {
                    name: finalStudent.name,
                    registrationCode: finalStudent.registrationCode,
                    roomNo: finalStudent.roomNo,
                    seatNo: finalStudent.seatNo,
                    examMarks: finalStudent.examMarks,
                    resultStatus: finalStudent.resultStatus,
                    markEntryStatus: finalStudent.markEntryStatus,
                },
                enteredBy: {
                    name: invigilator.name,
                    email: invigilator.email,
                },
            },
        });
    } catch (error) {
        console.error('Enter marks error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error: ' + error.message,
        });
    }
};

// Submit marks for a student (final submission by invigilator)
exports.submitMarks = async (req, res) => {
    try {
        const { studentId } = req.params;

        console.log('Submit marks request received:', {
            studentId,
            invigilatorId: req.user.id
        });

        // Check if invigilator exists
        const invigilator = await Invigilator.findById(req.user.id);
        if (!invigilator) {
            return res.status(401).json({
                success: false,
                error: 'Invigilator not found',
            });
        }

        // Find student
        const student = await Student.findById(studentId);
        if (!student) {
            return res.status(404).json({
                success: false,
                error: 'Student not found',
            });
        }

        // Log the types for debugging
        console.log("Type check:", {
            studentRoomNo: student.roomNo,
            studentRoomNoType: typeof student.roomNo,
            invigilatorRooms: invigilator.assignedRooms.map(r => ({
                roomNo: r.roomNo,
                type: typeof r.roomNo
            }))
        });

        // Check if invigilator is assigned to student's room - convert both to same type for comparison
        const isAssigned = invigilator.assignedRooms.some(room => {
            // Convert both to numbers for comparison
            const assignedRoomNo = parseInt(room.roomNo);
            const studentRoomNo = parseInt(student.roomNo);
            return assignedRoomNo === studentRoomNo;
        });

        console.log("Assignment check result:", {
            isAssigned,
            studentRoomNo: student.roomNo,
            studentRoomNoNum: parseInt(student.roomNo),
            invigilatorRoomNumbers: invigilator.assignedRooms.map(r => parseInt(r.roomNo))
        });

        if (!isAssigned) {
            return res.status(403).json({
                success: false,
                error: `You are not assigned to Room ${student.roomNo} where this student is located`,
                debug: {
                    yourAssignedRooms: invigilator.assignedRooms.map(r => r.roomNo),
                    studentRoom: student.roomNo
                }
            });
        }

        // Check if marks are entered
        if (!student.examMarks || student.examMarks === 0) {
            return res.status(400).json({
                success: false,
                error: 'Cannot submit without entering marks',
            });
        }

        // Check if already submitted
        if (student.markEntryStatus === 'submitted') {
            return res.status(400).json({
                success: false,
                error: 'Marks are already submitted',
            });
        }

        if (student.markEntryStatus === 'final') {
            return res.status(400).json({
                success: false,
                error: 'Marks are already finalized and cannot be submitted',
            });
        }

        // Submit marks
        await student.submitMarks(invigilator._id, invigilator.name);

        // Update student status
        await Student.updateOne(
            { _id: studentId },
            {
                $set: {
                    status: 'Exam Completed'
                }
            }
        );

        // Get updated student info
        const updatedStudent = await Student.findById(studentId)
            .select('name registrationCode roomNo seatNo examMarks resultStatus markEntryStatus submittedAt');

        res.json({
            success: true,
            message: 'Marks submitted successfully',
            data: {
                student: {
                    name: updatedStudent.name,
                    registrationCode: updatedStudent.registrationCode,
                    roomNo: updatedStudent.roomNo,
                    seatNo: updatedStudent.seatNo,
                    examMarks: updatedStudent.examMarks,
                    resultStatus: updatedStudent.resultStatus,
                    markEntryStatus: updatedStudent.markEntryStatus,
                    submittedAt: updatedStudent.submittedAt,
                },
                submittedBy: {
                    name: invigilator.name,
                    email: invigilator.email,
                },
            },
        });
    } catch (error) {
        console.error('Submit marks error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error: ' + error.message,
        });
    }
};

// Submit all marks for a room
exports.submitRoomMarks = async (req, res) => {
    try {
        const { roomNo } = req.params;

        console.log('Submit room marks request received:', {
            roomNo,
            invigilatorId: req.user.id
        });

        // Check if invigilator exists
        const invigilator = await Invigilator.findById(req.user.id);
        if (!invigilator) {
            return res.status(401).json({
                success: false,
                error: 'Invigilator not found',
            });
        }

        // Check if invigilator is assigned to this room
        const isAssigned = invigilator.assignedRooms.some(room => room.roomNo === roomNo);
        if (!isAssigned) {
            return res.status(403).json({
                success: false,
                error: `You are not assigned to Room ${roomNo}`,
            });
        }

        // Find all draft students in the room
        const draftStudents = await Student.find({ 
            roomNo: roomNo,
            markEntryStatus: 'draft'
        });

        if (draftStudents.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No draft marks found in this room',
            });
        }

        // Check for students with no marks
        const studentsWithNoMarks = await Student.find({
            roomNo: roomNo,
            examMarks: 0
        });

        if (studentsWithNoMarks.length > 0) {
            return res.status(400).json({
                success: false,
                error: `Cannot submit: ${studentsWithNoMarks.length} students have no marks entered`,
            });
        }

        // Submit all draft students
        const submitPromises = draftStudents.map(student => 
            student.submitMarks(invigilator._id, invigilator.name)
        );

        await Promise.all(submitPromises);

        // Update status for all students in the room
        await Student.updateMany(
            { roomNo: roomNo },
            { $set: { status: 'Exam Completed' } }
        );

        res.json({
            success: true,
            message: `Successfully submitted marks for ${draftStudents.length} students in Room ${roomNo}`,
            data: {
                roomNo,
                submittedCount: draftStudents.length,
            },
        });
    } catch (error) {
        console.error('Submit room marks error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error: ' + error.message,
        });
    }
};

// Alternative version using studentId parameter
exports.enterMarksById = async (req, res) => {
    try {
        const { studentId } = req.params;
        const { marks } = req.body;

        console.log('Enter marks by ID request:', {
            studentId,
            marks,
            invigilatorId: req.user.id
        });

        if (!marks || marks < 0 || marks > 100) {
            return res.status(400).json({
                success: false,
                error: 'Please enter valid marks between 0 and 100',
            });
        }

        // Check if invigilator exists
        const invigilator = await Invigilator.findById(req.user.id);
        if (!invigilator) {
            return res.status(401).json({
                success: false,
                error: 'Invigilator not found',
            });
        }

        // Find student by ID
        const student = await Student.findById(studentId);
        if (!student) {
            return res.status(404).json({
                success: false,
                error: 'Student not found',
            });
        }

        // Check if student marks are already submitted
        if (student.markEntryStatus === 'submitted') {
            return res.status(403).json({
                success: false,
                error: 'Marks have already been submitted and cannot be edited',
            });
        }

        // Check if invigilator is assigned to student's room
        const isAssigned = invigilator.assignedRooms.some(room => 
            room.roomNo === student.roomNo
        );

        if (!isAssigned) {
            return res.status(403).json({
                success: false,
                error: `You are not assigned to Room ${student.roomNo} where this student is located`,
            });
        }

        // Determine action for history
        let action = 'entered';
        if (student.examMarks > 0) {
            action = 'updated';
        }

        // Store previous marks for history
        const previousMarks = student.examMarks;

        // Update marks
        const updateResult = await Student.updateOne(
            { _id: studentId },
            {
                $set: {
                    examMarks: marks,
                    markEntryStatus: 'draft',
                    resultStatus: marks >= 40 ? 'Passed' : 'Failed',
                    lastEditedAt: new Date(),
                    currentEditor: invigilator._id,
                    currentEditorModel: 'Invigilator',
                    currentEditorName: invigilator.name
                }
            }
        );

        if (updateResult.modifiedCount === 0) {
            return res.status(400).json({
                success: false,
                error: 'Failed to update marks',
            });
        }

        // Add to mark history
        const updatedStudent = await Student.findById(studentId);
        await updatedStudent.addMarkHistory(
            marks,
            invigilator._id,
            'Invigilator',
            invigilator.name,
            action,
            previousMarks,
            'Marks saved as draft'
        );

        // Get updated student data
        const finalStudent = await Student.findById(studentId)
            .select('name registrationCode roomNo seatNo examMarks resultStatus markEntryStatus');

        res.json({
            success: true,
            message: 'Marks saved as draft',
            data: {
                student: {
                    name: finalStudent.name,
                    registrationCode: finalStudent.registrationCode,
                    roomNo: finalStudent.roomNo,
                    seatNo: finalStudent.seatNo,
                    examMarks: finalStudent.examMarks,
                    resultStatus: finalStudent.resultStatus,
                    markEntryStatus: finalStudent.markEntryStatus,
                },
                enteredBy: {
                    name: invigilator.name,
                    email: invigilator.email,
                },
            },
        });
    } catch (error) {
        console.error('Enter marks by ID error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error: ' + error.message,
        });
    }
};

// Bulk enter marks for room
exports.bulkEnterMarks = async (req, res) => {
    try {
        const { roomNo } = req.params;
        const { marksData } = req.body;

        console.log('Bulk marks request received:', {
            roomNo,
            marksData,
            invigilatorId: req.user.id
        });

        if (!Array.isArray(marksData) || marksData.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Please provide marks data array',
            });
        }

        // Check if invigilator is assigned to this room
        const invigilator = await Invigilator.findById(req.user.id);
        console.log('Invigilator found:', invigilator?.name);
        
        const isAssigned = invigilator?.assignedRooms?.some(room => room.roomNo === roomNo);
        console.log('Is assigned to room?', isAssigned);

        if (!isAssigned) {
            return res.status(403).json({
                success: false,
                error: 'You are not assigned to this room',
            });
        }

        const results = [];
        const errors = [];

        for (const item of marksData) {
            try {
                console.log('Processing student:', {
                    registrationCode: item.registrationCode,
                    roomNo,
                    marks: item.marks
                });

                // Try finding student with exact room number
                const student = await Student.findOne({
                    registrationCode: item.registrationCode,
                    roomNo: roomNo
                });

                console.log('Student found in room?', !!student);
                
                if (!student) {
                    // Let's find where the student actually is
                    const studentAnywhere = await Student.findOne({
                        registrationCode: item.registrationCode
                    });
                    
                    if (studentAnywhere) {
                        errors.push({
                            registrationCode: item.registrationCode,
                            error: `Student found but in Room ${studentAnywhere.roomNo}, not Room ${roomNo}`,
                            actualRoom: studentAnywhere.roomNo
                        });
                    } else {
                        errors.push({
                            registrationCode: item.registrationCode,
                            error: 'Student not found with this registration code'
                        });
                    }
                    continue;
                }

                // Check if marks are already submitted
                if (student.markEntryStatus === 'submitted') {
                    errors.push({
                        registrationCode: item.registrationCode,
                        error: 'Marks already submitted for this student',
                    });
                    continue;
                }

                if (item.marks < 0 || item.marks > 100) {
                    errors.push({
                        registrationCode: item.registrationCode,
                        error: 'Invalid marks (must be 0-100)',
                    });
                    continue;
                }

                // Determine action for history
                let action = 'entered';
                if (student.examMarks > 0) {
                    action = 'updated';
                }

                // Store previous marks for history
                const previousMarks = student.examMarks;

                // Use updateOne instead of save() to avoid validation issues
                const updateResult = await Student.updateOne(
                    { 
                        _id: student._id,
                        registrationCode: item.registrationCode,
                        roomNo: roomNo
                    },
                    {
                        $set: {
                            examMarks: item.marks,
                            markEntryStatus: 'draft',
                            resultStatus: item.marks >= 40 ? 'Passed' : 'Failed',
                            lastEditedAt: new Date(),
                            currentEditor: invigilator._id,
                            currentEditorModel: 'Invigilator',
                            currentEditorName: invigilator.name,
                            updatedAt: new Date()
                        }
                    }
                );

                console.log('Update result:', updateResult);

                if (updateResult.modifiedCount > 0) {
                    // Add to mark history
                    const updatedStudent = await Student.findById(student._id);
                    await updatedStudent.addMarkHistory(
                        item.marks,
                        invigilator._id,
                        'Invigilator',
                        invigilator.name,
                        action,
                        previousMarks,
                        'Marks saved as draft via bulk entry'
                    );

                    results.push({
                        registrationCode: student.registrationCode,
                        name: student.name,
                        marks: item.marks,
                        success: true,
                        roomNo: student.roomNo
                    });
                } else {
                    errors.push({
                        registrationCode: item.registrationCode,
                        error: 'Failed to update marks'
                    });
                }
            } catch (error) {
                console.error('Error processing student:', error);
                errors.push({
                    registrationCode: item.registrationCode || 'Unknown',
                    error: error.message,
                });
            }
        }

        res.json({
            success: true,
            message: `Bulk marks entry completed. Success: ${results.length}, Failed: ${errors.length}`,
            data: {
                processed: marksData.length,
                successful: results.length,
                failed: errors.length,
                results,
                errors,
            },
        });
    } catch (error) {
        console.error('Bulk enter marks error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error: ' + error.message,
        });
    }
};

// Get pending submissions
exports.getPendingSubmissions = async (req, res) => {
    try {
        const invigilator = await Invigilator.findById(req.user.id);
        if (!invigilator) {
            return res.status(401).json({
                success: false,
                error: 'Invigilator not found',
            });
        }

        const roomNumbers = invigilator.assignedRooms.map(r => r.roomNo);
        
        const pendingSubmissions = await Student.find({
            roomNo: { $in: roomNumbers },
            markEntryStatus: 'draft',
            examMarks: { $gt: 0 }
        }).select('name registrationCode roomNo seatNo examMarks lastEditedAt');

        const roomStats = {};
        pendingSubmissions.forEach(student => {
            if (!roomStats[student.roomNo]) {
                roomStats[student.roomNo] = 0;
            }
            roomStats[student.roomNo]++;
        });

        res.json({
            success: true,
            data: {
                totalPending: pendingSubmissions.length,
                roomStats,
                students: pendingSubmissions
            }
        });
    } catch (error) {
        console.error('Get pending submissions error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error: ' + error.message,
        });
    }
};

// Get mark history for a student
exports.getStudentMarkHistory = async (req, res) => {
    try {
        const { studentId } = req.params;

        // Check if invigilator is assigned to this student's room
        const invigilator = await Invigilator.findById(req.user.id);
        const student = await Student.findById(studentId);
        
        if (!student) {
            return res.status(404).json({
                success: false,
                error: 'Student not found',
            });
        }

        console.log('GetMarkHistory Debug:', {
            invigilatorId: invigilator._id.toString(),
            invigilatorRooms: invigilator.assignedRooms.map(r => ({
                roomNo: r.roomNo,
                type: typeof r.roomNo
            })),
            studentRoomNo: student.roomNo,
            studentRoomNoType: typeof student.roomNo
        });

        // Convert both to numbers for comparison
        const studentRoomNum = parseInt(student.roomNo);
        const isAssigned = invigilator.assignedRooms.some(room => {
            const assignedRoomNum = parseInt(room.roomNo);
            return assignedRoomNum === studentRoomNum;
        });

        console.log('Assignment check result for history:', {
            isAssigned,
            studentRoomNum,
            assignedRoomsNumbers: invigilator.assignedRooms.map(r => parseInt(r.roomNo))
        });

        if (!isAssigned) {
            return res.status(403).json({
                success: false,
                error: 'You are not assigned to this student\'s room',
            });
        }

        const history = await Student.getMarkHistory(studentId);

        res.json({
            success: true,
            data: history
        });
    } catch (error) {
        console.error('Get mark history error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error: ' + error.message,
        });
    }
};
// Get invigilator profile
exports.getProfile = async (req, res) => {
    try {
        const invigilator = await Invigilator.findById(req.user.id)
            .select('-password -__v');

        if (!invigilator) {
            return res.status(404).json({
                success: false,
                error: 'Invigilator not found',
            });
        }

        res.json({
            success: true,
            data: invigilator,
        });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error',
        });
    }
};

// Update invigilator profile
exports.updateProfile = async (req, res) => {
    try {
        const { name, phone, currentPassword, newPassword } = req.body;
        const updateData = {};

        if (name) updateData.name = name;
        if (phone) updateData.phone = phone;

        // Handle password change
        if (currentPassword && newPassword) {
            const invigilator = await Invigilator.findById(req.user.id);
            const isMatch = await bcrypt.compare(currentPassword, invigilator.password);

            if (!isMatch) {
                return res.status(400).json({
                    success: false,
                    error: 'Current password is incorrect',
                });
            }

            if (newPassword.length < 6) {
                return res.status(400).json({
                    success: false,
                    error: 'New password must be at least 6 characters',
                });
            }

            updateData.password = newPassword;
        }

        const updatedInvigilator = await Invigilator.findByIdAndUpdate(
            req.user.id,
            updateData,
            { new: true, runValidators: true }
        ).select('-password -__v');

        res.json({
            success: true,
            message: 'Profile updated successfully',
            data: updatedInvigilator,
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error',
        });
    }
};