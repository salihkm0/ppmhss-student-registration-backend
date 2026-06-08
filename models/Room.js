const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
    roomNo: {
        type: Number,
        required: true,
        unique: true,
        index: true
    },
    totalSeats: {
        type: Number,
        default: 30
    },
    blockName: {
        type: String,
        trim: true,
        default: ''
    },
    status: {
        type: String,
        enum: ['Active', 'Inactive'],
        default: 'Active'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Room', roomSchema);
