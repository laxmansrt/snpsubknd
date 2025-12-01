const mongoose = require('mongoose');

const hostelSchema = new mongoose.Schema({
    blockName: {
        type: String,
        required: true,
    },
    roomNumber: {
        type: String,
        required: true,
    },
    floor: {
        type: Number,
        required: true,
    },
    roomType: {
        type: String,
        enum: ['single', 'double', 'triple', 'quad'],
        required: true,
    },
    capacity: {
        type: Number,
        required: true,
    },
    occupants: [{
        studentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        studentUsn: String,
        studentName: String,
        admissionDate: {
            type: Date,
            default: Date.now,
        },
        feeStatus: {
            type: String,
            enum: ['paid', 'pending', 'overdue'],
            default: 'pending',
        },
    }],
    facilities: {
        type: [String],
        default: ['bed', 'table', 'chair', 'wardrobe'],
    },
    status: {
        type: String,
        enum: ['available', 'occupied', 'full', 'maintenance'],
        default: 'available',
    },
    warden: {
        name: String,
        phone: String,
        email: String,
    },
    messMenu: [{
        day: String,
        breakfast: String,
        lunch: String,
        dinner: String,
    }],
}, {
    timestamps: true,
});

// Auto-update status based on occupancy
hostelSchema.pre('save', function (next) {
    if (this.occupants.length === 0) {
        this.status = 'available';
    } else if (this.occupants.length < this.capacity) {
        this.status = 'occupied';
    } else if (this.occupants.length >= this.capacity) {
        this.status = 'full';
    }
    next();
});

const Hostel = mongoose.model('Hostel', hostelSchema);

module.exports = Hostel;
