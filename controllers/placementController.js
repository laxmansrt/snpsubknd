const PlacementDrive = require('../models/PlacementDrive');
const User = require('../models/User');

// @desc    Create a new placement drive
// @route   POST /api/placements
// @access  Private/HRD or Admin
const createDrive = async (req, res) => {
    try {
        const {
            companyName,
            role,
            package,
            description,
            eligibilityCriteria,
            deadline,
            dateOfDrive,
            status
        } = req.body;

        const drive = new PlacementDrive({
            companyName,
            role,
            package,
            description,
            eligibilityCriteria,
            deadline,
            dateOfDrive,
            status,
            createdBy: req.user._id
        });

        const createdDrive = await drive.save();
        res.status(201).json(createdDrive);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all placement drives
// @route   GET /api/placements
// @access  Private
const getDrives = async (req, res) => {
    try {
        const drives = await PlacementDrive.find({}).sort({ createdAt: -1 });
        res.json(drives);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get drive by ID
// @route   GET /api/placements/:id
// @access  Private
const getDriveById = async (req, res) => {
    try {
        const drive = await PlacementDrive.findById(req.params.id)
            .populate('applicants.student', 'name email studentData');

        if (drive) {
            res.json(drive);
        } else {
            res.status(404).json({ message: 'Drive not found' });
        }
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

        if (drive) {
            drive.companyName = req.body.companyName || drive.companyName;
            drive.role = req.body.role || drive.role;
            drive.package = req.body.package || drive.package;
            drive.description = req.body.description || drive.description;
            drive.eligibilityCriteria = req.body.eligibilityCriteria || drive.eligibilityCriteria;
            drive.deadline = req.body.deadline || drive.deadline;
            drive.dateOfDrive = req.body.dateOfDrive || drive.dateOfDrive;
            drive.status = req.body.status || drive.status;

            const updatedDrive = await drive.save();
            res.json(updatedDrive);
        } else {
            res.status(404).json({ message: 'Drive not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete a drive
// @route   DELETE /api/placements/:id
// @access  Private/HRD or Admin
const deleteDrive = async (req, res) => {
    try {
        const drive = await PlacementDrive.findById(req.params.id);

        if (drive) {
            await PlacementDrive.deleteOne({ _id: drive._id });
            res.json({ message: 'Drive removed' });
        } else {
            res.status(404).json({ message: 'Drive not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Apply for a placement drive
// @route   POST /api/placements/:id/apply
// @access  Private/Student
const applyForDrive = async (req, res) => {
    try {
        const drive = await PlacementDrive.findById(req.params.id);

        if (!drive) {
            return res.status(404).json({ message: 'Drive not found' });
        }

        // Check if student already applied
        const alreadyApplied = drive.applicants.find(
            (applicant) => applicant.student.toString() === req.user._id.toString()
        );

        if (alreadyApplied) {
            return res.status(400).json({ message: 'You have already applied for this drive' });
        }

        // Check standard eligibility vs user data (optional advanced logic, for now just allow apply)

        drive.applicants.push({
            student: req.user._id,
            resumeUrl: req.body.resumeUrl // Make sure client provides resume link
        });

        await drive.save();
        res.status(201).json({ message: 'Applied successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update applicant status
// @route   PUT /api/placements/:id/applicant/:studentId
// @access  Private/HRD or Admin
const updateApplicationStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const drive = await PlacementDrive.findById(req.params.id);

        if (!drive) {
            return res.status(404).json({ message: 'Drive not found' });
        }

        const applicantIndex = drive.applicants.findIndex(
            (a) => a.student.toString() === req.params.studentId.toString()
        );

        if (applicantIndex === -1) {
            return res.status(404).json({ message: 'Applicant not found' });
        }

        drive.applicants[applicantIndex].status = status;
        await drive.save();

        res.json({ message: 'Application status updated' });
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
    updateApplicationStatus
};
