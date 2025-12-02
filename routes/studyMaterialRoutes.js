const express = require('express');
const router = express.Router();
const { uploadMaterial, getMaterials, deleteMaterial } = require('../controllers/studyMaterialController');
const { protect } = require('../middleware/authMiddleware');

router.route('/')
    .get(protect, getMaterials)
    .post(protect, uploadMaterial);

router.route('/:id')
    .delete(protect, deleteMaterial);

module.exports = router;
