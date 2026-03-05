const mongoose = require('mongoose');

/**
 * PlacementApplication model — extracted from PlacementDrive.applicants[]
 * Replaces the embedded array that caused full document rewrites on every
 * student application and status update.
 */
const placementApplicationSchema = new mongoose.Schema({
    driveId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PlacementDrive',
        required: true,
    },
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    resumeUrl: {
        type: String,
        default: '',
    },
    status: {
        type: String,
        enum: ['applied', 'shortlisted', 'interviewing', 'selected', 'rejected'],
        default: 'applied',
    },
    appliedAt: {
        type: Date,
        default: Date.now,
    },
    statusUpdatedAt: {
        type: Date,
        default: null,
    },
    statusUpdatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
    },
    notes: {
        type: String,
        default: '',
    },
}, {
    timestamps: true,
});

// PRIMARY: One application per student per drive
placementApplicationSchema.index({ driveId: 1, studentId: 1 }, { unique: true });

// For "my applications" student view
placementApplicationSchema.index({ studentId: 1, appliedAt: -1 });

// For HRD to filter applicants by status on a drive
placementApplicationSchema.index({ driveId: 1, status: 1 });

// For listing all applicants for a drive (sorted by apply date)
placementApplicationSchema.index({ driveId: 1, appliedAt: 1 });

const PlacementApplication = mongoose.model('PlacementApplication', placementApplicationSchema);

module.exports = PlacementApplication;
