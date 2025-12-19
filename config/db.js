const mongoose = require('mongoose');

let cachedConnection = null;

const connectDB = async () => {
    if (cachedConnection && mongoose.connection.readyState === 1) {
        return cachedConnection;
    }

    const uri = process.env.MONGODB_URI || process.env.MONGO_URI;

    try {
        if (!uri) {
            console.error('CRITICAL: Neither MONGODB_URI nor MONGO_URI is defined');
            return;
        }

        // Clean URI (remove whitespace)
        const cleanUri = uri.trim();

        // Log masked URI for debugging (only first 15 chars)
        console.log(`Attempting to connect to MongoDB with URI starting with: ${cleanUri.substring(0, 15)}...`);

        const conn = await mongoose.connect(cleanUri, {
            serverSelectionTimeoutMS: 5000, // Reduced to 5 seconds to catch error before Vercel timeout
            socketTimeoutMS: 45000,
            family: 4, // Force IPv4
            connectTimeoutMS: 10000,
        });

        cachedConnection = conn;
        console.log(`MongoDB Connected Successfully: ${conn.connection.name}`);
        return conn;
    } catch (error) {
        console.error(`MongoDB Connection Error Detail: ${error.message}`);
        console.error(`Error Code: ${error.code}`);
        console.error(`Error Stack: ${error.stack}`);
        // Do not process.exit(1) in serverless environment
    }
};

module.exports = connectDB;
