import IntegrityEvent from '../models/IntegrityEvent.js';
import UserBehaviorProfile from '../models/UserBehaviorProfile.js';
import User from '../models/User.js';
import Quiz from '../models/Quiz.js';
import QuizResult from '../models/QuizResult.js';
import { updateStudentGraph } from './ai/weakAreaDetector.js';
import { evaluateRisk } from './ai/predictionEngine.js';
import { evaluateAssignment } from './ai/assignmentEvaluator.js';
import {
  recordViolation,
  lockSession,
  clearSession,
  getViolationThreshold,
  isSessionLocked,
} from './examSessionManager.js';

/**
 * Record a violation event for a student during a quiz.
 * Persists to DB and tracks in-memory session.
 * Returns { violationCount, thresholdReached, forced, warning }.
 */
export const handleViolation = async (studentId, quizId, eventType, metadata = {}) => {
  // Record in session manager
  const sessionResult = recordViolation(quizId, studentId, eventType, metadata);

  // Persist to database (fire-and-forget for speed, but await for threshold logic)
  const event = await IntegrityEvent.create({
    studentId,
    quizId,
    eventType,
    metadata,
    autoSubmitted: sessionResult.thresholdReached,
  });

  // Update user violation counters (fire-and-forget)
  User.findByIdAndUpdate(studentId, {
    $inc: { totalViolations: 1 },
  }).catch(err => console.error(JSON.stringify({
    level: 'error', service: 'integrityService',
    event: 'user_update_failed', studentId, error: err.message,
  })));

  const threshold = getViolationThreshold();

  // Determine warning level
  let warning = null;
  if (sessionResult.violationCount === 1) {
    warning = 'WARNING';
  } else if (sessionResult.violationCount === 2) {
    warning = 'STRONG_WARNING';
  }

  // If threshold reached, force quiz submission
  let forcedResult = null;
  if (sessionResult.thresholdReached) {
    warning = 'AUTO_SUBMIT';
    forcedResult = await forceSubmitQuiz(studentId, quizId);
  }

  return {
    violationCount: sessionResult.violationCount,
    threshold,
    thresholdReached: sessionResult.thresholdReached,
    warning,
    locked: sessionResult.locked,
    forcedResult,
  };
};

/**
 * Force-submit a quiz on behalf of a student due to violation threshold.
 * Calculates score from any answers already saved,
 * or submits with 0 if no answers recorded.
 */
export const forceSubmitQuiz = async (studentId, quizId) => {
  // Check if already submitted
  const existing = await QuizResult.findOne({ studentId, quizId });
  if (existing) {
    lockSession(quizId, studentId);
    return { alreadySubmitted: true, resultId: existing._id };
  }

  const quiz = await Quiz.findById(quizId);
  if (!quiz) {
    lockSession(quizId, studentId);
    return { error: 'Quiz not found' };
  }

  // Force submit with zero score (no answers provided)
  const totalScore = 0;
  const maxScore = quiz.questions.reduce((sum, q) => sum + (q.weight || 1), 0);
  const accuracyPercentage = 0;

  const marksAssigned = await evaluateAssignment(totalScore, maxScore);

  const result = await QuizResult.create({
    studentId,
    quizId,
    totalScore,
    timeTakenSeconds: 0,
    accuracyPercentage,
    marksAssigned,
    questionMetrics: [],
  });

  // Mark all weak topics (student got 0)
  const weakNodes = quiz.questions.map(q => q.topicTag).filter(Boolean);
  updateStudentGraph(studentId, weakNodes).catch(err =>
    console.error('weakAreaDetector failed (forced):', err.message)
  );

  evaluateRisk(studentId).catch(err =>
    console.error('predictionEngine failed (forced):', err.message)
  );

  // Lock session and mark as auto-submitted
  lockSession(quizId, studentId);

  // Update user suspicious exam counter
  User.findByIdAndUpdate(studentId, {
    $inc: { suspiciousExamCount: 1 },
  }).catch(() => {});

  return {
    forced: true,
    resultId: result._id,
    marksAssigned,
    accuracyPercentage: 0,
  };
};

/**
 * Get integrity events for a specific quiz (for teacher dashboard).
 */
export const getQuizIntegrityEvents = async (quizId) => {
  return IntegrityEvent.find({ quizId })
    .populate('studentId', 'name email rollNumber')
    .sort({ createdAt: -1 })
    .lean();
};

/**
 * Get integrity summary per student for a quiz (aggregated).
 */
export const getQuizIntegritySummary = async (quizId) => {
  const pipeline = [
    { $match: { quizId: (await import('mongoose')).default.Types.ObjectId.createFromHexString(quizId) } },
    {
      $group: {
        _id: '$studentId',
        totalViolations: { $sum: 1 },
        violationTypes: { $addToSet: '$eventType' },
        autoSubmitted: { $max: '$autoSubmitted' },
        firstViolation: { $min: '$createdAt' },
        lastViolation: { $max: '$createdAt' },
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'student',
        pipeline: [{ $project: { name: 1, email: 1, rollNumber: 1 } }],
      },
    },
    { $unwind: '$student' },
    { $sort: { totalViolations: -1 } },
  ];

  return IntegrityEvent.aggregate(pipeline);
};

/**
 * Update the behavioral profile for a student after a quiz session.
 */
export const updateBehaviorProfile = async (studentId, quizId) => {
  try {
    // Get all events for this student+quiz
    const events = await IntegrityEvent.find({ studentId, quizId })
      .sort({ createdAt: 1 })
      .lean();

    const violationCount = events.length;
    const wasAutoSubmitted = events.some(e => e.autoSubmitted);

    // Calculate time-to-first-violation (from quiz start approximation)
    let timeToFirstViolation = 0;
    if (events.length >= 2) {
      timeToFirstViolation = Math.floor((events[0].createdAt - events[0].createdAt) / 1000);
    }

    // Build per-type increment map
    const typeIncrements = {};
    events.forEach(e => {
      const key = `violationBreakdown.${e.eventType}`;
      typeIncrements[key] = (typeIncrements[key] || 0) + 1;
    });

    // Upsert behavior profile
    const profile = await UserBehaviorProfile.findOneAndUpdate(
      { studentId },
      {
        $inc: {
          totalViolations: violationCount,
          totalExams: 1,
          suspiciousExamCount: violationCount > 0 ? 1 : 0,
          autoSubmitCount: wasAutoSubmitted ? 1 : 0,
          ...typeIncrements,
        },
        $set: { lastUpdatedAt: new Date() },
      },
      { upsert: true, new: true }
    );

    // Recalculate derived fields
    if (profile.totalExams > 0) {
      profile.avgViolationsPerExam = profile.totalViolations / profile.totalExams;
      // Integrity score: 100 - (violations * 5), clamped to [0, 100]
      profile.integrityScore = Math.max(0, Math.min(100,
        100 - (profile.totalViolations * 5) - (profile.autoSubmitCount * 15)
      ));
      await profile.save();

      // Sync integrity score to User model
      await User.findByIdAndUpdate(studentId, {
        integrityScore: profile.integrityScore,
      });
    }

    return profile;
  } catch (error) {
    console.error(JSON.stringify({
      level: 'error', service: 'integrityService',
      event: 'profile_update_failed', studentId, error: error.message,
    }));
  }
};

/**
 * Clean up exam session after submission.
 */
export const cleanupExamSession = (quizId, studentId) => {
  clearSession(quizId, studentId);
};

/**
 * Check if exam session is locked (already force-submitted).
 */
export const checkSessionLocked = (quizId, studentId) => {
  return isSessionLocked(quizId, studentId);
};
