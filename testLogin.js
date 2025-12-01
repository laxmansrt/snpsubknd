const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const connectDB = require('./config/db');

dotenv.config();

const testLogin = async () => {
    try {
        await connectDB();

        // Find the student user
        const user = await User.findOne({ email: 'student@snpsu.edu.in', role: 'student' });

        if (!user) {
            console.log('❌ User not found!');
            process.exit(1);
        }

        console.log('✅ User found:', {
            name: user.name,
            email: user.email,
            role: user.role,
            hasPassword: !!user.password
        });

        // Test password
        const isMatch = await user.matchPassword('student123');
        console.log('Password match:', isMatch ? '✅ YES' : '❌ NO');

        if (isMatch) {
            console.log('\n🎉 Login credentials are working correctly!');
        } else {
            console.log('\n❌ Password does not match!');
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

testLogin();
