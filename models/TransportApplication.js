const mongoose = require('mongoose');

const transportApplicationSchema = new mongoose.Schema({
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
    // Bus details
    routeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Transport',
        required: true,
    },
    routeName: {
        type: String,
        required: true,
    },
    pickupPoint: {
        type: String,
        required: true,
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

module.exports = mongoose.model('TransportApplication', transportApplicationSchema);
