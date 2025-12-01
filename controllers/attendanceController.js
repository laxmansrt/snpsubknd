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
        const { class: className, subject, date, studentUsn } = req.query;

        const query = {};
        if (className) query.class = className;
        if (subject) query.subject = subject;
        if (date) query.date = new Date(date);
        if (studentUsn) query.studentUsn = studentUsn;

        const records = await Attendance.find(query)
            .sort({ date: -1 })
            .populate('markedBy', 'name email');

        res.json(records);
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
        const { studentUsn, class: className, startDate, endDate } = req.query;

        const query = {};
        if (studentUsn) query.studentUsn = studentUsn;
        if (className) query.class = className;
        if (startDate && endDate) {
            query.date = {
                $gte: new Date(startDate),
                $lte: new Date(endDate),
            };
        }

        const records = await Attendance.find(query);

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

        // If no students or very few students found, add mock data for demo purposes
        if (students.length < 3) {
            const mockStudents = [
                {
                    _id: 'mock1',
                    name: 'Rahul Kumar',
                    email: 'rahul@example.com',
                    studentData: { usn: '1SI21CS045', class: className }
                },
                {
                    _id: 'mock2',
                    name: 'Priya Sharma',
                    email: 'priya@example.com',
                    studentData: { usn: '1SI21CS048', class: className }
                },
                {
                    _id: 'mock3',
                    name: 'Amit Singh',
                    email: 'amit@example.com',
                    studentData: { usn: '1SI21CS052', class: className }
                },
                {
                    _id: 'mock4',
                    name: 'Sneha Gupta',
                    email: 'sneha@example.com',
                    studentData: { usn: '1SI21CS055', class: className }
                },
                {
                    _id: 'mock5',
                    name: 'Vikram Reddy',
                    email: 'vikram@example.com',
                    studentData: { usn: '1SI21CS058', class: className }
                },
                {
                    _id: 'mock6',
                    name: 'Anjali Desai',
                    email: 'anjali@example.com',
                    studentData: { usn: '1SI21CS061', class: className }
                },
                {
                    _id: 'mock7',
                    name: 'Arjun Patel',
                    email: 'arjun@example.com',
                    studentData: { usn: '1SI21CS064', class: className }
                },
                {
                    _id: 'mock8',
                    name: 'Meera Iyer',
                    email: 'meera@example.com',
                    studentData: { usn: '1SI21CS067', class: className }
                }
            ];
            students = [...students, ...mockStudents];
        }

        res.json(students);
    } catch (error) {
        console.error('Get students error:', error);
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    markAttendance,
    getAttendance,
    getAttendanceReport,
    getStudentsForClass,
};
