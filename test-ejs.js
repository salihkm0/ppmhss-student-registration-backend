const ejs = require('ejs');
const path = require('path');

const viewsDir = '/Users/muhammedsalihkm/My Work/nmea/ppmhss-student-registration-backend/views';

async function testTemplate(name, data) {
    try {
        console.log(`Testing ${name}...`);
        const html = await ejs.renderFile(path.join(viewsDir, name), data);
        console.log(`✅ ${name} compiled successfully! Rendered length: ${html.length} characters.`);
    } catch (err) {
        console.error(`❌ ${name} compilation failed:`);
        console.error(err.message);
    }
}

async function main() {
    await testTemplate('attendance-sheet.ejs', {
        roomNo: 1,
        studentPages: [[{ name: 'Student 1', registrationCode: 'PPM1000', seatNo: 1, aadhaarNo: '123456789012', medium: 'English', gender: 'Male', examType: 'A', studyingClass: '10' }]],
        totalStudents: 1,
        maxRows: 20,
        separateSummaryPage: false,
        generationDate: '05/06/2026',
        examDate: '28-06-2026',
        examTime: '10:00 AM - 11:30 PM',
        isPreview: true,
        autoPrint: false,
        summary: {
            englishCount: 1,
            malayalamCount: 0,
            englishTypeA: 1,
            englishTypeB: 0,
            malayalamTypeA: 0,
            malayalamTypeB: 0,
            totalTypeA: 1,
            totalTypeB: 0,
            maleCount: 1,
            femaleCount: 0,
            otherCount: 0,
            class10Count: 1,
            class12Count: 0,
            class10EnglishCount: 1,
            class10MalayalamCount: 0,
            class10EnglishTypeA: 1,
            class10EnglishTypeB: 0,
            class10MalayalamTypeA: 0,
            class10MalayalamTypeB: 0,
            class10TotalTypeA: 1,
            class10TotalTypeB: 0,
            class12EnglishCount: 0,
            class12MalayalamCount: 0,
            class12EnglishTypeA: 0,
            class12EnglishTypeB: 0,
            class12MalayalamTypeA: 0,
            class12MalayalamTypeB: 0,
            class12TotalTypeA: 0,
            class12TotalTypeB: 0
        }
    });

    // Create 30 mock students
    const mockStudents30 = [];
    for (let i = 1; i <= 30; i++) {
        mockStudents30.push({
            name: `Student ${i}`,
            registrationCode: `PPM${1000 + i}`,
            seatNo: i,
            aadhaarNo: '123456789012',
            medium: i % 2 === 0 ? 'English' : 'Malayalam',
            gender: i % 2 === 0 ? 'Male' : 'Female',
            examType: i % 2 === 0 ? 'A' : 'B',
            studyingClass: i % 3 === 0 ? '12' : '10'
        });
    }

    await testTemplate('attendance-sheet.ejs', {
        roomNo: 1,
        studentPages: [mockStudents30],
        totalStudents: 30,
        maxRows: 30,
        separateSummaryPage: true,
        generationDate: '05/06/2026',
        examDate: '28-06-2026',
        examTime: '10:00 AM - 11:30 PM',
        isPreview: true,
        autoPrint: false,
        summary: {
            englishCount: 15,
            malayalamCount: 15,
            englishTypeA: 8,
            englishTypeB: 7,
            malayalamTypeA: 7,
            malayalamTypeB: 8,
            totalTypeA: 15,
            totalTypeB: 15,
            maleCount: 15,
            femaleCount: 15,
            otherCount: 0,
            class10Count: 20,
            class12Count: 10,
            class10EnglishCount: 10,
            class10MalayalamCount: 10,
            class10EnglishTypeA: 5,
            class10EnglishTypeB: 5,
            class10MalayalamTypeA: 5,
            class10MalayalamTypeB: 5,
            class10TotalTypeA: 10,
            class10TotalTypeB: 10,
            class12EnglishCount: 5,
            class12MalayalamCount: 5,
            class12EnglishTypeA: 3,
            class12EnglishTypeB: 2,
            class12MalayalamTypeA: 2,
            class12MalayalamTypeB: 3,
            class12TotalTypeA: 5,
            class12TotalTypeB: 5
        }
    });

    await testTemplate('simple-exam-slips-multi.ejs', {
        roomNumbers: [1],
        studentsByRoom: {
            1: [{ name: 'Student 1', registrationCode: 'PPM1000', seatNo: 1, roomNo: 1, examType: 'A' }]
        },
        totalStudents: 1,
        generationDate: '05/06/2026',
        isPreview: true,
        autoPrint: false
    });

    await testTemplate('overall-summary.ejs', {
        totalStudents: 1,
        totalRooms: 1,
        generationDate: '05/06/2026',
        generationTime: '12:00:00 PM',
        isPreview: true,
        autoPrint: false,
        summary: {
            englishCount: 1,
            malayalamCount: 0,
            englishMale: 1,
            englishFemale: 0,
            englishOther: 0,
            malayalamMale: 0,
            malayalamFemale: 0,
            malayalamOther: 0,
            englishTypeA: 1,
            englishTypeB: 0,
            malayalamTypeA: 0,
            malayalamTypeB: 0,
            totalTypeA: 1,
            totalTypeB: 0,
            totalEnglishStudents: 1,
            totalMalayalamStudents: 0,
            totalMale: 1,
            totalFemale: 0,
            totalOther: 0,
            class10Count: 1,
            class12Count: 0
        },
        rooms: [{
            roomNo: 1,
            total: 1,
            class10: 1,
            class12: 0,
            english: 1,
            malayalam: 0,
            male: 1,
            female: 0,
            englishTypeA: 1,
            englishTypeB: 0,
            malayalamTypeA: 0,
            malayalamTypeB: 0
        }]
    });
}

main();
