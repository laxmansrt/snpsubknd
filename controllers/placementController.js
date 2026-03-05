const PlacementDrive = require('../models/PlacementDrive');
const PlacementApplication = require('../models/PlacementApplication');
const User = require('../models/User');

// @desc    Create a new placement drive
// @route   POST /api/placements
// @access  Private/HRD or Admin
const createDrive = async (req, res) => {
    try {
        const {
            companyName,
            role,
            package: pkg,
            description,
            eligibilityCriteria,
            deadline,
            dateOfDrive,
            status
        } = req.body;

        const drive = await PlacementDrive.create({
            companyName,
            role,
            package: pkg,
            description,
            eligibilityCriteria,
            deadline,
            dateOfDrive,
            status,
            createdBy: req.user._id,
        });

        res.status(201).json(drive);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all placement drives
// @route   GET /api/placements
// @access  Private
const getDrives = async (req, res) => {
    try {
        const { status } = req.query;
        const query = {};
        if (status) query.status = status;

        const drives = await PlacementDrive.find(query)
            .sort({ deadline: 1, createdAt: -1 })
            .lean();

        if (drives.length === 0) return res.json([]);

        // Get applicant counts for all drives in one aggregation
        const driveIds = drives.map(d => d._id);
        const countAgg = await PlacementApplication.aggregate([
            { $match: { driveId: { $in: driveIds } } },
            { $group: { _id: '$driveId', count: { $sum: 1 } } },
        ]);
        const countMap = {};
        countAgg.forEach(c => { countMap[c._id.toString()] = c.count; });

        // If student, also check which drives they have applied to
        let appliedSet = new Set();
        if (req.user.role === 'student') {
            const myApplications = await PlacementApplication.find({
                driveId: { $in: driveIds },
                studentId: req.user._id,
            }).select('driveId status').lean();
            myApplications.forEach(a => appliedSet.add(a.driveId.toString()));
        }

        const result = drives.map(d => ({
            ...d,
            applicantCount: countMap[d._id.toString()] || 0,
            hasApplied: appliedSet.has(d._id.toString()),
        }));

        res.json(result);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get drive by ID with full applicant list
// @route   GET /api/placements/:id
// @access  Private
const getDriveById = async (req, res) => {
    try {
        const drive = await PlacementDrive.findById(req.params.id).lean();

        if (!drive) {
            return res.status(404).json({ message: 'Drive not found' });
        }

        // Fetch applicants from the separate PlacementApplication collection
        const applicants = await PlacementApplication.find({ driveId: req.params.id })
            .populate('studentId', 'name email studentData')
            .populate('statusUpdatedBy', 'name')
            .sort({ appliedAt: 1 })
            .lean();

        res.json({ ...drive, applicants });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update a drive
// @route   PUT /api/placements/:id
// @access  Private/HRD or Admin
const updateDrive = async (req, res) => {
    try {
        const drive = await PlacementDrive.findById(req.params.id);

        if (!drive) {
            return res.status(404).json({ message: 'Drive not found' });
        }

        const fields = ['companyName', 'role', 'package', 'description', 'eligibilityCriteria', 'deadline', 'dateOfDrive', 'status'];
        fields.forEach(f => {
            if (req.body[f] !== undefined) drive[f] = req.body[f];
        });

        const updatedDrive = await drive.save();
        res.json(updatedDrive);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete a drive (and cascade-delete its applications)
// @route   DELETE /api/placements/:id
// @access  Private/HRD or Admin
const deleteDrive = async (req, res) => {
    try {
        const drive = await PlacementDrive.findById(req.params.id);

        if (!drive) {
            return res.status(404).json({ message: 'Drive not found' });
        }

        // Cascade delete all applications for this drive
        await PlacementApplication.deleteMany({ driveId: drive._id });
        await PlacementDrive.deleteOne({ _id: drive._id });

        res.json({ message: 'Drive and all applications removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Apply for a placement drive
// @route   POST /api/placements/:id/apply
// @access  Private/Student
const applyForDrive = async (req, res) => {
    try {
        const drive = await PlacementDrive.findById(req.params.id).lean();

        if (!drive) {
            return res.status(404).json({ message: 'Drive not found' });
        }

        if (drive.status === 'completed' || drive.status === 'cancelled') {
            return res.status(400).json({ message: 'This drive is no longer accepting applications' });
        }

        if (drive.deadline && new Date() > new Date(drive.deadline)) {
            return res.status(400).json({ message: 'Application deadline has passed' });
        }

        // (Optional) Eligibility check
        const student = req.user;
        if (drive.eligibilityCriteria?.cgpa && student.studentData?.cgpa < drive.eligibilityCriteria.cgpa) {
            return res.status(400).json({ message: `Minimum CGPA of ${drive.eligibilityCriteria.cgpa} required` });
        }
        if (
            drive.eligibilityCriteria?.branches?.length > 0 &&
            !drive.eligibilityCriteria.branches.includes(student.studentData?.department)
        ) {
            return res.status(400).json({ message: 'Your branch is not eligible for this drive' });
        }

        // create() will throw a duplicate key error if already applied (unique index)
        const application = await PlacementApplication.create({
            driveId: req.params.id,
            studentId: req.user._id,
            resumeUrl: req.body.resumeUrl || '',
        });

        res.status(201).json({ message: 'Applied successfully', application });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: 'You have already applied for this drive' });
        }
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update applicant status (shortlist / reject / select)
// @route   PUT /api/placements/:id/applicant/:studentId
// @access  Private/HRD or Admin
const updateApplicationStatus = async (req, res) => {
    try {
        const { status, notes } = req.body;

        const validStatuses = ['applied', 'shortlisted', 'interviewing', 'selected', 'rejected'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ message: 'Invalid status value' });
        }

        const application = await PlacementApplication.findOneAndUpdate(
            { driveId: req.params.id, studentId: req.params.studentId },
            {
                $set: {
                    status,
                    notes: notes || '',
                    statusUpdatedAt: new Date(),
                    statusUpdatedBy: req.user._id,
                },
            },
            { new: true, runValidators: true }
        );

        if (!application) {
            return res.status(404).json({ message: 'Application not found' });
        }

        res.json({ message: 'Application status updated', application });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    createDrive,
    getDrives,
    getDriveById,
    updateDrive,
    deleteDrive,
    applyForDrive,
    updateApplicationStatus,
};
