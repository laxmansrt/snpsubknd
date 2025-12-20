const express = require('express');
const router = express.Router();
const { chatWithAI } = require('../controllers/aiController');
const { protect } = require('../middleware/authMiddleware');

const { aiRateLimiter } = require('../middleware/rateLimiter');

// @route   POST /api/ai/chat
// @access  Public
router.post('/chat', aiRateLimiter, chatWithAI);

module.exports = router;
