const fs = require('fs');
const path = require('path');
const ejs = require('ejs');
const pdf = require('html-pdf');

class PDFGenerator {
    constructor() {
        this.templatePath = path.join(__dirname, '../views/exam-slips.ejs');
    }

    // Format date as in the example
    formatDate(date = new Date()) {
        const months = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        const day = date.getDate();
        const month = months[date.getMonth()];
        const year = date.getFullYear();
        return `${month} ${String(day).padStart(2, '0')} ${year}`;
    }

    // Generate HTML from EJS template
    async generateHTML(students, options = {}) {
        const template = fs.readFileSync(this.templatePath, 'utf8');
        
        const data = {
            students: Array.isArray(students) ? students : [students],
            formattedDate: options.date || this.formatDate(),
            ...options
        };

        return ejs.render(template, data);
    }

    // Generate PDF from students data
    async generatePDF(students, options = {}) {
        try {
            const html = await this.generateHTML(students, options);
            
            const pdfOptions = {
                format: 'A4',
                orientation: 'portrait',
                border: {
                    top: '0.5cm',
                    right: '0.5cm',
                    bottom: '0.5cm',
                    left: '0.5cm'
                },
                type: 'pdf',
                quality: '100',
                timeout: 30000
            };

            return new Promise((resolve, reject) => {
                pdf.create(html, pdfOptions).toBuffer((err, buffer) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(buffer);
                    }
                });
            });
        } catch (error) {
            console.error('PDF generation error:', error);
            throw error;
        }
    }

    // Save PDF to file
    async savePDF(students, filePath, options = {}) {
        try {
            const buffer = await this.generatePDF(students, options);
            fs.writeFileSync(filePath, buffer);
            console.log(`PDF saved to: ${filePath}`);
            return filePath;
        } catch (error) {
            console.error('Error saving PDF:', error);
            throw error;
        }
    }

    // Generate for multiple students with pagination
    async generateExamSlips(students, options = {}) {
        // Ensure students is an array
        const studentsArray = Array.isArray(students) ? students : [students];
        
        // Add slip numbers if not present
        const studentsWithSlipNos = studentsArray.map((student, index) => ({
            ...student,
            slipNumber: index + 1
        }));

        return this.generatePDF(studentsWithSlipNos, options);
    }
}

module.exports = PDFGenerator;