const mongoose = require('mongoose');

/**
 * ReadReceipt model — extracted from Announcement.readBy[]
 * Replaces the embedded array that required a full document rewrite on every
 * single "mark as read" click from 6,000+ students.
 * Uses upsert in the controller so this is always idempotent.
 */
const readReceiptSchema = new mongoose.Schema({
    announcementId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Announcement',
        required: true,
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    readAt: {
        type: Date,
        default: Date.now,
    },
}, {
    // No timestamps needed — readAt is the only time we care about
    timestamps: false,
});

// PRIMARY: One receipt per user per announcement
readReceiptSchema.index({ announcementId: 1, userId: 1 }, { unique: true });

// For "how many users read this announcement" (admin stats)
readReceiptSchema.index({ announcementId: 1 });

// For "which announcements has this user read" (user feed)
readReceiptSchema.index({ userId: 1 });

const ReadReceipt = mongoose.model('ReadReceipt', readReceiptSchema);

module.exports = ReadReceipt;
