require('dotenv').config();
const mongoose = require('mongoose');
const Student = require('./models/Student');

async function moveStudents() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find all active students in room 8
    const room8Students = await Student.find({ roomNo: 8, isDeleted: false }).sort({ seatNo: 1 });
    console.log(`Found ${room8Students.length} students in room 8`);

    // Find available seats in room 7
    // A room can have 20 seats. 
    const room7Students = await Student.find({ roomNo: 7, isDeleted: false });
    const takenSeats = room7Students.map(s => s.seatNo);
    
    let availableSeats = [];
    for (let i = 1; i <= 20; i++) {
      if (!takenSeats.includes(i)) {
        availableSeats.push(i);
      }
    }
    
    console.log(`Available seats in room 7: ${availableSeats.length}`);

    if (availableSeats.length < room8Students.length) {
      console.log('Not enough seats in room 7 to move all students from room 8');
      return;
    }

    for (let i = 0; i < room8Students.length; i++) {
      const student = room8Students[i];
      student.roomNo = 7;
      student.seatNo = availableSeats[i];
      await student.save({ validateBeforeSave: false }); // Skip validators to just update room/seat
      console.log(`Moved ${student.name} (Reg: ${student.registrationCode}) to Room 7, Seat ${availableSeats[i]}`);
    }

    console.log('Done moving students');
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

moveStudents();
