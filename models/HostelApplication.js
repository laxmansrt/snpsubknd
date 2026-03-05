const mongoose = require('mongoose');

const hostelApplicationSchema = new mongoose.Schema({
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    studentUsn: {
        type: String,
        required: true,
    },
    studentName: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
    },
    phone: {
        type: String,
        required: true,
    },
    semester: {
        type: Number,
        required: true,
    },
    department: {
        type: String,
        required: true,
    },
    // Preferred room details
    roomPreference: {
        type: String,
        enum: ['single', 'double', 'triple', 'quad'],
        required: true,
    },
    blockPreference: {
        type: String,
        required: true,
    },
    // Parent/Guardian details
    guardianName: {
        type: String,
        required: true,
    },
    guardianPhone: {
        type: String,
        required: true,
    },
    guardianRelation: {
        type: String,
        required: true,
    },
    // Address
    permanentAddress: {
        street: String,
        city: String,
        state: String,
        pincode: String,
    },
    // Medical information
    anyMedicalConditions: {
        type: Boolean,
        default: false,
    },
    medicalDetails: {
        type: String,
        default: '',
    },
    // Application status
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending',
    },
    appliedDate: {
        type: Date,
        default: Date.now,
    },
    processedDate: {
        type: Date,
    },
    processedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    remarks: {
        type: String,
        default: '',
    },
}, {
    timestamps: true,
});

// Student can only have one active hostel application
hostelApplicationSchema.index({ studentId: 1 }, { unique: true });

// Admin view: pending applications, sorted by date
hostelApplicationSchema.index({ status: 1, appliedDate: -1 });

// Lookup by USN in admin search
hostelApplicationSchema.index({ studentUsn: 1 });

const HostelApplication = mongoose.model('HostelApplication', hostelApplicationSchema);

module.exports = HostelApplication;
