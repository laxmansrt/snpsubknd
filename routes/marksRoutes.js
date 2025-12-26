const express = require('express');
const router = express.Router();
const { uploadMarks, getMarks, getGlobalStats, publishResults } = require('../controllers/marksController');
const { protect, admin } = require('../middleware/authMiddleware');

router.route('/')
    .get(protect, getMarks)
    .post(protect, uploadMarks);

router.get('/stats', protect, getGlobalStats);
router.post('/publish', protect, admin, publishResults);

module.exports = router;

