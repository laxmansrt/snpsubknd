const Hostel = require('../models/Hostel');

// @desc    Get all hostel rooms
// @route   GET /api/hostel
// @access  Private
const getRooms = async (req, res) => {
    try {
        const { status, block } = req.query;
        const query = {};
        if (status) query.status = status;
        if (block) query.blockName = block;

        const rooms = await Hostel.find(query).sort({ blockName: 1, floor: 1, roomNumber: 1 });
        res.json(rooms);
    } catch (error) {
        console.error('Get rooms error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get single room
// @route   GET /api/hostel/:id
// @access  Private
const getRoomById = async (req, res) => {
    try {
        const room = await Hostel.findById(req.params.id);
        if (!room) {
            return res.status(404).json({ message: 'Room not found' });
        }
        res.json(room);
    } catch (error) {
        console.error('Get room error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create hostel room
// @route   POST /api/hostel
// @access  Private (Admin)
const createRoom = async (req, res) => {
    try {
        const room = await Hostel.create(req.body);
        res.status(201).json(room);
    } catch (error) {
        console.error('Create room error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update hostel room
// @route   PUT /api/hostel/:id
// @access  Private (Admin)
const updateRoom = async (req, res) => {
    try {
        const room = await Hostel.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        if (!room) {
            return res.status(404).json({ message: 'Room not found' });
        }
        res.json(room);
    } catch (error) {
        console.error('Update room error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete hostel room
// @route   DELETE /api/hostel/:id
// @access  Private (Admin)
const deleteRoom = async (req, res) => {
    try {
        const room = await Hostel.findByIdAndDelete(req.params.id);
        if (!room) {
            return res.status(404).json({ message: 'Room not found' });
        }
        res.json({ message: 'Room deleted successfully' });
    } catch (error) {
        console.error('Delete room error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get mess menu
// @route   GET /api/hostel/mess/menu
// @access  Private
const getMessMenu = async (req, res) => {
    try {
        // Get mess menu from any room (they should be same)
        const room = await Hostel.findOne({ messMenu: { $exists: true, $ne: [] } });
        if (room && room.messMenu) {
            res.json(room.messMenu);
        } else {
            res.json([]);
        }
    } catch (error) {
        console.error('Get mess menu error:', error);
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getRooms,
    getRoomById,
    createRoom,
    updateRoom,
    deleteRoom,
    getMessMenu,
};

const HostelApplication = require('../models/HostelApplication');

// @desc    Submit hostel application
// @route   POST /api/hostel/application
// @access  Private (Student)
const submitApplication = async (req, res) => {
    try {
        const { studentUsn } = req.body;

        // Check if already applied
        const existingApplication = await HostelApplication.findOne({
            studentUsn,
            status: 'pending',
        });

        if (existingApplication) {
            return res.status(400).json({ message: 'You already have a pending application' });
        }

        const application = await HostelApplication.create({
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
// @route   GET /api/hostel/applications
// @access  Private (Admin)
const getApplications = async (req, res) => {
    try {
        const { status } = req.query;
        const query = {};
        if (status) query.status = status;

        const applications = await HostelApplication.find(query)
            .sort({ appliedDate: -1 })
            .populate('studentId', 'name email');

        res.json(applications);
    } catch (error) {
        console.error('Get applications error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get student's application
// @route   GET /api/hostel/application/my
// @access  Private (Student)
const getMyApplication = async (req, res) => {
    try {
        const application = await HostelApplication.findOne({
            studentId: req.user._id,
        }).sort({ appliedDate: -1 });

        res.json(application || null);
    } catch (error) {
        console.error('Get my application error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update application status
// @route   PUT /api/hostel/application/:id
// @access  Private (Admin)
const updateApplicationStatus = async (req, res) => {
    try {
        const { status, remarks } = req.body;

        const application = await HostelApplication.findByIdAndUpdate(
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
    getRooms,
    getRoomById,
    createRoom,
    updateRoom,
    deleteRoom,
    getMessMenu,
    submitApplication,
    getApplications,
    getMyApplication,
    updateApplicationStatus,
};
