import express from 'express';
import multer from 'multer';
import {
  generateQuiz,
  publishQuiz,
  updateQuiz,
  getQuizzesBySection,
  startExam,
  getQuizForStudent,
  submitQuiz,
  deleteQuiz,
  getQuizReview,
  forceSubmitQuiz,
  getQuizDetail,
  getQuizResults,
} from '../controllers/quizController.js';
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

// ─── Teacher / Admin routes ───────────────────────────────────────────
router.post('/generate',    protect, roleGuard('TEACHER', 'ADMIN'), upload.single('document'), generateQuiz);
router.post('/:id/publish', protect, roleGuard('TEACHER', 'ADMIN'), publishQuiz);
// Edit DRAFT quiz — questions, title, duration, totalMarks
router.put('/:id',          protect, roleGuard('TEACHER', 'ADMIN'), updateQuiz);
router.delete('/:id',       protect, roleGuard('TEACHER', 'ADMIN'), deleteQuiz);
router.get('/section/:contextId', protect, roleGuard('TEACHER', 'ADMIN'), getQuizzesBySection);
// Full preview with correct answers — for teacher to review before publishing
router.get('/:id/detail',   protect, roleGuard('TEACHER', 'ADMIN'), getQuizDetail);
// Class results + analytics (ranked, paginated)
router.get('/:id/results',  protect, roleGuard('TEACHER', 'ADMIN'), getQuizResults);

// ─── Integrity config (all authenticated) ────────────────────────────
router.get('/integrity/config', protect, getIntegrityConfig);

// ─── Student routes ───────────────────────────────────────────────────
router.post('/:id/start',        protect, roleGuard('STUDENT'), startExam);
router.get('/:id/attempt',       protect, roleGuard('STUDENT'), getQuizForStudent);
router.post('/:id/submit',       protect, roleGuard('STUDENT'), submitQuiz);
router.post('/:id/force-submit', protect, roleGuard('STUDENT'), forceSubmitQuiz);
router.get('/:id/review',        protect, roleGuard('STUDENT'), getQuizReview);
router.post('/:id/violation',    protect, roleGuard('STUDENT'), reportViolation);

// ─── Teacher / Admin: integrity monitoring ────────────────────────────
router.get('/:id/integrity',         protect, roleGuard('TEACHER', 'ADMIN'), getIntegrityEvents);
router.get('/:id/integrity/summary', protect, roleGuard('TEACHER', 'ADMIN'), getIntegritySummary);

export default router;
