const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const {
    loginSchema,
    registerSchema,
    bulkRegisterSchema,
    updateProfileSchema,
    updatePasswordSchema,
    updateUserSchema
} = require('../validations/authValidation');

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
    try {
        // Zod validation throws if input is invalid
        const validData = loginSchema.parse(req.body);
        const { email, password, role } = validData;

        // Find user by email OR phone and role
        const user = await User.findOne({
            $or: [{ email: email }, { phone: email }],
            role: role
        });

        if (user && (await user.matchPassword(password))) {
            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                studentData: user.studentData,
                facultyData: user.facultyData,
                parentData: user.parentData,
                hrdData: user.hrdData,
                token: generateToken(user._id),
            });
        } else {
            console.log('Login failed - invalid credentials or role mismatch');
            res.status(401).json({ message: 'Invalid email, password, or role' });
        }
    } catch (error) {
        if (error.name === 'ZodError') {
            return res.status(400).json({ message: error.errors[0].message });
        }
        console.error('Login error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Register new user (Admin only)
// @route   POST /api/auth/register
// @access  Private/Admin
const registerUser = async (req, res) => {
    try {
        const validData = registerSchema.parse(req.body);
        const { name, email, password, role, studentData, facultyData, parentData, hrdData, phone } = validData;

        // Check if user exists
        const userExists = await User.findOne({ email });

        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Create user
        const user = await User.create({
            name,
            email,
            password,
            role,
            phone,
            studentData,
            facultyData,
            parentData,
            hrdData,
        });

        if (user) {
            res.status(201).json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                token: generateToken(user._id),
            });
        } else {
            res.status(400).json({ message: 'Invalid user data' });
        }
    } catch (error) {
        if (error.name === 'ZodError') {
            return res.status(400).json({ message: error.errors[0].message });
        }
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password');
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Bulk register users
// @route   POST /api/auth/bulk-register
// @access  Private/Admin
const bulkRegisterUsers = async (req, res) => {
    try {
        const users = bulkRegisterSchema.parse(req.body); // Validate full array properly
        const results = {
            success: 0,
            failed: 0,
            errors: []
        };

        for (const userData of users) {
            try {
                // Check if user exists
                const userExists = await User.findOne({ email: userData.email });
                if (userExists) {
                    throw new Error(`User ${userData.email} already exists`);
                }

                // Prepare user object
                const newUser = {
                    name: userData.name,
                    email: userData.email,
                    role: userData.role,
                    password: userData.password || 'welcome123', // Default password if not provided
                };

                // Role specific data
                if (userData.role === 'student') {
                    newUser.studentData = {
                        usn: userData.usn,
                        class: userData.class,
                        semester: userData.semester,
                        department: userData.department,
                    };
                } else if (userData.role === 'faculty') {
                    newUser.facultyData = {
                        employeeId: userData.employeeId,
                        department: userData.department,
                        designation: userData.designation,
                    };
                } else if (userData.role === 'parent') {
                    let childName = userData.childName;

                    if (!childName && userData.childUsn) {
                        const student = await User.findOne({ 'studentData.usn': userData.childUsn, role: 'student' });
                        if (student) {
                            childName = student.name;
                        }
                    }

                    newUser.parentData = {
                        childUsn: userData.childUsn,
                        childName: childName || 'Unknown Student',
                    };
                }

                await User.create(newUser);
                results.success++;
            } catch (error) {
                results.failed++;
                results.errors.push({ email: userData.email, error: error.message });
            }
        }

        res.json({
            message: `Processed ${users.length} records`,
            results
        });

    } catch (error) {
        if (error.name === 'ZodError') {
            return res.status(400).json({ message: 'Invalid bulk data format provided', issues: error.errors });
        }
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all users (Admin only)
// @route   GET /api/auth/users
// @access  Private/Admin
const getUsers = async (req, res) => {
    try {
        const { role } = req.query;
        // sanitize the role search to avoid query injections directly to DB
        const query = role && typeof role === 'string' ? { role } : {};
        const users = await User.find(query).select('-password');
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = async (req, res) => {
    try {
        const validData = updateProfileSchema.parse(req.body);
        const user = await User.findById(req.user._id);

        if (user) {
            user.name = validData.name || user.name;
            user.email = validData.email || user.email;

            const updatedUser = await user.save();

            res.json({
                _id: updatedUser._id,
                name: updatedUser.name,
                email: updatedUser.email,
                role: updatedUser.role,
                studentData: updatedUser.studentData,
                facultyData: updatedUser.facultyData,
                parentData: updatedUser.parentData,
                token: generateToken(updatedUser._id),
            });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        if (error.name === 'ZodError') {
            return res.status(400).json({ message: error.errors[0].message });
        }
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update user password
// @route   PUT /api/auth/password
// @access  Private
const updatePassword = async (req, res) => {
    try {
        const validData = updatePasswordSchema.parse(req.body);
        const { currentPassword, newPassword } = validData;

        const user = await User.findById(req.user._id);

        if (user && (await user.matchPassword(currentPassword))) {
            user.password = newPassword;
            await user.save();
            res.json({ message: 'Password updated successfully' });
        } else {
            res.status(401).json({ message: 'Invalid current password' });
        }
    } catch (error) {
        if (error.name === 'ZodError') {
            return res.status(400).json({ message: error.errors[0].message });
        }
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete a user (Admin only)
// @route   DELETE /api/auth/users/:id
// @access  Private/Admin
const deleteUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        if (user._id.toString() === req.user._id.toString()) {
            return res.status(400).json({ message: 'Cannot delete your own account' });
        }
        await User.findByIdAndDelete(req.params.id);
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update a user (Admin only)
// @route   PUT /api/auth/users/:id
// @access  Private/Admin
const updateUser = async (req, res) => {
    try {
        // Only take perfectly verified schema elements
        const validData = updateUserSchema.parse(req.body);

        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const { name, email, role, phone, studentData, facultyData, hrdData } = validData;
        if (name) user.name = name;
        if (email) user.email = email;
        if (role) user.role = role;
        if (phone) user.phone = phone;

        if (studentData) user.studentData = { ...user.studentData?.toObject?.() || {}, ...studentData };
        if (facultyData) user.facultyData = { ...user.facultyData?.toObject?.() || {}, ...facultyData };
        if (hrdData) user.hrdData = { ...user.hrdData?.toObject?.() || {}, ...hrdData };

        const updatedUser = await user.save();
        res.json({
            _id: updatedUser._id,
            name: updatedUser.name,
            email: updatedUser.email,
            role: updatedUser.role,
            phone: updatedUser.phone,
            studentData: updatedUser.studentData,
            facultyData: updatedUser.facultyData,
        });
    } catch (error) {
        if (error.name === 'ZodError') {
            return res.status(400).json({ message: error.errors[0].message });
        }
        if (error.code === 11000 && error.keyPattern && error.keyPattern.phone) {
            return res.status(400).json({ message: 'This phone number is already used by another user.' });
        }
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    loginUser,
    registerUser,
    getMe,
    bulkRegisterUsers,
    getUsers,
    updateProfile,
    updatePassword,
    deleteUser,
    updateUser,
};
