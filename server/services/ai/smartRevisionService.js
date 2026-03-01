import { chatCompletion, safeParseJSON } from './groqClient.js';
import { buildSmartRevisionPrompt } from './promptTemplates.js';
import User from '../../models/User.js';
import QuizResult from '../../models/QuizResult.js';

// ─── Default Fallback ─────────────────────────────────────────────
const FALLBACK_RESPONSE = {
  overview: 'Unable to generate a personalized revision plan. Please try again later.',
  days: [],
  revisionStrategy: '',
};

// ─── Fetch Student Profile ────────────────────────────────────────
const getStudentProfile = async (userId) => {
  try {
    const user = await User.findById(userId)
      .select('weakTopics overallRiskLevel academicContext')
      .lean();

    if (!user) {
      throw Object.assign(new Error('Student not found'), { statusCode: 404 });
    }

    const weakTopics = user.weakTopics || [];
    const riskLevel = user.overallRiskLevel || 'LOW';

    // Fetch last 3 quiz results for performance context
    const recentResults = await QuizResult.find({ studentId: userId })
      .sort({ createdAt: -1 })
      .limit(3)
      .select('accuracyPercentage totalScore')
      .lean();

    const recentQuizScores = recentResults.map(r => ({
      accuracy: r.accuracyPercentage,
      score: r.totalScore,
    }));

    return { weakTopics, riskLevel, recentQuizScores };
  } catch (error) {
    if (error.statusCode) throw error;
    console.error(JSON.stringify({
      level: 'error',
      service: 'smartRevision',
      event: 'profile_fetch_failed',
      userId,
      error: error.message,
    }));
    return { weakTopics: [], riskLevel: 'LOW', recentQuizScores: [] };
  }
};

// ─── Main Service Function ────────────────────────────────────────
export const generateRevisionPlan = async ({ userId, language = 'English' }) => {
  // Step 1: Fetch student profile
  const profile = await getStudentProfile(userId);

  console.log(JSON.stringify({
    level: 'info',
    service: 'smartRevision',
    event: 'generating_plan',
    userId,
    weakTopicsCount: profile.weakTopics.length,
    riskLevel: profile.riskLevel,
    recentQuizCount: profile.recentQuizScores.length,
    language,
  }));

  // Step 2: Build prompt
  const prompt = buildSmartRevisionPrompt({
    weakTopics: profile.weakTopics,
    riskLevel: profile.riskLevel,
    recentQuizScores: profile.recentQuizScores,
    language,
  });

  // Step 3: Call Groq
  const rawResponse = await chatCompletion({
    messages: [
      { role: 'system', content: prompt.system },
      { role: 'user', content: prompt.user },
    ],
    temperature: 0.4,
    maxTokens: 4096,
    jsonMode: true,
    userId,
    requestType: 'smart_revision',
  });

  // Step 4: Parse and validate
  const parsed = safeParseJSON(rawResponse, null);
  if (!parsed || !parsed.days || !Array.isArray(parsed.days)) {
    console.error(JSON.stringify({
      level: 'error',
      service: 'smartRevision',
      event: 'invalid_ai_response',
      userId,
      rawPreview: rawResponse?.slice(0, 300),
    }));
    return FALLBACK_RESPONSE;
  }

  // Step 5: Normalize days structure
  const normalizedDays = parsed.days.map((day, idx) => ({
    day: day.day || idx + 1,
    focusTopics: Array.isArray(day.focusTopics) ? day.focusTopics : [],
    subtopics: Array.isArray(day.subtopics) ? day.subtopics : [],
    recommendedPractice: Array.isArray(day.recommendedPractice) ? day.recommendedPractice : [],
    timeAllocation: day.timeAllocation || '1-2 hours',
  }));

  return {
    overview: parsed.overview || 'Personalized revision plan based on your performance data.',
    days: normalizedDays,
    revisionStrategy: parsed.revisionStrategy || '',
    metadata: {
      riskLevel: profile.riskLevel,
      weakTopicsUsed: profile.weakTopics.map(t => t.topicName),
      generatedAt: new Date().toISOString(),
    },
  };
};
