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
const { protect, authorize, admin } = require('../middleware/authMiddleware');

// All routes require authentication
router.post('/mark', protect, authorize('admin', 'faculty'), markAttendance);
router.get('/', protect, getAttendance);
router.get('/report', protect, getAttendanceReport);
router.get('/students', protect, authorize('admin', 'faculty'), getStudentsForClass);
router.get('/classes', protect, getClasses);
router.get('/stats', protect, admin, getGlobalStats);

module.exports = router;
