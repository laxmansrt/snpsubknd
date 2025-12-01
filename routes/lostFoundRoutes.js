const express = require('express');
const router = express.Router();
const {
    getItems,
    getItemById,
    createItem,
    updateItem,
    deleteItem,
} = require('../controllers/lostFoundController');
const { protect, admin } = require('../middleware/authMiddleware');

router.route('/')
    .get(getItems)
    .post(protect, createItem);

router.route('/:id')
    .get(getItemById)
    .put(protect, updateItem)
    .delete(protect, admin, deleteItem);

module.exports = router;
