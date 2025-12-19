const express = require('express');
const router = express.Router();
const {
    markAttendance,
    getAttendance,
    getAttendanceReport,
    getStudentsForClass,
    getClasses,
    getGlobalStats,
} = require('../controllers/attendanceController');
const { protect } = require('../middleware/authMiddleware');

// All routes require authentication
router.post('/mark', protect, markAttendance);
router.get('/', protect, getAttendance);
router.get('/report', protect, getAttendanceReport);
router.get('/students', protect, getStudentsForClass);
router.get('/classes', protect, getClasses);
router.get('/stats', protect, getGlobalStats);

module.exports = router;
