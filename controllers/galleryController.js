const Gallery = require('../models/Gallery');

// @desc    Get all gallery items
// @route   GET /api/gallery
// @access  Public
const getGalleryItems = async (req, res) => {
    try {
        const items = await Gallery.find().sort({ createdAt: -1 });
        res.status(200).json(items);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create a gallery item
// @route   POST /api/gallery
// @access  Private (Admin)
const createGalleryItem = async (req, res) => {
    try {
        const { title, description, type, url, category } = req.body;

        if (!title || !type || !url) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        const item = await Gallery.create({
            title,
            description,
            type,
            url,
            category,
            uploadedBy: req.user._id
        });

        res.status(201).json(item);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete a gallery item
// @route   DELETE /api/gallery/:id
// @access  Private (Admin)
const deleteGalleryItem = async (req, res) => {
    try {
        const item = await Gallery.findById(req.params.id);

        if (!item) {
            return res.status(404).json({ message: 'Item not found' });
        }

        await item.deleteOne();
        res.status(200).json({ message: 'Item removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getGalleryItems,
    createGalleryItem,
    deleteGalleryItem
};
