const rateLimit = require('express-rate-limit');

/**
 * @desc    General API rate limiter - Standard protection
 */
const apiRateLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 100, // Limit each IP to 100 requests per minute
    message: {
        message: 'Too many requests, please slow down',
    },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * @desc    Rate limiter for AI chat routes - Prevents high LLM costs and server load
 */
const aiRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20,
    message: {
        message: 'AI assistant is busy. Please try again in 15 minutes.',
    },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * @desc    Heavy Operation Limiter - For Bulk Uploads, Reports, and Auth
 *          Protects DB from write-flooding and expensive aggregations.
 */
const heavyOpLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 10, // Only 10 heavy operations per 5 minutes
    message: {
        message: 'System is processing heavy requests. Please wait a few minutes.',
    },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * @desc    Auth Limiter - Prevents Brute Force
 */
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 15,
    message: {
        message: 'Too many login attempts. Please try again after 15 minutes.',
    },
});

module.exports = {
    apiRateLimiter,
    aiRateLimiter,
    heavyOpLimiter,
    authLimiter
};
