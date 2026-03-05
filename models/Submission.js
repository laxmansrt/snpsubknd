const mongoose = require('mongoose');

/**
 * Submission model — extracted from Assignment.submissions[]
 * Replaces the embedded array pattern that would hit MongoDB's 16MB doc limit
 * at ~8,000 submissions per assignment.
 */
const submissionSchema = new mongoose.Schema({
    assignmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Assignment',
        required: true,
    },
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    studentUsn: {
        type: String,
        required: true,
        trim: true,
    },
    studentName: {
        type: String,
        required: true,
        trim: true,
    },
    submissionText: {
        type: String,
        default: '',
    },
    attachmentUrl: {
        type: String,
        default: '',
    },
    submittedAt: {
        type: Date,
        default: Date.now,
    },
    // Grading
    grade: {
        type: Number,
        default: null,
    },
    feedback: {
        type: String,
        default: '',
    },
    gradedAt: {
        type: Date,
        default: null,
    },
    gradedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
    },
    isLate: {
        type: Boolean,
        default: false,
    },
}, {
    timestamps: true,
});

// PRIMARY: One submission per student per assignment
submissionSchema.index({ assignmentId: 1, studentId: 1 }, { unique: true });

// For fetching all submissions for a given assignment (faculty view)
submissionSchema.index({ assignmentId: 1 });

// For fetching a student's submission history across all assignments
submissionSchema.index({ studentId: 1, submittedAt: -1 });

// For grading queue (all ungraded submissions)
submissionSchema.index({ assignmentId: 1, grade: 1 });

const Submission = mongoose.model('Submission', submissionSchema);

module.exports = Submission;
