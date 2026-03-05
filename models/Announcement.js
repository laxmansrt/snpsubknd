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
        enum: ['low', 'medium', 'high', 'urgent', 'normal'],
        default: 'normal',
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
    // PRODUCTION NOTE: Read receipts are stored in the separate `ReadReceipt` collection.
    // Query: ReadReceipt.findOne({ announcementId: id, userId: req.user._id })
    // Count: ReadReceipt.countDocuments({ announcementId: id })
    // This replaces the old embedded readBy[] array.
}, {
    timestamps: true,
});

// Compound index: covers the primary feed query (active, by audience, sorted by date)
// Replaces 3 separate single-field indexes with one efficient compound index
announcementSchema.index({ isActive: 1, targetAudience: 1, publishedAt: -1 });

// TTL index — MongoDB auto-deletes announcements after their expiresAt date
announcementSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, sparse: true });

const Announcement = mongoose.model('Announcement', announcementSchema);

module.exports = Announcement;
