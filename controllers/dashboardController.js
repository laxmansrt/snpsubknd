const User = require('../models/User');
const Announcement = require('../models/Announcement');
const Marks = require('../models/Marks');
const Attendance = require('../models/Attendance');
const Exam = require('../models/Exam');
const Department = require('../models/Department');
const HostelApplication = require('../models/HostelApplication');
const TransportApplication = require('../models/TransportApplication');

// @desc    Get dashboard statistics
// @route   GET /api/dashboard/stats
// @access  Private (Admin)
const getDashboardStats = async (req, res) => {
    try {
        const [
            totalStudents,
            totalFaculty,
            totalParents,
            totalDepartments,
            activeAnnouncements,
            recentAnnouncements,
            hostelApplications,
            transportApplications,
        ] = await Promise.all([
            User.countDocuments({ role: 'student' }),
            User.countDocuments({ role: 'faculty' }),
            User.countDocuments({ role: 'parent' }),
            Department.countDocuments(),
            Announcement.countDocuments({ isActive: true }),
            Announcement.find({ isActive: true })
                .sort({ publishedAt: -1 })
                .limit(5)
                .populate('publishedBy', 'name')
                .select('title category priority publishedAt'),
            HostelApplication.countDocuments({ status: 'pending' }),
            TransportApplication.countDocuments({ status: 'pending' }),
        ]);

        // Department-wise student count
        const departmentStats = await User.aggregate([
            { $match: { role: 'student' } },
            { $group: { _id: '$studentData.department', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
        ]);

        // Average attendance
        const attendanceAgg = await User.aggregate([
            { $match: { role: 'student', 'studentData.attendance': { $gt: 0 } } },
            { $group: { _id: null, avgAttendance: { $avg: '$studentData.attendance' } } },
        ]);
        const avgAttendance = attendanceAgg.length > 0 ? Math.round(attendanceAgg[0].avgAttendance * 10) / 10 : 0;

        // Average CGPA
        const cgpaAgg = await User.aggregate([
            { $match: { role: 'student', 'studentData.cgpa': { $gt: 0 } } },
            { $group: { _id: null, avgCGPA: { $avg: '$studentData.cgpa' } } },
        ]);
        const avgCGPA = cgpaAgg.length > 0 ? Math.round(cgpaAgg[0].avgCGPA * 100) / 100 : 0;

        res.json({
            overview: {
                totalStudents,
                totalFaculty,
                totalParents,
                totalDepartments,
                activeAnnouncements,
                avgAttendance,
                avgCGPA,
            },
            pendingApplications: {
                hostel: hostelApplications,
                transport: transportApplications,
            },
            departmentStats,
            recentAnnouncements,
        });
    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get student-specific dashboard stats
// @route   GET /api/dashboard/student
// @access  Private (Student)
const getStudentDashboard = async (req, res) => {
    try {
        const student = req.user;
        const usn = student.studentData?.usn;

        const [marks, announcements] = await Promise.all([
            Marks.find({ studentUsn: usn }).sort({ date: -1 }).limit(10),
            Announcement.find({
                isActive: true,
                targetAudience: { $in: ['student', 'all'] },
            })
                .sort({ publishedAt: -1 })
                .limit(5)
                .populate('publishedBy', 'name')
                .select('title category priority publishedAt'),
        ]);

        // Calculate subject-wise performance
        const subjectPerformance = {};
        marks.forEach(mark => {
            if (!subjectPerformance[mark.subject]) {
                subjectPerformance[mark.subject] = [];
            }
            subjectPerformance[mark.subject].push({
                examType: mark.examType,
                obtained: mark.obtainedMarks,
                max: mark.maxMarks,
                percentage: Math.round((mark.obtainedMarks / mark.maxMarks) * 100),
            });
        });

        res.json({
            profile: {
                name: student.name,
                usn: student.studentData?.usn,
                department: student.studentData?.department,
                semester: student.studentData?.semester,
                attendance: student.studentData?.attendance,
                cgpa: student.studentData?.cgpa,
            },
            recentMarks: marks,
            subjectPerformance,
            recentAnnouncements: announcements,
        });
    } catch (error) {
        console.error('Student dashboard error:', error);
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getDashboardStats,
    getStudentDashboard,
};
