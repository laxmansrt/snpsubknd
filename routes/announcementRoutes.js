const express = require('express');
const router = express.Router();
const {
    createAnnouncement,
    getAnnouncements,
    getAnnouncementById,
    updateAnnouncement,
    deleteAnnouncement,
    markAsRead,
    getReadCount,
} = require('../controllers/announcementController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.post('/', protect, authorize('admin', 'faculty'), createAnnouncement);
router.get('/', protect, getAnnouncements);
router.get('/:id', protect, getAnnouncementById);
router.put('/:id', protect, authorize('admin', 'faculty'), updateAnnouncement);
router.delete('/:id', protect, authorize('admin', 'faculty'), deleteAnnouncement);
router.post('/:id/read', protect, markAsRead);
router.get('/:id/reads', protect, authorize('admin', 'faculty'), getReadCount);

module.exports = router;
