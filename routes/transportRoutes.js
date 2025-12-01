const express = require('express');
const router = express.Router();
const {
    getRoutes,
    getRouteById,
    createRoute,
    updateRoute,
    deleteRoute,
} = require('../controllers/transportController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, getRoutes);
router.get('/:id', protect, getRouteById);
router.post('/', protect, createRoute);
router.put('/:id', protect, updateRoute);
router.delete('/:id', protect, deleteRoute);

module.exports = router;
