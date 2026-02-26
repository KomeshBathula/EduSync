import { chatCompletion, safeParseJSON } from './groqClient.js';
import { buildYoutubeQuizPrompt } from './promptTemplates.js';
import User from '../../models/User.js';

// ─── Default Fallback ─────────────────────────────────────────────
const FALLBACK_RESPONSE = {
  questions: [],
  error: 'Unable to generate a quiz from this content. Please try again.',
};

/**
 * Generate a post-reading comprehension quiz from YouTube summary data.
 * Uses the student's risk level for adaptive difficulty.
 * @param {Object} params
 * @param {string} params.summary - The AI-generated summary text
 * @param {Array} [params.keyConcepts] - Extracted key concepts
 * @param {string} [params.title] - Video title
 * @param {string} params.userId
 */
export const generateYoutubeQuiz = async ({ summary, keyConcepts = [], title = '', userId }) => {
  // Fetch student's risk level for adaptive difficulty
  let riskLevel = 'LOW';
  try {
    const user = await User.findById(userId).select('overallRiskLevel').lean();
    if (user?.overallRiskLevel) {
      riskLevel = user.overallRiskLevel;
    }
  } catch (error) {
    console.error(JSON.stringify({
      level: 'warn',
      service: 'youtubeQuiz',
      event: 'risk_fetch_failed',
      userId,
      error: error.message,
    }));
  }

  console.log(JSON.stringify({
    level: 'info',
    service: 'youtubeQuiz',
    event: 'generating_quiz',
    userId,
    riskLevel,
    summaryLength: summary.length,
    conceptCount: keyConcepts.length,
  }));

  // Build prompt with risk-adaptive difficulty
  const prompt = buildYoutubeQuizPrompt({
    summary,
    keyConcepts,
    title,
    riskLevel,
  });

  // Call Groq
  const rawResponse = await chatCompletion({
    messages: [
      { role: 'system', content: prompt.system },
      { role: 'user', content: prompt.user },
    ],
    temperature: 0.4,
    maxTokens: 2048,
    jsonMode: true,
    userId,
    requestType: 'youtube_quiz',
  });

  // Parse and validate
  const parsed = safeParseJSON(rawResponse, null);
  if (!parsed || !Array.isArray(parsed.questions) || parsed.questions.length === 0) {
    console.error(JSON.stringify({
      level: 'error',
      service: 'youtubeQuiz',
      event: 'invalid_ai_response',
      userId,
      rawPreview: rawResponse?.slice(0, 300),
    }));
    return FALLBACK_RESPONSE;
  }

  // Normalize and validate each question
  const validQuestions = parsed.questions
    .filter(q => q.questionText && Array.isArray(q.options) && q.options.length === 4 && typeof q.correctOptionIndex === 'number')
    .map(q => ({
      questionText: q.questionText,
      options: q.options,
      correctOptionIndex: q.correctOptionIndex,
      explanation: q.explanation || '',
    }));

  if (validQuestions.length === 0) {
    return FALLBACK_RESPONSE;
  }

  return {
    questions: validQuestions,
    riskLevel,
    generatedAt: new Date().toISOString(),
  };
};
