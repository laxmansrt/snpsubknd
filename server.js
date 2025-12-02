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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/lostfound', require('./routes/lostFoundRoutes'));
app.use('/api/attendance', require('./routes/attendanceRoutes'));
app.use('/api/announcements', require('./routes/announcementRoutes'));
app.use('/api/transport', require('./routes/transportRoutes'));
app.use('/api/hostel', require('./routes/hostelRoutes'));
app.use('/api/materials', require('./routes/studyMaterialRoutes'));
app.use('/api/marks', require('./routes/marksRoutes'));

// Health check
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
