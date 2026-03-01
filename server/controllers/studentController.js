import { getStudentDashboard } from '../services/studentService.js';
import { getAdaptiveRecommendations } from '../services/adaptiveRecommendationService.js';

export const getStudentDashboardData = async (req, res) => {
    try {
        const dashboardData = await getStudentDashboard(req.user._id);
        res.json(dashboardData);
    } catch (error) {
        res.status(error.statusCode || 500).json({ message: error.message });
    }
};

// @desc    Get adaptive study recommendations
// @route   GET /api/student/recommendations
// @access  STUDENT
export const getRecommendations = async (req, res) => {
    try {
        const recommendations = await getAdaptiveRecommendations(req.user._id);
        res.json(recommendations);
    } catch (error) {
        res.status(error.statusCode || 500).json({ message: error.message });
    }
};
