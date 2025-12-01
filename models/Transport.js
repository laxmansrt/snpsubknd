const mongoose = require('mongoose');

const transportSchema = new mongoose.Schema({
    routeNumber: {
        type: String,
        required: true,
        unique: true,
    },
    routeName: {
        type: String,
        required: true,
    },
    driverName: {
        type: String,
        required: true,
    },
    driverPhone: {
        type: String,
        required: true,
    },
    busNumber: {
        type: String,
        required: true,
    },
    capacity: {
        type: Number,
        required: true,
    },
    stops: [{
        stopName: String,
        arrivalTime: String,
        departureTime: String,
    }],
    studentsAssigned: [{
        studentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        studentUsn: String,
        studentName: String,
        boardingStop: String,
        feeStatus: {
            type: String,
            enum: ['paid', 'pending', 'overdue'],
            default: 'pending',
        },
    }],
    status: {
        type: String,
        enum: ['active', 'inactive', 'maintenance'],
        default: 'active',
    },
    schedule: {
        morningStart: String,
        morningEnd: String,
        eveningStart: String,
        eveningEnd: String,
    },
}, {
    timestamps: true,
});

const Transport = mongoose.model('Transport', transportSchema);

module.exports = Transport;
