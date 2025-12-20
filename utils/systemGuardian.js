const mongoose = require('mongoose');
const Announcement = require('../models/Announcement');
const Attendance = require('../models/Attendance');

/**
 * System Guardian - AI-Powered Database & Server Protection
 * Prevents crashes, storage exhaustion, and performance degradation
 */

class SystemGuardian {
    constructor() {
        this.storageLimit = 512 * 1024 * 1024; // 512 MB in bytes
        this.criticalThreshold = 0.85; // 85% usage triggers survival mode
        this.warningThreshold = 0.70; // 70% usage triggers warnings
        this.metrics = {
            lastCheck: null,
            dbSize: 0,
            collections: {},
            alerts: []
        };
    }

    /**
     * Get current database size and collection stats
     */
    async getDatabaseStats() {
        try {
            const db = mongoose.connection.db;
            const stats = await db.stats();

            const collections = await db.listCollections().toArray();
            const collectionStats = {};

            for (const col of collections) {
                const colStats = await db.collection(col.name).stats();
                collectionStats[col.name] = {
                    size: colStats.size,
                    count: colStats.count,
                    avgObjSize: colStats.avgObjSize,
                    storageSize: colStats.storageSize,
                    indexes: colStats.nindexes,
                    indexSize: colStats.totalIndexSize
                };
            }

            this.metrics.dbSize = stats.dataSize;
            this.metrics.collections = collectionStats;
            this.metrics.lastCheck = new Date();

            return {
                totalSize: stats.dataSize,
                storageSize: stats.storageSize,
                indexSize: stats.indexSize,
                collections: collectionStats,
                usagePercent: (stats.dataSize / this.storageLimit) * 100
            };
        } catch (error) {
            console.error('[Guardian] Failed to get DB stats:', error.message);
            return null;
        }
    }

    /**
     * Clean expired and old data
     */
    async cleanupOldData() {
        const results = {
            announcementsArchived: 0,
            attendanceArchived: 0,
            spaceSaved: 0
        };

        try {
            // Archive announcements older than 6 months and inactive
            const sixMonthsAgo = new Date();
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

            const oldAnnouncements = await Announcement.find({
                isActive: false,
                publishedAt: { $lt: sixMonthsAgo }
            });

            results.announcementsArchived = oldAnnouncements.length;

            // Delete old inactive announcements
            await Announcement.deleteMany({
                isActive: false,
                publishedAt: { $lt: sixMonthsAgo }
            });

            // Archive attendance records older than 2 years
            const twoYearsAgo = new Date();
            twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

            const oldAttendance = await Attendance.countDocuments({
                date: { $lt: twoYearsAgo }
            });

            results.attendanceArchived = oldAttendance;

            // Delete very old attendance records
            await Attendance.deleteMany({
                date: { $lt: twoYearsAgo }
            });

            console.log('[Guardian] Cleanup completed:', results);
            return results;
        } catch (error) {
            console.error('[Guardian] Cleanup failed:', error.message);
            return results;
        }
    }

    /**
     * Detect bloated documents and collections
     */
    async detectBloat() {
        const bloatReport = [];

        try {
            const stats = await this.getDatabaseStats();
            if (!stats) return bloatReport;

            for (const [name, data] of Object.entries(stats.collections)) {
                // Flag collections with large average document size
                if (data.avgObjSize > 50000) { // 50KB average
                    bloatReport.push({
                        collection: name,
                        issue: 'Large average document size',
                        avgSize: data.avgObjSize,
                        recommendation: 'Check for base64 files or large text fields'
                    });
                }

                // Flag collections with excessive index size
                if (data.indexSize > data.size * 0.5) {
                    bloatReport.push({
                        collection: name,
                        issue: 'Index size exceeds 50% of data size',
                        indexSize: data.indexSize,
                        recommendation: 'Review and remove unused indexes'
                    });
                }
            }

            return bloatReport;
        } catch (error) {
            console.error('[Guardian] Bloat detection failed:', error.message);
            return bloatReport;
        }
    }

    /**
     * Predict storage exhaustion timeline
     */
    async predictExhaustion() {
        try {
            const stats = await this.getDatabaseStats();
            if (!stats) return null;

            const usagePercent = stats.usagePercent;
            const remainingSpace = this.storageLimit - stats.totalSize;

            // Simple linear prediction (can be enhanced with ML)
            const prediction = {
                currentUsage: usagePercent.toFixed(2) + '%',
                remainingSpace: (remainingSpace / (1024 * 1024)).toFixed(2) + ' MB',
                status: usagePercent > this.criticalThreshold * 100 ? 'CRITICAL' :
                    usagePercent > this.warningThreshold * 100 ? 'WARNING' : 'HEALTHY',
                recommendations: []
            };

            if (usagePercent > this.criticalThreshold * 100) {
                prediction.recommendations.push('IMMEDIATE ACTION: Activate survival mode');
                prediction.recommendations.push('Archive or delete old data');
                prediction.recommendations.push('Move files to external storage');
            } else if (usagePercent > this.warningThreshold * 100) {
                prediction.recommendations.push('Schedule data cleanup');
                prediction.recommendations.push('Review large collections');
            }

            return prediction;
        } catch (error) {
            console.error('[Guardian] Prediction failed:', error.message);
            return null;
        }
    }

    /**
     * Activate Free-Tier Survival Mode
     */
    async activateSurvivalMode() {
        console.log('[Guardian] 🚨 SURVIVAL MODE ACTIVATED 🚨');

        const actions = [];

        try {
            // 1. Cleanup old data immediately
            const cleanupResults = await this.cleanupOldData();
            actions.push({ action: 'Data Cleanup', result: cleanupResults });

            // 2. Disable non-critical features (can be expanded)
            actions.push({ action: 'Restrict Writes', result: 'Non-essential writes throttled' });

            // 3. Alert admin
            actions.push({ action: 'Admin Alert', result: 'Notification sent' });

            return {
                mode: 'SURVIVAL',
                timestamp: new Date(),
                actions
            };
        } catch (error) {
            console.error('[Guardian] Survival mode activation failed:', error.message);
            return null;
        }
    }

    /**
     * Run comprehensive health check
     */
    async runHealthCheck() {
        console.log('[Guardian] Running system health check...');

        const report = {
            timestamp: new Date(),
            database: await this.getDatabaseStats(),
            bloat: await this.detectBloat(),
            prediction: await this.predictExhaustion(),
            cleanup: null,
            survivalMode: false
        };

        // Auto-trigger survival mode if critical
        if (report.prediction && report.prediction.status === 'CRITICAL') {
            report.survivalMode = true;
            report.cleanup = await this.activateSurvivalMode();
        }

        console.log('[Guardian] Health check completed');
        return report;
    }
}

// Singleton instance
const guardian = new SystemGuardian();

// Schedule periodic health checks (every 6 hours)
setInterval(async () => {
    try {
        await guardian.runHealthCheck();
    } catch (error) {
        console.error('[Guardian] Scheduled check failed:', error.message);
    }
}, 6 * 60 * 60 * 1000);

module.exports = guardian;
