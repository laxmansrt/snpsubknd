const mongoose = require('mongoose');

const timetableSchema = new mongoose.Schema({
    className: {
        type: String,
        required: true,
        trim: true
    },
    day: {
        type: String,
        required: true,
        enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
        trim: true
    },
    slots: [{
        type: String,
        trim: true
    }]
}, {
    timestamps: true
});

const Timetable = mongoose.model('Timetable', timetableSchema);

module.exports = Timetable;
