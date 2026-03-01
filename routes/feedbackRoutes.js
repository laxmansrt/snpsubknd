const express = require('express');
const router = express.Router();
const {
    createFeedback,
    getFeedbackForms,
    getFeedbackById,
    submitResponse,
    deleteFeedback,
} = require('../controllers/feedbackController');
const { protect } = require('../middleware/authMiddleware');

// All routes require authentication
router.route('/')
    .get(protect, getFeedbackForms)
    .post(protect, createFeedback);

router.route('/:id')
    .get(protect, getFeedbackById)
    .delete(protect, deleteFeedback);

router.post('/:id/respond', protect, submitResponse);

module.exports = router;
