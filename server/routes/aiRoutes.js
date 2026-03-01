import express from 'express';
import { summarizeYoutube, doubtSolverChat, generateSmartRevision, getSupportedLanguages, youtubeQuiz, getChatHistory, sendChatMessage, clearChatHistory } from '../controllers/aiController.js';
import { protect, roleGuard } from '../middleware/authMiddleware.js';
import { youtubeRateLimiter, doubtRateLimiter, revisionRateLimiter } from '../middleware/aiRateLimiter.js';

const router = express.Router();

// YouTube AI Summarizer
router.post('/youtube-summary', protect, roleGuard('STUDENT'), youtubeRateLimiter, summarizeYoutube);
// YouTube Post-Reading Quiz
router.post('/youtube-quiz', protect, roleGuard('STUDENT'), youtubeRateLimiter, youtubeQuiz);
// Backward compatibility
router.post('/youtube', protect, roleGuard('STUDENT', 'TEACHER', 'ADMIN'), youtubeRateLimiter, summarizeYoutube);

// AI Doubt Solver
router.post('/doubt', protect, roleGuard('STUDENT'), doubtRateLimiter, doubtSolverChat);
// Backward compatibility
router.post('/chat', protect, roleGuard('STUDENT', 'TEACHER', 'ADMIN'), doubtRateLimiter, doubtSolverChat);

// Chat History & Memory
router.get('/chat/history', protect, roleGuard('STUDENT'), getChatHistory);
router.post('/chat/message', protect, roleGuard('STUDENT'), doubtRateLimiter, sendChatMessage);
router.delete('/chat/clear', protect, roleGuard('STUDENT'), clearChatHistory);

// Smart Revision Generator
router.get('/smart-revision', protect, roleGuard('STUDENT'), revisionRateLimiter, generateSmartRevision);
// Backward compatibility
router.get('/revision', protect, roleGuard('STUDENT'), revisionRateLimiter, generateSmartRevision);

// Supported Languages
router.get('/languages', protect, getSupportedLanguages);

export default router;
