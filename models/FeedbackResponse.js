const mongoose = require('mongoose');

/**
 * FeedbackResponse model — extracted from Feedback.responses[]
 * Replaces the embedded array that would grow to 3MB+ per survey form
 * with 6,000 students responding.
 */
const feedbackResponseSchema = new mongoose.Schema({
    feedbackId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Feedback',
        required: true,
    },
    respondentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null, // null for fully anonymous submissions
    },
    isAnonymous: {
        type: Boolean,
        default: true,
    },
    answers: [{
        questionIndex: {
            type: Number,
            required: true,
        },
        ratingValue: {
            type: Number,
            min: 1,
            max: 5,
            default: null,
        },
        textValue: {
            type: String,
            default: '',
        },
        selectedOption: {
            type: String,
            default: '',
        },
    }],
    submittedAt: {
        type: Date,
        default: Date.now,
    },
}, {
    timestamps: true,
});

// One response per user per feedback form (sparse allows null respondentId for anon)
feedbackResponseSchema.index(
    { feedbackId: 1, respondentId: 1 },
    { unique: true, sparse: true }
);

// Fast count of responses per feedback form
feedbackResponseSchema.index({ feedbackId: 1 });

// For analytics aggregations per question
feedbackResponseSchema.index({ feedbackId: 1, 'answers.questionIndex': 1 });

const FeedbackResponse = mongoose.model('FeedbackResponse', feedbackResponseSchema);

module.exports = FeedbackResponse;
