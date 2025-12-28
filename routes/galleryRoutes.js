const express = require('express');
const router = express.Router();
const { getGalleryItems, createGalleryItem, deleteGalleryItem } = require('../controllers/galleryController');
const { protect, admin } = require('../middleware/authMiddleware');

router.get('/', getGalleryItems);
router.post('/', protect, admin, createGalleryItem);
router.delete('/:id', protect, admin, deleteGalleryItem);

module.exports = router;
