const express = require('express');
const router = express.Router();
const PDFGenerator = require('../utils/pdfGenerator');
const Student = require('../models/Student');
const fs = require('fs');
const path = require('path');

const pdfGenerator = new PDFGenerator();

// Route to preview exam slips (HTML)
router.get('/preview', async (req, res) => {
    try {
        // Get students from database or use sample data
        const { registrationCodes, class: studentClass, medium, limit = 10 } = req.query;
        
        let students = [];
        
        if (registrationCodes) {
            // Get specific students by registration codes
            const codes = registrationCodes.split(',');
            students = await Student.find({ 
                registrationCode: { $in: codes } 
            }).limit(parseInt(limit));
        } else if (studentClass || medium) {
            // Filter by class and/or medium
            const filter = {};
            if (studentClass) filter.studyingClass = studentClass;
            if (medium) filter.medium = medium;
            
            students = await Student.find(filter)
                .sort({ registrationCode: 1 })
                .limit(parseInt(limit));
        } else {
            // Get all students with limit
            students = await Student.find()
                .sort({ registrationCode: 1 })
                .limit(parseInt(limit));
        }
        
        if (!students || students.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'No students found'
            });
        }
        
        // Generate HTML for preview
        const html = await pdfGenerator.generateHTML(students, {
            date: req.query.date || pdfGenerator.formatDate()
        });
        
        res.send(html);
        
    } catch (error) {
        console.error('Preview error:', error);
        res.status(500).json({
            success: false,
            error: 'Error generating preview'
        });
    }
});

// Route to download exam slips PDF
router.get('/download', async (req, res) => {
    try {
        const { 
            registrationCodes, 
            class: studentClass, 
            medium, 
            limit = 100,
            filename = 'exam-slips.pdf'
        } = req.query;
        
        let students = [];
        
        if (registrationCodes) {
            const codes = registrationCodes.split(',');
            students = await Student.find({ 
                registrationCode: { $in: codes } 
            }).limit(parseInt(limit));
        } else if (studentClass || medium) {
            const filter = {};
            if (studentClass) filter.studyingClass = studentClass;
            if (medium) filter.medium = medium;
            
            students = await Student.find(filter)
                .sort({ registrationCode: 1 })
                .limit(parseInt(limit));
        } else {
            students = await Student.find()
                .sort({ registrationCode: 1 })
                .limit(parseInt(limit));
        }
        
        if (!students || students.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'No students found'
            });
        }
        
        console.log(`Generating PDF for ${students.length} students...`);
        
        // Generate PDF
        const pdfBuffer = await pdfGenerator.generateExamSlips(students, {
            date: req.query.date || pdfGenerator.formatDate()
        });
        
        // Set response headers for PDF download
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${filename}"`,
            'Content-Length': pdfBuffer.length
        });
        
        res.send(pdfBuffer);
        
    } catch (error) {
        console.error('PDF download error:', error);
        res.status(500).json({
            success: false,
            error: 'Error generating PDF'
        });
    }
});

// Route to generate slips for a specific class and medium
router.get('/class/:class/medium/:medium', async (req, res) => {
    try {
        const { class: studentClass, medium } = req.params;
        const { limit = 100, filename } = req.query;
        
        const students = await Student.find({
            studyingClass: studentClass,
            medium: medium
        })
        .sort({ registrationCode: 1 })
        .limit(parseInt(limit));
        
        if (!students || students.length === 0) {
            return res.status(404).json({
                success: false,
                error: `No students found for Class ${studentClass} - ${medium} medium`
            });
        }
        
        const pdfBuffer = await pdfGenerator.generateExamSlips(students);
        
        const downloadFilename = filename || 
            `exam-slips-class${studentClass}-${medium}-${Date.now()}.pdf`;
        
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${downloadFilename}"`,
            'Content-Length': pdfBuffer.length
        });
        
        res.send(pdfBuffer);
        
    } catch (error) {
        console.error('Class/Medium PDF error:', error);
        res.status(500).json({
            success: false,
            error: 'Error generating PDF'
        });
    }
});

// Route to generate slips for all students
router.get('/all', async (req, res) => {
    try {
        const { limit = 500, filename } = req.query;
        
        const students = await Student.find()
            .sort({ studyingClass: 1, medium: 1, registrationCode: 1 })
            .limit(parseInt(limit));
        
        if (!students || students.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'No students found'
            });
        }
        
        const pdfBuffer = await pdfGenerator.generateExamSlips(students);
        
        const downloadFilename = filename || 
            `all-exam-slips-${Date.now()}.pdf`;
        
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${downloadFilename}"`,
            'Content-Length': pdfBuffer.length
        });
        
        res.send(pdfBuffer);
        
    } catch (error) {
        console.error('All students PDF error:', error);
        res.status(500).json({
            success: false,
            error: 'Error generating PDF'
        });
    }
});

// Test route with sample data
router.get('/test', async (req, res) => {
    try {
        // Sample test data
        const sampleStudents = Array(10).fill().map((_, index) => ({
            registrationCode: `PPM${1000 + index}`,
            applicationNo: `APP2602${String(index + 1).padStart(4, '0')}`,
            name: `Student ${index + 1}`,
            fatherName: `Father ${index + 1}`,
            studyingClass: '7',
            medium: index % 2 === 0 ? 'Malayalam' : 'English',
            schoolName: 'PPMHSS Kottukkara'
        }));
        
        const html = await pdfGenerator.generateHTML(sampleStudents);
        res.send(html);
        
    } catch (error) {
        console.error('Test error:', error);
        res.status(500).json({
            success: false,
            error: 'Test error'
        });
    }
});

module.exports = router;