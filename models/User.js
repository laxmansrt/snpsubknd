const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },
    password: {
        type: String,
        required: true,
    },
    role: {
        type: String,
        enum: ['admin', 'faculty', 'student', 'parent'],
        required: true,
        trim: true,
    },
    // Role-specific data
    studentData: {
        usn: { type: String, trim: true },
        class: { type: String, trim: true },
        semester: Number,
        department: { type: String, trim: true },
        attendance: { type: Number, default: 0 },
        cgpa: { type: Number, default: 0 },
    },
    facultyData: {
        employeeId: { type: String, trim: true },
        department: { type: String, trim: true },
        designation: { type: String, trim: true },
    },
    parentData: {
        childUsn: { type: String, trim: true },
        childName: { type: String, trim: true },
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

// Indexes for performance
userSchema.index({ role: 1 });
userSchema.index({ 'studentData.usn': 1 }, { sparse: true });
userSchema.index({ 'facultyData.employeeId': 1 }, { sparse: true });

const User = mongoose.model('User', userSchema);

module.exports = User;
