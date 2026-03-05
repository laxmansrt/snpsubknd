const express = require('express');
const router = express.Router();
const {
    createAssignment,
    getAssignments,
    getAssignmentById,
    getSubmissions,
    submitAssignment,
    gradeSubmission,
    deleteAssignment,
} = require('../controllers/assignmentController');
const { protect, authorize } = require('../middleware/authMiddleware');

// All routes require authentication
router.route('/')
    .get(protect, getAssignments)
    .post(protect, authorize('admin', 'faculty'), createAssignment);

router.route('/:id')
    .get(protect, getAssignmentById)
    .delete(protect, authorize('admin', 'faculty'), deleteAssignment);

// Faculty-only: view all submissions for a specific assignment
router.get('/:id/submissions', protect, authorize('admin', 'faculty'), getSubmissions);

// Student-only: submit their assignment
router.post('/:id/submit', protect, authorize('student'), submitAssignment);

// Faculty-only: grade a submission
router.put('/:id/grade/:studentId', protect, authorize('admin', 'faculty'), gradeSubmission);

module.exports = router;
