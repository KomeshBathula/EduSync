import express from 'express';
import { getMyActivity, getContextActivity } from '../controllers/activityLogController.js';
import { protect, roleGuard } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect, roleGuard('TEACHER', 'ADMIN'));

router.get('/my', getMyActivity);
router.get('/context/:contextId', getContextActivity);

export default router;
