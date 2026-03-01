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
    applicants: [{
        student: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        appliedAt: {
            type: Date,
            default: Date.now,
        },
        status: {
            type: String,
            enum: ['applied', 'shortlisted', 'interviewing', 'selected', 'rejected'],
            default: 'applied',
        },
        resumeUrl: {
            type: String,
        }
    }]
}, {
    timestamps: true,
});

const PlacementDrive = mongoose.model('PlacementDrive', placementDriveSchema);

module.exports = PlacementDrive;
