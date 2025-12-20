const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Department = require('./models/Department');
const Subject = require('./models/Subject');
const Timetable = require('./models/Timetable');
const connectDB = require('./config/db');

dotenv.config();

const seedAcademics = async () => {
    try {
        await connectDB();

        // Clear existing data
        await Department.deleteMany();
        await Subject.deleteMany();
        await Timetable.deleteMany();

        // Seed Departments
        const departments = await Department.insertMany([
            { name: 'Computer Science & Engineering', code: 'CSE', duration: '4 Years', students: 240, hod: 'Dr. N C Mahendra Babu' },
            { name: 'Electronics & Communication', code: 'ECE', duration: '4 Years', students: 180, hod: 'Dr. R. Kumar' },
            { name: 'Information Science & Engineering', code: 'ISE', duration: '4 Years', students: 120, hod: 'Dr. B. S. Prasad' },
            { name: 'Electrical & Electronics', code: 'EEE', duration: '4 Years', students: 120, hod: 'Dr. S. Sharma' },
        ]);

        // Seed Subjects
        await Subject.insertMany([
            { name: 'Data Structures', code: 'CS301', semester: '3', credits: 4, department: 'CSE' },
            { name: 'Operating Systems', code: 'CS401', semester: '4', credits: 4, department: 'CSE' },
            { name: 'Database Management', code: 'CS402', semester: '4', credits: 3, department: 'CSE' },
            { name: 'Digital Logic Design', code: 'EC201', semester: '2', credits: 4, department: 'ECE' },
        ]);

        // Seed Timetables
        await Timetable.insertMany([
            { className: 'CSE 5A', day: 'Monday', slots: ['Data Structures', 'OS Lab', 'DBMS', 'Break', 'Mathematics', 'Physics'] },
            { className: 'CSE 5A', day: 'Tuesday', slots: ['DBMS', 'Data Structures', 'OS', 'Break', 'Chemistry', 'English'] },
            { className: 'CSE 5A', day: 'Wednesday', slots: ['Operating Systems', 'DBMS Lab', 'Mathematics', 'Break', 'Data Structures', 'Sports'] },
            { className: 'CSE 5A', day: 'Thursday', slots: ['Mathematics', 'Physics', 'DBMS', 'Break', 'OS', 'Data Structures'] },
            { className: 'CSE 5A', day: 'Friday', slots: ['Chemistry', 'English', 'Data Structures', 'Break', 'Project Work', 'Project Work'] },

            { className: 'ISE 3A', day: 'Monday', slots: ['Discrete Mathematics', 'Java Programming', 'Data Comm', 'Break', 'Physics', 'Chemistry'] },
            { className: 'ISE 3A', day: 'Tuesday', slots: ['Java Lab', 'Discrete Math', 'English', 'Break', 'Data Comm', 'Mathematics'] },
            { className: 'ISE 3A', day: 'Wednesday', slots: ['Data Comm', 'Java', 'Sports', 'Break', 'Math Lab', 'Discrete Math'] },
            { className: 'ISE 3A', day: 'Thursday', slots: ['Physics', 'Chemistry', 'Java', 'Break', 'Data Comm', 'Discrete Math'] },
            { className: 'ISE 3A', day: 'Friday', slots: ['English', 'Mathematics', 'Project Work', 'Break', 'Project Work', 'Java'] },
        ]);

        console.log('Academic data seeded successfully!');
        process.exit();
    } catch (error) {
        console.error('Error seeding academic data:', error);
        process.exit(1);
    }
};

seedAcademics();
