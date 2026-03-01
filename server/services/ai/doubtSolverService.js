import { chatCompletion, safeParseJSON, trimToTokenLimit } from './groqClient.js';
import { buildDoubtSolverPrompt } from './promptTemplates.js';
import User from '../../models/User.js';
import QuizResult from '../../models/QuizResult.js';

// ─── Constants ────────────────────────────────────────────────────
const MAX_MESSAGE_LENGTH = 2000;
const DANGEROUS_PATTERNS = [
  /ignore\s+(all\s+)?(previous|above|prior)\s+(instructions|prompts|rules)/i,
  /you\s+are\s+now\s+/i,
  /forget\s+(all\s+)?(previous|your)\s+(instructions|rules|constraints)/i,
  /system\s*:\s*/i,
  /\bpretend\s+to\s+be\b/i,
  /\bjailbreak\b/i,
  /\bDAN\b/,
  /\bact\s+as\s+(?:if|though)\b/i,
  /\brole\s*play\b/i,
];

// ─── Input Sanitization ──────────────────────────────────────────
const sanitizeInput = (message) => {
  if (!message || typeof message !== 'string') {
    throw Object.assign(new Error('Message is required'), { statusCode: 400 });
  }

  const trimmed = message.trim();
  if (trimmed.length === 0) {
    throw Object.assign(new Error('Message cannot be empty'), { statusCode: 400 });
  }
  if (trimmed.length > MAX_MESSAGE_LENGTH) {
    throw Object.assign(new Error(`Message exceeds maximum length of ${MAX_MESSAGE_LENGTH} characters`), { statusCode: 400 });
  }

  // Check for prompt injection attempts
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(trimmed)) {
      console.warn(JSON.stringify({
        level: 'warn',
        service: 'doubtSolver',
        event: 'prompt_injection_blocked',
        pattern: pattern.toString(),
      }));
      throw Object.assign(new Error('Invalid input detected'), { statusCode: 400 });
    }
  }

  // Strip HTML tags and control characters
  return trimmed
    .replace(/<[^>]*>/g, '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
};

// ─── Fetch Student Context ───────────────────────────────────────
const getStudentContext = async (userId) => {
  try {
    const user = await User.findById(userId)
      .select('weakTopics overallRiskLevel academicContext name')
      .populate('academicContext', 'year branch section')
      .lean();

    if (!user) return { weakTopics: [], gradeContext: '', recentPerformance: '' };

    const weakTopics = (user.weakTopics || []).map(t => t.topicName).filter(Boolean);
    const gradeContext = user.academicContext
      ? `Year ${user.academicContext.year} - ${user.academicContext.branch} ${user.academicContext.section}`
      : '';

    // Fetch last 3 quiz results
    const recentResults = await QuizResult.find({ studentId: userId })
      .sort({ createdAt: -1 })
      .limit(3)
      .select('accuracyPercentage totalScore')
      .lean();

    const recentPerformance = recentResults.length > 0
      ? recentResults.map(r => `${r.accuracyPercentage}% accuracy`).join(', ')
      : 'No recent quiz data';

    return { weakTopics, gradeContext, recentPerformance };
  } catch (error) {
    console.error(JSON.stringify({
      level: 'error',
      service: 'doubtSolver',
      event: 'context_fetch_failed',
      userId,
      error: error.message,
    }));
    return { weakTopics: [], gradeContext: '', recentPerformance: '' };
  }
};

// ─── Default Fallback ─────────────────────────────────────────────
const FALLBACK_RESPONSE = {
  answer: 'I apologize, but I was unable to process your question. Please try rephrasing it.',
  explanationSteps: [],
  relatedConcepts: [],
  suggestedPractice: [],
};

// ─── Main Service Function ────────────────────────────────────────
export const solveDoubt = async ({ message, userId }) => {
  // Step 1: Sanitize input
  const sanitizedMessage = sanitizeInput(message);

  // Step 2: Fetch student context
  const context = await getStudentContext(userId);

  console.log(JSON.stringify({
    level: 'info',
    service: 'doubtSolver',
    event: 'processing_doubt',
    userId,
    messageLength: sanitizedMessage.length,
    weakTopicsCount: context.weakTopics.length,
  }));

  // Step 3: Build prompt
  const prompt = buildDoubtSolverPrompt({
    question: sanitizedMessage,
    weakTopics: context.weakTopics,
    gradeContext: context.gradeContext,
    recentPerformance: context.recentPerformance,
  });

  // Step 4: Call Groq
  const rawResponse = await chatCompletion({
    messages: [
      { role: 'system', content: prompt.system },
      { role: 'user', content: prompt.user },
    ],
    temperature: 0.5,
    maxTokens: 2048,
    jsonMode: true,
    userId,
    requestType: 'doubt_solver',
  });

  // Step 5: Parse and validate
  const parsed = safeParseJSON(rawResponse, null);
  if (!parsed || !parsed.answer) {
    console.error(JSON.stringify({
      level: 'error',
      service: 'doubtSolver',
      event: 'invalid_ai_response',
      userId,
      rawPreview: rawResponse?.slice(0, 300),
    }));
    return FALLBACK_RESPONSE;
  }

  // Step 6: Normalize
  return {
    answer: parsed.answer || FALLBACK_RESPONSE.answer,
    explanationSteps: Array.isArray(parsed.explanationSteps) ? parsed.explanationSteps : [],
    relatedConcepts: Array.isArray(parsed.relatedConcepts) ? parsed.relatedConcepts : [],
    suggestedPractice: Array.isArray(parsed.suggestedPractice) ? parsed.suggestedPractice : [],
  };
};
