const mongoose = require('mongoose');

const gallerySchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Please add a title'],
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    type: {
        type: String,
        enum: ['image', 'video'],
        required: true
    },
    url: {
        type: String,
        required: [true, 'Please add a URL or image data']
    },
    category: {
        type: String,
        default: 'General'
    },
    uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
}, {
    timestamps: true,
});

// Gallery page: filter by type and category, sorted by newest
gallerySchema.index({ type: 1, category: 1, createdAt: -1 });

// Public gallery (most recent first)
gallerySchema.index({ createdAt: -1 });

module.exports = mongoose.model('Gallery', gallerySchema);
