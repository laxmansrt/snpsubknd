const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const connectDB = require('./config/db');

dotenv.config();

const checkUsers = async () => {
    try {
        await connectDB();

        const count = await User.countDocuments({ role: 'student' });
        console.log(`\nTotal Students: ${count}`);

        const users = await User.find({ role: 'student' }).limit(5);

        console.log('\nSample Users:');
        users.forEach(u => {
            console.log({
                id: u._id,
                name: u.name,
                email: u.email,
                role: u.role,
                roleType: typeof u.role
            });
        });

        const allRoles = await User.distinct('role');
        console.log('\nAll unique roles in DB:', allRoles);

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

checkUsers();
