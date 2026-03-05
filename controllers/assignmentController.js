const Assignment = require('../models/Assignment');
const Submission = require('../models/Submission');

// @desc    Create assignment
// @route   POST /api/assignments
// @access  Private (Faculty/Admin)
const createAssignment = async (req, res) => {
    try {
        const { title, description, subject, class: className, department, dueDate, maxMarks, attachmentUrl } = req.body;

        if (!title || !description || !subject || !className || !dueDate) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        const assignment = await Assignment.create({
            title,
            description,
            subject,
            class: className,
            department,
            dueDate,
            maxMarks: maxMarks || 100,
            attachmentUrl,
            createdBy: req.user._id,
        });

        const populated = await Assignment.findById(assignment._id)
            .populate('createdBy', 'name email');

        res.status(201).json(populated);
    } catch (error) {
        console.error('Create assignment error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all assignments (filtered by class/department for students)
// @route   GET /api/assignments
// @access  Private
const getAssignments = async (req, res) => {
    try {
        const { class: className, subject, department } = req.query;
        const query = { isActive: true };

        if (className) query.class = className;
        if (subject) query.subject = subject;
        if (department) query.department = department;

        // Students automatically see only their class's assignments
        if (req.user.role === 'student' && req.user.studentData?.class) {
            query.class = req.user.studentData.class;
        }

        const assignments = await Assignment.find(query)
            .populate('createdBy', 'name email')
            .sort({ dueDate: -1 })
            .lean();

        // For students — inject their own submission status without loading ALL submissions
        if (req.user.role === 'student') {
            const assignmentIds = assignments.map(a => a._id);

            // One DB call to find all of this student's submissions for these assignments
            const mySubmissions = await Submission.find({
                assignmentId: { $in: assignmentIds },
                studentId: req.user._id,
            }).select('assignmentId grade feedback submittedAt isLate').lean();

            const submissionMap = {};
            mySubmissions.forEach(s => {
                submissionMap[s.assignmentId.toString()] = s;
            });

            // Attach submission counts separately with one aggregation
            const countAgg = await Submission.aggregate([
                { $match: { assignmentId: { $in: assignmentIds } } },
                { $group: { _id: '$assignmentId', count: { $sum: 1 } } },
            ]);
            const countMap = {};
            countAgg.forEach(c => { countMap[c._id.toString()] = c.count; });

            const result = assignments.map(a => ({
                ...a,
                mySubmission: submissionMap[a._id.toString()] || null,
                submissionCount: countMap[a._id.toString()] || 0,
            }));

            return res.json(result);
        }

        res.json(assignments);
    } catch (error) {
        console.error('Get assignments error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get single assignment with all submissions (faculty view)
// @route   GET /api/assignments/:id
// @access  Private
const getAssignmentById = async (req, res) => {
    try {
        const assignment = await Assignment.findById(req.params.id)
            .populate('createdBy', 'name email')
            .lean();

        if (!assignment) {
            return res.status(404).json({ message: 'Assignment not found' });
        }

        // Fetch submissions as a separate collection query
        const submissions = await Submission.find({ assignmentId: req.params.id })
            .populate('studentId', 'name email studentData.usn')
            .populate('gradedBy', 'name')
            .sort({ submittedAt: -1 })
            .lean();

        res.json({ ...assignment, submissions });
    } catch (error) {
        console.error('Get assignment error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all submissions for an assignment (faculty view)
// @route   GET /api/assignments/:id/submissions
// @access  Private (Faculty/Admin)
const getSubmissions = async (req, res) => {
    try {
        const { status } = req.query; // 'graded' | 'ungraded'
        const query = { assignmentId: req.params.id };

        if (status === 'graded') query.grade = { $ne: null };
        if (status === 'ungraded') query.grade = null;

        const submissions = await Submission.find(query)
            .populate('studentId', 'name email studentData.usn studentData.class')
            .populate('gradedBy', 'name')
            .sort({ submittedAt: -1 })
            .lean();

        res.json(submissions);
    } catch (error) {
        console.error('Get submissions error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Submit assignment (Student)
// @route   POST /api/assignments/:id/submit
// @access  Private (Student)
const submitAssignment = async (req, res) => {
    try {
        const assignment = await Assignment.findById(req.params.id).lean();

        if (!assignment) {
            return res.status(404).json({ message: 'Assignment not found' });
        }

        const isPastDue = new Date() > new Date(assignment.dueDate);

        // Upsert: creates or updates the submission atomically
        const submission = await Submission.findOneAndUpdate(
            { assignmentId: req.params.id, studentId: req.user._id },
            {
                $set: {
                    studentUsn: req.user.studentData?.usn || '',
                    studentName: req.user.name,
                    submissionText: req.body.submissionText,
                    attachmentUrl: req.body.attachmentUrl || '',
                    submittedAt: new Date(),
                    isLate: isPastDue,
                },
            },
            { upsert: true, new: true, runValidators: true }
        );

        res.json({
            message: isPastDue ? 'Assignment submitted (late)' : 'Assignment submitted successfully',
            submission,
        });
    } catch (error) {
        console.error('Submit assignment error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Grade a submission (Faculty/Admin)
// @route   PUT /api/assignments/:id/grade/:studentId
// @access  Private (Faculty/Admin)
const gradeSubmission = async (req, res) => {
    try {
        const { grade, feedback } = req.body;

        if (grade === undefined || grade === null) {
            return res.status(400).json({ message: 'Grade value is required' });
        }

        const submission = await Submission.findOneAndUpdate(
            { assignmentId: req.params.id, studentId: req.params.studentId },
            {
                $set: {
                    grade,
                    feedback: feedback || '',
                    gradedAt: new Date(),
                    gradedBy: req.user._id,
                },
            },
            { new: true, runValidators: true }
        );

        if (!submission) {
            return res.status(404).json({ message: 'Submission not found' });
        }

        res.json({ message: 'Submission graded successfully', submission });
    } catch (error) {
        console.error('Grade submission error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete assignment (soft delete)
// @route   DELETE /api/assignments/:id
// @access  Private (Faculty/Admin)
const deleteAssignment = async (req, res) => {
    try {
        const assignment = await Assignment.findById(req.params.id);

        if (!assignment) {
            return res.status(404).json({ message: 'Assignment not found' });
        }

        if (assignment.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized' });
        }

        assignment.isActive = false;
        await assignment.save();
        res.json({ message: 'Assignment deleted successfully' });
    } catch (error) {
        console.error('Delete assignment error:', error);
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    createAssignment,
    getAssignments,
    getAssignmentById,
    getSubmissions,
    submitAssignment,
    gradeSubmission,
    deleteAssignment,
};
