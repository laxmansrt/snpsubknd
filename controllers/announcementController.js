const Announcement = require('../models/Announcement');

// @desc    Create new announcement
// @route   POST /api/announcements
// @access  Private (Faculty/Admin)
const createAnnouncement = async (req, res) => {
    try {
        const {
            title,
            content,
            category,
            targetAudience,
            targetClasses,
            priority,
            expiresAt,
        } = req.body;

        if (!title || !content || !targetAudience) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        const announcement = await Announcement.create({
            title,
            content,
            category,
            targetAudience,
            targetClasses: targetClasses || [],
            priority,
            expiresAt,
            publishedBy: req.user._id,
        });

        const populatedAnnouncement = await Announcement.findById(announcement._id)
            .populate('publishedBy', 'name email role');

        res.status(201).json(populatedAnnouncement);
    } catch (error) {
        console.error('Create announcement error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all announcements
// @route   GET /api/announcements
// @access  Private
const getAnnouncements = async (req, res) => {
    try {
        const { category, priority, audience } = req.query;
        const userRole = req.user.role;

        const query = { isActive: true };

        // Filter by category
        if (category) query.category = category;

        // Filter by priority
        if (priority) query.priority = priority;

        // Filter by target audience
        if (audience) {
            query.targetAudience = { $in: [audience, 'all'] };
        } else {
            // Show announcements for user's role or 'all'
            query.targetAudience = { $in: [userRole, 'all'] };
        }

        // Filter by target class for students
        if (userRole === 'student' && req.user.studentData?.class) {
            query.$or = [
                { targetClasses: { $size: 0 } }, // Announcements for all classes
                { targetClasses: req.user.studentData.class }, // Announcements for specific class
            ];
        }

        // Don't show expired announcements
        query.$or = [
            { expiresAt: { $exists: false } },
            { expiresAt: null },
            { expiresAt: { $gte: new Date() } },
        ];

        const announcements = await Announcement.find(query)
            .populate('publishedBy', 'name email role')
            .sort({ priority: -1, publishedAt: -1 })
            .limit(50);

        res.json(announcements);
    } catch (error) {
        console.error('Get announcements error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get single announcement
// @route   GET /api/announcements/:id
// @access  Private
const getAnnouncementById = async (req, res) => {
    try {
        const announcement = await Announcement.findById(req.params.id)
            .populate('publishedBy', 'name email role');

        if (!announcement) {
            return res.status(404).json({ message: 'Announcement not found' });
        }

        res.json(announcement);
    } catch (error) {
        console.error('Get announcement error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update announcement
// @route   PUT /api/announcements/:id
// @access  Private (Faculty/Admin)
const updateAnnouncement = async (req, res) => {
    try {
        const announcement = await Announcement.findById(req.params.id);

        if (!announcement) {
            return res.status(404).json({ message: 'Announcement not found' });
        }

        // Check if user is the creator or admin
        if (announcement.publishedBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized to update this announcement' });
        }

        const updatedAnnouncement = await Announcement.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        ).populate('publishedBy', 'name email role');

        res.json(updatedAnnouncement);
    } catch (error) {
        console.error('Update announcement error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete announcement
// @route   DELETE /api/announcements/:id
// @access  Private (Faculty/Admin)
const deleteAnnouncement = async (req, res) => {
    try {
        const announcement = await Announcement.findById(req.params.id);

        if (!announcement) {
            return res.status(404).json({ message: 'Announcement not found' });
        }

        // Check if user is the creator or admin
        if (announcement.publishedBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized to delete this announcement' });
        }

        // Soft delete - just mark as inactive
        announcement.isActive = false;
        await announcement.save();

        res.json({ message: 'Announcement deleted successfully' });
    } catch (error) {
        console.error('Delete announcement error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Mark announcement as read
// @route   POST /api/announcements/:id/read
// @access  Private
const markAsRead = async (req, res) => {
    try {
        const announcement = await Announcement.findById(req.params.id);

        if (!announcement) {
            return res.status(404).json({ message: 'Announcement not found' });
        }

        // Check if already read
        const alreadyRead = announcement.readBy.some(
            read => read.userId.toString() === req.user._id.toString()
        );

        if (!alreadyRead) {
            announcement.readBy.push({
                userId: req.user._id,
                readAt: new Date(),
            });
            await announcement.save();
        }

        res.json({ message: 'Marked as read' });
    } catch (error) {
        console.error('Mark as read error:', error);
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    createAnnouncement,
    getAnnouncements,
    getAnnouncementById,
    updateAnnouncement,
    deleteAnnouncement,
    markAsRead,
};
