const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const connectDB = require('./config/db');

dotenv.config();
connectDB();

const users = [
    {
        name: 'Admin User',
        email: 'admin@snpsu.edu.in',
        password: 'admin123',
        role: 'admin',
    },
    {
        name: 'Dr. Ramesh Kumar',
        email: 'faculty@snpsu.edu.in',
        password: 'faculty123',
        role: 'faculty',
        facultyData: {
            employeeId: 'FAC001',
            department: 'Computer Science',
            designation: 'Associate Professor',
        },
    },
    {
        name: 'Rahul Kumar',
        email: 'student@snpsu.edu.in',
        password: 'student123',
        role: 'student',
        studentData: {
            usn: '1SI21CS045',
            class: 'CSE - Sem 5',
            semester: 5,
            department: 'Computer Science',
            attendance: 85,
            cgpa: 8.4,
        },
    },
    {
        name: 'Mr. Kumar (Parent)',
        email: 'parent@snpsu.edu.in',
        password: 'parent123',
        role: 'parent',
        parentData: {
            childUsn: '1SI21CS045',
            childName: 'Rahul Kumar',
        },
    },
];

const importData = async () => {
    try {
        await User.deleteMany();

        // Use create instead of insertMany to trigger password hashing
        for (const userData of users) {
            await User.create(userData);
        }

        console.log('Data Imported!');
        process.exit();
    } catch (error) {
        console.error(`Error: ${error}`);
        process.exit(1);
    }
};

const destroyData = async () => {
    try {
        await User.deleteMany();
        console.log('Data Destroyed!');
        process.exit();
    } catch (error) {
        console.error(`Error: ${error}`);
        process.exit(1);
    }
};

if (process.argv[2] === '-d') {
    destroyData();
} else {
    importData();
}
