const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
    },
    password: {
        type: String,
        required: true,
    },
    role: {
        type: String,
        enum: ['admin', 'faculty', 'student', 'parent'],
        required: true,
    },
    // Role-specific data
    studentData: {
        usn: String,
        class: String,
        semester: Number,
        department: String,
        attendance: { type: Number, default: 0 },
        cgpa: { type: Number, default: 0 },
    },
    facultyData: {
        employeeId: String,
        department: String,
        designation: String,
    },
    parentData: {
        childUsn: String,
        childName: String,
    },
}, {
    timestamps: true,
});

// Hash password before saving
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Compare password method
userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);

module.exports = User;
