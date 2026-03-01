const express = require('express');
const router = express.Router();
const {
    getDashboardStats,
    getStudentDashboard,
} = require('../controllers/dashboardController');
const { protect } = require('../middleware/authMiddleware');

// Admin dashboard stats
router.get('/stats', protect, getDashboardStats);

// Student-specific dashboard
router.get('/student', protect, getStudentDashboard);

module.exports = router;
