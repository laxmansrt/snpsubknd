const rateLimit = require('express-rate-limit');

/**
 * @desc    Rate limiter for AI chat routes to prevent abuse and high load
 */
const aiRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // Limit each IP to 20 requests per windowMs
    message: {
        message: 'Too many requests from this IP, please try again after 15 minutes',
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

/**
 * @desc    General API rate limiter
 */
const apiRateLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 100, // Limit each IP to 100 requests per minute
    message: {
        message: 'Too many requests, please slow down',
    },
});

module.exports = { aiRateLimiter, apiRateLimiter };
