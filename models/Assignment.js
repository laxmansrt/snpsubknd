const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
    },
    description: {
        type: String,
        required: true,
    },
    subject: {
        type: String,
        required: true,
        trim: true,
    },
    class: {
        type: String,
        required: true,
        trim: true,
    },
    department: {
        type: String,
        trim: true,
    },
    dueDate: {
        type: Date,
        required: true,
    },
    maxMarks: {
        type: Number,
        default: 100,
    },
    attachmentUrl: {
        type: String, // Base64 or URL for assignment file
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    submissions: [{
        studentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        studentUsn: { type: String, required: true },
        studentName: { type: String, required: true },
        submissionText: { type: String },
        attachmentUrl: { type: String },
        submittedAt: { type: Date, default: Date.now },
        grade: { type: Number },
        feedback: { type: String },
        gradedAt: { type: Date },
        gradedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    }],
    isActive: {
        type: Boolean,
        default: true,
    },
}, {
    timestamps: true,
});

assignmentSchema.index({ class: 1, subject: 1 });
assignmentSchema.index({ dueDate: 1 });
assignmentSchema.index({ createdBy: 1 });

module.exports = mongoose.model('Assignment', assignmentSchema);
