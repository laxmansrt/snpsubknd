const express = require('express');
const router = express.Router();
const { chatWithAI } = require('../controllers/aiController');
const { protect } = require('../middleware/authMiddleware');

// @route   POST /api/ai/chat
// @access  Public
router.post('/chat', chatWithAI);

module.exports = router;
