const Student = require('../models/Student');
const Result = require('../models/Result');

// Get result by registration code
exports.getResultByCode = async (req, res) => {
    try {
        const { code } = req.params;

        // First check in Result collection
        let result = await Result.findOne({ registrationCode: code })
            .populate('studentId', 'name fatherName studyingClass schoolName phoneNo address roomNo seatNo')
            .select('-__v');

        if (result) {
            const formattedResult = {
                studentId: result.studentId?._id,
                registrationCode: result.registrationCode,
                examMarks: result.examMarks || 0,
                totalMarks: result.totalMarks || 50,
                percentage: result.percentage || 0,
                rank: result.rank || 0,
            };
            return res.json({
                success: true,
                data: {
                    result: formattedResult,
                    student: result.studentId ? {
                        name: result.studentId.name,
                        fatherName: result.studentId.fatherName,
                        studyingClass: result.studentId.studyingClass,
                        schoolName: result.studentId.schoolName,
                        roomNo: result.studentId.roomNo,
                        seatNo: result.studentId.seatNo,
                        phoneNo: result.studentId.phoneNo,
                        address: result.studentId.address,
                    } : null,
                    source: 'Result Collection',
                },
            });
        }

        // If not found in Result collection, check Student collection
        const student = await Student.findOne({
            $or: [
                { registrationCode: code },
                { applicationNo: code }
            ]
        }).select('-__v');

        if (!student) {
            return res.status(404).json({
                success: false,
                error: 'Student not found',
            });
        }

        // Create result from student data
        const resultData = {
            studentId: student._id,
            registrationCode: student.registrationCode,
            examMarks: student.examMarks || 0,
            totalMarks: student.totalMarks || 50,
            percentage: student.examMarks ? (student.examMarks / student.totalMarks) * 100 : 0,
            rank: student.rank || 0,
        };

        res.json({
            success: true,
            data: {
                result: resultData,
                student: {
                    name: student.name,
                    fatherName: student.fatherName,
                    studyingClass: student.studyingClass,
                    schoolName: student.schoolName,
                    roomNo: student.roomNo,
                    seatNo: student.seatNo,
                    phoneNo: student.phoneNo,
                    address: student.address,
                },
                source: 'Student Collection',
            },
        });
    } catch (error) {
        console.error('Get result error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error',
        });
    }
};

// Get results by phone number
exports.getResultsByPhone = async (req, res) => {
    try {
        const { phoneNo } = req.params;

        if (!/^\d{10}$/.test(phoneNo)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid phone number format',
            });
        }

        // Find all students with this phone number
        const students = await Student.find({ phoneNo })
            .select('name registrationCode applicationNo studyingClass examMarks rank totalMarks resultStatus')
            .sort({ createdAt: -1 });

        if (!students || students.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'No registrations found for this phone number',
            });
        }

        // Prepare results
        const results = students.map(student => ({
            name: student.name,
            registrationCode: student.registrationCode,
            applicationNo: student.applicationNo,
            class: student.studyingClass,
            marks: student.examMarks || 0,
            totalMarks: student.totalMarks || 50,
            percentage: student.examMarks ? ((student.examMarks / (student.totalMarks || 50)) * 100).toFixed(2) : 0,
            rank: student.rank || 0,
            result: student.resultStatus,
        }));

        res.json({
            success: true,
            data: {
                count: results.length,
                results: results,
            },
        });
    } catch (error) {
        console.error('Get results by phone error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error',
        });
    }
};

// Get top results
exports.getTopResults = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20;
        const studyingClass = req.query.studyingClass;

        const query = { examMarks: { $gt: 0 }, isDeleted: false };
        if (studyingClass === '10' || studyingClass === '12') {
            query.studyingClass = studyingClass;
        }

        // Get top students - SORT BY examMarks DESC, THEN name ASC for consistent tie-breaking
        const students = await Student.find(query)
            .sort({ examMarks: -1, name: 1 })
            .limit(limit)
            .select('name registrationCode studyingClass schoolName examMarks totalMarks rank roomNo seatNo markEntryStatus');

        // Format results
        const results = students.map(student => {
            const totalMarks = student.totalMarks || 50;
            const percentage = (student.examMarks / totalMarks) * 100;
            
            return {
                rank: student.rank || 0,
                name: student.name,
                registrationCode: student.registrationCode,
                class: student.studyingClass,
                school: student.schoolName,
                marks: student.examMarks,
                totalMarks: totalMarks,
                percentage: parseFloat(percentage.toFixed(2)),
                roomNo: student.roomNo,
                seatNo: student.seatNo,
                markEntryStatus: student.markEntryStatus,
            };
        });

        // Get statistics
        const totalStudents = await Student.countDocuments(query);

        res.json({
            success: true,
            data: {
                results,
                statistics: {
                    totalStudents,
                },
            },
        });
    } catch (error) {
        console.error('Get top results error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error',
        });
    }
};

// Get results by room
exports.getResultsByRoom = async (req, res) => {
    try {
        const { roomNo } = req.params;

        const students = await Student.find({ roomNo })
            .select('name registrationCode seatNo studyingClass examMarks rank resultStatus')
            .sort({ seatNo: 1 });

        if (!students || students.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'No students found in this room',
            });
        }

        // Calculate room statistics
        const totalStudents = students.length;
        const marksEntered = students.filter(s => s.examMarks > 0).length;

        const results = students.map(student => ({
            seatNo: student.seatNo,
            name: student.name,
            registrationCode: student.registrationCode,
            marks: student.examMarks || 'Pending',
            totalMarks: student.totalMarks || 50,
            percentage: student.examMarks ? (student.examMarks / (student.totalMarks || 50)) * 100 : 0,
            rank: student.rank || 0,
            result: student.resultStatus,
        }));

        res.json({
            success: true,
            data: {
                roomNo,
                statistics: {
                    totalStudents,
                    marksEntered,
                    marksPending: totalStudents - marksEntered,
                },
                results,
            },
        });
    } catch (error) {
        console.error('Get results by room error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error',
        });
    }
};

// Generate rank list
exports.generateRankList = async (req, res) => {
    try {
        // Update all ranks
        const updateResult = await Student.updateRanksAndScholarships();

        // Create or update results in Result collection
        const studentsWithMarks = await Student.find({ examMarks: { $gt: 0 }, isDeleted: false })
            .select('_id registrationCode examMarks totalMarks rank studyingClass');

        for (const student of studentsWithMarks) {
            await Result.findOneAndUpdate(
                { registrationCode: student.registrationCode },
                {
                    studentId: student._id,
                    registrationCode: student.registrationCode,
                    examMarks: student.examMarks,
                    totalMarks: student.totalMarks,
                    rank: student.rank,
                    isQualified: false,
                    scholarshipType: '',
                    iasCoaching: false,
                    publishedDate: new Date(),
                },
                { upsert: true, new: true }
            );
        }

        res.json({
            success: true,
            message: 'Unique rank list generated successfully',
            data: {
                totalRanked: studentsWithMarks.length,
                iasDetails: updateResult.iasDetails
            },
        });
    } catch (error) {
        console.error('Generate rank list error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error',
        });
    }
};
// Check result with Registration Code and DOB
exports.checkResultWithDob = async (req, res) => {
    try {
        const { registrationCode, dob } = req.body;

        if (!registrationCode || !dob) {
            return res.status(400).json({
                success: false,
                error: 'Registration Code and Date of Birth are required',
            });
        }

        // Find student by reg code and DOB (start and end of the day to avoid timezone mismatches)
        const dateObj = new Date(dob);
        const startOfDay = new Date(dateObj.setUTCHours(0, 0, 0, 0));
        const endOfDay = new Date(dateObj.setUTCHours(23, 59, 59, 999));

        const student = await Student.findOne({
            registrationCode: registrationCode.trim().toUpperCase(),
            dob: { $gte: startOfDay, $lte: endOfDay },
            isDeleted: false
        }).select('-__v');

        if (!student) {
            return res.status(404).json({
                success: false,
                error: 'Invalid Registration Code or Date of Birth',
            });
        }

        // We can just format the result like getResultByCode does
        const resultData = {
            studentId: student._id,
            registrationCode: student.registrationCode,
            examMarks: student.examMarks || 0,
            totalMarks: student.totalMarks || 50,
            percentage: student.examMarks ? (student.examMarks / (student.totalMarks || 50)) * 100 : 0,
            rank: student.rank || 0,
            resultStatus: student.resultStatus,
        };

        res.json({
            success: true,
            data: {
                result: resultData,
                student: {
                    name: student.name,
                    fatherName: student.fatherName,
                    studyingClass: student.studyingClass,
                    schoolName: student.schoolName,
                    roomNo: student.roomNo,
                    seatNo: student.seatNo,
                    phoneNo: student.phoneNo,
                    address: student.address,
                },
                source: 'Student Collection',
            },
        });
    } catch (error) {
        console.error('Check result with DOB error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error',
        });
    }
};
