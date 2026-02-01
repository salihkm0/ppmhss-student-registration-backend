const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
    applicationNo: {
        type: String,
        unique: true,
        index: true
        // Removed required: true since it's auto-generated
    },
    registrationCode: {
        type: String,
        unique: true,
        index: true
        // Removed required: true since it's auto-generated
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
        enum: ['Registered'],
        default: 'Registered'
    }
}, {
    timestamps: true
});

// Generate registration code before saving
studentSchema.pre('save', async function(next) {
    try {
        // Generate simple sequential registration code starting from PPM1000
        if (!this.registrationCode) {
            const lastStudent = await this.constructor.findOne(
                {},
                {},
                { sort: { 'registrationCode': -1 } }
            );
            
            let nextNumber = 1000; // Start from 1000
            
            if (lastStudent && lastStudent.registrationCode) {
                const lastRegCode = lastStudent.registrationCode;
                // Extract numeric part from PPM1000 format
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
            
            // Get the last application number
            const lastStudent = await this.constructor.findOne(
                {},
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
        
        next();
    } catch (error) {
        console.error('Error generating codes:', error);
        next(error);
    }
});

// Add indexes for better performance
studentSchema.index({ phoneNo: 1 });
studentSchema.index({ aadhaarNo: 1 });
studentSchema.index({ status: 1 });
studentSchema.index({ createdAt: -1 });
studentSchema.index({ registrationCode: 1 });

// Static method to get next application number
studentSchema.statics.getNextApplicationNo = async function() {
    try {
        const year = new Date().getFullYear().toString().slice(-2);
        const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
        
        const lastStudent = await this.findOne(
            {},
            {},
            { sort: { 'applicationNo': -1 } }
        );
        
        let nextNumber = 1;
        if (lastStudent && lastStudent.applicationNo) {
            const lastAppNo = lastStudent.applicationNo;
            const lastSequence = parseInt(lastAppNo.slice(-4)) || 0;
            nextNumber = lastSequence + 1;
        }
        
        return `APP${year}${month}${String(nextNumber).padStart(4, '0')}`;
    } catch (error) {
        console.error('Error getting next application number:', error);
        throw error;
    }
};

// Static method to get next registration code
studentSchema.statics.getNextRegistrationCode = async function() {
    try {
        const lastStudent = await this.findOne(
            {},
            {},
            { sort: { 'registrationCode': -1 } }
        );
        
        let nextNumber = 1000; // Start from 1000
        
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
        
        return `PPM${nextNumber}`;
    } catch (error) {
        console.error('Error getting next registration code:', error);
        throw error;
    }
};

module.exports = mongoose.model('Student', studentSchema);