const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');
const { apiRateLimiter } = require('./middleware/rateLimiter');

// Handle uncaught exceptions to prevent process crashes
process.on('uncaughtException', (err) => {
    console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
    console.error(err.name, err.message);
    process.exit(1);
});

// Load env vars
dotenv.config();

// Connect to database
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Reduced limit for security
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(apiRateLimiter); // Apply general rate limiting to all routes

// Ensure Database Connection Middleware
app.use(async (req, res, next) => {
    try {
        await connectDB();
        next();
    } catch (error) {
        res.status(503).json({
            message: 'Database connection is temporarily unavailable.',
        });
    }
});

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/lostfound', require('./routes/lostFoundRoutes'));
app.use('/api/attendance', require('./routes/attendanceRoutes'));
app.use('/api/announcements', require('./routes/announcementRoutes'));
app.use('/api/transport', require('./routes/transportRoutes'));
app.use('/api/hostel', require('./routes/hostelRoutes'));
app.use('/api/materials', require('./routes/studyMaterialRoutes'));
app.use('/api/marks', require('./routes/marksRoutes'));
app.use('/api/ai', require('./routes/aiRoutes'));
app.use('/api/academics', require('./routes/academicRoutes'));

const mongoose = require('mongoose');

// Health check
app.get('/health', (req, res) => {
    const dbStatus = mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected';
    res.json({
        status: 'OK',
        database: dbStatus,
        timestamp: new Date().toISOString()
    });
});

app.get('/', (req, res) => {
    res.json({ message: 'Sapthagiri NPS University API is running' });
});

// 404 Handler
app.use((req, res, next) => {
    res.status(404).json({ message: `Route ${req.originalUrl} not found` });
});

// Global Error handling middleware
app.use((err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    console.error(`[Error] ${err.message}`);

    res.status(statusCode).json({
        message: err.message || 'Internal Server Error',
        stack: process.env.NODE_ENV === 'production' ? null : err.stack,
    });
});

// Export for Vercel serverless
module.exports = app;

// For local development
if (require.main === module) {
    const PORT = process.env.PORT || 5000;
    const server = app.listen(PORT, () => {
        console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (err) => {
        console.error('UNHANDLED REJECTION! 💥 Shutting down...');
        console.error(err.name, err.message);
        server.close(() => {
            process.exit(1);
        });
    });
}
