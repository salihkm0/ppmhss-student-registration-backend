// const mongoose = require('mongoose');

// const studentSchema = new mongoose.Schema({
//     applicationNo: {
//         type: String,
//         unique: true,
//         index: true
//     },
//     registrationCode: {
//         type: String,
//         unique: true,
//         index: true
//     },
//     name: {
//         type: String,
//         required: [true, 'Name is required'],
//         trim: true,
//         minlength: [3, 'Name must be at least 3 characters']
//     },
//     gender: {
//         type: String,
//         enum: ['Male', 'Female', 'Other'],
//         required: [true, 'Gender is required']
//     },
//     fatherName: {
//         type: String,
//         required: [true, "Father's name is required"],
//         trim: true,
//         minlength: [3, "Father's name must be at least 3 characters"]
//     },
//     aadhaarNo: {
//         type: String,
//         required: [true, 'Aadhaar number is required'],
//         unique: true,
//         match: [/^\d{12}$/, 'Please enter a valid 12-digit Aadhaar number']
//     },
//     schoolName: {
//         type: String,
//         required: [true, 'School name is required'],
//         trim: true
//     },
//     subDistrict: {
//         type: String,
//         required: [true, 'Sub-district is required'],
//         trim: true,
//         enum: ['kondotty', 'manjeri', 'kizhisseri', 'vengara' ,'areekode','',' ','malappuram']
//     },
//     studyingClass: {
//         type: String,
//         required: [true, 'Class is required'],
//         enum: ['7', '8', '9', '10', '11', '12']
//     },
//     medium: {
//         type: String,
//         required: [true, 'Medium is required'],
//         enum: ['English', 'Malayalam', 'Hindi', 'Other']
//     },
//     phoneNo: {
//         type: String,
//         required: [true, 'Phone number is required'],
//         match: [/^\d{10}$/, 'Please enter a valid 10-digit phone number']
//     },
//     address: {
//         houseName: {
//             type: String,
//             required: [true, 'House name is required'],
//             trim: true
//         },
//         place: {
//             type: String,
//             required: [true, 'Place is required'],
//             trim: true
//         },
//         postOffice: {
//             type: String,
//             required: [true, 'Post office is required'],
//             trim: true
//         },
//         pinCode: {
//             type: String,
//             required: [true, 'PIN code is required'],
//             match: [/^\d{6}$/, 'Please enter a valid 6-digit PIN code']
//         },
//         localBodyType: {
//             type: String,
//             required: [true, 'Local body type is required'],
//             enum: ['Municipality', 'Corporation', 'Panchayat']
//         },
//         localBodyName: {
//             type: String,
//             required: [true, 'Local body name is required'],
//             trim: true
//         },
//         village: {
//             type: String,
//             required: [true, 'Village name is required'],
//             trim: true
//         }
//     },
//     registrationDate: {
//         type: Date,
//         default: Date.now
//     },
//     status: {
//         type: String,
//         enum: ['Registered', 'Exam Completed', 'Result Published'],
//         default: 'Registered'
//     },
//     roomNo: {
//         type: Number,
//         required: false,
//         default: null
//     },
//     seatNo: {
//         type: Number,
//         required: false,
//         default: null
//     },
//     examMarks: {
//         type: Number,
//         default: 0
//     },
//     totalMarks: {
//         type: Number,
//         default: 100
//     },
//     resultStatus: {
//         type: String,
//         enum: ['Pending', 'Passed', 'Failed'],
//         default: 'Pending'
//     },
//     rank: {
//         type: Number,
//         default: 0
//     },
//     scholarship: {
//         type: String,
//         enum: ['', 'Gold', 'Silver', 'Bronze'],
//         default: ''
//     },
//     iasCoaching: {
//         type: Boolean,
//         default: false
//     },
//     // SOFT DELETE FIELDS - UPDATED
//     isDeleted: {
//         type: Boolean,
//         default: false
//     },
//     deletedAt: {
//         type: Date,
//         default: null
//     },
//     deletedBy: {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: 'Admin',
//         default: null
//     },
//     deleteReason: {
//         type: String,
//         default: ''
//     },
//     // Store original codes for restoration
//     originalRegistrationCode: {
//         type: String,
//         default: null
//     },
//     originalApplicationNo: {
//         type: String,
//         default: null
//     }
// }, {
//     timestamps: true
// });

// // Add query middleware to filter out deleted documents by default
// studentSchema.pre(/^find/, function() {
//     if (!this.getOptions().includeDeleted) {
//         this.where({ isDeleted: false });
//     }
// });

// studentSchema.pre('countDocuments', function() {
//     if (!this.getOptions().includeDeleted) {
//         this.where({ isDeleted: false });
//     }
// });

// // Helper function to find next available seat in a room
// const findAvailableSeat = async function(roomNo) {
//     const takenSeats = await this.find({
//         roomNo: roomNo,
//         isDeleted: false
//     }).select('seatNo');
    
//     const takenSeatNumbers = takenSeats.map(s => s.seatNo);
    
//     // Find first available seat (1-20)
//     for (let seat = 1; seat <= 20; seat++) {
//         if (!takenSeatNumbers.includes(seat)) {
//             return seat;
//         }
//     }
//     return null; // Room is full
// };

// // Helper function to find available room with seats
// const findAvailableRoom = async function() {
//     // Check existing rooms for available seats
//     const roomOccupancy = await this.aggregate([
//         { $match: { isDeleted: false } },
//         { $group: {
//             _id: '$roomNo',
//             count: { $sum: 1 },
//             seats: { $push: '$seatNo' }
//         }},
//         { $match: { count: { $lt: 20 } } },
//         { $sort: { _id: 1 } }
//     ]);
    
//     // Find room with available seat
//     for (const room of roomOccupancy) {
//         const availableSeat = await findAvailableSeat.call(this, room._id);
//         if (availableSeat) {
//             return { roomNo: room._id, seatNo: availableSeat };
//         }
//     }
    
//     // If all rooms are full, create new room
//     const maxRoom = await this.findOne({ isDeleted: false })
//         .sort({ roomNo: -1 })
//         .select('roomNo');
    
//     const newRoomNo = maxRoom ? maxRoom.roomNo + 1 : 1;
//     return { roomNo: newRoomNo, seatNo: 1 };
// };

// // Generate registration code before saving - UPDATED VERSION
// studentSchema.pre('save', async function(next) {
//     try {
//         // Only generate codes for new documents
//         if (this.isNew) {
//             // Generate simple sequential registration code starting from PPM1000
//             if (!this.registrationCode) {
//                 const lastStudent = await this.constructor.findOne(
//                     { isDeleted: false },
//                     {},
//                     { sort: { 'registrationCode': -1 } }
//                 );
                
//                 let nextNumber = 1000;
                
//                 if (lastStudent && lastStudent.registrationCode) {
//                     const lastRegCode = lastStudent.registrationCode;
//                     const match = lastRegCode.match(/PPM(\d+)/);
//                     if (match && match[1]) {
//                         const lastNumber = parseInt(match[1]);
//                         if (!isNaN(lastNumber) && lastNumber >= 1000) {
//                             nextNumber = lastNumber + 1;
//                         }
//                     }
//                 }
                
//                 this.registrationCode = `PPM${nextNumber}`;
//                 this.originalRegistrationCode = this.registrationCode;
//             }
            
//             // Generate application number
//             if (!this.applicationNo) {
//                 const year = new Date().getFullYear().toString().slice(-2);
//                 const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
                
//                 const lastStudent = await this.constructor.findOne(
//                     { isDeleted: false },
//                     {},
//                     { sort: { 'applicationNo': -1 } }
//                 );
                
//                 let nextNumber = 1;
//                 if (lastStudent && lastStudent.applicationNo) {
//                     const lastAppNo = lastStudent.applicationNo;
//                     const lastSequence = parseInt(lastAppNo.slice(-4)) || 0;
//                     nextNumber = lastSequence + 1;
//                 }
                
//                 this.applicationNo = `APP${year}${month}${String(nextNumber).padStart(4, '0')}`;
//                 this.originalApplicationNo = this.applicationNo;
//             }
            
//             // Assign room and seat - fill gaps first, then create new room if needed
//             if (this.roomNo === null || this.seatNo === null) {
//                 const available = await findAvailableRoom.call(this.constructor);
//                 this.roomNo = available.roomNo;
//                 this.seatNo = available.seatNo;
//             }
//         }
        
//         next();
//     } catch (error) {
//         console.error('Error generating codes:', error);
//         next(error);
//     }
// });

// // Static method to soft delete a student - UPDATED with room seat optimization
// studentSchema.statics.softDelete = async function(studentId, adminId, reason) {
//     try {
//         // First find the student
//         const student = await this.findById(studentId);
        
//         if (!student) {
//             throw new Error('Student not found');
//         }
        
//         // Store original codes
//         const originalRegistrationCode = student.registrationCode;
//         const originalApplicationNo = student.applicationNo;
        
//         // Generate deleted codes
//         const deletedRegistrationCode = `DEL${originalRegistrationCode}-${Date.now()}`;
//         const deletedApplicationNo = `DEL${originalApplicationNo}-${Date.now()}`;
        
//         // Update the student
//         const updatedStudent = await this.findByIdAndUpdate(
//             studentId,
//             {
//                 $set: {
//                     isDeleted: true,
//                     deletedAt: new Date(),
//                     deletedBy: adminId,
//                     deleteReason: reason || '',
//                     registrationCode: deletedRegistrationCode,
//                     applicationNo: deletedApplicationNo,
//                     originalRegistrationCode: originalRegistrationCode,
//                     originalApplicationNo: originalApplicationNo
//                 }
//             },
//             { new: true }
//         );
        
//         // Reassign seats for remaining students in the same room
//         await this.reassignSeats(student.roomNo);
        
//         return {
//             success: true,
//             message: 'Student soft deleted successfully',
//             data: updatedStudent
//         };
//     } catch (error) {
//         console.error('Error soft deleting student:', error);
//         throw error;
//     }
// };

// // Static method to reassign seats in a room after deletion
// studentSchema.statics.reassignSeats = async function(roomNo) {
//     try {
//         // Get all active students in the room sorted by seat number
//         const students = await this.find({
//             roomNo: roomNo,
//             isDeleted: false
//         }).sort({ seatNo: 1 });
        
//         // Reassign sequential seat numbers
//         const updatePromises = [];
//         students.forEach((student, index) => {
//             const newSeatNo = index + 1;
//             if (student.seatNo !== newSeatNo) {
//                 updatePromises.push(
//                     this.findByIdAndUpdate(
//                         student._id,
//                         { $set: { seatNo: newSeatNo } },
//                         { new: true }
//                     )
//                 );
//             }
//         });
        
//         await Promise.all(updatePromises);
        
//         return {
//             success: true,
//             message: `Seats reassigned in Room ${roomNo}`,
//             studentsUpdated: updatePromises.length
//         };
//     } catch (error) {
//         console.error('Error reassigning seats:', error);
//         throw error;
//     }
// };

// studentSchema.statics.restore = async function(studentId) {
//     try {
//         // Find the deleted student
//         const deletedStudent = await this.findOne({
//             _id: studentId,
//             isDeleted: true
//         }).setOptions({ includeDeleted: true });
        
//         if (!deletedStudent) {
//             throw new Error('Deleted student not found');
//         }
        
//         // Check if original codes would conflict
//         if (deletedStudent.originalRegistrationCode) {
//             const existingRegCode = await this.findOne({
//                 registrationCode: deletedStudent.originalRegistrationCode,
//                 isDeleted: false
//             });
            
//             if (existingRegCode) {
//                 throw new Error('Original registration code already in use');
//             }
//         }
        
//         if (deletedStudent.originalApplicationNo) {
//             const existingAppNo = await this.findOne({
//                 applicationNo: deletedStudent.originalApplicationNo,
//                 isDeleted: false
//             });
            
//             if (existingAppNo) {
//                 throw new Error('Original application number already in use');
//             }
//         }
        
//         // Find available seat
//         const available = await findAvailableRoom.call(this);
        
//         // Restore the student
//         const restoredStudent = await this.findByIdAndUpdate(
//             studentId,
//             {
//                 $set: {
//                     isDeleted: false,
//                     deletedAt: null,
//                     deletedBy: null,
//                     deleteReason: '',
//                     registrationCode: deletedStudent.originalRegistrationCode || deletedStudent.registrationCode.replace(/^DEL/, ''),
//                     applicationNo: deletedStudent.originalApplicationNo || deletedStudent.applicationNo.replace(/^DEL/, ''),
//                     roomNo: available.roomNo,
//                     seatNo: available.seatNo,
//                     originalRegistrationCode: null,
//                     originalApplicationNo: null
//                 }
//             },
//             { 
//                 new: true,
//                 runValidators: true
//             }
//         );
        
//         return {
//             success: true,
//             message: 'Student restored successfully',
//             data: restoredStudent
//         };
//     } catch (error) {
//         console.error('Error in restore:', error.message);
//         throw error;
//     }
// };

// // Static method to permanently delete a student
// studentSchema.statics.hardDelete = async function(studentId) {
//     try {
//         // First check if the student exists and is deleted
//         const student = await this.findOne({ 
//             _id: studentId,
//             isDeleted: true 
//         }).setOptions({ includeDeleted: true });

//         if (!student) {
//             throw new Error('Deleted student not found');
//         }

//         // Delete the student permanently
//         await this.deleteOne({ _id: studentId });

//         // Reassign seats in the room if student had a room assigned
//         if (student.roomNo) {
//             await this.reassignSeats(student.roomNo);
//         }

//         return {
//             success: true,
//             message: 'Student permanently deleted'
//         };
//     } catch (error) {
//         console.error('Error hard deleting student:', error);
//         throw error;
//     }
// };

// // Static method to get deleted students
// studentSchema.statics.getDeletedStudents = async function() {
//     try {
//         const deletedStudents = await this.find({ isDeleted: true })
//             .setOptions({ includeDeleted: true })
//             .populate('deletedBy', 'name email')
//             .sort({ deletedAt: -1 });

//         return deletedStudents;
//     } catch (error) {
//         console.error('Error getting deleted students:', error);
//         throw error;
//     }
// };

// // Static method to get room distribution
// studentSchema.statics.getRoomDistribution = async function() {
//     try {
//         const distribution = await this.aggregate([
//             { $match: { isDeleted: false } },
//             { $group: {
//                 _id: '$roomNo',
//                 totalStudents: { $sum: 1 },
//                 maleCount: {
//                     $sum: { $cond: [{ $eq: ['$gender', 'Male'] }, 1, 0] }
//                 },
//                 femaleCount: {
//                     $sum: { $cond: [{ $eq: ['$gender', 'Female'] }, 1, 0] }
//                 },
//                 otherCount: {
//                     $sum: { $cond: [{ $eq: ['$gender', 'Other'] }, 1, 0] }
//                 },
//                 students: {
//                     $push: {
//                         name: '$name',
//                         registrationCode: '$registrationCode',
//                         seatNo: '$seatNo',
//                         gender: '$gender'
//                     }
//                 }
//             }},
//             { $sort: { _id: 1 } },
//             { $project: {
//                 roomNo: '$_id',
//                 totalStudents: 1,
//                 maleCount: 1,
//                 femaleCount: 1,
//                 otherCount: 1,
//                 availableSeats: { $subtract: [20, '$totalStudents'] },
//                 occupancyRate: { $multiply: [{ $divide: ['$totalStudents', 20] }, 100] },
//                 students: { $sortArray: { input: '$students', sortBy: { seatNo: 1 } } }
//             }}
//         ]);

//         return distribution;
//     } catch (error) {
//         console.error('Error getting room distribution:', error);
//         throw error;
//     }
// };

// // Static method to update ranks and scholarships
// studentSchema.statics.updateRanksAndScholarships = async function() {
//     try {
//         // Get all students sorted by marks descending (excluding deleted)
//         const students = await this.find({ examMarks: { $gt: 0 }, isDeleted: false })
//             .sort({ examMarks: -1, createdAt: 1 })
//             .select('_id examMarks rank scholarship iasCoaching resultStatus status roomNo seatNo');
        
//         let rank = 1;
//         let previousMarks = null;
//         let previousRank = 0;
        
//         const updatePromises = [];
        
//         for (let i = 0; i < students.length; i++) {
//             const student = students[i];
            
//             // Handle same marks getting same rank
//             let currentRank;
//             if (previousMarks === student.examMarks) {
//                 currentRank = previousRank;
//             } else {
//                 currentRank = rank;
//                 previousRank = rank;
//                 previousMarks = student.examMarks;
//             }
            
//             // Assign scholarships for top 3
//             let scholarship = '';
//             if (currentRank === 1) {
//                 scholarship = 'Gold';
//             } else if (currentRank === 2) {
//                 scholarship = 'Silver';
//             } else if (currentRank === 3) {
//                 scholarship = 'Bronze';
//             }
            
//             // Top 100 get IAS coaching
//             const iasCoaching = currentRank <= 100;
            
//             // Update result status
//             const resultStatus = student.examMarks >= 40 ? 'Passed' : 'Failed';
            
//             // Update document WITHOUT triggering pre-save hooks
//             updatePromises.push(
//                 this.findByIdAndUpdate(
//                     student._id,
//                     {
//                         $set: {
//                             rank: currentRank,
//                             scholarship: scholarship,
//                             iasCoaching: iasCoaching,
//                             resultStatus: resultStatus,
//                             status: 'Result Published'
//                         }
//                     },
//                     { new: true, runValidators: true }
//                 )
//             );
            
//             rank++;
//         }
        
//         await Promise.all(updatePromises);
        
//         return {
//             success: true,
//             message: `Ranks and scholarships updated for ${students.length} students`,
//             updatedCount: students.length
//         };
//     } catch (error) {
//         console.error('Error updating ranks:', error);
//         throw error;
//     }
// };

// // Static method to get top performers
// studentSchema.statics.getTopPerformers = async function(limit = 10) {
//     try {
//         const topPerformers = await this.find({ examMarks: { $gt: 0 }, isDeleted: false })
//             .sort({ rank: 1 })
//             .limit(limit)
//             .select('name registrationCode examMarks totalMarks rank scholarship iasCoaching studyingClass schoolName roomNo seatNo');
        
//         return topPerformers;
//     } catch (error) {
//         console.error('Error getting top performers:', error);
//         throw error;
//     }
// };

// // Static method to get available seats in each room
// studentSchema.statics.getAvailableSeats = async function() {
//     try {
//         const rooms = await this.aggregate([
//             { $match: { isDeleted: false } },
//             { $group: {
//                 _id: '$roomNo',
//                 occupiedSeats: { $sum: 1 },
//                 seatNumbers: { $push: '$seatNo' }
//             }},
//             { $sort: { _id: 1 } },
//             { $project: {
//                 roomNo: '$_id',
//                 occupiedSeats: 1,
//                 availableSeats: { $subtract: [20, '$occupiedSeats'] },
//                 isFull: { $eq: ['$occupiedSeats', 20] },
//                 seatNumbers: { $sortArray: { input: '$seatNumbers', sortBy: 1 } },
//                 availableSeatNumbers: {
//                     $setDifference: [
//                         { $range: [1, 21] },
//                         '$seatNumbers'
//                     ]
//                 }
//             }}
//         ]);

//         return rooms;
//     } catch (error) {
//         console.error('Error getting available seats:', error);
//         throw error;
//     }
// };

// // Add indexes
// studentSchema.index({ phoneNo: 1 });
// studentSchema.index({ aadhaarNo: 1 });
// studentSchema.index({ status: 1 });
// studentSchema.index({ createdAt: -1 });
// studentSchema.index({ registrationCode: 1 });
// studentSchema.index({ roomNo: 1 });
// studentSchema.index({ seatNo: 1 });
// studentSchema.index({ roomNo: 1, seatNo: 1 });
// studentSchema.index({ phoneNo: 1, createdAt: -1 });
// studentSchema.index({ examMarks: -1 });
// studentSchema.index({ rank: 1 });
// studentSchema.index({ scholarship: 1 });
// studentSchema.index({ isDeleted: 1 });
// studentSchema.index({ deletedAt: -1 });

// module.exports = mongoose.model('Student', studentSchema);

const mongoose = require('mongoose');

const markHistorySchema = new mongoose.Schema({
  marks: {
    type: Number,
    required: true
  },
  editedBy: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'editedByModel',
    required: true
  },
  editedByModel: {
    type: String,
    enum: ['Invigilator', 'Admin'],
    required: true
  },
  editedByName: {
    type: String,
    required: true
  },
  editedAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['draft', 'submitted', 'final'],
    default: 'draft'
  },
  previousMarks: {
    type: Number,
    default: null
  },
  action: {
    type: String,
    enum: ['entered', 'updated', 'submitted', 'finalized'],
    required: true
  },
  notes: {
    type: String,
    default: ''
  }
});

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
    subDistrict: {
        type: String,
        required: [true, 'Sub-district is required'],
        trim: true,
        enum: ['kondotty', 'manjeri', 'kizhisseri', 'vengara' ,'areekode','',' ','malappuram']
    },
    studyingClass: {
        type: String,
        required: [true, 'Class is required'],
        enum: ['10', '12']
    },
    examType: {
        type: String,
        enum: ['A', 'B', ''],
        default: ''
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
        type: Number,
        required: false,
        default: null
    },
    seatNo: {
        type: Number,
        required: false,
        default: null
    },
    examMarks: {
        type: Number,
        default: 0
    },
    totalMarks: {
        type: Number,
        default: 50
    },
    resultStatus: {
        type: String,
        enum: ['Pending', 'Passed', 'Failed','Absent' , "Status Not Available", "Rank Published"],
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
    isSelected : {
        type: Boolean,
        default: false
    },
    // Mark entry status
    markEntryStatus: {
        type: String,
        enum: ['pending', 'draft', 'submitted', 'final'],
        default: 'pending'
    },
    // Mark history for tracking changes
    markHistory: [markHistorySchema],
    // Current mark editor
    currentEditor: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'currentEditorModel',
        default: null
    },
    currentEditorModel: {
        type: String,
        enum: [null, 'Invigilator', 'Admin'],
        default: null
    },

    currentEditorName: {
        type: String,
        default: null
    },
    lastEditedAt: {
        type: Date,
        default: null
    },
    submittedAt: {
        type: Date,
        default: null
    },
    submittedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Invigilator',
        default: null
    },
    // SOFT DELETE FIELDS
    isDeleted: {
        type: Boolean,
        default: false
    },
    deletedAt: {
        type: Date,
        default: null
    },
    deletedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
        default: null
    },
    deleteReason: {
        type: String,
        default: ''
    },
    // Store original codes for restoration
    originalRegistrationCode: {
        type: String,
        default: null
    },
    originalApplicationNo: {
        type: String,
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

// ─────────────────────────────────────────────────────────────────────────────
// SEATING LOGIC (v2 – 2 classes: 10th & 12th)
// ─────────────────────────────────────────────────────────────────────────────
// Room layout:
//   • 30 students per room, 10 desks, 3 students per desk
//   • Desk n  → seats (n-1)*3+1 (left/10th), (n-1)*3+2 (center/12th), (n-1)*3+3 (right/10th)
//   • Seat position within a desk = ((seatNo - 1) % 3) + 1
//       deskPos 1 → 10th class, Exam Type A  (left)
//       deskPos 2 → 12th class, Exam Type A  (center)
//       deskPos 3 → 10th class, Exam Type B  (right)
// ─────────────────────────────────────────────────────────────────────────────

const STUDENTS_PER_ROOM = 30;
const DESKS_PER_ROOM    = 10;
const STUDENTS_PER_DESK = 3;

/**
 * Returns all valid seat numbers in a room for a given class.
 * 10th  → positions 1 & 3 within each desk (seats 1,3,4,6,7,9 …)
 * 12th  → position 2 within each desk        (seats 2,5,8,11 …)
 */
const seatsForClass = function(studyingClass) {
    const seats = [];
    for (let desk = 1; desk <= DESKS_PER_ROOM; desk++) {
        const base = (desk - 1) * STUDENTS_PER_DESK;
        if (studyingClass === '10') {
            seats.push(base + 1); // left
            seats.push(base + 3); // right
        } else if (studyingClass === '12') {
            seats.push(base + 2); // center
        }
    }
    return seats;
};

/**
 * Exam type derived from seat number:
 *   deskPos 1 (10th left)    → always Type A
 *   deskPos 3 (10th right)   → always Type B
 *   deskPos 2 (12th center)  → alternates A/B per desk:
 *                               odd desk  → Type A
 *                               even desk → Type B
 */
const examTypeForSeat = function(seatNo) {
    const deskPos = ((seatNo - 1) % STUDENTS_PER_DESK) + 1;
    if (deskPos === 1) return 'A'; // 10th left
    if (deskPos === 3) return 'B'; // 10th right
    // deskPos === 2: 12th center – alternate by desk number
    const deskNo = Math.ceil(seatNo / STUDENTS_PER_DESK);
    return deskNo % 2 === 1 ? 'A' : 'B';
};

/**
 * Find the next available seat in a specific room for a given class.
 * Returns null if no seat is available for that class.
 */
const findAvailableSeatForClass = async function(roomNo, studyingClass) {
    const occupiedDocs = await this.find({ roomNo, isDeleted: false }).select('seatNo');
    const occupied = new Set(occupiedDocs.map(s => s.seatNo));

    const candidateSeats = seatsForClass(studyingClass);
    for (const seat of candidateSeats) {
        if (!occupied.has(seat)) return seat;
    }
    return null; // class quota in this room is full
};

/**
 * Find the room + seat for the next student of a given class.
 * Priority: fill existing rooms in order before opening a new room.
 */
const findAvailableRoom = async function(studyingClass) {
    // Get all partially-filled rooms (fewer than STUDENTS_PER_ROOM active students)
    const roomOccupancy = await this.aggregate([
        { $match: { isDeleted: false } },
        { $group: { _id: '$roomNo', count: { $sum: 1 } } },
        { $match: { count: { $lt: STUDENTS_PER_ROOM } } },
        { $sort: { _id: 1 } }
    ]);

    for (const room of roomOccupancy) {
        const seat = await findAvailableSeatForClass.call(this, room._id, studyingClass);
        if (seat !== null) {
            return { roomNo: room._id, seatNo: seat };
        }
    }

    // All existing rooms are either full or have no seats for this class → open a new room
    const maxRoom = await this.findOne({ isDeleted: false }).sort({ roomNo: -1 }).select('roomNo');
    const newRoomNo = maxRoom ? maxRoom.roomNo + 1 : 1;

    // Pick the first valid seat in the new room for this class
    const firstSeat = seatsForClass(studyingClass)[0];
    return { roomNo: newRoomNo, seatNo: firstSeat };
};

// Generate registration code before saving
studentSchema.pre('save', async function(next) {
    try {
        // Only generate codes for new documents
        if (this.isNew) {
            // Generate sequential registration code: NMEA2xxx for Class 10, NMEA3xxx for Class 12
            if (!this.registrationCode) {
                const cls = this.studyingClass === '10' ? '10' : '12';
                const startNum = cls === '10' ? 2000 : 3000;
                
                const lastStudent = await this.constructor.findOne(
                    { 
                        studyingClass: cls,
                        isDeleted: false,
                        registrationCode: { $regex: '^NMEA' }
                    },
                    {},
                    { sort: { 'registrationCode': -1 } }
                );
                
                let nextNumber = startNum;
                
                if (lastStudent && lastStudent.registrationCode) {
                    const lastRegCode = lastStudent.registrationCode;
                    const match = lastRegCode.match(/NMEA(\d+)/);
                    if (match && match[1]) {
                        const lastNumber = parseInt(match[1]);
                        if (!isNaN(lastNumber) && lastNumber >= startNum) {
                            nextNumber = lastNumber + 1;
                        }
                    }
                }
                
                this.registrationCode = `NMEA${nextNumber}`;
                this.originalRegistrationCode = this.registrationCode;
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
                this.originalApplicationNo = this.applicationNo;
            }
            
            // Assign room, seat, and examType based on class
            if (this.roomNo === null || this.seatNo === null) {
                const available = await findAvailableRoom.call(this.constructor, this.studyingClass);
                this.roomNo = available.roomNo;
                this.seatNo = available.seatNo;

                // Auto-create Room document in Room collection if it doesn't exist
                if (this.roomNo) {
                    try {
                        const RoomModel = mongoose.model('Room');
                        const roomExists = await RoomModel.findOne({ roomNo: this.roomNo });
                        if (!roomExists) {
                            const newRoom = new RoomModel({
                                roomNo: this.roomNo,
                                totalSeats: 30,
                                status: 'Active'
                            });
                            await newRoom.save();
                            console.log(`Auto-created Room ${this.roomNo} in database during student registration.`);
                        }
                    } catch (roomErr) {
                        console.error('Error auto-creating Room document during registration:', roomErr);
                    }
                }
            }
            // Derive examType from the assigned seat position
            if (!this.examType) {
                this.examType = examTypeForSeat(this.seatNo);
            }
        }
        
        next();
    } catch (error) {
        console.error('Error generating codes:', error);
        next(error);
    }
});

// Static method to soft delete a student
studentSchema.statics.softDelete = async function(studentId, adminId, reason) {
    try {
        // First find the student
        const student = await this.findById(studentId);
        
        if (!student) {
            throw new Error('Student not found');
        }
        
        // Store original codes
        const originalRegistrationCode = student.registrationCode;
        const originalApplicationNo = student.applicationNo;
        
        // Generate deleted codes
        const deletedRegistrationCode = `DEL${originalRegistrationCode}-${Date.now()}`;
        const deletedApplicationNo = `DEL${originalApplicationNo}-${Date.now()}`;
        
        // Update the student
        const updatedStudent = await this.findByIdAndUpdate(
            studentId,
            {
                $set: {
                    isDeleted: true,
                    deletedAt: new Date(),
                    deletedBy: adminId,
                    deleteReason: reason || '',
                    registrationCode: deletedRegistrationCode,
                    applicationNo: deletedApplicationNo,
                    originalRegistrationCode: originalRegistrationCode,
                    originalApplicationNo: originalApplicationNo
                }
            },
            { new: true }
        );
        
        // Reassign seats for remaining students in the same room
        await this.reassignSeats(student.roomNo);
        
        return {
            success: true,
            message: 'Student soft deleted successfully',
            data: updatedStudent
        };
    } catch (error) {
        console.error('Error soft deleting student:', error);
        throw error;
    }
};

// Static method to handle after a student deletion.
// With the desk-based layout (v2), each seat number is permanently mapped
// to a specific class and exam type, so we do NOT renumber existing students.
// The vacated seat will simply be re-filled by the next student of the same class.
studentSchema.statics.reassignSeats = async function(roomNo) {
    try {
        // Recalculate examType for all students in the room (safety net)
        const students = await this.find({ roomNo, isDeleted: false }).select('_id seatNo examType');

        const updatePromises = students
            .filter(s => s.seatNo != null)
            .map(s => {
                const correctExamType = examTypeForSeat(s.seatNo);
                if (s.examType !== correctExamType) {
                    return this.findByIdAndUpdate(s._id, { $set: { examType: correctExamType } }, { new: true });
                }
                return null;
            })
            .filter(Boolean);

        await Promise.all(updatePromises);

        return {
            success: true,
            message: `Seat integrity verified in Room ${roomNo}`,
            studentsUpdated: updatePromises.length
        };
    } catch (error) {
        console.error('Error in reassignSeats:', error);
        throw error;
    }
};

studentSchema.statics.restore = async function(studentId) {
    try {
        // Find the deleted student
        const deletedStudent = await this.findOne({
            _id: studentId,
            isDeleted: true
        }).setOptions({ includeDeleted: true });
        
        if (!deletedStudent) {
            throw new Error('Deleted student not found');
        }
        
        // Check if original codes would conflict
        if (deletedStudent.originalRegistrationCode) {
            const existingRegCode = await this.findOne({
                registrationCode: deletedStudent.originalRegistrationCode,
                isDeleted: false
            });
            
            if (existingRegCode) {
                throw new Error('Original registration code already in use');
            }
        }
        
        if (deletedStudent.originalApplicationNo) {
            const existingAppNo = await this.findOne({
                applicationNo: deletedStudent.originalApplicationNo,
                isDeleted: false
            });
            
            if (existingAppNo) {
                throw new Error('Original application number already in use');
            }
        }
        
        // Find available seat
        const available = await findAvailableRoom.call(this, deletedStudent.studyingClass);
        
        // Auto-create Room document in Room collection if it doesn't exist
        if (available.roomNo) {
            try {
                const RoomModel = mongoose.model('Room');
                const roomExists = await RoomModel.findOne({ roomNo: available.roomNo });
                if (!roomExists) {
                    const newRoom = new RoomModel({
                        roomNo: available.roomNo,
                        totalSeats: 30,
                        status: 'Active'
                    });
                    await newRoom.save();
                    console.log(`Auto-created Room ${available.roomNo} in database during student restore.`);
                }
            } catch (roomErr) {
                console.error('Error auto-creating Room document during restore:', roomErr);
            }
        }
        
        // Restore the student
        const restoredStudent = await this.findByIdAndUpdate(
            studentId,
            {
                $set: {
                    isDeleted: false,
                    deletedAt: null,
                    deletedBy: null,
                    deleteReason: '',
                    registrationCode: deletedStudent.originalRegistrationCode || deletedStudent.registrationCode.replace(/^DEL/, ''),
                    applicationNo: deletedStudent.originalApplicationNo || deletedStudent.applicationNo.replace(/^DEL/, ''),
                    roomNo: available.roomNo,
                    seatNo: available.seatNo,
                    originalRegistrationCode: null,
                    originalApplicationNo: null
                }
            },
            { 
                new: true,
                runValidators: true,
                includeDeleted: true
            }
        );
        
        return {
            success: true,
            message: 'Student restored successfully',
            data: restoredStudent
        };
    } catch (error) {
        console.error('Error in restore:', error.message);
        throw error;
    }
};

// Static method to permanently delete a student
studentSchema.statics.hardDelete = async function(studentId) {
    try {
        // First check if the student exists and is deleted
        const student = await this.findOne({ 
            _id: studentId,
            isDeleted: true 
        }).setOptions({ includeDeleted: true });

        if (!student) {
            throw new Error('Deleted student not found');
        }

        // Delete the student permanently
        await this.deleteOne({ _id: studentId });

        // Reassign seats in the room if student had a room assigned
        if (student.roomNo) {
            await this.reassignSeats(student.roomNo);
        }

        return {
            success: true,
            message: 'Student permanently deleted'
        };
    } catch (error) {
        console.error('Error hard deleting student:', error);
        throw error;
    }
};

// Static method to get deleted students
studentSchema.statics.getDeletedStudents = async function() {
    try {
        const deletedStudents = await this.find({ isDeleted: true })
            .setOptions({ includeDeleted: true })
            .populate('deletedBy', 'name email')
            .sort({ deletedAt: -1 });

        return deletedStudents;
    } catch (error) {
        console.error('Error getting deleted students:', error);
        throw error;
    }
};

// Static method to get room distribution
studentSchema.statics.getRoomDistribution = async function() {
    try {
        const distribution = await this.aggregate([
            { $match: { isDeleted: false } },
            { $group: {
                _id: '$roomNo',
                totalStudents: { $sum: 1 },
                maleCount: {
                    $sum: { $cond: [{ $eq: ['$gender', 'Male'] }, 1, 0] }
                },
                femaleCount: {
                    $sum: { $cond: [{ $eq: ['$gender', 'Female'] }, 1, 0] }
                },
                otherCount: {
                    $sum: { $cond: [{ $eq: ['$gender', 'Other'] }, 1, 0] }
                },
                students: {
                    $push: {
                        name: '$name',
                        registrationCode: '$registrationCode',
                        seatNo: '$seatNo',
                        gender: '$gender'
                    }
                }
            }},
            { $sort: { _id: 1 } },
            { $project: {
                roomNo: '$_id',
                totalStudents: 1,
                maleCount: 1,
                femaleCount: 1,
                otherCount: 1,
                availableSeats: { $subtract: [30, '$totalStudents'] },
                occupancyRate: { $multiply: [{ $divide: ['$totalStudents', 30] }, 100] },
                students: { $sortArray: { input: '$students', sortBy: { seatNo: 1 } } }
            }}
        ]);

        return distribution;
    } catch (error) {
        console.error('Error getting room distribution:', error);
        throw error;
    }
};

// Static method to update ranks separately for Class 10 and Class 12 (only top 3 ranks, no scholarships/selection/IAS)
studentSchema.statics.updateRanksAndScholarships = async function() {
    try {
        const classes = ['10', '12'];
        const resultsSummary = {};

        for (const studyingClass of classes) {
            // Get all students of this class with marks (including 0), sorted by marks (desc) and name (asc)
            const students = await this.find({ 
                studyingClass,
                examMarks: { $gte: 0 }, 
                isDeleted: false, 
                markEntryStatus: { $in: ['submitted', 'final'] } 
            })
            .sort({ examMarks: -1, name: 1 })
            .select('_id examMarks rank scholarship iasCoaching resultStatus status roomNo seatNo name isSelected');

            const updatePromises = [];

            for (let i = 0; i < students.length; i++) {
                const student = students[i];
                // Only assign rank if student is in the top 3 position (index 0, 1, 2) and has marks > 0
                const currentRank = (i < 3 && student.examMarks > 0) ? (i + 1) : 0;
                
                updatePromises.push(
                    this.findByIdAndUpdate(
                        student._id,
                        {
                            $set: {
                                rank: currentRank,
                                scholarship: '',
                                iasCoaching: false,
                                isSelected: false,
                                resultStatus: 'Rank Published',
                                status: 'Result Published',
                                markEntryStatus: 'final'
                            }
                        },
                        { new: true, runValidators: true }
                    )
                );
                
                console.log(`Student: ${student.name}, Class: ${studyingClass}, Marks: ${student.examMarks}, Rank: ${currentRank}`);
            }

            await Promise.all(updatePromises);
            
            resultsSummary[studyingClass] = {
                totalRanked: students.length,
                topPerformers: students.slice(0, 3).map((s, idx) => ({
                    name: s.name,
                    marks: s.examMarks,
                    rank: idx + 1
                }))
            };
        }

        return {
            success: true,
            message: 'Ranks (top 3 only) updated separately for Class 10 & 12',
            iasDetails: resultsSummary
        };
    } catch (error) {
        console.error('Error updating ranks:', error);
        throw error;
    }
};

// Static method to get top performers (accepts optional studyingClass parameter)
studentSchema.statics.getTopPerformers = async function(limit = 10, studyingClass) {
    try {
        const query = { examMarks: { $gt: 0 }, isDeleted: false };
        if (studyingClass === '10' || studyingClass === '12') {
            query.studyingClass = studyingClass;
        }
        
        const topPerformers = await this.find(query)
            .sort({ examMarks: -1, name: 1 })
            .limit(limit)
            .select('name registrationCode examMarks totalMarks rank scholarship iasCoaching studyingClass schoolName roomNo seatNo markEntryStatus isSelected');
        
        return topPerformers;
    } catch (error) {
        console.error('Error getting top performers:', error);
        throw error;
    }
};
// Static method to get available seats in each room
studentSchema.statics.getAvailableSeats = async function() {
    try {
        const rooms = await this.aggregate([
            { $match: { isDeleted: false } },
            { $group: {
                _id: '$roomNo',
                occupiedSeats: { $sum: 1 },
                seatNumbers: { $push: '$seatNo' }
            }},
            { $sort: { _id: 1 } },
            { $project: {
                roomNo: '$_id',
                occupiedSeats: 1,
                availableSeats: { $subtract: [30, '$occupiedSeats'] },
                isFull: { $eq: ['$occupiedSeats', 30] },
                seatNumbers: { $sortArray: { input: '$seatNumbers', sortBy: 1 } },
                availableSeatNumbers: {
                    $setDifference: [
                        { $range: [1, 31] },
                        '$seatNumbers'
                    ]
                }
            }}
        ]);

        return rooms;
    } catch (error) {
        console.error('Error getting available seats:', error);
        throw error;
    }
};

// Method to add mark history
studentSchema.methods.addMarkHistory = async function(marks, editorId, editorModel, editorName, action, previousMarks = null, notes = '') {
    const historyEntry = {
        marks: marks,
        editedBy: editorId,
        editedByModel: editorModel,
        editedByName: editorName,
        editedAt: new Date(),
        status: this.markEntryStatus,
        previousMarks: previousMarks,
        action: action,
        notes: notes
    };
    
    this.markHistory.push(historyEntry);
    this.lastEditedAt = new Date();
    
    if (editorModel === 'Invigilator') {
        this.currentEditor = editorId;
        this.currentEditorModel = 'Invigilator';
        this.currentEditorName = editorName;
    } else if (editorModel === 'Admin') {
        this.currentEditor = editorId;
        this.currentEditorModel = 'Admin';
        this.currentEditorName = editorName;
    }
    
    await this.save();
    return historyEntry;
};

// Method to submit marks (invigilator final submission)
studentSchema.methods.submitMarks = async function(invigilatorId, invigilatorName) {
    if (this.markEntryStatus === 'submitted' || this.markEntryStatus === 'final') {
        throw new Error('Marks are already submitted and cannot be edited');
    }
    
    this.markEntryStatus = 'submitted';
    this.submittedAt = new Date();
    this.submittedBy = invigilatorId;
    
    // Add to history
    await this.addMarkHistory(
        this.examMarks,
        invigilatorId,
        'Invigilator',
        invigilatorName,
        'submitted',
        this.examMarks,
        'Marks submitted by invigilator'
    );
    
    await this.save();
    return this;
};

// Method to finalize marks (admin before rank generation)
studentSchema.methods.finalizeMarks = async function(adminId, adminName) {
    this.markEntryStatus = 'final';
    
    // Add to history
    await this.addMarkHistory(
        this.examMarks,
        adminId,
        'Admin',
        adminName,
        'finalized',
        this.examMarks,
        'Marks finalized by admin'
    );
    
    await this.save();
    return this;
};

// Static method to get students by mark status
studentSchema.statics.getByMarkStatus = async function(status, roomNo = null) {
    const query = { isDeleted: false, markEntryStatus: status };
    if (roomNo) {
        query.roomNo = roomNo;
    }
    
    return await this.find(query)
        .sort({ roomNo: 1, seatNo: 1 })
        .select('name registrationCode roomNo seatNo examMarks markEntryStatus submittedAt submittedBy currentEditor');
};

// Static method to get mark history for a student
studentSchema.statics.getMarkHistory = async function(studentId) {
    const student = await this.findById(studentId)
        .select('name registrationCode examMarks markHistory markEntryStatus')
        .populate('markHistory.editedBy', 'name email');
    
    if (!student) {
        throw new Error('Student not found');
    }
    
    return student;
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
studentSchema.index({ isDeleted: 1 });
studentSchema.index({ deletedAt: -1 });
studentSchema.index({ markEntryStatus: 1 });
studentSchema.index({ submittedAt: -1 });

module.exports = mongoose.model('Student', studentSchema);