const mongoose = require('mongoose');

const resultSchema = new mongoose.Schema({
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student',
        required: true
    },
    registrationCode: {
        type: String,
        required: true,
        index: true
    },
    examMarks: {
        type: Number,
        required: true,
        min: 0,
        max: 100
    },
    totalMarks: {
        type: Number,
        default: 100
    },
    percentage: {
        type: Number,
        min: 0,
        max: 100
    },
    rank: {
        type: Number,
        required: true
    },
    isQualified: {
        type: Boolean,
        default: false
    },
    scholarshipType: {
        type: String,
        enum: ['', 'Gold', 'Silver', 'Bronze'],
        default: ''
    },
    iasCoaching: {
        type: Boolean,
        default: false
    },
    addedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Invigilator'
    },
    examDate: {
        type: Date,
        default: Date.now
    },
    publishedDate: {
        type: Date
    }
}, {
    timestamps: true
});

// Calculate percentage before saving
resultSchema.pre('save', function(next) {
    if (this.examMarks !== undefined && this.totalMarks) {
        this.percentage = (this.examMarks / this.totalMarks) * 100;
    }
    next();
});

// Add indexes
resultSchema.index({ rank: 1 });
resultSchema.index({ isQualified: 1 });
resultSchema.index({ scholarshipType: 1 });

module.exports = mongoose.model('Result', resultSchema);