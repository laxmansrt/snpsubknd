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
        const { class: className, subject, search } = req.query;
        const query = {};

        if (className && className !== 'All Classes') query.class = className;
        if (subject && subject !== 'All Subjects') query.subject = subject;
        if (search) {
            query.title = { $regex: search, $options: 'i' };
        }

        // If student, filter by their class (optional, but good for UX)
        // if (req.user.role === 'student' && req.user.studentData?.class) {
        //     query.class = req.user.studentData.class;
        // }

        const materials = await StudyMaterial.find(query)
            .populate('uploadedBy', 'name role')
            .sort({ createdAt: -1 });

        res.json(materials);
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
