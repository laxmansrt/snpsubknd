const mongoose = require('mongoose');

const placementDriveSchema = new mongoose.Schema({
    companyName: {
        type: String,
        required: true,
        trim: true,
    },
    role: {
        type: String,
        required: true,
        trim: true,
    },
    package: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    eligibilityCriteria: {
        cgpa: { type: Number, default: 0 },
        activeBacklogs: { type: Number, default: 0 },
        branches: [{ type: String }],
    },
    deadline: {
        type: Date,
        required: true,
    },
    dateOfDrive: {
        type: Date,
    },
    status: {
        type: String,
        enum: ['upcoming', 'ongoing', 'completed', 'cancelled'],
        default: 'upcoming',
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    // PRODUCTION NOTE: Applicants are stored in the separate `PlacementApplication` collection.
    // Query:   PlacementApplication.find({ driveId: drive._id })
    // Count:   PlacementApplication.countDocuments({ driveId: drive._id })
    // This replaces the old embedded applicants[] array.
}, {
    timestamps: true,
});

// List active/upcoming drives, sorted by deadline
placementDriveSchema.index({ status: 1, deadline: -1 });

// Filter drives by eligible branches
placementDriveSchema.index({ 'eligibilityCriteria.branches': 1 });

// HRD view — drives they created
placementDriveSchema.index({ createdBy: 1, createdAt: -1 });

const PlacementDrive = mongoose.model('PlacementDrive', placementDriveSchema);

module.exports = PlacementDrive;
