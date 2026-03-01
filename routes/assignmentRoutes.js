const express = require('express');
const router = express.Router();
const {
    createAssignment,
    getAssignments,
    getAssignmentById,
    submitAssignment,
    gradeSubmission,
    deleteAssignment,
} = require('../controllers/assignmentController');
const { protect } = require('../middleware/authMiddleware');

// All routes require authentication
router.route('/')
    .get(protect, getAssignments)
    .post(protect, createAssignment);

router.route('/:id')
    .get(protect, getAssignmentById)
    .delete(protect, deleteAssignment);

router.post('/:id/submit', protect, submitAssignment);
router.put('/:id/grade/:studentId', protect, gradeSubmission);

module.exports = router;
