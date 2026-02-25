// controllers/examInvigilatorController.js
const ExamInvigilator = require('../models/ExamInvigilator');
const InvigilatorDuty = require('../models/InvigilatorDuty');

// @desc    Get all invigilators
// @route   GET /api/exam-invigilator
// @access  Private/Admin
exports.getAllInvigilators = async (req, res) => {
    try {
        const invigilators = await ExamInvigilator.find({})
            .sort({ shortName: 1 });
        
        res.json({
            success: true,
            count: invigilators.length,
            data: invigilators
        });
    } catch (error) {
        console.error('Error fetching invigilators:', error);
        res.status(500).json({
            success: false,
            error: 'Server error while fetching invigilators'
        });
    }
};

// @desc    Get single invigilator
// @route   GET /api/exam-invigilator/:id
// @access  Private/Admin
exports.getInvigilatorById = async (req, res) => {
    try {
        const invigilator = await ExamInvigilator.findById(req.params.id);
        
        if (!invigilator) {
            return res.status(404).json({
                success: false,
                error: 'Invigilator not found'
            });
        }

        res.json({
            success: true,
            data: invigilator
        });
    } catch (error) {
        console.error('Error fetching invigilator:', error);
        res.status(500).json({
            success: false,
            error: 'Server error while fetching invigilator'
        });
    }
};

// @desc    Create new invigilator
// @route   POST /api/exam-invigilator
// @access  Private/Admin
exports.createInvigilator = async (req, res) => {
    try {
        const { shortName, name, mobileNo, isActive } = req.body;

        // Check if invigilator with same shortName exists
        const existingInvigilator = await ExamInvigilator.findOne({ 
            shortName: shortName.toUpperCase() 
        });
        
        if (existingInvigilator) {
            return res.status(400).json({
                success: false,
                error: 'Invigilator with this short name already exists'
            });
        }

        const invigilator = new ExamInvigilator({
            shortName: shortName.toUpperCase(),
            name,
            mobileNo,
            isActive: isActive !== undefined ? isActive : true
        });

        await invigilator.save();

        res.status(201).json({
            success: true,
            message: 'Invigilator created successfully',
            data: invigilator
        });
    } catch (error) {
        console.error('Error creating invigilator:', error);
        
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                error: 'Invigilator with this short name or mobile number already exists'
            });
        }

        res.status(500).json({
            success: false,
            error: error.message || 'Server error while creating invigilator'
        });
    }
};

// @desc    Update invigilator
// @route   PUT /api/exam-invigilator/:id
// @access  Private/Admin
exports.updateInvigilator = async (req, res) => {
    try {
        const { shortName, name, mobileNo, isActive } = req.body;

        // Check if shortName is being changed and if it already exists
        if (shortName) {
            const existingInvigilator = await ExamInvigilator.findOne({
                shortName: shortName.toUpperCase(),
                _id: { $ne: req.params.id }
            });
            
            if (existingInvigilator) {
                return res.status(400).json({
                    success: false,
                    error: 'Invigilator with this short name already exists'
                });
            }
        }

        const invigilator = await ExamInvigilator.findByIdAndUpdate(
            req.params.id,
            {
                ...(shortName && { shortName: shortName.toUpperCase() }),
                ...(name && { name }),
                ...(mobileNo && { mobileNo }),
                ...(isActive !== undefined && { isActive })
            },
            { new: true, runValidators: true }
        );

        if (!invigilator) {
            return res.status(404).json({
                success: false,
                error: 'Invigilator not found'
            });
        }

        res.json({
            success: true,
            message: 'Invigilator updated successfully',
            data: invigilator
        });
    } catch (error) {
        console.error('Error updating invigilator:', error);
        
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                error: 'Invigilator with this short name or mobile number already exists'
            });
        }

        res.status(500).json({
            success: false,
            error: 'Server error while updating invigilator'
        });
    }
};

// @desc    Toggle invigilator status
// @route   PATCH /api/exam-invigilator/:id/toggle-status
// @access  Private/Admin
exports.toggleInvigilatorStatus = async (req, res) => {
    try {
        const invigilator = await ExamInvigilator.findById(req.params.id);
        
        if (!invigilator) {
            return res.status(404).json({
                success: false,
                error: 'Invigilator not found'
            });
        }

        invigilator.isActive = !invigilator.isActive;
        await invigilator.save();

        res.json({
            success: true,
            message: `Invigilator ${invigilator.isActive ? 'activated' : 'deactivated'} successfully`,
            data: invigilator
        });
    } catch (error) {
        console.error('Error toggling invigilator status:', error);
        res.status(500).json({
            success: false,
            error: 'Server error while toggling invigilator status'
        });
    }
};

// @desc    Soft delete invigilator
// @route   DELETE /api/exam-invigilator/:id
// @access  Private/Admin
exports.softDeleteInvigilator = async (req, res) => {
    try {
        // Check if invigilator has any upcoming duties
        const hasUpcomingDuties = await InvigilatorDuty.findOne({
            invigilatorId: req.params.id,
            examDate: { $gte: new Date() }
        });

        if (hasUpcomingDuties) {
            return res.status(400).json({
                success: false,
                error: 'Cannot delete invigilator with upcoming duties'
            });
        }

        const invigilator = await ExamInvigilator.softDelete(
            req.params.id, 
            req.admin._id
        );

        if (!invigilator) {
            return res.status(404).json({
                success: false,
                error: 'Invigilator not found'
            });
        }

        res.json({
            success: true,
            message: 'Invigilator deleted successfully',
            data: invigilator
        });
    } catch (error) {
        console.error('Error deleting invigilator:', error);
        res.status(500).json({
            success: false,
            error: 'Server error while deleting invigilator'
        });
    }
};

// @desc    Restore soft deleted invigilator
// @route   POST /api/exam-invigilator/:id/restore
// @access  Private/Admin
exports.restoreInvigilator = async (req, res) => {
    try {
        const invigilator = await ExamInvigilator.restore(req.params.id);

        if (!invigilator) {
            return res.status(404).json({
                success: false,
                error: 'Deleted invigilator not found'
            });
        }

        res.json({
            success: true,
            message: 'Invigilator restored successfully',
            data: invigilator
        });
    } catch (error) {
        console.error('Error restoring invigilator:', error);
        res.status(500).json({
            success: false,
            error: 'Server error while restoring invigilator'
        });
    }
};

// @desc    Get all deleted invigilators
// @route   GET /api/exam-invigilator/deleted/all
// @access  Private/Admin
exports.getDeletedInvigilators = async (req, res) => {
    try {
        const deletedInvigilators = await ExamInvigilator.find({ isDeleted: true })
            .setOptions({ includeDeleted: true })
            .populate('deletedBy', 'name email')
            .sort({ deletedAt: -1 });

        res.json({
            success: true,
            count: deletedInvigilators.length,
            data: deletedInvigilators
        });
    } catch (error) {
        console.error('Error fetching deleted invigilators:', error);
        res.status(500).json({
            success: false,
            error: 'Server error while fetching deleted invigilators'
        });
    }
};

// @desc    Bulk create invigilators
// @route   POST /api/exam-invigilator/bulk
// @access  Private/Admin
exports.bulkCreateInvigilators = async (req, res) => {
    try {
        const { invigilators } = req.body;

        if (!Array.isArray(invigilators) || invigilators.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Please provide an array of invigilators'
            });
        }

        const results = {
            successful: [],
            failed: []
        };

        for (const invData of invigilators) {
            try {
                const { shortName, name, mobileNo } = invData;
                
                if (!shortName || !name || !mobileNo) {
                    results.failed.push({
                        data: invData,
                        error: 'Missing required fields'
                    });
                    continue;
                }

                // Check for existing
                const existing = await ExamInvigilator.findOne({ 
                    shortName: shortName.toUpperCase() 
                });

                if (existing) {
                    results.failed.push({
                        data: invData,
                        error: 'Short name already exists'
                    });
                    continue;
                }

                const invigilator = new ExamInvigilator({
                    shortName: shortName.toUpperCase(),
                    name,
                    mobileNo,
                    isActive: true
                });

                await invigilator.save();
                results.successful.push(invigilator);
            } catch (error) {
                results.failed.push({
                    data: invData,
                    error: error.message
                });
            }
        }

        res.status(201).json({
            success: true,
            message: `Successfully created ${results.successful.length} invigilators`,
            results
        });
    } catch (error) {
        console.error('Error bulk creating invigilators:', error);
        res.status(500).json({
            success: false,
            error: 'Server error while bulk creating invigilators'
        });
    }
};

// @desc    Get invigilator statistics
// @route   GET /api/exam-invigilator/stats/summary
// @access  Private/Admin
exports.getInvigilatorStats = async (req, res) => {
    try {
        const total = await ExamInvigilator.countDocuments();
        const active = await ExamInvigilator.countDocuments({ isActive: true });
        const inactive = await ExamInvigilator.countDocuments({ isActive: false });
        const deleted = await ExamInvigilator.countDocuments({ isDeleted: true })
            .setOptions({ includeDeleted: true });

        res.json({
            success: true,
            stats: {
                total,
                active,
                inactive,
                deleted
            }
        });
    } catch (error) {
        console.error('Error fetching invigilator stats:', error);
        res.status(500).json({
            success: false,
            error: 'Server error while fetching statistics'
        });
    }
};