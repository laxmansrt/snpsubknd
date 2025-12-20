const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    code: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    duration: {
        type: String,
        required: true,
        trim: true
    },
    students: {
        type: Number,
        default: 0
    },
    hod: {
        type: String,
        required: true,
        trim: true
    }
}, {
    timestamps: true
});

const Department = mongoose.model('Department', departmentSchema);

module.exports = Department;
