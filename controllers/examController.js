const asyncHandler = require('express-async-handler');
const Exam = require('../models/Exam');
const ExamResult = require('../models/ExamResult');
const User = require('../models/User');
const { sendExamLink } = require('../utils/notificationService');

// @desc    Create new exam
// @route   POST /api/exams
// @access  Admin/Faculty
const createExam = asyncHandler(async (req, res) => {
    const { title, description, semester, branch, duration, date, questions } = req.body;

    const exam = await Exam.create({
        title,
        description,
        semester,
        branch,
        duration,
        date,
        questions,
        createdBy: req.user._id
    });

    res.status(201).json(exam);
});

// @desc    Get all exams (filtered)
// @route   GET /api/exams
// @access  Private
const getExams = asyncHandler(async (req, res) => {
    const query = {};
    if (req.user.role === 'student') {
        query.branch = req.user.studentData.department;
        query.semester = req.user.studentData.semester;
    }

    const exams = await Exam.find(query).sort({ date: -1 });
    res.json(exams);
});

// @desc    Get single exam (without correct answers)
// @route   GET /api/exams/:id
// @access  Student
const getExamById = asyncHandler(async (req, res) => {
    const exam = await Exam.findById(req.params.id);

    if (!exam) {
        res.status(404);
        throw new Error('Exam not found');
    }

    // Check if student already submitted
    const existingResult = await ExamResult.findOne({ student: req.user._id, exam: req.params.id });
    if (existingResult) {
        res.status(400);
        throw new Error('You have already submitted this exam');
    }

    res.json(exam);
});

// @desc    Submit exam answers
// @route   POST /api/exams/:id/submit
// @access  Student
const submitExam = asyncHandler(async (req, res) => {
    const { answers } = req.body;
    const exam = await Exam.findById(req.params.id).select('+questions.correctAnswer');

    if (!exam) {
        res.status(404);
        throw new Error('Exam not found');
    }

    let score = 0;
    let maxScore = 0;

    exam.questions.forEach((q, idx) => {
        const studentAnswer = answers.find(a => a.questionIndex === idx);
        maxScore += q.points;
        if (studentAnswer && studentAnswer.selectedOption === q.correctAnswer) {
            score += q.points;
        }
    });

    const result = await ExamResult.create({
        student: req.user._id,
        exam: req.params.id,
        answers,
        score,
        maxScore
    });

    res.status(201).json({
        message: 'Exam submitted successfully',
        score,
        maxScore
    });
});

// @desc    Send exam invitations to students
// @route   POST /api/exams/:id/invite
// @access  Admin
const inviteStudents = asyncHandler(async (req, res) => {
    const exam = await Exam.findById(req.params.id);
    if (!exam) {
        res.status(404);
        throw new Error('Exam not found');
    }

    const students = await User.find({
        role: 'student',
        'studentData.department': exam.branch,
        'studentData.semester': exam.semester
    });

    let count = 0;
    for (const student of students) {
        await sendExamLink(student, exam.title, exam._id);
        count++;
    }

    res.json({ message: `Invitations sent to ${count} students` });
});

module.exports = {
    createExam,
    getExams,
    getExamById,
    submitExam,
    inviteStudents
};
