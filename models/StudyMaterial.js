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
        required: true, // Can be a link or base64 data URI
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

module.exports = mongoose.model('StudyMaterial', studyMaterialSchema);
