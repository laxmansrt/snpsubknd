const express = require('express');
const router = express.Router();
const {
    createExam,
    getExams,
    getExamById,
    submitExam,
    inviteStudents
} = require('../controllers/examController');
const { protect, admin } = require('../middleware/authMiddleware');

router.route('/')
    .post(protect, admin, createExam)
    .get(protect, getExams);

router.route('/:id')
    .get(protect, getExamById);

router.post('/:id/submit', protect, submitExam);
router.post('/:id/invite', protect, admin, inviteStudents);

module.exports = router;
