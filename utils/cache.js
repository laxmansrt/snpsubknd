const NodeCache = require('node-cache');

// Initialize cache with 5 minutes standard TTL and 10 minutes check period
const cache = new NodeCache({ stdTTL: 300, checkperiod: 600 });

/**
 * @desc    Cache utility for frequently accessed data
 */
const cacheUtil = {
    /**
     * Get data from cache or fetch and store it
     * @param {string} key - Cache key
     * @param {function} fetchFn - Function to fetch data if not in cache
     * @param {number} ttl - Optional TTL in seconds
     */
    getOrSet: async (key, fetchFn, ttl = 300) => {
        const value = cache.get(key);
        if (value) {
            return value;
        }

        const result = await fetchFn();
        cache.set(key, result, ttl);
        return result;
    },

    /**
     * Delete data from cache
     * @param {string} key - Cache key
     */
    del: (key) => {
        cache.del(key);
    },

    /**
     * Clear all cache
     */
    flush: () => {
        cache.flushAll();
    }
};

module.exports = cacheUtil;
