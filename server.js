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
app.use(express.json({ limit: '10mb' })); // Increased to 10mb for base64 file uploads
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(apiRateLimiter);

// Routes
app.use('/api/auth', require('./middleware/rateLimiter').authLimiter, require('./routes/authRoutes'));
app.use('/api/lostfound', require('./routes/lostFoundRoutes'));
app.use('/api/attendance', require('./routes/attendanceRoutes'));
app.use('/api/announcements', require('./routes/announcementRoutes'));
app.use('/api/transport', require('./routes/transportRoutes'));
app.use('/api/hostel', require('./routes/hostelRoutes'));
app.use('/api/materials', require('./routes/studyMaterialRoutes'));
app.use('/api/marks', require('./routes/marksRoutes'));
app.use('/api/exams', require('./routes/examRoutes'));
app.use('/api/ai', require('./routes/aiRoutes'));
app.use('/api/academics', require('./routes/academicRoutes'));
app.use('/api/guardian', require('./routes/guardianRoutes'));
app.use('/api/public', require('./routes/publicRoutes'));

const mongoose = require('mongoose');
const guardian = require('./utils/systemGuardian');

// Initialize System Guardian after DB connection
mongoose.connection.once('open', async () => {
    console.log('[System Guardian] Initializing...');
    try {
        const initialCheck = await guardian.runHealthCheck();
        console.log('[System Guardian] Active and monitoring');
        console.log(`[System Guardian] Database usage: ${initialCheck.prediction?.currentUsage || 'Unknown'}`);
    } catch (error) {
        console.error('[System Guardian] Initialization failed:', error.message);
    }
});

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
