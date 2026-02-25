import express from 'express';
import { generateQuiz, getQuizForStudent, submitQuiz } from '../controllers/quizController.js';
import { protect, roleGuard } from '../middleware/authMiddleware.js';

const router = express.Router();

// Teacher only
router.post('/generate', protect, roleGuard('TEACHER', 'ADMIN'), generateQuiz);

// Student only
router.get('/:id/attempt', protect, roleGuard('STUDENT'), getQuizForStudent);
router.post('/:id/submit', protect, roleGuard('STUDENT'), submitQuiz);

export default router;
