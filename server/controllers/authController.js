import { authenticateUser, registerStudent } from '../services/authService.js';

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
export const authUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        const result = await authenticateUser(email, password);
        res.json(result);
    } catch (error) {
        res.status(error.statusCode || 500).json({ message: error.message });
    }
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public (Can be restricted later)
export const registerUser = async (req, res) => {
    try {
        const result = await registerStudent(req.body);
        res.status(201).json(result);
    } catch (error) {
        res.status(error.statusCode || 500).json({ message: error.message });
    }
};
