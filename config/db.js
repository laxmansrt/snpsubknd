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
        console.log('Attempting to connect to MongoDB...');

        const conn = await mongoose.connect(cleanUri, {
            serverSelectionTimeoutMS: 10000, // 10 seconds timeout for server selection
            socketTimeoutMS: 45000,
            family: 4 // Force IPv4
        });

        cachedConnection = conn;
        console.log(`MongoDB Connected Successfully: ${conn.connection.name}`);
        return conn;
    } catch (error) {
        console.error(`MongoDB Connection Error Detail: ${error.message}`);
        console.error(`Error Code: ${error.code}`);
        // Do not process.exit(1) in serverless environment
    }
};

module.exports = connectDB;
