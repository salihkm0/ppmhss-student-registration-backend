const Student = require('../models/Student');
const { validationResult } = require('express-validator');

// Helper function to log registration notification
const logRegistrationNotification = async (student) => {
    console.log('='.repeat(60));
    console.log('📋 REGISTRATION NOTIFICATION');
    console.log('='.repeat(60));
    console.log(`Student: ${student.name}`);
    console.log(`Phone: ${student.phoneNo}`);
    console.log(`Application No: ${student.applicationNo}`);
    console.log(`Registration Code: ${student.registrationCode}`);
    console.log(`Room No: ${student.roomNo}`);
    console.log(`Seat No: ${student.seatNo}`);
    console.log(`Aadhaar: ${student.aadhaarNo}`);
    console.log('='.repeat(60));
};

// Get next application number
const getNextApplicationNo = async (req, res) => {
    try {
        const year = new Date().getFullYear().toString().slice(-2);
        const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
        
        const lastStudent = await Student.findOne({}, {}, { sort: { 'applicationNo': -1 } });
        
        let nextNumber = 1;
        if (lastStudent && lastStudent.applicationNo) {
            const lastAppNo = lastStudent.applicationNo;
            const lastSequence = parseInt(lastAppNo.slice(-4)) || 0;
            nextNumber = lastSequence + 1;
        }
        
        const nextAppNo = `APP${year}${month}${String(nextNumber).padStart(4, '0')}`;
        
        res.json({
            success: true,
            data: {
                nextApplicationNo: nextAppNo
            }
        });
    } catch (error) {
        console.error('Error getting next application number:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get next application number'
        });
    }
};

// Get next registration code
const getNextRegistrationCode = async (req, res) => {
    try {
        const lastStudent = await Student.findOne({}, {}, { sort: { 'registrationCode': -1 } });
        
        let nextNumber = 1000;
        
        if (lastStudent && lastStudent.registrationCode) {
            const lastRegCode = lastStudent.registrationCode;
            const match = lastRegCode.match(/PPM(\d+)/);
            if (match && match[1]) {
                const lastNumber = parseInt(match[1]);
                if (!isNaN(lastNumber) && lastNumber >= 1000) {
                    nextNumber = lastNumber + 1;
                }
            }
        }
        
        const nextRegCode = `PPM${nextNumber}`;
        
        res.json({
            success: true,
            data: {
                nextRegistrationCode: nextRegCode
            }
        });
    } catch (error) {
        console.error('Error getting next registration code:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get next registration code'
        });
    }
};

// Get next room allocation
const getNextRoomAllocation = async (req, res) => {
    try {
        const totalStudents = await Student.countDocuments();
        const studentsPerRoom = 20;
        
        const roomNo = Math.floor(totalStudents / studentsPerRoom) + 1;
        const seatNo = (totalStudents % studentsPerRoom) + 1;
        
        res.json({
            success: true,
            data: {
                roomNo,
                seatNo,
                totalStudents
            }
        });
    } catch (error) {
        console.error('Error getting next room allocation:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get next room allocation'
        });
    }
};

// Get all students with pagination
const getAllStudents = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const search = req.query.search || '';
        const classFilter = req.query.class || '';
        const roomFilter = req.query.room || '';

        let query = {};

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { registrationCode: { $regex: search, $options: 'i' } },
                { applicationNo: { $regex: search, $options: 'i' } },
                { phoneNo: { $regex: search, $options: 'i' } },
                { 'address.village': { $regex: search, $options: 'i' } },
                { fatherName: { $regex: search, $options: 'i' } },
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
            .select('-__v');

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
        console.error('Get students error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error',
        });
    }
};

// Get student by ID
const getStudentById = async (req, res) => {
    try {
        const student = await Student.findById(req.params.id).select('-__v');
        
        if (!student) {
            return res.status(404).json({
                success: false,
                error: 'Student not found',
            });
        }

        res.json({
            success: true,
            data: student,
        });
    } catch (error) {
        console.error('Get student error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error',
        });
    }
};

// Get student by registration code
const getStudentByCode = async (req, res) => {
    try {
        const student = await Student.findOne({
            $or: [
                { registrationCode: req.params.code },
                { applicationNo: req.params.code }
            ]
        }).select('-__v');
        
        if (!student) {
            return res.status(404).json({
                success: false,
                error: 'Student not found',
            });
        }

        res.json({
            success: true,
            data: student,
        });
    } catch (error) {
        console.error('Get student by code error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error',
        });
    }
};

// Get students by phone number
const getStudentsByPhone = async (req, res) => {
    try {
        const { phoneNo } = req.params;
        
        if (!/^\d{10}$/.test(phoneNo)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid phone number format. Must be 10 digits.'
            });
        }
        
        const students = await Student.find({ phoneNo })
            .select('-__v')
            .sort({ createdAt: -1 });
        
        if (!students || students.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'No students found for this phone number'
            });
        }
        
        res.json({
            success: true,
            count: students.length,
            data: students
        });
    } catch (error) {
        console.error('Get students by phone error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error'
        });
    }
};

// Soft delete a student
const softDeleteStudent = async (req, res) => {
    try {
        const { studentId } = req.params;
        const { reason } = req.body;
        const adminId = req.admin._id;

        const result = await Student.softDelete(studentId, adminId, reason);

        res.json({
            success: true,
            message: result.message,
            data: result.data
        });
    } catch (error) {
        console.error('Soft delete error:', error);
        res.status(400).json({
            success: false,
            error: error.message || 'Failed to delete student'
        });
    }
};

// Restore a soft deleted student
const restoreStudent = async (req, res) => {
    try {
        const { studentId } = req.params;

        const result = await Student.restore(studentId);

        res.json({
            success: true,
            message: result.message,
            data: result.data
        });
    } catch (error) {
        console.error('Restore error:', error);
        res.status(400).json({
            success: false,
            error: error.message || 'Failed to restore student'
        });
    }
};

// Get deleted students
const getDeletedStudents = async (req, res) => {
    try {
        const deletedStudents = await Student.getDeletedStudents();

        res.json({
            success: true,
            data: deletedStudents
        });
    } catch (error) {
        console.error('Get deleted students error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error'
        });
    }
};

// Permanently delete a student
const hardDeleteStudent = async (req, res) => {
    try {
        const { studentId } = req.params;

        const result = await Student.hardDelete(studentId);

        res.json({
            success: true,
            message: result.message
        });
    } catch (error) {
        console.error('Hard delete error:', error);
        res.status(400).json({
            success: false,
            error: error.message || 'Failed to permanently delete student'
        });
    }
};

// Get room distribution
const getRoomDistribution = async (req, res) => {
    try {
        const distribution = await Student.aggregate([
            {
                $group: {
                    _id: "$roomNo",
                    count: { $sum: 1 },
                    students: {
                        $push: {
                            name: "$name",
                            registrationCode: "$registrationCode",
                            applicationNo: "$applicationNo",
                            seatNo: "$seatNo"
                        }
                    }
                }
            },
            { $sort: { _id: 1 } },
            {
                $project: {
                    roomNo: "$_id",
                    count: 1,
                    students: {
                        $sortArray: { input: "$students", sortBy: { seatNo: 1 } }
                    },
                    _id: 0
                }
            }
        ]);
        
        const totalStudents = await Student.countDocuments();
        
        res.json({
            success: true,
            data: {
                distribution,
                totalStudents,
                roomsOccupied: distribution.length,
                studentsPerRoom: 20
            }
        });
    } catch (error) {
        console.error('Get room distribution error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error'
        });
    }
};

// Get students by room number
const getStudentsByRoom = async (req, res) => {
    try {
        const roomNo = parseInt(req.params.roomNo);
        
        if (isNaN(roomNo) || roomNo < 1) {
            return res.status(400).json({
                success: false,
                error: 'Invalid room number'
            });
        }
        
        const students = await Student.find({ roomNo })
            .select('name registrationCode applicationNo seatNo studyingClass phoneNo examMarks resultStatus rank')
            .sort({ seatNo: 1 });
        
        if (!students || students.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'No students found in this room'
            });
        }
        
        res.json({
            success: true,
            data: {
                roomNo,
                studentCount: students.length,
                capacity: 20,
                availableSeats: 20 - students.length,
                students
            }
        });
    } catch (error) {
        console.error('Get students by room error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error'
        });
    }
};

// Register new student
const registerStudent = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        // Check if Aadhaar already exists
        const existingAadhaar = await Student.findOne({ aadhaarNo: req.body.aadhaarNo });
        if (existingAadhaar) {
            return res.status(400).json({
                success: false,
                error: 'Aadhaar number already registered'
            });
        }

        const student = new Student(req.body);
        await student.save();

        // Count registrations from this phone number
        const registrationsFromPhone = await Student.countDocuments({
            phoneNo: student.phoneNo
        });

        // Log registration notification
        logRegistrationNotification(student).catch(err => {
            console.log('Background logging error:', err.message);
        });

        res.status(201).json({
            success: true,
            message: 'Registration successful',
            data: {
                applicationNo: student.applicationNo,
                registrationCode: student.registrationCode,
                name: student.name,
                fatherName: student.fatherName,
                phoneNo: student.phoneNo,
                roomNo: student.roomNo,
                seatNo: student.seatNo,
                studyingClass: student.studyingClass,
                registrationsFromPhone: registrationsFromPhone,
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                error: 'Duplicate entry found'
            });
        }
        
        res.status(500).json({
            success: false,
            error: 'Server error during registration'
        });
    }
};

// Hall ticket preview
const hallTicketPreview = async (req, res) => {
    try {
        const student = await Student.findOne({
            $or: [
                { registrationCode: req.params.code },
                { applicationNo: req.params.code }
            ]
        }).select('-__v').lean();
        
        if (!student) {
            return res.status(404).json({
                success: false,
                error: 'Student not found'
            });
        }
        
        const issueDate = new Date().toLocaleDateString('en-GB');
        
        if (!student.address) {
            student.address = {
                houseName: 'Not provided',
                place: 'Not provided',
                postOffice: 'Not provided',
                pinCode: 'XXXXXX',
                localBodyType: '',
                localBodyName: 'Not provided'
            };
        }
        
        student.roomNo = student.roomNo || 'To be assigned';
        student.seatNo = student.seatNo || 'To be assigned';
        
        res.render('hallticket', {
            student: student,
            issueDate: issueDate,
            isPreview: true,
            backUrl: '/',
            autoPrint: req.query.print === 'true'
        });
    } catch (error) {
        console.error('Hall ticket preview error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error'
        });
    }
};

// Export students data
const exportStudents = async (req, res) => {
    try {
        const students = await Student.find()
            .select('-__v')
            .sort({ roomNo: 1, seatNo: 1 });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader(
            'Content-Disposition',
            `attachment; filename=students_${Date.now()}.csv`
        );

        const headers = [
            'Registration Code',
            'Application No',
            'Name',
            'Gender',
            'Father Name',
            'Aadhaar No',
            'Phone No',
            'School',
            'Class',
            'Medium',
            'Room No',
            'Seat No',
            'Exam Marks',
            'Total Marks',
            'Rank',
            'Scholarship',
            'IAS Coaching',
            'Result Status',
            'House Name',
            'Place',
            'Post Office',
            'PIN Code',
            'Local Body Type',
            'Local Body Name',
            'Village',
            'Registration Date',
        ].join(',');

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
                    student.examMarks || 0,
                    student.totalMarks || 100,
                    student.rank || 'N/A',
                    student.scholarship || 'N/A',
                    student.iasCoaching ? 'Yes' : 'No',
                    student.resultStatus,
                    student.address.houseName,
                    student.address.place,
                    student.address.postOffice,
                    student.address.pinCode,
                    student.address.localBodyType,
                    student.address.localBodyName,
                    student.address.village,
                    new Date(student.createdAt).toLocaleDateString('en-IN'),
                ]
                    .map((field) => {
                        const fieldStr = String(field || '').replace(/"/g, '""');
                        return `"${fieldStr}"`;
                    })
                    .join(',');
            })
            .join('\n');

        res.send(headers + '\n' + rows);
    } catch (error) {
        console.error('Export error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error',
        });
    }
};

// Health check endpoint
const healthCheck = (req, res) => {
    res.json({
        success: true,
        message: 'Student registration API is running',
        timestamp: new Date().toISOString()
    });
};

module.exports = {
    getNextApplicationNo,
    getNextRegistrationCode,
    getNextRoomAllocation,
    getAllStudents,
    getStudentById,
    getStudentByCode,
    getStudentsByPhone,
    softDeleteStudent,
    restoreStudent,
    getDeletedStudents,
    hardDeleteStudent,
    getRoomDistribution,
    getStudentsByRoom,
    registerStudent,
    hallTicketPreview,
    exportStudents,
    healthCheck
};