const mongoose = require('mongoose');

const examInvigilatorSchema = new mongoose.Schema({
    shortName: {
        type: String,
        required: [true, 'Short name is required'],
        trim: true,
        uppercase: true,
        unique: true,
        maxlength: [10, 'Short name cannot exceed 10 characters']
    },
    name: {
        type: String,
        required: [true, 'Full name is required'],
        trim: true
    },
    mobileNo: {
        type: String,
        required: [true, 'Mobile number is required'],
        match: [/^\d{10}$/, 'Please enter a valid 10-digit mobile number']
    },
    isActive: {
        type: Boolean,
        default: true
    },
    // SOFT DELETE FIELDS
    isDeleted: {
        type: Boolean,
        default: false
    },
    deletedAt: {
        type: Date,
        default: null
    },
    deletedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
        default: null
    }
}, {
    timestamps: true
});

// Add indexes
examInvigilatorSchema.index({ shortName: 1 });
examInvigilatorSchema.index({ mobileNo: 1 });
examInvigilatorSchema.index({ isActive: 1 });
examInvigilatorSchema.index({ isDeleted: 1 });

// Query middleware to filter out deleted documents
examInvigilatorSchema.pre(/^find/, function() {
    if (!this.getOptions().includeDeleted) {
        this.where({ isDeleted: false });
    }
});

// Static method to soft delete
examInvigilatorSchema.statics.softDelete = async function(invigilatorId, adminId) {
    try {
        const invigilator = await this.findByIdAndUpdate(
            invigilatorId,
            {
                $set: {
                    isDeleted: true,
                    deletedAt: new Date(),
                    deletedBy: adminId,
                    isActive: false
                }
            },
            { new: true }
        );
        
        return invigilator;
    } catch (error) {
        console.error('Error soft deleting invigilator:', error);
        throw error;
    }
};

// Static method to restore
examInvigilatorSchema.statics.restore = async function(invigilatorId) {
    try {
        const invigilator = await this.findByIdAndUpdate(
            invigilatorId,
            {
                $set: {
                    isDeleted: false,
                    deletedAt: null,
                    deletedBy: null,
                    isActive: true
                }
            },
            { new: true }
        ).setOptions({ includeDeleted: true });
        
        return invigilator;
    } catch (error) {
        console.error('Error restoring invigilator:', error);
        throw error;
    }
};

module.exports = mongoose.model('ExamInvigilator', examInvigilatorSchema);