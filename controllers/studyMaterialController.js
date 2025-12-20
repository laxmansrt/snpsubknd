const StudyMaterial = require('../models/StudyMaterial');

// @desc    Upload study material
// @route   POST /api/materials
// @access  Private (Faculty/Admin)
const uploadMaterial = async (req, res) => {
    try {
        const { title, subject, class: className, type, fileUrl, size } = req.body;

        if (!title || !subject || !className || !fileUrl) {
            return res.status(400).json({ message: 'Please provide all required fields' });
        }

        // CRITICAL: Prevent Base64 bloat - Reject files stored as data URIs
        if (fileUrl.startsWith('data:') || fileUrl.length > 2048) {
            return res.status(400).json({
                message: 'Direct file uploads not allowed. Please use external storage (Google Drive, Dropbox) and provide the link.',
                maxUrlLength: 2048
            });
        }

        const material = await StudyMaterial.create({
            title,
            subject,
            class: className,
            type,
            fileUrl,
            size,
            uploadedBy: req.user._id,
        });

        const populatedMaterial = await StudyMaterial.findById(material._id)
            .populate('uploadedBy', 'name role');

        res.status(201).json(populatedMaterial);
    } catch (error) {
        console.error('Upload material error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all study materials
// @route   GET /api/materials
// @access  Private
const getMaterials = async (req, res) => {
    try {
        const { class: className, subject, search, page = 1, limit = 20 } = req.query;
        const query = {};

        if (className && className !== 'All Classes') query.class = className;
        if (subject && subject !== 'All Subjects') query.subject = subject;
        if (search) {
            query.title = { $regex: search, $options: 'i' };
        }

        // Enforce pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const maxLimit = Math.min(parseInt(limit), 50);

        const materials = await StudyMaterial.find(query)
            .populate('uploadedBy', 'name role')
            .sort({ createdAt: -1 })
            .limit(maxLimit)
            .skip(skip)
            .lean();

        const total = await StudyMaterial.countDocuments(query);

        res.json({
            materials,
            pagination: {
                total,
                page: parseInt(page),
                limit: maxLimit,
                pages: Math.ceil(total / maxLimit)
            }
        });
    } catch (error) {
        console.error('Get materials error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete study material
// @route   DELETE /api/materials/:id
// @access  Private (Faculty/Admin)
const deleteMaterial = async (req, res) => {
    try {
        const material = await StudyMaterial.findById(req.params.id);

        if (!material) {
            return res.status(404).json({ message: 'Material not found' });
        }

        // Check ownership
        if (material.uploadedBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized to delete this material' });
        }

        await material.deleteOne();
        res.json({ message: 'Material deleted' });
    } catch (error) {
        console.error('Delete material error:', error);
        res.status(500).json({ message: error.message });
    }
};

module.exports = { uploadMaterial, getMaterials, deleteMaterial };
