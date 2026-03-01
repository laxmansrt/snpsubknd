const Assignment = require('../models/Assignment');

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

        // If student, filter by their class
        if (req.user.role === 'student' && req.user.studentData?.class) {
            query.class = req.user.studentData.class;
        }

        const assignments = await Assignment.find(query)
            .populate('createdBy', 'name email')
            .sort({ dueDate: -1 });

        // For students, add their submission status
        if (req.user.role === 'student') {
            const result = assignments.map(a => {
                const obj = a.toObject();
                const mySubmission = obj.submissions.find(
                    s => s.studentId.toString() === req.user._id.toString()
                );
                obj.mySubmission = mySubmission || null;
                obj.submissionCount = obj.submissions.length;
                delete obj.submissions; // Don't send all submissions to students
                return obj;
            });
            return res.json(result);
        }

        res.json(assignments);
    } catch (error) {
        console.error('Get assignments error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get single assignment
// @route   GET /api/assignments/:id
// @access  Private
const getAssignmentById = async (req, res) => {
    try {
        const assignment = await Assignment.findById(req.params.id)
            .populate('createdBy', 'name email')
            .populate('submissions.studentId', 'name email studentData.usn')
            .populate('submissions.gradedBy', 'name');

        if (!assignment) {
            return res.status(404).json({ message: 'Assignment not found' });
        }

        res.json(assignment);
    } catch (error) {
        console.error('Get assignment error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Submit assignment (Student)
// @route   POST /api/assignments/:id/submit
// @access  Private (Student)
const submitAssignment = async (req, res) => {
    try {
        const assignment = await Assignment.findById(req.params.id);

        if (!assignment) {
            return res.status(404).json({ message: 'Assignment not found' });
        }

        // Check if past due date
        if (new Date() > new Date(assignment.dueDate)) {
            return res.status(400).json({ message: 'Assignment deadline has passed' });
        }

        // Check if already submitted
        const existingSubmission = assignment.submissions.find(
            s => s.studentId.toString() === req.user._id.toString()
        );

        if (existingSubmission) {
            // Update existing submission
            existingSubmission.submissionText = req.body.submissionText || existingSubmission.submissionText;
            existingSubmission.attachmentUrl = req.body.attachmentUrl || existingSubmission.attachmentUrl;
            existingSubmission.submittedAt = new Date();
        } else {
            // Add new submission
            assignment.submissions.push({
                studentId: req.user._id,
                studentUsn: req.user.studentData?.usn || '',
                studentName: req.user.name,
                submissionText: req.body.submissionText,
                attachmentUrl: req.body.attachmentUrl,
            });
        }

        await assignment.save();
        res.json({ message: 'Assignment submitted successfully' });
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
        const assignment = await Assignment.findById(req.params.id);

        if (!assignment) {
            return res.status(404).json({ message: 'Assignment not found' });
        }

        const submission = assignment.submissions.find(
            s => s.studentId.toString() === req.params.studentId
        );

        if (!submission) {
            return res.status(404).json({ message: 'Submission not found' });
        }

        submission.grade = grade;
        submission.feedback = feedback;
        submission.gradedAt = new Date();
        submission.gradedBy = req.user._id;

        await assignment.save();
        res.json({ message: 'Submission graded successfully', submission });
    } catch (error) {
        console.error('Grade submission error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete assignment
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
    submitAssignment,
    gradeSubmission,
    deleteAssignment,
};
