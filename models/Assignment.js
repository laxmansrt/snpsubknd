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
    // PRODUCTION NOTE: Submissions are stored in the separate `Submission` collection.
    // Query: Submission.find({ assignmentId: assignment._id })
    // This replaces the old embedded submissions[] array to prevent the 16MB doc limit.
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
