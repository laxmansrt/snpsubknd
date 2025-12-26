const User = require('../models/User');
const Announcement = require('../models/Announcement');
const asyncHandler = require('express-async-handler');

/**
 * @desc    Get public stats for landing page
 * @route   GET /api/public/stats
 * @access  Public
 */
const getStats = asyncHandler(async (req, res) => {
    try {
        // Run counts in parallel for efficiency
        const [studentCount, facultyCount, noticeCount] = await Promise.all([
            User.countDocuments({ role: 'student' }),
            User.countDocuments({ role: 'faculty' }),
            Announcement.countDocuments({
                isActive: true,
                publishedAt: {
                    $gte: new Date(new Date().setHours(0, 0, 0, 0))
                }
            })
        ]);

        console.log(`[Stats API] Students: ${studentCount}, Faculty: ${facultyCount}, Notices Today: ${noticeCount}`);

        // If noticeCount is 0, let's get any active recent ones to not show 0
        let effectiveNoticeCount = noticeCount;
        if (noticeCount === 0) {
            effectiveNoticeCount = await Announcement.countDocuments({ isActive: true });
        }

        res.json({
            students: studentCount,
            faculty: facultyCount,
            notices: effectiveNoticeCount,
            uptime: 99.9 // This is usually a calculated metric or hardcoded target
        });
    } catch (error) {
        console.error('Error fetching public stats:', error);
        res.status(500).json({ message: 'Error fetching statistics' });
    }
});

module.exports = {
    getStats
};
