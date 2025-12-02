const mongoose = require('mongoose');

const marksSchema = new mongoose.Schema({
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    studentUsn: {
        type: String,
        required: true,
    },
    studentName: {
        type: String,
        required: true,
    },
    class: {
        type: String,
        required: true,
    },
    subject: {
        type: String,
        required: true,
    },
    examType: {
        type: String, // Internal 1, Internal 2, Internal 3, Semester
        required: true,
    },
    maxMarks: {
        type: Number,
        required: true,
    },
    obtainedMarks: {
        type: Number,
        required: true,
    },
    date: {
        type: Date,
        default: Date.now,
    },
    uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
}, {
    timestamps: true,
});

// Compound index to prevent duplicate entries for same exam
marksSchema.index({ studentUsn: 1, subject: 1, examType: 1 }, { unique: true });

module.exports = mongoose.model('Marks', marksSchema);
