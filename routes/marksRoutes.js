const express = require('express');
const router = express.Router();
const { uploadMarks, getMarks } = require('../controllers/marksController');
const { protect } = require('../middleware/authMiddleware');

router.route('/')
    .get(protect, getMarks)
    .post(protect, uploadMarks);

module.exports = router;
