const express = require('express');
const router = express.Router();
const {
    getRooms,
    getRoomById,
    createRoom,
    updateRoom,
    deleteRoom,
    getMessMenu,
    submitApplication,
    getApplications,
    getMyApplication,
    updateApplicationStatus,
} = require('../controllers/hostelController');
const { protect, admin } = require('../middleware/authMiddleware');

router.get('/', protect, getRooms);
router.get('/mess/menu', protect, getMessMenu);
router.get('/application/my', protect, getMyApplication);
router.get('/applications', protect, admin, getApplications);
router.post('/application', protect, submitApplication);
router.put('/application/:id', protect, admin, updateApplicationStatus);
router.get('/:id', protect, getRoomById);
router.post('/', protect, createRoom);
router.put('/:id', protect, updateRoom);
router.delete('/:id', protect, deleteRoom);

module.exports = router;
