const express = require('express');
const router = express.Router();
const { uploadMarks, getMarks, getGlobalStats, publishResults, exportMarksheet } = require('../controllers/marksController');
const { protect, admin } = require('../middleware/authMiddleware');

router.route('/')
    .get(protect, getMarks)
    .post(protect, uploadMarks);

router.get('/stats', protect, getGlobalStats);
router.get('/export/:studentUsn', protect, exportMarksheet);
router.post('/publish', protect, admin, publishResults);

module.exports = router;
