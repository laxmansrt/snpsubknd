const express = require('express');
const router = express.Router();
const {
    createDrive,
    getDrives,
    getDriveById,
    updateDrive,
    deleteDrive,
    applyForDrive,
    updateApplicationStatus
} = require('../controllers/placementController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.route('/')
    .get(protect, getDrives)
    .post(protect, authorize('admin', 'hrd'), createDrive);

router.route('/:id')
    .get(protect, getDriveById)
    .put(protect, authorize('admin', 'hrd'), updateDrive)
    .delete(protect, authorize('admin', 'hrd'), deleteDrive);

router.route('/:id/apply')
    .post(protect, authorize('student'), applyForDrive);

router.route('/:id/applicant/:studentId')
    .put(protect, authorize('admin', 'hrd'), updateApplicationStatus);

module.exports = router;
