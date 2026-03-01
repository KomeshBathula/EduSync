import express from 'express';
import { getPublicAcademicStructures, getAcademicAnalyticsById } from '../controllers/academicController.js';
import { protect, roleGuard } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/public', getPublicAcademicStructures);
router.get('/:id/analytics', protect, roleGuard('TEACHER', 'ADMIN'), getAcademicAnalyticsById);

export default router;
