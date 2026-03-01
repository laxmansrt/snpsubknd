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
    responses: [{
        respondentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        isAnonymous: { type: Boolean, default: true },
        answers: [{
            questionIndex: Number,
            ratingValue: Number, // 1-5 for rating type
            textValue: String,  // For text type
            selectedOption: String, // For multiple_choice
        }],
        submittedAt: { type: Date, default: Date.now },
    }],
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

feedbackSchema.index({ type: 1 });
feedbackSchema.index({ isActive: 1 });
feedbackSchema.index({ department: 1 });

module.exports = mongoose.model('Feedback', feedbackSchema);
