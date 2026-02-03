const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const invigilatorSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
    },
    phone: {
        type: String,
        required: [true, 'Phone number is required'],
        match: [/^\d{10}$/, 'Please enter a valid 10-digit phone number']
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [6, 'Password must be at least 6 characters']
    },
    role: {
        type: String,
        enum: ['invigilator'],
        default: 'invigilator'
    },
    assignedRooms: [{
        roomNo: {
            type: String,
            required: true
        },
        examDate: {
            type: Date,
            default: Date.now
        }
    }],
    isActive: {
        type: Boolean,
        default: true
    },
    lastLogin: {
        type: Date
    }
}, {
    timestamps: true
});

// Hash password before saving
invigilatorSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Compare password method
invigilatorSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Method to assign room
invigilatorSchema.methods.assignRoom = function(roomNo) {
    const existingRoom = this.assignedRooms.find(room => room.roomNo === roomNo);
    
    if (!existingRoom) {
        this.assignedRooms.push({
            roomNo: roomNo,
            examDate: new Date()
        });
    }
    
    return this;
};

// Method to remove room assignment
invigilatorSchema.methods.removeRoom = function(roomNo) {
    this.assignedRooms = this.assignedRooms.filter(room => room.roomNo !== roomNo);
    return this;
};

module.exports = mongoose.model('Invigilator', invigilatorSchema);