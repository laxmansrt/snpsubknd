const mongoose = require('mongoose');

const lostFoundSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['lost', 'found'],
        required: true,
    },
    itemName: {
        type: String,
        required: true,
    },
    category: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    location: {
        type: String,
        required: true,
    },
    date: {
        type: Date,
        required: true,
    },
    contactName: {
        type: String,
        required: true,
    },
    contactPhone: {
        type: String,
        required: true,
    },
    status: {
        type: String,
        enum: ['active', 'claimed', 'resolved'],
        default: 'active',
    },
    reportedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    imageUrl: {
        type: String,
    },
}, {
    timestamps: true,
});

// Main feed: active items sorted by newest — most common query
lostFoundSchema.index({ status: 1, date: -1 });

// Filter by lost/found type
lostFoundSchema.index({ type: 1, status: 1 });

// Reporter lookup
lostFoundSchema.index({ reportedBy: 1 });

const LostFound = mongoose.model('LostFound', lostFoundSchema);

module.exports = LostFound;
