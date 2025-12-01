const User = require('../models/User');
const generateToken = require('../utils/generateToken');

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
    try {
        const { email, password, role } = req.body;

        console.log('Login attempt:', { email, role, hasPassword: !!password });

        // Find user by email and role
        const user = await User.findOne({ email, role });

        console.log('User found:', user ? 'Yes' : 'No');
        console.log('User details:', user ? { email: user.email, role: user.role, hasPassword: !!user.password } : 'N/A');

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

module.exports = { loginUser, registerUser, getMe };
