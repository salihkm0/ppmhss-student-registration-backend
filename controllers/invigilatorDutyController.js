// controllers/invigilatorDutyController.js
const InvigilatorDuty = require('../models/InvigilatorDuty');
const ExamInvigilator = require('../models/ExamInvigilator');
const Student = require('../models/Student');
const mongoose = require('mongoose');

// @desc    Get all duties for a specific date
// @route   GET /api/invigilator-duties/by-date/:date
// @access  Private/Admin
exports.getDutiesByDate = async (req, res) => {
    try {
        const { date } = req.params;
        
        // Parse date (format: YYYY-MM-DD)
        const startDate = new Date(date);
        startDate.setHours(0, 0, 0, 0);
        
        const endDate = new Date(date);
        endDate.setHours(23, 59, 59, 999);

        const duties = await InvigilatorDuty.find({
            examDate: { $gte: startDate, $lte: endDate }
        })
        .populate('invigilatorId', 'shortName name mobileNo isActive')
        .populate('createdBy', 'name email')
        .sort({ roomNo: 1 });

        res.json({
            success: true,
            count: duties.length,
            data: duties
        });
    } catch (error) {
        console.error('Error fetching duties by date:', error);
        res.status(500).json({
            success: false,
            error: 'Server error while fetching duties'
        });
    }
};

// @desc    Get duty by ID
// @route   GET /api/invigilator-duties/:id
// @access  Private/Admin
exports.getDutyById = async (req, res) => {
    try {
        const duty = await InvigilatorDuty.findById(req.params.id)
            .populate('invigilatorId', 'shortName name mobileNo isActive')
            .populate('createdBy', 'name email');

        if (!duty) {
            return res.status(404).json({
                success: false,
                error: 'Duty not found'
            });
        }

        res.json({
            success: true,
            data: duty
        });
    } catch (error) {
        console.error('Error fetching duty:', error);
        res.status(500).json({
            success: false,
            error: 'Server error while fetching duty'
        });
    }
};

// @desc    Bulk create duties (room assignments)
// @route   POST /api/invigilator-duties/bulk
// @access  Private/Admin
exports.bulkCreateDuties = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { examDate, duties } = req.body;
        const adminId = req.admin._id;

        if (!examDate || !Array.isArray(duties) || duties.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Please provide exam date and duties array'
            });
        }

        // Parse exam date
        const dutyDate = new Date(examDate);
        dutyDate.setHours(0, 0, 0, 0);

        const results = {
            successful: [],
            failed: []
        };

        // Check for duplicate room assignments in the request
        const roomMap = new Map();
        for (const duty of duties) {
            if (roomMap.has(duty.roomNo)) {
                results.failed.push({
                    ...duty,
                    error: `Duplicate room assignment: Room ${duty.roomNo} is assigned multiple times in this request`
                });
            } else {
                roomMap.set(duty.roomNo, duty);
            }
        }

        // Process each duty
        for (const duty of duties.filter(d => !roomMap.has(d.roomNo) || roomMap.get(d.roomNo) === d)) {
            try {
                // Check if room is already assigned for this date
                const existingDuty = await InvigilatorDuty.findOne({
                    examDate: dutyDate,
                    roomNo: duty.roomNo
                }).session(session);

                if (existingDuty) {
                    results.failed.push({
                        ...duty,
                        error: `Room ${duty.roomNo} is already assigned to another invigilator`
                    });
                    continue;
                }

                // Check if invigilator already has duty on this date
                const invigilatorDuty = await InvigilatorDuty.findOne({
                    examDate: dutyDate,
                    invigilatorId: duty.invigilatorId
                }).session(session);

                if (invigilatorDuty) {
                    results.failed.push({
                        ...duty,
                        error: 'Invigilator already has a duty on this date'
                    });
                    continue;
                }

                // Verify invigilator exists and is active
                const invigilator = await ExamInvigilator.findOne({
                    _id: duty.invigilatorId,
                    isActive: true,
                    isDeleted: false
                });

                if (!invigilator) {
                    results.failed.push({
                        ...duty,
                        error: 'Invigilator not found or inactive'
                    });
                    continue;
                }

                // Create the duty
                const newDuty = new InvigilatorDuty({
                    invigilatorId: duty.invigilatorId,
                    examDate: dutyDate,
                    dutyFrom: duty.dutyFrom,
                    dutyTo: duty.dutyTo,
                    roomNo: duty.roomNo,
                    createdBy: adminId,
                    batchId: new mongoose.Types.ObjectId().toString()
                });

                await newDuty.save({ session });
                
                const populatedDuty = await InvigilatorDuty.findById(newDuty._id)
                    .populate('invigilatorId', 'shortName name mobileNo')
                    .session(session);

                results.successful.push(populatedDuty);
            } catch (error) {
                results.failed.push({
                    ...duty,
                    error: error.message
                });
            }
        }

        await session.commitTransaction();

        res.status(201).json({
            success: true,
            message: `Successfully assigned ${results.successful.length} duties`,
            results
        });
    } catch (error) {
        await session.abortTransaction();
        console.error('Error bulk creating duties:', error);
        res.status(500).json({
            success: false,
            error: 'Server error while creating duties'
        });
    } finally {
        session.endSession();
    }
};

// @desc    Update duty (room assignment)
// @route   PUT /api/invigilator-duties/:id
// @access  Private/Admin
exports.updateDuty = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { roomNo, dutyFrom, dutyTo, examDate } = req.body;
        const dutyId = req.params.id;

        // Get existing duty
        const existingDuty = await InvigilatorDuty.findById(dutyId).session(session);
        
        if (!existingDuty) {
            await session.abortTransaction();
            return res.status(404).json({
                success: false,
                error: 'Duty not found'
            });
        }

        // Parse new exam date
        const newExamDate = examDate ? new Date(examDate) : existingDuty.examDate;
        newExamDate.setHours(0, 0, 0, 0);

        // Check if room is available for the new date/time (if changed)
        if (roomNo && roomNo !== existingDuty.roomNo) {
            const roomConflict = await InvigilatorDuty.findOne({
                _id: { $ne: dutyId },
                examDate: newExamDate,
                roomNo: roomNo
            }).session(session);

            if (roomConflict) {
                await session.abortTransaction();
                return res.status(400).json({
                    success: false,
                    error: `Room ${roomNo} is already assigned for this date`
                });
            }
        }

        // Check if invigilator is available (if date changed)
        if (examDate && examDate !== existingDuty.examDate.toISOString().split('T')[0]) {
            const invigilatorConflict = await InvigilatorDuty.findOne({
                _id: { $ne: dutyId },
                examDate: newExamDate,
                invigilatorId: existingDuty.invigilatorId
            }).session(session);

            if (invigilatorConflict) {
                await session.abortTransaction();
                return res.status(400).json({
                    success: false,
                    error: 'Invigilator already has a duty on this date'
                });
            }
        }

        // Update the duty
        const updatedDuty = await InvigilatorDuty.findByIdAndUpdate(
            dutyId,
            {
                ...(roomNo && { roomNo }),
                ...(dutyFrom && { dutyFrom }),
                ...(dutyTo && { dutyTo }),
                ...(examDate && { examDate: newExamDate })
            },
            { new: true, session }
        ).populate('invigilatorId', 'shortName name mobileNo');

        await session.commitTransaction();

        res.json({
            success: true,
            message: 'Duty updated successfully',
            data: updatedDuty
        });
    } catch (error) {
        await session.abortTransaction();
        console.error('Error updating duty:', error);
        res.status(500).json({
            success: false,
            error: 'Server error while updating duty'
        });
    } finally {
        session.endSession();
    }
};

// @desc    Delete duty (room assignment)
// @route   DELETE /api/invigilator-duties/:id
// @access  Private/Admin
exports.deleteDuty = async (req, res) => {
    try {
        const duty = await InvigilatorDuty.findById(req.params.id);
        
        if (!duty) {
            return res.status(404).json({
                success: false,
                error: 'Duty not found'
            });
        }

        // Check if attendance is already marked
        if (duty.status !== 'Assigned') {
            return res.status(400).json({
                success: false,
                error: 'Cannot delete duty after attendance is marked'
            });
        }

        await duty.deleteOne();

        res.json({
            success: true,
            message: 'Duty deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting duty:', error);
        res.status(500).json({
            success: false,
            error: 'Server error while deleting duty'
        });
    }
};

// @desc    Delete all duties in a batch
// @route   DELETE /api/invigilator-duties/batch/:batchId
// @access  Private/Admin
exports.deleteBatchDuties = async (req, res) => {
    try {
        const { batchId } = req.params;

        // Check if any duties in the batch have attendance marked
        const dutiesWithAttendance = await InvigilatorDuty.find({
            batchId: batchId,
            status: { $ne: 'Assigned' }
        });

        if (dutiesWithAttendance.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'Cannot delete batch because some duties have attendance marked'
            });
        }

        const result = await InvigilatorDuty.deleteMany({ batchId: batchId });

        res.json({
            success: true,
            message: `Successfully deleted ${result.deletedCount} duties`,
            deletedCount: result.deletedCount
        });
    } catch (error) {
        console.error('Error deleting batch duties:', error);
        res.status(500).json({
            success: false,
            error: 'Server error while deleting batch duties'
        });
    }
};

// @desc    Mark attendance for a duty
// @route   PUT /api/invigilator-duties/:id/attendance
// @access  Private/Admin
exports.markAttendance = async (req, res) => {
    try {
        const { status, signature } = req.body;

        if (!status || !['Present', 'Absent'].includes(status)) {
            return res.status(400).json({
                success: false,
                error: 'Please provide valid status (Present/Absent)'
            });
        }

        const duty = await InvigilatorDuty.findById(req.params.id);
        
        if (!duty) {
            return res.status(404).json({
                success: false,
                error: 'Duty not found'
            });
        }

        await duty.markAttendance(status, signature);

        res.json({
            success: true,
            message: `Attendance marked as ${status}`,
            data: duty
        });
    } catch (error) {
        console.error('Error marking attendance:', error);
        res.status(500).json({
            success: false,
            error: 'Server error while marking attendance'
        });
    }
};

// @desc    Generate attendance sheet PDF
// @route   GET /api/invigilator-duties/attendance/:date/pdf
// @access  Private/Admin
exports.generateAttendanceSheet = async (req, res) => {
    try {
        const { date } = req.params;
        const { preview, print } = req.query;

        // Parse date (format: DD-MM-YYYY)
        const dateParts = date.split('-');
        if (dateParts.length !== 3) {
            return res.status(400).json({
                success: false,
                error: 'Invalid date format. Use DD-MM-YYYY'
            });
        }

        const formattedDate = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;
        const startDate = new Date(formattedDate);
        startDate.setHours(0, 0, 0, 0);
        
        const endDate = new Date(formattedDate);
        endDate.setHours(23, 59, 59, 999);

        // Get duties for the date
        const duties = await InvigilatorDuty.find({
            examDate: { $gte: startDate, $lte: endDate }
        })
        .populate('invigilatorId', 'shortName name mobileNo')
        .sort({ roomNo: 1 });

        // Format duties for template
        const formattedDuties = duties.map(duty => ({
            shortName: duty.invigilatorId?.shortName || '',
            name: duty.invigilatorId?.name || '',
            mobileNo: duty.invigilatorId?.mobileNo || '',
            dutyFrom: duty.dutyFrom,
            dutyTo: duty.dutyTo,
            roomNo: duty.roomNo,
            status: duty.status,
            remarks: ''
        }));

        // Format date for display
        const displayDate = `${dateParts[0]}-${dateParts[1]}-${dateParts[2]}`;

        res.render('invigilator-attendance', {
            examDate: displayDate,
            examTime: '09:00 AM - 01:00 PM',
            examCenter: 'PPM HSS KOTTUKKARA',
            duties: formattedDuties,
            totalInvigilators: formattedDuties.length,
            isPreview: preview === 'true',
            autoPrint: print === 'true'
        });

    } catch (error) {
        console.error('Error generating attendance sheet:', error);
        res.status(500).json({
            success: false,
            error: 'Server error while generating attendance sheet'
        });
    }
};

// @desc    Get available rooms for duty assignment
// @route   GET /api/invigilator-duties/available-rooms
// @access  Private/Admin
exports.getAvailableRoomsForDuty = async (req, res) => {
    try {
        const { date } = req.query;

        if (!date) {
            return res.status(400).json({
                success: false,
                error: 'Please provide date'
            });
        }

        const examDate = new Date(date);
        examDate.setHours(0, 0, 0, 0);

        // Get all rooms with student count
        const roomStats = await Student.aggregate([
            { $match: { isDeleted: false } },
            { $group: {
                _id: '$roomNo',
                studentCount: { $sum: 1 },
                genderCounts: {
                    $push: {
                        gender: '$gender',
                        count: 1
                    }
                }
            }},
            { $sort: { _id: 1 } }
        ]);

        // Get assigned rooms for the date
        const assignedDuties = await InvigilatorDuty.find({
            examDate: examDate
        }).populate('invigilatorId', 'shortName name');

        const assignedRooms = assignedDuties.map(duty => ({
            roomNo: duty.roomNo,
            invigilator: {
                id: duty.invigilatorId?._id,
                shortName: duty.invigilatorId?.shortName,
                name: duty.invigilatorId?.name
            },
            dutyFrom: duty.dutyFrom,
            dutyTo: duty.dutyTo,
            status: duty.status
        }));

        // Filter rooms with students and calculate availability
        const availableRooms = roomStats
            .filter(room => room._id !== null)
            .map(room => {
                const isAssigned = assignedDuties.some(d => d.roomNo === room._id);
                const genderAggregation = room.genderCounts.reduce((acc, curr) => {
                    const existing = acc.find(g => g._id === curr.gender);
                    if (existing) {
                        existing.count += 1;
                    } else {
                        acc.push({ _id: curr.gender, count: 1 });
                    }
                    return acc;
                }, []);

                return {
                    roomNo: room._id,
                    studentCount: room.studentCount,
                    capacity: 20,
                    availableSeats: 20 - room.studentCount,
                    isAssigned,
                    genderCounts: genderAggregation
                };
            });

        res.json({
            success: true,
            data: {
                available: availableRooms.filter(r => !r.isAssigned),
                assigned: assignedRooms
            }
        });
    } catch (error) {
        console.error('Error fetching available rooms:', error);
        res.status(500).json({
            success: false,
            error: 'Server error while fetching available rooms'
        });
    }
};