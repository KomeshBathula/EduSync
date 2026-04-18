import { chatCompletion } from './groqClient.js';
import { buildSmartRevisionPrompt } from './promptTemplates.js';
import { cleanAIResponse, safeParseJSON, validateRevisionPlan } from './jsonParser.js';
import User from '../../models/User.js';
import QuizResult from '../../models/QuizResult.js';

// ─── Default Fallback ─────────────────────────────────────────────
const generateFallbackDays = (weakTopics) => {
  const days = [];
  const baseTopics = weakTopics && weakTopics.length > 0 
    ? weakTopics.slice(0, 3).map(t => t.topicName || t) 
    : ['General Review', 'Core Concepts'];

  for (let i = 1; i <= 7; i++) {
    days.push({
      day: i,
      focusTopics: baseTopics,
      subtopics: ['Review notes', 'Read textbook chapter'],
      recommendedPractice: ['Complete practice questions', 'Review previous mistakes'],
      timeAllocation: '1.5 hours'
    });
  }
  return days;
};

const getFallbackResponse = (weakTopics) => ({
  overview: 'Basic revision plan generated (System Recovery Mode)',
  days: generateFallbackDays(weakTopics),
  revisionStrategy: 'Focus on consistency and daily review of core concepts.',
});

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
  // Performance: already trimmed inside buildSmartRevisionPrompt
  const prompt = buildSmartRevisionPrompt({
    weakTopics: profile.weakTopics,
    riskLevel: profile.riskLevel,
    recentQuizScores: profile.recentQuizScores,
    language,
  });

  // Retry Mechanism
  for (let i = 0; i < 2; i++) {
    try {
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

      const cleaned = cleanAIResponse(rawResponse);
      let parsed = safeParseJSON(cleaned);

      // Handle array fallback
      if (Array.isArray(parsed)) {
        parsed = {
          overview: "7-Day Revision Plan",
          days: parsed,
          revisionStrategy: "Follow this plan consistently."
        };
      }

      if (validateRevisionPlan(parsed)) {
        return {
          overview: parsed.overview || 'Personalized revision plan based on your performance data.',
          days: parsed.days,
          revisionStrategy: parsed.revisionStrategy || 'Stay consistent and focus on understanding rather than memorization.',
          metadata: {
            riskLevel: profile.riskLevel,
            weakTopicsUsed: profile.weakTopics.map(t => t.topicName).slice(0, 5),
            generatedAt: new Date().toISOString(),
          },
        };
      }

      console.error(JSON.stringify({
        level: 'warn',
        service: 'smartRevision',
        event: 'validation_failed_retrying',
        attempt: i + 1,
        userId,
        rawPreview: rawResponse?.slice(0, 300)
      }));
    } catch (error) {
      console.error("AI Revision Parse Failed", error.message);
    }
  }

  // Final Fallback
  console.error(JSON.stringify({
    level: 'error',
    service: 'smartRevision',
    event: 'all_retries_failed_using_fallback',
    userId
  }));
  
  return getFallbackResponse(profile.weakTopics);
};
