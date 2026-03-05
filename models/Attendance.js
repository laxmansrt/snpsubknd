const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    studentUsn: {
        type: String,
        required: true,
        trim: true,
    },
    studentName: {
        type: String,
        required: true,
        trim: true,
    },
    class: {
        type: String,
        required: true,
        trim: true,
    },
    subject: {
        type: String,
        required: true,
        trim: true,
    },
    date: {
        type: Date,
        required: true,
    },
    status: {
        type: String,
        enum: ['present', 'absent', 'late', 'excused'],
        required: true,
    },
    markedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    remarks: {
        type: String,
        default: '',
    },
    /**
     * ARCHIVAL STRATEGY:
     * academicYear is used to manually archive old records by moving documents
     * where academicYear !== currentYear to an `attendance_archive` collection.
     * Run: db.attendance.aggregate([{ $match: { academicYear: '2024-25' } }, { $out: 'attendance_archive' }])
     * Then: db.attendance.deleteMany({ academicYear: '2024-25' })
     * This keeps the active attendance collection lean and fast.
     */
    academicYear: {
        type: String, // e.g. '2025-26'
        required: true,
        trim: true,
    },
}, {
    timestamps: true,
});

/**
 * INDEX STRATEGY for 7.2M records:
 *
 * Query 1: Student checks their own attendance for a subject
 *   → .find({ studentUsn, subject }) — covered by index 1
 *
 * Query 2: Faculty marks attendance for a class on a date
 *   → .find({ class, date }) — covered by index 2
 *
 * Query 3: Attendance report (studentUsn, date range)
 *   → .find({ studentUsn, date: { $gte, $lte } }) — covered by index 1 (partial)
 *
 * Query 4: Archive query — find all records for a past academic year
 *   → .find({ academicYear: '2024-25' }) — covered by index 3
 */

// Index 1: Student's attendance view — USN + date is the primary retrieval pattern
attendanceSchema.index({ studentUsn: 1, date: -1 });

// Index 2: Faculty marks attendance by class and date
attendanceSchema.index({ class: 1, date: -1, subject: 1 });

// Index 3: Archival queries — find all records for a specific academic year
attendanceSchema.index({ academicYear: 1 });

// TTL index: auto-archive records older than 2 years (730 days)
// MongoDB will delete old records automatically if manual archival hasn't been run
attendanceSchema.index({ date: 1 }, { expireAfterSeconds: 63072000 });

const Attendance = mongoose.model('Attendance', attendanceSchema);

module.exports = Attendance;
