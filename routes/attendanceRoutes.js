const express = require('express');
const router = express.Router();
const {
    markAttendance,
    getAttendance,
    getAttendanceReport,
    getStudentsForClass,
} = require('../controllers/attendanceController');
const { protect } = require('../middleware/authMiddleware');

// All routes require authentication
router.post('/mark', protect, markAttendance);
router.get('/', protect, getAttendance);
router.get('/report', protect, getAttendanceReport);
router.get('/students', protect, getStudentsForClass);

module.exports = router;
