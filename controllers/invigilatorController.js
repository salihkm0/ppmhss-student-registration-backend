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
                .select('name registrationCode seatNo studyingClass examMarks resultStatus')
                .sort({ seatNo: 1 });

            const totalStudents = students.length;
            const marksEntered = students.filter(s => s.examMarks > 0).length;
            const marksPending = totalStudents - marksEntered;

            roomDetails.push({
                roomNo: room.roomNo,
                examDate: room.examDate,
                totalStudents,
                marksEntered,
                marksPending,
                students,
            });
        }

        // Get summary stats
        const totalAssignedRooms = invigilator.assignedRooms.length;
        const totalStudents = roomDetails.reduce((sum, room) => sum + room.totalStudents, 0);
        const totalMarksEntered = roomDetails.reduce((sum, room) => sum + room.marksEntered, 0);

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

        // Check if invigilator is assigned to this room
        const invigilator = await Invigilator.findById(req.user.id);
        const isAssigned = invigilator.assignedRooms.some(room => room.roomNo === roomNo);

        if (!isAssigned) {
            return res.status(403).json({
                success: false,
                error: 'You are not assigned to this room',
            });
        }

        const students = await Student.find({ roomNo })
            .select('name registrationCode seatNo studyingClass fatherName phoneNo examMarks resultStatus')
            .sort({ seatNo: 1 });

        if (!students || students.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'No students found in this room',
            });
        }

        const roomStats = {
            roomNo,
            totalStudents: students.length,
            marksEntered: students.filter(s => s.examMarks > 0).length,
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

// Enter marks for single student
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

        console.log('Invigilator:', invigilator.name);
        console.log('Assigned rooms:', invigilator.assignedRooms);

        // Find student and check room assignment
        const student = await Student.findById(studentId)
            .select('name registrationCode roomNo seatNo examMarks');
        
        if (!student) {
            return res.status(404).json({
                success: false,
                error: 'Student not found',
            });
        }

        console.log('Student found:', {
            name: student.name,
            registrationCode: student.registrationCode,
            roomNo: student.roomNo,
            seatNo: student.seatNo
        });

        // Check if invigilator is assigned to student's room
        const isAssigned = invigilator.assignedRooms.some(room => room.roomNo.toString() === student.roomNo.toString());
        
        if (!isAssigned) {
            return res.status(403).json({
                success: false,
                error: 'You are not assigned to this student\'s room',
            });
        }

        // Check if marks are already entered and same
        if (student.examMarks === marks) {
            return res.status(400).json({
                success: false,
                error: 'Marks already entered for this student',
            });
        }

        // Update student marks
        const updateResult = await Student.updateOne(
            { _id: studentId },
            {
                $set: {
                    examMarks: marks,
                    status: 'Exam Completed',
                    resultStatus: marks >= 40 ? 'Passed' : 'Failed'
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

        // Get updated student info
        const updatedStudent = await Student.findById(studentId)
            .select('name registrationCode roomNo seatNo examMarks resultStatus');

        res.json({
            success: true,
            message: 'Marks entered successfully',
            data: {
                student: {
                    name: updatedStudent.name,
                    registrationCode: updatedStudent.registrationCode,
                    roomNo: updatedStudent.roomNo,
                    seatNo: updatedStudent.seatNo,
                    examMarks: updatedStudent.examMarks,
                    resultStatus: updatedStudent.resultStatus,
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

        // Check if marks are already entered and same
        if (student.examMarks === marks) {
            return res.status(400).json({
                success: false,
                error: 'Marks already entered for this student',
            });
        }

        // Update marks
        const updateResult = await Student.updateOne(
            { _id: studentId },
            {
                $set: {
                    examMarks: marks,
                    status: 'Exam Completed',
                    resultStatus: marks >= 40 ? 'Passed' : 'Failed',
                    updatedAt: new Date()
                }
            }
        );

        if (updateResult.modifiedCount === 0) {
            return res.status(400).json({
                success: false,
                error: 'Failed to update marks',
            });
        }

        // Get updated student data
        const updatedStudent = await Student.findById(studentId)
            .select('name registrationCode roomNo seatNo examMarks resultStatus');

        res.json({
            success: true,
            message: 'Marks entered successfully',
            data: {
                student: {
                    name: updatedStudent.name,
                    registrationCode: updatedStudent.registrationCode,
                    roomNo: updatedStudent.roomNo,
                    seatNo: updatedStudent.seatNo,
                    examMarks: updatedStudent.examMarks,
                    resultStatus: updatedStudent.resultStatus,
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

                // First, let's check if student exists at all
                const allStudents = await Student.find({ 
                    registrationCode: item.registrationCode 
                });
                console.log('Found students with this code:', allStudents.length);

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

                if (item.marks < 0 || item.marks > 100) {
                    errors.push({
                        registrationCode: item.registrationCode,
                        error: 'Invalid marks (must be 0-100)',
                    });
                    continue;
                }

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
                            status: 'Exam Completed',
                            resultStatus: item.marks >= 40 ? 'Passed' : 'Failed',
                            updatedAt: new Date()
                        }
                    }
                );

                console.log('Update result:', updateResult);

                if (updateResult.modifiedCount > 0) {
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