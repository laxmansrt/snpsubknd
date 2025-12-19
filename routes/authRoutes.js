const express = require('express');
const router = express.Router();
const { loginUser, registerUser, getMe } = require('../controllers/authController');
const { protect, admin } = require('../middleware/authMiddleware');

router.post('/login', loginUser);
router.post('/register', protect, admin, registerUser);
router.post('/bulk-register', protect, admin, require('../controllers/authController').bulkRegisterUsers);
router.get('/me', protect, getMe);

module.exports = router;
