import User from '../models/User.js';

/**
 * Increment a numeric ML tracking field on a user document.
 * Fire-and-forget — errors are logged but never thrown.
 * @param {string} userId
 * @param {string} field - One of: materialViewCount, youtubeQuizAttempts, aiDoubtUsageCount, revisionPlanCount, youtubeSummaryCount
 * @param {number} [amount=1]
 */
export const incrementUserMetric = async (userId, field, amount = 1) => {
  try {
    if (!userId || !field) return;
    await User.findByIdAndUpdate(userId, { $inc: { [field]: amount } });
  } catch (error) {
    console.error(JSON.stringify({
      level: 'error',
      service: 'mlTracking',
      event: 'increment_failed',
      userId,
      field,
      error: error.message,
    }));
  }
};
