const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    code: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    semester: {
        type: String,
        required: true,
        trim: true
    },
    credits: {
        type: Number,
        required: true
    },
    department: {
        type: String,
        required: true,
        trim: true
    }
}, {
    timestamps: true
});

const Subject = mongoose.model('Subject', subjectSchema);

module.exports = Subject;
