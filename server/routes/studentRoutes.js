import express from 'express';
import { getStudentDashboardData, getRecommendations } from '../controllers/studentController.js';
import { protect, roleGuard } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/dashboard', protect, roleGuard('STUDENT'), getStudentDashboardData);
router.get('/recommendations', protect, roleGuard('STUDENT'), getRecommendations);

export default router;
