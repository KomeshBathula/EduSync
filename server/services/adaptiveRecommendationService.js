import { chatCompletion, safeParseJSON } from './ai/groqClient.js';
import { buildRecommendationPrompt } from './ai/promptTemplates.js';
import User from '../models/User.js';
import QuizResult from '../models/QuizResult.js';
import Material from '../models/Material.js';
import { predictRisk } from '../ml/inferenceService.js';

// ─── Default Fallback ─────────────────────────────────────────────
const FALLBACK_RESPONSE = {
  priorityTopics: [],
  studyPlan: [],
  youtubeSearchTerms: [],
  motivationalNote: 'Keep learning and practicing! Every attempt makes you stronger.',
};

/**
 * Risk-based personalization parameters.
 * Controls quiz difficulty, revision intensity, and notification urgency
 * based on ML-predicted risk level.
 */
const RISK_PERSONALIZATION = {
  HIGH: {
    quizDifficulty: 'easy',
    revisionIntensity: 'high',
    notificationUrgency: 'high',
    studyPlanDetail: 'detailed step-by-step with frequent checkpoints',
    questionStyle: 'foundational and confidence-building',
  },
  MEDIUM: {
    quizDifficulty: 'medium',
    revisionIntensity: 'moderate',
    notificationUrgency: 'moderate',
    studyPlanDetail: 'balanced with moderate practice',
    questionStyle: 'mixed difficulty with some challenging problems',
  },
  LOW: {
    quizDifficulty: 'hard',
    revisionIntensity: 'light',
    notificationUrgency: 'low',
    studyPlanDetail: 'advanced application and exploration focused',
    questionStyle: 'advanced application and critical thinking',
  },
};

/**
 * Gather student profile data for recommendations, enriched with ML prediction.
 */
const gatherStudentProfile = async (userId) => {
  const user = await User.findById(userId)
    .select('weakTopics overallRiskLevel academicContext lastMLPrediction predictionConfidence')
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

  // Get ML prediction for personalization (non-blocking)
  let mlPrediction = null;
  try {
    mlPrediction = await predictRisk(userId);
  } catch {
    // ML unavailable, proceed with rule-based
  }

  const effectiveRiskLevel = mlPrediction?.predictedClass || user.overallRiskLevel || 'LOW';
  const personalization = RISK_PERSONALIZATION[effectiveRiskLevel] || RISK_PERSONALIZATION.MEDIUM;

  return {
    weakTopics: user.weakTopics || [],
    riskLevel: effectiveRiskLevel,
    recentScores,
    availableResources,
    personalization,
    mlConfidence: mlPrediction?.confidence || null,
  };
};

/**
 * Generate adaptive study recommendations for a student.
 * Analyzes weakTopics, quiz performance trends, risk level, and available materials.
 * Recommendations are personalized based on ML risk prediction.
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
    personalization: profile.personalization.quizDifficulty,
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
        personalization: profile.personalization,
      },
    };
  }

  // Build prompt with personalization context
  const prompt = buildRecommendationPrompt({
    weakTopics: profile.weakTopics,
    riskLevel: profile.riskLevel,
    recentScores: profile.recentScores,
    availableResources: profile.availableResources,
    personalization: profile.personalization,
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
        personalization: profile.personalization,
      },
    };
  }

  // Normalize — flatten objects to strings so the frontend can render them safely
  return {
    priorityTopics: Array.isArray(parsed.priorityTopics)
      ? parsed.priorityTopics.map(t => (typeof t === 'object' && t !== null ? (t.topic || t.name || JSON.stringify(t)) : String(t)))
      : [],
    studyPlan: Array.isArray(parsed.studyPlan)
      ? parsed.studyPlan.map(s => (typeof s === 'object' && s !== null ? (s.action || s.step || JSON.stringify(s)) : String(s)))
      : [],
    youtubeSearchTerms: Array.isArray(parsed.youtubeSearchTerms)
      ? parsed.youtubeSearchTerms.map(t => (typeof t === 'object' && t !== null ? (t.query || t.term || JSON.stringify(t)) : String(t)))
      : [],
    motivationalNote: parsed.motivationalNote || FALLBACK_RESPONSE.motivationalNote,
    metadata: {
      riskLevel: profile.riskLevel,
      weakTopicsUsed: profile.weakTopics.map(t => t.topicName),
      recentScoresTrend: profile.recentScores.map(s => s.accuracy),
      dataAvailable: true,
      generatedAt: new Date().toISOString(),
      personalization: profile.personalization,
      mlConfidence: profile.mlConfidence,
    },
  };
};
