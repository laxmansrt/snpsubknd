const express = require('express');
const router = express.Router();
const { uploadMarks, getMarks, getGlobalStats } = require('../controllers/marksController');
const { protect } = require('../middleware/authMiddleware');

router.route('/')
    .get(protect, getMarks)
    .post(protect, uploadMarks);

router.get('/stats', protect, getGlobalStats);

module.exports = router;
