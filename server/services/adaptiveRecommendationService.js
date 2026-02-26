import { chatCompletion, safeParseJSON } from './ai/groqClient.js';
import { buildRecommendationPrompt } from './ai/promptTemplates.js';
import User from '../models/User.js';
import QuizResult from '../models/QuizResult.js';
import Material from '../models/Material.js';

// ─── Default Fallback ─────────────────────────────────────────────
const FALLBACK_RESPONSE = {
  priorityTopics: [],
  studyPlan: [],
  youtubeSearchTerms: [],
  motivationalNote: 'Keep learning and practicing! Every attempt makes you stronger.',
};

/**
 * Gather student profile data for recommendations.
 */
const gatherStudentProfile = async (userId) => {
  const user = await User.findById(userId)
    .select('weakTopics overallRiskLevel academicContext')
    .lean();

  if (!user) {
    const error = new Error('Student not found');
    error.statusCode = 404;
    throw error;
  }

  // Recent quiz results
  const recentResults = await QuizResult.find({ studentId: userId })
    .sort({ createdAt: -1 })
    .limit(5)
    .select('accuracyPercentage quizId')
    .populate('quizId', 'title')
    .lean();

  const recentScores = recentResults.map(r => ({
    accuracy: r.accuracyPercentage,
    quizTitle: r.quizId?.title || 'Unknown',
  }));

  // Available study materials
  let availableResources = [];
  if (user.academicContext) {
    availableResources = await Material.find({ academicContext: user.academicContext })
      .select('title originalFileName')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();
  }

  return {
    weakTopics: user.weakTopics || [],
    riskLevel: user.overallRiskLevel || 'LOW',
    recentScores,
    availableResources,
  };
};

/**
 * Generate adaptive study recommendations for a student.
 * Analyzes weakTopics, quiz performance trends, risk level, and available materials.
 * @param {string} userId
 */
export const getAdaptiveRecommendations = async (userId) => {
  const profile = await gatherStudentProfile(userId);

  console.log(JSON.stringify({
    level: 'info',
    service: 'adaptiveRecommendation',
    event: 'generating',
    userId,
    weakTopicsCount: profile.weakTopics.length,
    riskLevel: profile.riskLevel,
    recentScoresCount: profile.recentScores.length,
  }));

  // If student has no data yet, return a tailored empty response
  if (profile.weakTopics.length === 0 && profile.recentScores.length === 0) {
    return {
      ...FALLBACK_RESPONSE,
      motivationalNote: 'Welcome! Complete your first quiz to get personalized recommendations.',
      metadata: {
        riskLevel: profile.riskLevel,
        dataAvailable: false,
        generatedAt: new Date().toISOString(),
      },
    };
  }

  // Build prompt
  const prompt = buildRecommendationPrompt({
    weakTopics: profile.weakTopics,
    riskLevel: profile.riskLevel,
    recentScores: profile.recentScores,
    availableResources: profile.availableResources,
  });

  // Call Groq
  const rawResponse = await chatCompletion({
    messages: [
      { role: 'system', content: prompt.system },
      { role: 'user', content: prompt.user },
    ],
    temperature: 0.5,
    maxTokens: 2048,
    jsonMode: true,
    userId,
    requestType: 'adaptive_recommendation',
  });

  // Parse and validate
  const parsed = safeParseJSON(rawResponse, null);
  if (!parsed || !parsed.priorityTopics) {
    console.error(JSON.stringify({
      level: 'error',
      service: 'adaptiveRecommendation',
      event: 'invalid_ai_response',
      userId,
      rawPreview: rawResponse?.slice(0, 300),
    }));
    return {
      ...FALLBACK_RESPONSE,
      metadata: {
        riskLevel: profile.riskLevel,
        dataAvailable: true,
        generatedAt: new Date().toISOString(),
      },
    };
  }

  // Normalize
  return {
    priorityTopics: Array.isArray(parsed.priorityTopics) ? parsed.priorityTopics : [],
    studyPlan: Array.isArray(parsed.studyPlan) ? parsed.studyPlan : [],
    youtubeSearchTerms: Array.isArray(parsed.youtubeSearchTerms) ? parsed.youtubeSearchTerms : [],
    motivationalNote: parsed.motivationalNote || FALLBACK_RESPONSE.motivationalNote,
    metadata: {
      riskLevel: profile.riskLevel,
      weakTopicsUsed: profile.weakTopics.map(t => t.topicName),
      recentScoresTrend: profile.recentScores.map(s => s.accuracy),
      dataAvailable: true,
      generatedAt: new Date().toISOString(),
    },
  };
};
