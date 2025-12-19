const mongoose = require('mongoose');

// Disable buffering so we get immediate errors if not connected
// This prevents the "buffering timed out" error by failing fast
mongoose.set('bufferCommands', false);

let cachedPromise = null;

const connectDB = async () => {
    // If already connected, return the connection
    if (mongoose.connection.readyState === 1) {
        return mongoose.connection;
    }

    // If a connection is already in progress, wait for it
    if (!cachedPromise) {
        const uri = process.env.MONGODB_URI || process.env.MONGO_URI;

        if (!uri) {
            const errorMsg = 'CRITICAL: Neither MONGODB_URI nor MONGO_URI is defined in environment variables';
            console.error(errorMsg);
            throw new Error(errorMsg);
        }

        const cleanUri = uri.trim();
        console.log(`Attempting new MongoDB connection...`);

        const options = {
            serverSelectionTimeoutMS: 10000, // 10 seconds
            socketTimeoutMS: 45000,
            family: 4, // Force IPv4
            connectTimeoutMS: 10000,
        };

        cachedPromise = mongoose.connect(cleanUri, options)
            .then((m) => {
                console.log(`MongoDB Connected Successfully: ${m.connection.name}`);
                return m;
            })
            .catch((err) => {
                console.error(`MongoDB Connection Error: ${err.message}`);
                cachedPromise = null; // Reset so we can try again on next request
                throw err;
            });
    }

    return cachedPromise;
};

module.exports = connectDB;
