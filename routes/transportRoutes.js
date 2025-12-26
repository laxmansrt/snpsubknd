const express = require('express');
const router = express.Router();
const {
    getRoutes,
    getRouteById,
    createRoute,
    updateRoute,
    deleteRoute,
    submitApplication,
    getApplications,
    getMyApplication,
    updateApplicationStatus,
} = require('../controllers/transportController');
const { protect, admin } = require('../middleware/authMiddleware');

router.get('/', protect, getRoutes);
router.get('/applications', protect, admin, getApplications);
router.post('/application', protect, submitApplication);
router.get('/application/my', protect, getMyApplication);
router.put('/application/:id', protect, admin, updateApplicationStatus);
router.get('/:id', protect, getRouteById);
router.post('/', protect, admin, createRoute);
router.put('/:id', protect, admin, updateRoute);
router.delete('/:id', protect, admin, deleteRoute);

module.exports = router;
