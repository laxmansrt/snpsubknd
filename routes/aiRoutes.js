const express = require('express');
const router = express.Router();
const { chatWithAI } = require('../controllers/aiController');
const { protect, softProtect } = require('../middleware/authMiddleware');

const { aiRateLimiter } = require('../middleware/rateLimiter');

// @route   POST /api/ai/chat
// @access  Public / Private (Dynamic)
router.post('/chat', softProtect, aiRateLimiter, chatWithAI);

module.exports = router;
