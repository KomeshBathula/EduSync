import { summarizeYoutubeVideo } from '../services/ai/youtubeSummarizerService.js';
import { solveDoubt } from '../services/ai/doubtSolverService.js';
import { generateRevisionPlan } from '../services/ai/smartRevisionService.js';
import { SUPPORTED_LANGUAGES } from '../services/ai/promptTemplates.js';
import { generateYoutubeQuiz } from '../services/ai/youtubeQuizService.js';
import { incrementUserMetric } from '../services/mlTrackingService.js';

// ─── YouTube AI Summarizer ────────────────────────────────────────
export const summarizeYoutube = async (req, res) => {
  try {
    const { url, language, noteSize } = req.body;
    const userId = req.user?._id?.toString() || 'unknown';

    const result = await summarizeYoutubeVideo({ url, language, userId, noteSize });

    // ML tracking (fire-and-forget)
    incrementUserMetric(req.user?._id, 'youtubeSummaryCount');

    res.json(result);
  } catch (error) {
    const status = error.statusCode || 500;
    const message = status < 500
      ? error.message
      : 'An error occurred while processing the video. Please try again.';
    res.status(status).json({ error: message });
  }
};

// ─── YouTube Post-Reading Quiz ────────────────────────────────────
export const youtubeQuiz = async (req, res) => {
  try {
    const { summary, keyConcepts, title } = req.body;
    const userId = req.user?._id?.toString() || 'unknown';

    if (!summary) {
      return res.status(400).json({ error: 'Summary is required to generate a quiz.' });
    }

    const result = await generateYoutubeQuiz({ summary, keyConcepts, title, userId });

    // ML tracking
    incrementUserMetric(req.user?._id, 'youtubeQuizAttempts');

    res.json(result);
  } catch (error) {
    const status = error.statusCode || 500;
    const message = status < 500
      ? error.message
      : 'An error occurred while generating the quiz. Please try again.';
    res.status(status).json({ error: message });
  }
};

// ─── AI Doubt Solver ──────────────────────────────────────────────
export const doubtSolverChat = async (req, res) => {
  try {
    const { message } = req.body;
    const userId = req.user?._id?.toString() || 'unknown';

    const result = await solveDoubt({ message, userId });

    // ML tracking
    incrementUserMetric(req.user?._id, 'aiDoubtUsageCount');

    res.json(result);
  } catch (error) {
    const status = error.statusCode || 500;
    const message = status < 500
      ? error.message
      : 'An error occurred while processing your question. Please try again.';
    res.status(status).json({ error: message });
  }
};

// ─── Smart Revision Generator ─────────────────────────────────────
export const generateSmartRevision = async (req, res) => {
  try {
    const userId = req.user?._id?.toString() || 'unknown';
    const language = req.query.language || 'English';

    const result = await generateRevisionPlan({ userId, language });

    // ML tracking
    incrementUserMetric(req.user?._id, 'revisionPlanCount');

    res.json(result);
  } catch (error) {
    const status = error.statusCode || 500;
    const message = status < 500
      ? error.message
      : 'An error occurred while generating your revision plan. Please try again.';
    res.status(status).json({ error: message });
  }
};

// ─── Get Supported Languages ──────────────────────────────────────
export const getSupportedLanguages = (req, res) => {
  res.json({ languages: SUPPORTED_LANGUAGES });
};
