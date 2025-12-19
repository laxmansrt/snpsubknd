const mongoose = require('mongoose');

let cachedConnection = null;

const connectDB = async () => {
    if (cachedConnection && mongoose.connection.readyState === 1) {
        return cachedConnection;
    }

    const uri = process.env.MONGODB_URI || process.env.MONGO_URI;

    try {
        if (!uri) {
            console.error('Neither MONGODB_URI nor MONGO_URI is defined in environment variables');
            return;
        }

        const conn = await mongoose.connect(uri);
        cachedConnection = conn;
        console.log(`MongoDB Connected: ${conn.connection.name || conn.connection.host}`);
        return conn;
    } catch (error) {
        console.error(`MongoDB Connection Error: ${error.message}`);
        // Do not process.exit(1) in serverless environment
    }
};

module.exports = connectDB;
