const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const Student = require('./models/Student');

async function check() {
    await mongoose.connect(process.env.MONGODB_URI);
    const room7 = await Student.find({ roomNo: 7, isDeleted: false });
    const room8 = await Student.find({ roomNo: 8, isDeleted: false });
    
    console.log(`Room 7 has ${room7.length} students.`);
    console.log(`Room 8 has ${room8.length} students.`);
    
    const r8c10 = room8.filter(s => s.studyingClass === '10').length;
    const r8c12 = room8.filter(s => s.studyingClass === '12').length;
    
    const r7c10 = room7.filter(s => s.studyingClass === '10').length;
    const r7c12 = room7.filter(s => s.studyingClass === '12').length;
    
    console.log(`Room 7: 10th=${r7c10}, 12th=${r7c12}`);
    console.log(`Room 8: 10th=${r8c10}, 12th=${r8c12}`);
    
    await mongoose.disconnect();
}

check().catch(console.error);
