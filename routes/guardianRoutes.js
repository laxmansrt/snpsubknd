const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');
const guardian = require('../utils/systemGuardian');

/**
 * @desc    Get system health report
 * @route   GET /api/guardian/health
 * @access  Private/Admin
 */
router.get('/health', protect, admin, async (req, res) => {
    try {
        const report = await guardian.runHealthCheck();
        res.json(report);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

/**
 * @desc    Get database statistics
 * @route   GET /api/guardian/stats
 * @access  Private/Admin
 */
router.get('/stats', protect, admin, async (req, res) => {
    try {
        const stats = await guardian.getDatabaseStats();
        res.json(stats);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

/**
 * @desc    Run manual cleanup
 * @route   POST /api/guardian/cleanup
 * @access  Private/Admin
 */
router.post('/cleanup', protect, admin, async (req, res) => {
    try {
        const results = await guardian.cleanupOldData();
        res.json({
            message: 'Cleanup completed successfully',
            results
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

/**
 * @desc    Detect bloated collections
 * @route   GET /api/guardian/bloat
 * @access  Private/Admin
 */
router.get('/bloat', protect, admin, async (req, res) => {
    try {
        const bloatReport = await guardian.detectBloat();
        res.json(bloatReport);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

/**
 * @desc    Get storage prediction
 * @route   GET /api/guardian/prediction
 * @access  Private/Admin
 */
router.get('/prediction', protect, admin, async (req, res) => {
    try {
        const prediction = await guardian.predictExhaustion();
        res.json(prediction);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

/**
 * @desc    Manually activate survival mode
 * @route   POST /api/guardian/survival
 * @access  Private/Admin
 */
router.post('/survival', protect, admin, async (req, res) => {
    try {
        const result = await guardian.activateSurvivalMode();
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
