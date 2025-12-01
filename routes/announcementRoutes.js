const express = require('express');
const router = express.Router();
const {
    createAnnouncement,
    getAnnouncements,
    getAnnouncementById,
    updateAnnouncement,
    deleteAnnouncement,
    markAsRead,
} = require('../controllers/announcementController');
const { protect } = require('../middleware/authMiddleware');

// All routes require authentication
router.post('/', protect, createAnnouncement);
router.get('/', protect, getAnnouncements);
router.get('/:id', protect, getAnnouncementById);
router.put('/:id', protect, updateAnnouncement);
router.delete('/:id', protect, deleteAnnouncement);
router.post('/:id/read', protect, markAsRead);

module.exports = router;
