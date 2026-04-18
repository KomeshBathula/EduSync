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
    const { summaryContent, questionCount, difficulty } = req.body;
    const userId = req.user?._id?.toString() || 'unknown';

    // Validate summary content (check for empty or whitespace-only strings)
    if (!summaryContent || typeof summaryContent !== 'string' || summaryContent.trim().length === 0) {
      return res.status(400).json({ 
        error: 'Summary content is required to generate a quiz. Please summarize a video first.',
        debug: { received: typeof summaryContent, length: summaryContent?.length || 0 }
      });
    }

    if (summaryContent.trim().length < 50) {
      return res.status(400).json({ 
        error: 'Summary content is too short. Please use a longer video or detailed notes.',
        debug: { length: summaryContent.trim().length }
      });
    }

    if (!questionCount || ![5, 10, 15].includes(questionCount)) {
      return res.status(400).json({ error: 'Question count must be 5, 10, or 15.' });
    }

    if (!difficulty || !['EASY', 'MEDIUM', 'HARD'].includes(difficulty)) {
      return res.status(400).json({ error: 'Difficulty must be EASY, MEDIUM, or HARD.' });
    }

    const result = await generateYoutubeQuiz({ 
      summaryContent, 
      questionCount, 
      difficulty,
      userId 
    });

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

// ─── Chat History & Memory Management ─────────────────────────────

import AIChatMessage from '../models/AIChatMessage.js';

// GET /api/ai/chat/history - Fetch conversation history
export const getChatHistory = async (req, res) => {
  try {
    const studentId = req.user?._id;

    if (!studentId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const messages = await AIChatMessage.find({ studentId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const totalMessages = await AIChatMessage.countDocuments({ studentId });
    const hasMore = skip + messages.length < totalMessages;

    res.json({ 
      success: true, 
      messages: messages.reverse(), // reverse so oldest in the page is first
      hasMore,
      totalMessages 
    });
  } catch (error) {
    console.error('[Chat History Error]', error.message);
    res.status(500).json({ error: 'Failed to fetch chat history' });
  }
};

// POST /api/ai/chat/message - Send message and get AI response with persistence
export const sendChatMessage = async (req, res) => {
  try {
    const { message } = req.body;
    const studentId = req.user?._id;

    if (!studentId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Validation
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Sanitize & trim
    const sanitizedMessage = message.trim().substring(0, 1000);

    if (!sanitizedMessage) {
      return res.status(400).json({ error: 'Message cannot be empty' });
    }

    // Get AI response
    const aiResult = await solveDoubt({ message: sanitizedMessage, userId: studentId.toString() });

    if (!aiResult || !aiResult.answer) {
      return res.status(500).json({ error: 'Failed to get AI response' });
    }

    // Save messages in parallel
    await AIChatMessage.insertMany([
      { studentId, role: 'USER', content: sanitizedMessage },
      { studentId, role: 'AI', content: aiResult.answer }
    ]);

    // Limit Storage: Keep last 5000 messages
    const count = await AIChatMessage.countDocuments({ studentId });
    if (count > 5000) {
      const messagesToKeep = await AIChatMessage.find({ studentId })
        .sort({ createdAt: -1 })
        .limit(5000)
        .select('_id');
      const keepIds = messagesToKeep.map(m => m._id);
      await AIChatMessage.deleteMany({
        studentId,
        _id: { $nin: keepIds }
      });
    }

    // ML tracking
    incrementUserMetric(studentId, 'aiDoubtUsageCount');

    // Return AI response with metadata
    res.json({
      success: true,
      aiMessage: {
        role: 'AI',
        content: aiResult.answer,
        createdAt: new Date(),
      },
      metadata: {
        explanationSteps: aiResult.explanationSteps || [],
        relatedConcepts: aiResult.relatedConcepts || [],
        suggestedPractice: aiResult.suggestedPractice || [],
      },
    });
  } catch (error) {
    console.error('[Send Chat Message Error]', error.message);
    const status = error.statusCode || 500;
    const message = status < 500
      ? error.message
      : 'Failed to process message. Please try again.';
    res.status(status).json({ error: message });
  }
};

// DELETE /api/ai/chat/clear - Clear conversation history
export const clearChatHistory = async (req, res) => {
  try {
    const studentId = req.user?._id;

    if (!studentId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await AIChatMessage.deleteMany({ studentId });

    res.json({ success: true, message: 'Chat history cleared' });
  } catch (error) {
    console.error('[Clear Chat History Error]', error.message);
    res.status(500).json({ error: 'Failed to clear chat history' });
  }
};
