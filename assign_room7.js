const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const Student = require('./models/Student');

async function assign() {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const room8 = await Student.find({ roomNo: 8, isDeleted: false });
    
    for (const student of room8) {
        student.roomNo = null;
        student.seatNo = null;
        
        // Let's test if finding available room works and forces them into Room 7
        // Wait, instead of relying on the save hook which might pick another room, 
        // we can require the model and call the function manually, or we can just 
        // set their roomNo to 7 and seatNo to a specific value.
        // Actually, let's just use the built-in hook by setting it to null and let's see which room it assigns.
        // Or better yet, we can do it deterministically.
        
        const occupiedDocs = await Student.find({ roomNo: 7, isDeleted: false }).select('seatNo');
        const occupied = new Set(occupiedDocs.map(s => s.seatNo));
        
        // studyingClass is '12'
        let assignedSeat = null;
        
        // Desk-based layout logic:
        // class 10 -> odd seats (1, 3, 5)
        // class 12 -> even seats (2, 4, 6)
        for (let i = 2; i <= 60; i += 2) {
            if (!occupied.has(i)) {
                assignedSeat = i;
                break;
            }
        }
        
        if (assignedSeat) {
            student.roomNo = 7;
            student.seatNo = assignedSeat;
            const deskNo = Math.ceil(assignedSeat / 2); // 2 students per desk
            student.examType = deskNo % 2 === 1 ? 'A' : 'B';
            await student.save();
            console.log(`Moved ${student.name} to Room 7, Seat ${assignedSeat}`);
        } else {
            console.log(`Could not find seat for ${student.name}`);
        }
    }
    
    await mongoose.disconnect();
}

assign().catch(console.error);
