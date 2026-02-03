const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/student_registration', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        
        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
        
        // Create indexes
        await mongoose.connection.db.collection('students').createIndex({ roomNo: 1, seatNo: 1 });
        await mongoose.connection.db.collection('results').createIndex({ studentId: 1 });
        await mongoose.connection.db.collection('invigilators').createIndex({ email: 1 }, { unique: true });
        
    } catch (error) {
        console.error(`❌ MongoDB connection error: ${error.message}`);
        process.exit(1);
    }
};

module.exports = connectDB;