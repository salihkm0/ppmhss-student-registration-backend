const mongoose = require('mongoose');
require('dotenv').config();
const Student = require('./models/Student');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const room7Students = await Student.find({ roomNo: 7, isDeleted: false }).sort({ seatNo: 1 });
  console.log(`Found ${room7Students.length} students in Room 7.`);
  
  const room8Students = await Student.find({ roomNo: 8, isDeleted: false }).sort({ seatNo: 1 });
  console.log(`Found ${room8Students.length} students in Room 8.`);
  
  if (room8Students.length === 0) {
      console.log("No students in Room 8 to move.");
      mongoose.disconnect();
      return;
  }
  
  let maxSeatNo = room7Students.length > 0 
      ? Math.max(...room7Students.map(s => s.seatNo || 0)) 
      : 0;
      
  for (const student of room8Students) {
      maxSeatNo++;
      student.roomNo = 7;
      student.seatNo = maxSeatNo;
      await student.save();
  }
  
  console.log("Successfully combined Room 8 into Room 7.");
  mongoose.disconnect();
}
run();
