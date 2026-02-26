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

// GET /api/ai/chat/history - Fetch conversation history
export const getChatHistory = async (req, res) => {
  try {
    const studentId = req.user?._id;

    if (!studentId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const AIChatConversation = (await import('../models/AIChatConversation.js')).default;

    const conversation = await AIChatConversation.findOne({ studentId })
      .select('messages')
      .lean();

    if (!conversation || !conversation.messages) {
      return res.json({ success: true, messages: [] });
    }

    // Return last 50 messages max
    const messages = conversation.messages.slice(-50);
    res.json({ success: true, messages });
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

    const AIChatConversation = (await import('../models/AIChatConversation.js')).default;

    // Get or create conversation
    let conversation = await AIChatConversation.findOne({ studentId });
    if (!conversation) {
      conversation = new AIChatConversation({ studentId, messages: [] });
    }

    // Add user message
    conversation.messages.push({
      role: 'USER',
      content: sanitizedMessage,
      timestamp: new Date(),
    });

    // Get AI response
    const aiResult = await solveDoubt({ message: sanitizedMessage, userId: studentId.toString() });

    if (!aiResult || !aiResult.answer) {
      return res.status(500).json({ error: 'Failed to get AI response' });
    }

    // Add AI message to conversation
    conversation.messages.push({
      role: 'AI',
      content: aiResult.answer,
      timestamp: new Date(),
    });

    // Save conversation
    await conversation.save();

    // ML tracking
    incrementUserMetric(studentId, 'aiDoubtUsageCount');

    // Return AI response with metadata
    res.json({
      success: true,
      aiMessage: {
        role: 'AI',
        content: aiResult.answer,
        timestamp: new Date(),
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

    const AIChatConversation = (await import('../models/AIChatConversation.js')).default;

    await AIChatConversation.deleteOne({ studentId });

    res.json({ success: true, message: 'Chat history cleared' });
  } catch (error) {
    console.error('[Clear Chat History Error]', error.message);
    res.status(500).json({ error: 'Failed to clear chat history' });
  }
};
