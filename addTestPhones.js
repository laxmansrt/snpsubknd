const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');

dotenv.config();

const addTestPhone = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB Connected');

        // Find a few sample users to add phone numbers to for testing
        const users = await User.find({}).limit(5);

        if (users.length === 0) {
            console.log('No users found in database to update.');
        } else {
            console.log(`Updating ${users.length} users with test phone numbers...`);

            const testPhones = ['9876543210', '9988776655', '8877665544', '7766554433', '6655443322'];

            for (let i = 0; i < users.length; i++) {
                users[i].phone = testPhones[i];
                await users[i].save();
                console.log(`✅ Updated ${users[i].name} (${users[i].role}) with phone: ${testPhones[i]}`);
            }

            console.log('\nAll test phone numbers updated successfully! You can now use these to test the Phone Login.');
        }

        process.exit();
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
};

addTestPhone();
