const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');

dotenv.config();

const findPhoneNumbers = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB Connected');

        const users = await User.find({ phone: { $exists: true, $ne: '' } }, 'name email phone role');

        if (users.length === 0) {
            console.log('\nNo users found with phone numbers.');
        } else {
            console.log(`\nFound ${users.length} users with phone numbers:\n`);
            users.forEach(u => {
                console.log(`- ${u.name} (${u.role}): Phone: ${u.phone} | Email: ${u.email}`);
            });
        }

        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

findPhoneNumbers();
