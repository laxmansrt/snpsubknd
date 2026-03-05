const mongoose = require('mongoose');

const examResultSchema = new mongoose.Schema({
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    exam: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Exam',
        required: true
    },
    answers: [{
        questionIndex: Number,
        selectedOption: Number
    }],
    score: {
        type: Number,
        required: true
    },
    maxScore: {
        type: Number,
        required: true
    },
    submittedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Prevent a student from submitting the same exam twice
examResultSchema.index({ student: 1, exam: 1 }, { unique: true });

// Fast result lookup by student ("my results" page)
examResultSchema.index({ student: 1, submittedAt: -1 });

// Fast lookup of all results for an exam (faculty view)
examResultSchema.index({ exam: 1 });

module.exports = mongoose.model('ExamResult', examResultSchema);
