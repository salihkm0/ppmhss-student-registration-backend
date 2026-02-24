const mongoose = require('mongoose');

const invigilatorDutySchema = new mongoose.Schema({
    invigilatorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ExamInvigilator',
        required: true
    },
    examDate: {
        type: Date,
        required: true
    },
    dutyFrom: {
        type: String,
        required: true,
        match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please enter valid time in HH:MM format']
    },
    dutyTo: {
        type: String,
        required: true,
        match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please enter valid time in HH:MM format']
    },
    roomNo: {
        type: Number,
        required: true,
        min: 1,
        max: 100
    },
    signature: {
        type: String,
        default: null
    },
    signatureTime: {
        type: Date,
        default: null
    },
    status: {
        type: String,
        enum: ['Assigned', 'Present', 'Absent'],
        default: 'Assigned'
    },
    // For bulk upload tracking
    batchId: {
        type: String,
        index: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
        required: true
    }
}, {
    timestamps: true
});

// Compound index to prevent duplicate assignments for same room on same date
invigilatorDutySchema.index({ examDate: 1, roomNo: 1 }, { unique: true });

// Index for searching
invigilatorDutySchema.index({ examDate: 1, status: 1 });
invigilatorDutySchema.index({ batchId: 1 });

// Virtual for formatted duty timing
invigilatorDutySchema.virtual('dutyTiming').get(function() {
    return `${this.dutyFrom} - ${this.dutyTo}`;
});

// Method to mark attendance
invigilatorDutySchema.methods.markAttendance = async function(status, signature = null) {
    this.status = status;
    if (signature) {
        this.signature = signature;
        this.signatureTime = new Date();
    }
    await this.save();
    return this;
};

module.exports = mongoose.model('InvigilatorDuty', invigilatorDutySchema);