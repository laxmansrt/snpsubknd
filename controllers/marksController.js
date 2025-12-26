const Marks = require('../models/Marks');
const User = require('../models/User');
const { notifyResults } = require('../utils/notificationService');

// @desc    Upload marks for students
// @route   POST /api/marks
// @access  Private (Faculty/Admin)
const uploadMarks = async (req, res) => {
    try {
        const { marksData } = req.body; // Array of { studentUsn, obtainedMarks }
        const { class: className, subject, examType, maxMarks } = req.body;

        if (!marksData || !className || !subject || !examType || !maxMarks) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        const results = [];

        for (const record of marksData) {
            // Find student by USN
            const student = await User.findOne({ 'studentData.usn': record.studentUsn });

            if (!student) {
                console.log(`Student not found: ${record.studentUsn}`);
                continue;
            }

            // Check if marks already uploaded for this exam
            const existing = await Marks.findOne({
                studentUsn: record.studentUsn,
                subject,
                examType,
            });

            if (existing) {
                // Update existing record
                existing.obtainedMarks = record.obtainedMarks;
                existing.maxMarks = maxMarks;
                await existing.save();
                results.push(existing);
            } else {
                // Create new record
                const newRecord = await Marks.create({
                    studentId: student._id,
                    studentUsn: record.studentUsn,
                    studentName: student.name,
                    class: className,
                    subject,
                    examType,
                    maxMarks,
                    obtainedMarks: record.obtainedMarks,
                    uploadedBy: req.user._id,
                });
                results.push(newRecord);
            }
        }

        res.status(201).json({
            message: 'Marks uploaded successfully',
            count: results.length,
            records: results,
        });
    } catch (error) {
        console.error('Upload marks error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get marks for a student
// @route   GET /api/marks?studentUsn=1SI21CS045
// @access  Private
const getMarks = async (req, res) => {
    try {
        const { studentUsn, class: className, subject, examType } = req.query;
        const query = {};

        if (studentUsn) query.studentUsn = studentUsn;
        if (className) query.class = className;
        if (subject) query.subject = subject;
        if (examType) query.examType = examType;

        // If student, force their USN
        if (req.user.role === 'student' && req.user.studentData?.usn) {
            query.studentUsn = req.user.studentData.usn;
        }

        const marks = await Marks.find(query)
            .sort({ date: -1 })
            .populate('uploadedBy', 'name email');

        res.json(marks);
    } catch (error) {
        console.error('Get marks error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get global results stats for admin
// @route   GET /api/marks/stats
// @access  Private (Admin)
const getGlobalStats = async (req, res) => {
    try {
        const allMarks = await Marks.find();

        if (allMarks.length === 0) {
            return res.json({ averagePercentage: 0, totalResults: 0 });
        }

        const totalObtained = allMarks.reduce((sum, m) => sum + m.obtainedMarks, 0);
        const totalMax = allMarks.reduce((sum, m) => sum + m.maxMarks, 0);

        const averagePercentage = ((totalObtained / totalMax) * 100).toFixed(1);

        res.json({
            averagePercentage,
            totalResults: allMarks.length
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Publish results and notify students
// @route   POST /api/marks/publish
// @access  Private (Admin)
const publishResults = async (req, res) => {
    try {
        const { branch, semester } = req.body;

        // Find students in this branch/sem
        const students = await User.find({
            role: 'student',
            'studentData.department': branch,
            'studentData.semester': semester
        });

        if (students.length === 0) {
            return res.status(404).json({ message: 'No students found for this selection' });
        }

        let sentCount = 0;
        for (const student of students) {
            // Check if student has marks for this sem
            const studentMarks = await Marks.findOne({ studentId: student._id, class: new RegExp(`${branch}.*Sem ${semester}`, 'i') });

            if (studentMarks) {
                await notifyResults(student, { semester: `${branch} - Sem ${semester}` });
                sentCount++;
            }
        }

        res.json({ message: `Results published. Notifications sent to ${sentCount} students.` });
    } catch (error) {
        console.error('Publish results error:', error);
        res.status(500).json({ message: error.message });
    }
};

module.exports = { uploadMarks, getMarks, getGlobalStats, publishResults };

