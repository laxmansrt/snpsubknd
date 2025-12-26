const Transport = require('../models/Transport');
const TransportApplication = require('../models/TransportApplication');

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

// @desc    Submit transport application
// @route   POST /api/transport/application
// @access  Private (Student)
const submitApplication = async (req, res) => {
    try {
        const { studentUsn } = req.body;

        // Check if already applied
        const existingApplication = await TransportApplication.findOne({
            studentUsn,
            status: 'pending',
        });

        if (existingApplication) {
            return res.status(400).json({ message: 'You already have a pending application' });
        }

        const application = await TransportApplication.create({
            ...req.body,
            studentId: req.user._id,
        });

        res.status(201).json(application);
    } catch (error) {
        console.error('Submit application error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all applications
// @route   GET /api/transport/applications
// @access  Private (Admin)
const getApplications = async (req, res) => {
    try {
        const { status } = req.query;
        const query = {};
        if (status) query.status = status;

        const applications = await TransportApplication.find(query)
            .sort({ appliedDate: -1 })
            .populate('studentId', 'name email')
            .populate('routeId');

        res.json(applications);
    } catch (error) {
        console.error('Get applications error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get student's application
// @route   GET /api/transport/application/my
// @access  Private (Student)
const getMyApplication = async (req, res) => {
    try {
        const application = await TransportApplication.findOne({
            studentId: req.user._id,
        }).sort({ appliedDate: -1 });

        res.json(application || null);
    } catch (error) {
        console.error('Get my application error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update application status
// @route   PUT /api/transport/application/:id
// @access  Private (Admin)
const updateApplicationStatus = async (req, res) => {
    try {
        const { status, remarks } = req.body;

        const application = await TransportApplication.findByIdAndUpdate(
            req.params.id,
            {
                status,
                remarks,
                processedDate: Date.now(),
                processedBy: req.user._id,
            },
            { new: true }
        );

        if (!application) {
            return res.status(404).json({ message: 'Application not found' });
        }

        res.json(application);
    } catch (error) {
        console.error('Update application error:', error);
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getRoutes,
    getRouteById,
    createRoute,
    updateRoute,
    deleteRoute,
    submitApplication,
    getApplications,
    getMyApplication,
    updateApplicationStatus,
};
