import express from 'express';
import multer from 'multer';
import { generateQuiz, getQuizForStudent, submitQuiz, deleteQuiz } from '../controllers/quizController.js';
import {
  reportViolation,
  getIntegrityEvents,
  getIntegritySummary,
  getIntegrityConfig,
} from '../controllers/integrityController.js';
import { protect, roleGuard } from '../middleware/authMiddleware.js';

const router = express.Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 16 * 1024 * 1024 },
});

// Teacher only
router.post('/generate', protect, roleGuard('TEACHER', 'ADMIN'), upload.single('document'), generateQuiz);
router.delete('/:id', protect, roleGuard('TEACHER', 'ADMIN'), deleteQuiz);

// Integrity config (all authenticated)
router.get('/integrity/config', protect, getIntegrityConfig);

// Student only
router.get('/:id/attempt', protect, roleGuard('STUDENT'), getQuizForStudent);
router.post('/:id/submit', protect, roleGuard('STUDENT'), submitQuiz);
router.post('/:id/violation', protect, roleGuard('STUDENT'), reportViolation);

// Teacher/Admin: integrity monitoring
router.get('/:id/integrity', protect, roleGuard('TEACHER', 'ADMIN'), getIntegrityEvents);
router.get('/:id/integrity/summary', protect, roleGuard('TEACHER', 'ADMIN'), getIntegritySummary);

export default router;
