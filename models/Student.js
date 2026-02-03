const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
    applicationNo: {
        type: String,
        unique: true,
        index: true
    },
    registrationCode: {
        type: String,
        unique: true,
        index: true
    },
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true,
        minlength: [3, 'Name must be at least 3 characters']
    },
    gender: {
        type: String,
        enum: ['Male', 'Female', 'Other'],
        required: [true, 'Gender is required']
    },
    fatherName: {
        type: String,
        required: [true, "Father's name is required"],
        trim: true,
        minlength: [3, "Father's name must be at least 3 characters"]
    },
    aadhaarNo: {
        type: String,
        required: [true, 'Aadhaar number is required'],
        unique: true,
        match: [/^\d{12}$/, 'Please enter a valid 12-digit Aadhaar number']
    },
    schoolName: {
        type: String,
        required: [true, 'School name is required'],
        trim: true
    },
    studyingClass: {
        type: String,
        required: [true, 'Class is required'],
        enum: ['7', '8', '9', '10', '11', '12']
    },
    medium: {
        type: String,
        required: [true, 'Medium is required'],
        enum: ['English', 'Malayalam', 'Hindi', 'Other']
    },
    phoneNo: {
        type: String,
        required: [true, 'Phone number is required'],
        match: [/^\d{10}$/, 'Please enter a valid 10-digit phone number']
    },
    address: {
        houseName: {
            type: String,
            required: [true, 'House name is required'],
            trim: true
        },
        place: {
            type: String,
            required: [true, 'Place is required'],
            trim: true
        },
        postOffice: {
            type: String,
            required: [true, 'Post office is required'],
            trim: true
        },
        pinCode: {
            type: String,
            required: [true, 'PIN code is required'],
            match: [/^\d{6}$/, 'Please enter a valid 6-digit PIN code']
        },
        localBodyType: {
            type: String,
            required: [true, 'Local body type is required'],
            enum: ['Municipality', 'Corporation', 'Panchayat']
        },
        localBodyName: {
            type: String,
            required: [true, 'Local body name is required'],
            trim: true
        },
        village: {
            type: String,
            required: [true, 'Village name is required'],
            trim: true
        }
    },
    registrationDate: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        enum: ['Registered', 'Exam Completed', 'Result Published'],
        default: 'Registered'
    },
    roomNo: {
        type: String,
        required: false,
        default: ''
    },
    seatNo: {
        type: String,
        required: false,
        default: ''
    },
    examMarks: {
        type: Number,
        default: 0
    },
    totalMarks: {
        type: Number,
        default: 100
    },
    resultStatus: {
        type: String,
        enum: ['Pending', 'Passed', 'Failed'],
        default: 'Pending'
    },
    rank: {
        type: Number,
        default: 0
    },
    scholarship: {
        type: String,
        enum: ['', 'Gold', 'Silver', 'Bronze'],
        default: ''
    },
    iasCoaching: {
        type: Boolean,
        default: false
    },
    // SOFT DELETE FIELDS - ADDED HERE
    isDeleted: {
        type: Boolean,
        default: false
    },
    deletedAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

// Add query middleware to filter out deleted documents by default
studentSchema.pre(/^find/, function() {
    if (!this.getOptions().includeDeleted) {
        this.where({ isDeleted: false });
    }
});

studentSchema.pre('countDocuments', function() {
    if (!this.getOptions().includeDeleted) {
        this.where({ isDeleted: false });
    }
});

// Generate registration code before saving - ONLY FOR NEW DOCUMENTS
studentSchema.pre('save', async function(next) {
    try {
        // Only generate codes for new documents
        if (this.isNew) {
            // Generate simple sequential registration code starting from PPM1000
            if (!this.registrationCode) {
                const lastStudent = await this.constructor.findOne(
                    { isDeleted: false },
                    {},
                    { sort: { 'registrationCode': -1 } }
                );
                
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
                
                this.registrationCode = `PPM${nextNumber}`;
            }
            
            // Generate application number
            if (!this.applicationNo) {
                const year = new Date().getFullYear().toString().slice(-2);
                const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
                
                const lastStudent = await this.constructor.findOne(
                    { isDeleted: false },
                    {},
                    { sort: { 'applicationNo': -1 } }
                );
                
                let nextNumber = 1;
                if (lastStudent && lastStudent.applicationNo) {
                    const lastAppNo = lastStudent.applicationNo;
                    const lastSequence = parseInt(lastAppNo.slice(-4)) || 0;
                    nextNumber = lastSequence + 1;
                }
                
                this.applicationNo = `APP${year}${month}${String(nextNumber).padStart(4, '0')}`;
            }
            
            // Calculate room number and seat number - ONLY FOR NEW REGISTRATIONS
            if (!this.roomNo || !this.seatNo) {
                const totalStudents = await this.constructor.countDocuments({ isDeleted: false });
                const studentsPerRoom = 20;
                
                this.roomNo = Math.floor(totalStudents / studentsPerRoom) + 1;
                this.seatNo = (totalStudents % studentsPerRoom) + 1;
            }
        }
        
        next();
    } catch (error) {
        console.error('Error generating codes:', error);
        next(error);
    }
});

// Static method to soft delete a student - ADDED HERE
studentSchema.statics.softDelete = async function(studentId) {
    try {
        const student = await this.findByIdAndUpdate(
            studentId,
            {
                $set: {
                    isDeleted: true,
                    deletedAt: new Date()
                }
            },
            { new: true }
        );
        
        if (!student) {
            throw new Error('Student not found');
        }
        
        return {
            success: true,
            message: 'Student soft deleted successfully',
            data: student
        };
    } catch (error) {
        console.error('Error soft deleting student:', error);
        throw error;
    }
};

// Static method to restore a soft deleted student - ADDED HERE
studentSchema.statics.restore = async function(studentId) {
    try {
        const student = await this.findByIdAndUpdate(
            studentId,
            {
                $set: {
                    isDeleted: false,
                    deletedAt: null
                }
            },
            { new: true }
        );
        
        if (!student) {
            throw new Error('Student not found');
        }
        
        return {
            success: true,
            message: 'Student restored successfully',
            data: student
        };
    } catch (error) {
        console.error('Error restoring student:', error);
        throw error;
    }
};

// Static method to get deleted students - ADDED HERE
studentSchema.statics.getDeletedStudents = async function() {
    try {
        const deletedStudents = await this.find({ isDeleted: true })
            .sort({ deletedAt: -1 });
        
        return deletedStudents;
    } catch (error) {
        console.error('Error getting deleted students:', error);
        throw error;
    }
};

// Static method to permanently delete a student - ADDED HERE
studentSchema.statics.hardDelete = async function(studentId) {
    try {
        const student = await this.findOne({ _id: studentId, isDeleted: true });
        
        if (!student) {
            throw new Error('Deleted student not found');
        }
        
        await this.findByIdAndDelete(studentId);
        
        return {
            success: true,
            message: 'Student permanently deleted'
        };
    } catch (error) {
        console.error('Error hard deleting student:', error);
        throw error;
    }
};

// Static method to update ranks and scholarships - FIXED VERSION
studentSchema.statics.updateRanksAndScholarships = async function() {
    try {
        // Get all students sorted by marks descending (excluding deleted)
        const students = await this.find({ examMarks: { $gt: 0 }, isDeleted: false })
            .sort({ examMarks: -1, createdAt: 1 })
            .select('_id examMarks rank scholarship iasCoaching resultStatus status roomNo seatNo');
        
        let rank = 1;
        let previousMarks = null;
        let previousRank = 0;
        
        const updatePromises = [];
        
        for (let i = 0; i < students.length; i++) {
            const student = students[i];
            
            // Handle same marks getting same rank
            let currentRank;
            if (previousMarks === student.examMarks) {
                currentRank = previousRank;
            } else {
                currentRank = rank;
                previousRank = rank;
                previousMarks = student.examMarks;
            }
            
            // Assign scholarships for top 3
            let scholarship = '';
            if (currentRank === 1) {
                scholarship = 'Gold';
            } else if (currentRank === 2) {
                scholarship = 'Silver';
            } else if (currentRank === 3) {
                scholarship = 'Bronze';
            }
            
            // Top 100 get IAS coaching
            const iasCoaching = currentRank <= 100;
            
            // Update result status
            const resultStatus = student.examMarks >= 40 ? 'Passed' : 'Failed';
            
            // Update document WITHOUT triggering pre-save hooks
            updatePromises.push(
                this.findByIdAndUpdate(
                    student._id,
                    {
                        $set: {
                            rank: currentRank,
                            scholarship: scholarship,
                            iasCoaching: iasCoaching,
                            resultStatus: resultStatus,
                            status: 'Result Published'
                        }
                    },
                    { new: true, runValidators: true }
                )
            );
            
            rank++;
        }
        
        await Promise.all(updatePromises);
        
        return {
            success: true,
            message: `Ranks and scholarships updated for ${students.length} students`,
            updatedCount: students.length
        };
    } catch (error) {
        console.error('Error updating ranks:', error);
        throw error;
    }
};

// Static method to get top performers
studentSchema.statics.getTopPerformers = async function(limit = 10) {
    try {
        const topPerformers = await this.find({ examMarks: { $gt: 0 }, isDeleted: false })
            .sort({ rank: 1 })
            .limit(limit)
            .select('name registrationCode examMarks totalMarks rank scholarship iasCoaching studyingClass schoolName roomNo seatNo');
        
        return topPerformers;
    } catch (error) {
        console.error('Error getting top performers:', error);
        throw error;
    }
};

// Add indexes
studentSchema.index({ phoneNo: 1 });
studentSchema.index({ aadhaarNo: 1 });
studentSchema.index({ status: 1 });
studentSchema.index({ createdAt: -1 });
studentSchema.index({ registrationCode: 1 });
studentSchema.index({ roomNo: 1 });
studentSchema.index({ seatNo: 1 });
studentSchema.index({ roomNo: 1, seatNo: 1 });
studentSchema.index({ phoneNo: 1, createdAt: -1 });
studentSchema.index({ examMarks: -1 });
studentSchema.index({ rank: 1 });
studentSchema.index({ scholarship: 1 });
studentSchema.index({ isDeleted: 1 }); // ADDED HERE
studentSchema.index({ deletedAt: -1 }); // ADDED HERE

module.exports = mongoose.model('Student', studentSchema);