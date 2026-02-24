const InvigilatorDuty = require('../models/InvigilatorDuty');
const Invigilator = require('../models/ExamInvigilator');
const { v4: uuidv4 } = require('uuid');

// @desc    Bulk assign duties
// @route   POST /api/invigilator-duties/bulk
exports.bulkAssignDuties = async (req, res) => {
    try {
        const { duties, examDate } = req.body;

        if (!Array.isArray(duties) || duties.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Please provide an array of duties'
            });
        }

        if (!examDate) {
            return res.status(400).json({
                success: false,
                error: 'Exam date is required'
            });
        }

        const batchId = uuidv4();
        const results = {
            successful: [],
            failed: []
        };

        for (const duty of duties) {
            try {
                // Validate required fields - now checking for invigilatorId instead of shortName
                if (!duty.invigilatorId || !duty.roomNo || !duty.dutyFrom || !duty.dutyTo) {
                    results.failed.push({
                        data: duty,
                        error: 'Missing required fields (invigilatorId, roomNo, dutyFrom, dutyTo)'
                    });
                    continue;
                }

                // Verify invigilator exists
                const invigilator = await Invigilator.findById(duty.invigilatorId);
                if (!invigilator) {
                    results.failed.push({
                        data: duty,
                        error: `Invigilator with ID ${duty.invigilatorId} not found`
                    });
                    continue;
                }

                // Check if invigilator is active
                if (!invigilator.isActive) {
                    results.failed.push({
                        data: duty,
                        error: `Invigilator ${invigilator.shortName} is inactive`
                    });
                    continue;
                }

                // Check if room is already assigned for this exam date
                const existingDuty = await InvigilatorDuty.findOne({
                    examDate: new Date(examDate),
                    roomNo: duty.roomNo
                });

                if (existingDuty) {
                    results.failed.push({
                        data: duty,
                        error: `Room ${duty.roomNo} is already assigned to another invigilator`
                    });
                    continue;
                }

                // Check if invigilator already has duty on this date
                const existingInvigilatorDuty = await InvigilatorDuty.findOne({
                    examDate: new Date(examDate),
                    invigilatorId: duty.invigilatorId
                });

                if (existingInvigilatorDuty) {
                    results.failed.push({
                        data: duty,
                        error: `Invigilator ${invigilator.shortName} already has a duty assigned on this date`
                    });
                    continue;
                }

                const newDuty = await InvigilatorDuty.create({
                    invigilatorId: duty.invigilatorId,
                    examDate: new Date(examDate),
                    dutyFrom: duty.dutyFrom,
                    dutyTo: duty.dutyTo,
                    roomNo: duty.roomNo,
                    batchId,
                    createdBy: req.user.id,
                    status: 'Assigned'
                });

                // Populate invigilator details
                await newDuty.populate('invigilatorId', 'shortName name mobileNo');

                results.successful.push({
                    _id: newDuty._id,
                    shortName: newDuty.invigilatorId.shortName,
                    name: newDuty.invigilatorId.name,
                    mobileNo: newDuty.invigilatorId.mobileNo,
                    dutyFrom: newDuty.dutyFrom,
                    dutyTo: newDuty.dutyTo,
                    roomNo: newDuty.roomNo,
                    status: newDuty.status
                });
            } catch (error) {
                results.failed.push({
                    data: duty,
                    error: error.message
                });
            }
        }

        res.status(201).json({
            success: true,
            message: `Successfully assigned ${results.successful.length} duties`,
            batchId,
            results
        });
    } catch (error) {
        console.error('Error bulk assigning duties:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to bulk assign duties'
        });
    }
};

// @desc    Get duties by exam date
// @route   GET /api/invigilator-duties/by-date/:examDate
exports.getDutiesByDate = async (req, res) => {
    try {
        const examDate = new Date(req.params.examDate);
        const startOfDay = new Date(examDate);
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date(examDate);
        endOfDay.setHours(23, 59, 59, 999);

        const duties = await InvigilatorDuty.find({
            examDate: { $gte: startOfDay, $lte: endOfDay }
        })
        .populate('invigilatorId', 'shortName name mobileNo')
        .sort({ roomNo: 1 });

        res.json({
            success: true,
            data: duties
        });
    } catch (error) {
        console.error('Error fetching duties:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch duties'
        });
    }
};

// @desc    Get duties by batch
// @route   GET /api/invigilator-duties/batch/:batchId
exports.getDutiesByBatch = async (req, res) => {
    try {
        const duties = await InvigilatorDuty.find({
            batchId: req.params.batchId
        })
        .populate('invigilatorId', 'shortName name mobileNo')
        .sort({ roomNo: 1 });

        res.json({
            success: true,
            data: duties
        });
    } catch (error) {
        console.error('Error fetching duties by batch:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch duties'
        });
    }
};

// @desc    Update duty status (mark attendance)
// @route   PUT /api/invigilator-duties/:id/attendance
exports.markAttendance = async (req, res) => {
    try {
        const { status, signature } = req.body;

        const duty = await InvigilatorDuty.findById(req.params.id);
        
        if (!duty) {
            return res.status(404).json({
                success: false,
                error: 'Duty assignment not found'
            });
        }

        duty.status = status;
        if (signature) {
            duty.signature = signature;
            duty.signatureTime = new Date();
        }
        await duty.save();

        res.json({
            success: true,
            message: `Attendance marked as ${status}`,
            data: duty
        });
    } catch (error) {
        console.error('Error marking attendance:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to mark attendance'
        });
    }
};

// @desc    Generate attendance sheet data
// @route   GET /api/invigilator-duties/attendance-sheet/:examDate
exports.getAttendanceSheetData = async (req, res) => {
    try {
        const examDate = new Date(req.params.examDate);
        const startOfDay = new Date(examDate);
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date(examDate);
        endOfDay.setHours(23, 59, 59, 999);

        const duties = await InvigilatorDuty.find({
            examDate: { $gte: startOfDay, $lte: endOfDay }
        })
        .populate('invigilatorId', 'shortName name mobileNo')
        .sort({ roomNo: 1 });

        // Format data for the attendance sheet
        const attendanceData = duties.map((duty, index) => ({
            slNo: index + 1,
            shortName: duty.invigilatorId?.shortName || '',
            name: duty.invigilatorId?.name || '',
            mobileNo: duty.invigilatorId?.mobileNo || '',
            dutyFrom: duty.dutyFrom,
            dutyTo: duty.dutyTo,
            dateTime: `${duty.dutyFrom} - ${duty.dutyTo}`,
            roomNo: duty.roomNo,
            signature: duty.signature || ''
        }));

        res.json({
            success: true,
            examDate: req.params.examDate,
            totalInvigilators: attendanceData.length,
            data: attendanceData
        });
    } catch (error) {
        console.error('Error generating attendance sheet data:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate attendance sheet data'
        });
    }
};

// @desc    Delete duty assignment
// @route   DELETE /api/invigilator-duties/:id
exports.deleteDuty = async (req, res) => {
    try {
        const duty = await InvigilatorDuty.findByIdAndDelete(req.params.id);

        if (!duty) {
            return res.status(404).json({
                success: false,
                error: 'Duty assignment not found'
            });
        }

        res.json({
            success: true,
            message: 'Duty assignment deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting duty:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete duty assignment'
        });
    }
};

// @desc    Delete all duties by batch
// @route   DELETE /api/invigilator-duties/batch/:batchId
exports.deleteBatch = async (req, res) => {
    try {
        const result = await InvigilatorDuty.deleteMany({
            batchId: req.params.batchId
        });

        res.json({
            success: true,
            message: `Deleted ${result.deletedCount} duty assignments`,
            deletedCount: result.deletedCount
        });
    } catch (error) {
        console.error('Error deleting batch:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete batch'
        });
    }
};