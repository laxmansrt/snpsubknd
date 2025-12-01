const LostFound = require('../models/LostFound');

// @desc    Get all lost/found items
// @route   GET /api/lostfound
// @access  Public
const getItems = async (req, res) => {
    try {
        const { type, status } = req.query;
        const filter = {};

        if (type) filter.type = type;
        if (status) filter.status = status;

        const items = await LostFound.find(filter)
            .populate('reportedBy', 'name email')
            .sort({ createdAt: -1 });

        res.json(items);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get single item
// @route   GET /api/lostfound/:id
// @access  Public
const getItemById = async (req, res) => {
    try {
        const item = await LostFound.findById(req.params.id)
            .populate('reportedBy', 'name email');

        if (item) {
            res.json(item);
        } else {
            res.status(404).json({ message: 'Item not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create new item
// @route   POST /api/lostfound
// @access  Private
const createItem = async (req, res) => {
    try {
        const item = await LostFound.create({
            ...req.body,
            reportedBy: req.user._id,
        });

        res.status(201).json(item);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update item
// @route   PUT /api/lostfound/:id
// @access  Private
const updateItem = async (req, res) => {
    try {
        const item = await LostFound.findById(req.params.id);

        if (item) {
            // Check if user is the owner or admin
            if (item.reportedBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
                return res.status(403).json({ message: 'Not authorized to update this item' });
            }

            Object.assign(item, req.body);
            const updatedItem = await item.save();
            res.json(updatedItem);
        } else {
            res.status(404).json({ message: 'Item not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete item
// @route   DELETE /api/lostfound/:id
// @access  Private/Admin
const deleteItem = async (req, res) => {
    try {
        const item = await LostFound.findById(req.params.id);

        if (item) {
            await item.deleteOne();
            res.json({ message: 'Item removed' });
        } else {
            res.status(404).json({ message: 'Item not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getItems, getItemById, createItem, updateItem, deleteItem };
