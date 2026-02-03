const Student = require('../models/Student');
const Result = require('../models/Result');

// Get result by registration code
exports.getResultByCode = async (req, res) => {
    try {
        const { code } = req.params;

        // First check in Result collection
        let result = await Result.findOne({ registrationCode: code })
            .populate('studentId', 'name fatherName studyingClass schoolName phoneNo address')
            .select('-__v');

        if (result) {
            return res.json({
                success: true,
                data: {
                    result: result,
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
            totalMarks: student.totalMarks || 100,
            percentage: student.examMarks ? (student.examMarks / student.totalMarks) * 100 : 0,
            rank: student.rank || 0,
            isQualified: student.examMarks >= 40,
            scholarshipType: student.scholarship || '',
            iasCoaching: student.iasCoaching || false,
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
            .select('name registrationCode applicationNo studyingClass examMarks rank scholarship iasCoaching resultStatus')
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
            marks: student.examMarks || 'Not Available',
            totalMarks: 100,
            percentage: student.examMarks ? (student.examMarks / 100) * 100 : 0,
            rank: student.rank || 'Not Ranked',
            result: student.resultStatus,
            scholarship: student.scholarship || 'Not Eligible',
            iasCoaching: student.iasCoaching ? 'Eligible' : 'Not Eligible',
            qualified: student.examMarks >= 40,
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

        // Get top students
        const students = await Student.find({ examMarks: { $gt: 0 } })
            .sort({ examMarks: -1 })
            .limit(limit)
            .select('name registrationCode studyingClass schoolName examMarks rank scholarship iasCoaching');

        // Format results
        const results = students.map(student => ({
            rank: student.rank || 'Not Ranked',
            name: student.name,
            registrationCode: student.registrationCode,
            class: student.studyingClass,
            school: student.schoolName,
            marks: student.examMarks,
            totalMarks: 100,
            percentage: (student.examMarks / 100) * 100,
            scholarship: student.scholarship || 'Not Eligible',
            iasCoaching: student.iasCoaching ? 'Eligible' : 'Not Eligible',
        }));

        // Get statistics
        const totalStudents = await Student.countDocuments({ examMarks: { $gt: 0 } });
        const passedStudents = await Student.countDocuments({ examMarks: { $gte: 40 } });
        const failedStudents = totalStudents - passedStudents;
        const iasEligible = await Student.countDocuments({ iasCoaching: true });

        res.json({
            success: true,
            data: {
                results,
                statistics: {
                    totalStudents,
                    passedStudents,
                    failedStudents,
                    passPercentage: totalStudents > 0 ? (passedStudents / totalStudents) * 100 : 0,
                    iasEligible,
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
            .select('name registrationCode seatNo studyingClass examMarks rank scholarship iasCoaching resultStatus')
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
        const passedStudents = students.filter(s => s.examMarks >= 40).length;
        const failedStudents = marksEntered - passedStudents;
        const topStudent = students.reduce((max, student) => 
            student.examMarks > (max?.examMarks || 0) ? student : max, null
        );

        const results = students.map(student => ({
            seatNo: student.seatNo,
            name: student.name,
            registrationCode: student.registrationCode,
            marks: student.examMarks || 'Pending',
            totalMarks: 100,
            percentage: student.examMarks ? (student.examMarks / 100) * 100 : 0,
            rank: student.rank || 'Pending',
            result: student.resultStatus,
            scholarship: student.scholarship || 'Not Eligible',
            iasCoaching: student.iasCoaching ? 'Eligible' : 'Not Eligible',
            qualified: student.examMarks >= 40,
        }));

        res.json({
            success: true,
            data: {
                roomNo,
                statistics: {
                    totalStudents,
                    marksEntered,
                    marksPending: totalStudents - marksEntered,
                    passedStudents,
                    failedStudents,
                    passPercentage: marksEntered > 0 ? (passedStudents / marksEntered) * 100 : 0,
                    topStudent: topStudent ? {
                        name: topStudent.name,
                        registrationCode: topStudent.registrationCode,
                        marks: topStudent.examMarks,
                        rank: topStudent.rank,
                    } : null,
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
        // Update all ranks and scholarships
        const updateResult = await Student.updateRanksAndScholarships();

        // Get updated top performers
        const topPerformers = await Student.getTopPerformers(100);

        // Create or update results in Result collection
        const studentsWithMarks = await Student.find({ examMarks: { $gt: 0 } })
            .select('_id registrationCode examMarks totalMarks rank scholarship iasCoaching');

        for (const student of studentsWithMarks) {
            await Result.findOneAndUpdate(
                { registrationCode: student.registrationCode },
                {
                    studentId: student._id,
                    registrationCode: student.registrationCode,
                    examMarks: student.examMarks,
                    totalMarks: student.totalMarks,
                    rank: student.rank,
                    isQualified: student.examMarks >= 40,
                    scholarshipType: student.scholarship || '',
                    iasCoaching: student.iasCoaching,
                    publishedDate: new Date(),
                },
                { upsert: true, new: true }
            );
        }

        res.json({
            success: true,
            message: 'Rank list generated successfully',
            data: {
                totalRanked: studentsWithMarks.length,
                topPerformers: topPerformers.slice(0, 10),
                scholarshipWinners: topPerformers.filter(s => s.scholarship).slice(0, 3),
                iasEligible: studentsWithMarks.filter(s => s.rank <= 100).length,
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