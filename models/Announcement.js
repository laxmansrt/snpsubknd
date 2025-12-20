const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
    },
    content: {
        type: String,
        required: true,
    },
    category: {
        type: String,
        enum: ['academic', 'event', 'exam', 'general', 'urgent', 'video'],
        default: 'general',
    },
    targetAudience: {
        type: [String], // ['all', 'student', 'faculty', 'parent', 'admin']
        required: true,
    },
    targetClasses: {
        type: [String], // Empty array means all classes
        default: [],
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium',
    },
    attachments: [{
        name: String,
        url: String,
    }],
    publishedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    publishedAt: {
        type: Date,
        default: Date.now,
    },
    expiresAt: {
        type: Date,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    readBy: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        readAt: {
            type: Date,
            default: Date.now,
        },
    }],
}, {
    timestamps: true,
});

// Index for faster queries
announcementSchema.index({ publishedAt: -1 });
announcementSchema.index({ targetAudience: 1 });
announcementSchema.index({ isActive: 1 });

const Announcement = mongoose.model('Announcement', announcementSchema);

module.exports = Announcement;
