const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

dotenv.config();

// Admin schema
const adminSchema = new mongoose.Schema({
    username: String,
    password: String,
    email: String,
    role: String
});

const Admin = mongoose.model('Admin', adminSchema);

async function setupAdmin() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/student_registration', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        
        console.log('✅ Connected to MongoDB');
        
        // Check if admin already exists
        const existingAdmin = await Admin.findOne({ username: 'admin' });
        if (existingAdmin) {
            console.log('⚠️  Admin user already exists');
            process.exit(0);
        }
        
        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('nmea@ppmhss', salt);
        
        // Create admin
        const admin = new Admin({
            username: 'admin@nmea',
            password: hashedPassword,
            email: 'admin@ppmhss.com',
            role: 'superadmin'
        });
        
        await admin.save();
        
        console.log('✅ Admin user created successfully');
        console.log('📋 Login credentials:');
        console.log('   Username: admin');
        console.log('   Password: admin123');
        console.log('⚠️  Please change the password after first login!');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Setup error:', error);
        process.exit(1);
    }
}

setupAdmin();