const express = require('express');
const router = express.Router();
const {
    loginUser,
    registerUser,
    getMe,
    bulkRegisterUsers,
    getUsers,
    updateProfile,
    updatePassword
} = require('../controllers/authController');
const { protect, admin } = require('../middleware/authMiddleware');

router.post('/login', loginUser);
router.post('/register', protect, admin, registerUser);
router.post('/bulk-register', protect, admin, bulkRegisterUsers);
router.get('/me', protect, getMe);
router.get('/users', protect, admin, getUsers);
router.put('/profile', protect, updateProfile);
router.put('/password', protect, updatePassword);

module.exports = router;
