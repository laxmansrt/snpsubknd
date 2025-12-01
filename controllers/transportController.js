const Transport = require('../models/Transport');

// @desc    Get all transport routes
// @route   GET /api/transport
// @access  Private
const getRoutes = async (req, res) => {
    try {
        const routes = await Transport.find().sort({ routeNumber: 1 });
        res.json(routes);
    } catch (error) {
        console.error('Get routes error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get single route
// @route   GET /api/transport/:id
// @access  Private
const getRouteById = async (req, res) => {
    try {
        const route = await Transport.findById(req.params.id);
        if (!route) {
            return res.status(404).json({ message: 'Route not found' });
        }
        res.json(route);
    } catch (error) {
        console.error('Get route error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create transport route
// @route   POST /api/transport
// @access  Private (Admin)
const createRoute = async (req, res) => {
    try {
        const route = await Transport.create(req.body);
        res.status(201).json(route);
    } catch (error) {
        console.error('Create route error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update transport route
// @route   PUT /api/transport/:id
// @access  Private (Admin)
const updateRoute = async (req, res) => {
    try {
        const route = await Transport.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        if (!route) {
            return res.status(404).json({ message: 'Route not found' });
        }
        res.json(route);
    } catch (error) {
        console.error('Update route error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete transport route
// @route   DELETE /api/transport/:id
// @access  Private (Admin)
const deleteRoute = async (req, res) => {
    try {
        const route = await Transport.findByIdAndDelete(req.params.id);
        if (!route) {
            return res.status(404).json({ message: 'Route not found' });
        }
        res.json({ message: 'Route deleted successfully' });
    } catch (error) {
        console.error('Delete route error:', error);
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getRoutes,
    getRouteById,
    createRoute,
    updateRoute,
    deleteRoute,
};
