const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');

// Load env vars
dotenv.config();

// Connect to database
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Ensure Database Connection Middleware
app.use(async (req, res, next) => {
    try {
        await connectDB();
        next();
    } catch (error) {
        console.error('Database connection middleware error:', error.message);
        res.status(503).json({
            message: 'Database connection is temporarily unavailable. Please try again in a few seconds.',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
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

app.get('/api', (req, res) => {
    res.json({ message: 'Sapthagiri NPS University API is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    res.status(statusCode);
    res.json({
        message: err.message,
        stack: process.env.NODE_ENV === 'production' ? null : err.stack,
    });
});

// Export for Vercel serverless
module.exports = app;

// For local development
if (require.main === module) {
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
        console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
    });
}
