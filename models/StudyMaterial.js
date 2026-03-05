const mongoose = require('mongoose');

const studyMaterialSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
    },
    subject: {
        type: String,
        required: true,
    },
    class: {
        type: String,
        required: true,
    },
    type: {
        type: String,
        required: true, // PDF, DOCX, etc.
    },
    fileUrl: {
        type: String,
        required: true,
        // IMPORTANT: Store only CDN/cloud URLs, never base64 strings
        // Large base64 blobs in MongoDB are an Atlas storage anti-pattern
        validate: {
            validator: (v) => !v.startsWith('data:'),
            message: 'fileUrl must be a CDN URL, not a base64 data URI. Upload files to Cloudinary first.',
        },
    },
    size: {
        type: String,
        default: 'Unknown',
    },
    uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
}, {
    timestamps: true,
});

// Primary student query: materials for my class and subject
studyMaterialSchema.index({ class: 1, subject: 1 });

// Faculty view: materials uploaded by me
studyMaterialSchema.index({ uploadedBy: 1, createdAt: -1 });

module.exports = mongoose.model('StudyMaterial', studyMaterialSchema);
