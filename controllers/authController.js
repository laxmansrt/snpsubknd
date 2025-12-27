const User = require('../models/User');
const generateToken = require('../utils/generateToken');

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
    try {
        const { email, password, role } = req.body; // 'email' is used as a general identifier here

        console.log('Login attempt:', { identifier: email, role, hasPassword: !!password });

        // Find user by email OR phone and role
        const user = await User.findOne({
            $or: [{ email: email }, { phone: email }],
            role: role
        });

        console.log('User found:', user ? 'Yes' : 'No');
        console.log('User details:', user ? { email: user.email, phone: user.phone, role: user.role } : 'N/A');

        if (user && (await user.matchPassword(password))) {
            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                studentData: user.studentData,
                facultyData: user.facultyData,
                parentData: user.parentData,
                token: generateToken(user._id),
            });
        } else {
            console.log('Login failed - invalid credentials or role mismatch');
            res.status(401).json({ message: 'Invalid email, password, or role' });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Register new user (Admin only)
// @route   POST /api/auth/register
// @access  Private/Admin
const registerUser = async (req, res) => {
    try {
        const { name, email, password, role, studentData, facultyData, parentData } = req.body;

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
            studentData,
            facultyData,
            parentData,
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
        const users = req.body; // Array of user objects
        const results = {
            success: 0,
            failed: 0,
            errors: []
        };

        for (const userData of users) {
            try {
                // Basic validation
                if (!userData.email || !userData.name || !userData.role) {
                    throw new Error(`Missing required fields for ${userData.email || 'unknown user'}`);
                }

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

                    // If childName is missing but childUsn is present, try to find the student
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
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all users (Admin only)
// @route   GET /api/auth/users
// @access  Private/Admin
const getUsers = async (req, res) => {
    try {
        const { role } = req.query;
        const query = role ? { role } : {};
        const users = await User.find(query).select('-password');
        console.log(`API/getUsers: Fetched ${users.length} users. Query:`, query);
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
        const user = await User.findById(req.user._id);

        if (user) {
            user.name = req.body.name || user.name;
            user.email = req.body.email || user.email;

            // Update role-specific data if provided (e.g., phone number could be added to schema later)
            // For now, let's just stick to name and email as per schema

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
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update user password
// @route   PUT /api/auth/password
// @access  Private
const updatePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const user = await User.findById(req.user._id);

        if (user && (await user.matchPassword(currentPassword))) {
            user.password = newPassword;
            await user.save();
            res.json({ message: 'Password updated successfully' });
        } else {
            res.status(401).json({ message: 'Invalid current password' });
        }
    } catch (error) {
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
    updatePassword
};
