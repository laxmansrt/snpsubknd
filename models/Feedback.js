const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
    },
    description: {
        type: String,
        trim: true,
    },
    type: {
        type: String,
        enum: ['course', 'faculty', 'infrastructure', 'general'],
        default: 'general',
    },
    targetCourse: {
        type: String,
        trim: true,
    },
    targetFaculty: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    department: {
        type: String,
        trim: true,
    },
    semester: {
        type: Number,
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    questions: [{
        question: { type: String, required: true },
        type: {
            type: String,
            enum: ['rating', 'text', 'multiple_choice'],
            default: 'rating',
        },
        options: [String], // For multiple_choice type
        required: { type: Boolean, default: true },
    }],
    // PRODUCTION NOTE: Responses are stored in the separate `FeedbackResponse` collection.
    // Query: FeedbackResponse.find({ feedbackId: feedback._id })
    // Analytics: FeedbackResponse.aggregate([{ $match: { feedbackId } }, ...])
    // This replaces the old embedded responses[] array.
    isActive: {
        type: Boolean,
        default: true,
    },
    expiresAt: {
        type: Date,
    },
}, {
    timestamps: true,
});

// Compound index for the most common query pattern: active forms by type and dept
feedbackSchema.index({ isActive: 1, type: 1, department: 1 });

// TTL index — MongoDB auto-deletes expired feedback forms (expiresAt is optional)
feedbackSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, sparse: true });

module.exports = mongoose.model('Feedback', feedbackSchema);
