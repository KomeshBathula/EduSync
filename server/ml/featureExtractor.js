import User from '../models/User.js';
import QuizResult from '../models/QuizResult.js';
import IntegrityEvent from '../models/IntegrityEvent.js';

/**
 * Feature count expected by the ML model.
 */
export const FEATURE_COUNT = 11;

/**
 * Feature names in order, matching the model input vector.
 */
export const FEATURE_NAMES = [
  'avgAccuracy3',
  'avgAccuracy5',
  'engagementScore',
  'weakTopicCount',
  'integrityScore',
  'violationRate',
  'loginFrequency',
  'materialEngagement',
  'aiUsageIntensity',
  'trendSlope',
  'timeConsistency',
];

/**
 * Clamp and normalize a value to 0–1 range.
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
const normalize = (value, min, max) => {
  if (max === min) return 0;
  return Math.max(0, Math.min(1, (value - min) / (max - min)));
};

/**
 * Calculate the linear regression slope of an array of numbers.
 * Returns a value in [-1, 1] after normalization.
 * @param {number[]} values
 * @returns {number}
 */
const calculateTrendSlope = (values) => {
  if (values.length < 2) return 0.5; // neutral
  const n = values.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumXX += i * i;
  }
  const denominator = n * sumXX - sumX * sumX;
  if (denominator === 0) return 0.5;
  const slope = (n * sumXY - sumX * sumY) / denominator;
  // Normalize slope from roughly [-50, 50] to [0, 1]
  return normalize(slope, -50, 50);
};

/**
 * Extract and normalize ML features for a given student.
 * All features are returned in [0, 1] range.
 *
 * @param {string} studentId
 * @returns {Promise<object>} Normalized feature object
 */
export const extractFeatures = async (studentId) => {
  const student = await User.findById(studentId).lean();
  if (!student) throw new Error('Student not found');

  // Fetch last 5 quiz results (we use last 3 and last 5)
  const recentResults = await QuizResult.find({ studentId })
    .sort({ createdAt: -1 })
    .limit(5)
    .lean();

  // Fetch integrity events count
  const totalExams = await QuizResult.countDocuments({ studentId });
  const totalViolations = await IntegrityEvent.countDocuments({ studentId });
  const autoSubmittedCount = await IntegrityEvent.countDocuments({
    studentId,
    autoSubmitted: true,
  });

  // ─── Raw feature computation ───────────────────────────────

  // 1. Average accuracy (last 3)
  const last3 = recentResults.slice(0, 3);
  const avgAccuracy3 = last3.length > 0
    ? last3.reduce((sum, r) => sum + r.accuracyPercentage, 0) / last3.length
    : 50; // neutral default

  // 2. Average accuracy (last 5)
  const avgAccuracy5 = recentResults.length > 0
    ? recentResults.reduce((sum, r) => sum + r.accuracyPercentage, 0) / recentResults.length
    : 50;

  // 3. Engagement score (0-100)
  const totalInteractions = (student.aiDoubtUsageCount || 0) +
    (student.revisionPlanCount || 0) +
    (student.materialViewCount || 0);
  const engagementRaw = Math.min(totalInteractions * 10, 100);

  // 4. Weak topic count
  const weakTopicCount = (student.weakTopics || []).length;

  // 5. Integrity score (already 0-100)
  const integrityScore = student.integrityScore ?? 100;

  // 6. Violation rate (violations per exam)
  const violationRate = totalExams > 0 ? totalViolations / totalExams : 0;

  // 7. Login frequency (normalized against reasonable max of 100)
  const loginFrequency = student.loginCount || 0;

  // 8. Material engagement
  const materialEngagement = student.materialViewCount || 0;

  // 9. AI usage intensity (doubt solver usage)
  const aiUsageIntensity = student.aiDoubtUsageCount || 0;

  // 10. Trend slope (improvement trend from accuracies, oldest to newest)
  const accuracies = recentResults.map(r => r.accuracyPercentage).reverse();
  const trendSlope = calculateTrendSlope(accuracies);

  // 11. Time consistency (variance in time spent on quizzes)
  let timeConsistency = 1; // high consistency by default
  if (recentResults.length >= 2) {
    const times = recentResults.map(r => r.timeTakenSeconds);
    const avgTime = times.reduce((s, t) => s + t, 0) / times.length;
    const variance = times.reduce((s, t) => s + Math.pow(t - avgTime, 2), 0) / times.length;
    const stdDev = Math.sqrt(variance);
    const cv = avgTime > 0 ? stdDev / avgTime : 0; // coefficient of variation
    timeConsistency = 1 - normalize(cv, 0, 2); // low cv = high consistency
  }

  // ─── Normalize all features to [0, 1] ──────────────────────
  return {
    avgAccuracy3: normalize(avgAccuracy3, 0, 100),
    avgAccuracy5: normalize(avgAccuracy5, 0, 100),
    engagementScore: normalize(engagementRaw, 0, 100),
    weakTopicCount: normalize(weakTopicCount, 0, 10),
    integrityScore: normalize(integrityScore, 0, 100),
    violationRate: normalize(violationRate, 0, 10),
    loginFrequency: normalize(loginFrequency, 0, 100),
    materialEngagement: normalize(materialEngagement, 0, 50),
    aiUsageIntensity: normalize(aiUsageIntensity, 0, 30),
    trendSlope,
    timeConsistency,
  };
};

/**
 * Convert a feature object into a numeric array matching FEATURE_NAMES order.
 * @param {object} features
 * @returns {number[]}
 */
export const featuresToVector = (features) => {
  return FEATURE_NAMES.map(name => features[name] ?? 0);
};