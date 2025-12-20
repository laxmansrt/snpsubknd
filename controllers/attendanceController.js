const Attendance = require('../models/Attendance');
const User = require('../models/User');

// @desc    Mark attendance for students
// @route   POST /api/attendance/mark
// @access  Private (Faculty/Admin)
const markAttendance = async (req, res) => {
    try {
        const { attendanceData } = req.body; // Array of { studentUsn, studentName, status, remarks }
        const { class: className, subject, date } = req.body;

        if (!attendanceData || !className || !subject || !date) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        const attendanceRecords = [];

        for (const record of attendanceData) {
            // Find student by USN
            const student = await User.findOne({ 'studentData.usn': record.studentUsn });

            if (!student) {
                console.log(`Student not found: ${record.studentUsn}`);
                continue;
            }

            // Check if attendance already marked for this date
            const existing = await Attendance.findOne({
                studentUsn: record.studentUsn,
                date: new Date(date),
                subject,
            });

            if (existing) {
                // Update existing record
                existing.status = record.status;
                existing.remarks = record.remarks || '';
                await existing.save();
                attendanceRecords.push(existing);
            } else {
                // Create new record
                const newRecord = await Attendance.create({
                    studentId: student._id,
                    studentUsn: record.studentUsn,
                    studentName: record.studentName || student.name,
                    class: className,
                    subject,
                    date: new Date(date),
                    status: record.status,
                    markedBy: req.user._id,
                    remarks: record.remarks || '',
                });
                attendanceRecords.push(newRecord);
            }
        }

        res.status(201).json({
            message: 'Attendance marked successfully',
            count: attendanceRecords.length,
            records: attendanceRecords,
        });
    } catch (error) {
        console.error('Mark attendance error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get attendance for a specific class/date
// @route   GET /api/attendance?class=CSE-5&subject=DBMS&date=2024-01-15
// @access  Private
const getAttendance = async (req, res) => {
    try {
        const { class: className, subject, date, page = 1, limit = 50 } = req.query;
        let { studentUsn } = req.query;
        const user = req.user;

        // Security: Restrict access based on role
        if (user.role === 'student') {
            studentUsn = user.studentData.usn;
        } else if (user.role === 'parent') {
            studentUsn = user.parentData.childUsn;
        }

        const query = {};
        if (className && (user.role === 'admin' || user.role === 'faculty')) query.class = className;
        if (subject) query.subject = subject;
        if (date) query.date = new Date(date);
        if (studentUsn) query.studentUsn = studentUsn;

        // Enforce pagination to prevent memory exhaustion
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const maxLimit = Math.min(parseInt(limit), 100); // Cap at 100 records per request

        const records = await Attendance.find(query)
            .sort({ date: -1 })
            .limit(maxLimit)
            .skip(skip)
            .populate('markedBy', 'name email')
            .lean(); // Use lean() for better performance

        const total = await Attendance.countDocuments(query);

        res.json({
            records,
            pagination: {
                total,
                page: parseInt(page),
                limit: maxLimit,
                pages: Math.ceil(total / maxLimit)
            }
        });
    } catch (error) {
        console.error('Get attendance error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get attendance report/statistics
// @route   GET /api/attendance/report?studentUsn=1SI21CS045
// @access  Private
const getAttendanceReport = async (req, res) => {
    try {
        const { class: className, startDate, endDate } = req.query;
        let { studentUsn } = req.query;
        const user = req.user;

        // Security: Restrict access based on role
        if (user.role === 'student') {
            studentUsn = user.studentData.usn;
        } else if (user.role === 'parent') {
            studentUsn = user.parentData.childUsn;
        }

        const query = {};
        if (studentUsn) query.studentUsn = studentUsn;
        if (className && (user.role === 'admin' || user.role === 'faculty')) query.class = className;

        if (startDate && endDate) {
            query.date = {
                $gte: new Date(startDate),
                $lte: new Date(endDate),
            };
        }

        const records = await Attendance.find(query).sort({ date: -1 });

        const stats = {
            total: records.length,
            present: records.filter(r => r.status === 'present').length,
            absent: records.filter(r => r.status === 'absent').length,
            late: records.filter(r => r.status === 'late').length,
            excused: records.filter(r => r.status === 'excused').length,
        };

        stats.percentage = stats.total > 0
            ? ((stats.present / stats.total) * 100).toFixed(2)
            : 0;

        res.json({
            stats,
            records,
        });
    } catch (error) {
        console.error('Get attendance report error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get students for a class
// @route   GET /api/attendance/students?class=CSE-5
// @access  Private (Faculty/Admin)
const getStudentsForClass = async (req, res) => {
    try {
        const { class: className } = req.query;

        if (!className) {
            return res.status(400).json({ message: 'Class parameter is required' });
        }

        let students = await User.find({
            role: 'student',
            'studentData.class': className,
        }).select('name email studentData');

        res.json(students);
    } catch (error) {
        console.error('Get students error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get global attendance stats for admin
// @route   GET /api/attendance/stats
// @access  Private (Admin)
const getGlobalStats = async (req, res) => {
    try {
        const totalRecords = await Attendance.countDocuments();
        const presentRecords = await Attendance.countDocuments({ status: 'present' });

        const percentage = totalRecords > 0
            ? ((presentRecords / totalRecords) * 100).toFixed(1)
            : 0;

        res.json({
            totalRecords,
            presentRecords,
            percentage
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all unique classes
// @route   GET /api/attendance/classes
// @access  Private
const getClasses = async (req, res) => {
    try {
        const classes = await User.distinct('studentData.class', { role: 'student' });
        res.json(classes.filter(c => c)); // Filter out null/undefined
    } catch (error) {
        console.error('Get classes error:', error);
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    markAttendance,
    getAttendance,
    getAttendanceReport,
    getStudentsForClass,
    getClasses,
    getGlobalStats,
};
