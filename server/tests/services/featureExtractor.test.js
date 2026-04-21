/**
 * Feature Extractor Tests
 */
import { jest } from '@jest/globals';

const mockUserFindById = jest.fn();
const mockQuizResultFind = jest.fn();
const mockQuizResultCountDocuments = jest.fn();
const mockIntegrityEventCountDocuments = jest.fn();

jest.unstable_mockModule('../../models/User.js', () => ({
  default: {
    findById: mockUserFindById,
  },
}));

jest.unstable_mockModule('../../models/QuizResult.js', () => ({
  default: {
    find: mockQuizResultFind,
    countDocuments: mockQuizResultCountDocuments,
  },
}));

jest.unstable_mockModule('../../models/IntegrityEvent.js', () => ({
  default: {
    countDocuments: mockIntegrityEventCountDocuments,
  },
  VIOLATION_TYPES: [],
}));

const { extractFeatures, featuresToVector, FEATURE_COUNT, FEATURE_NAMES } =
  await import('../../ml/featureExtractor.js');

describe('featureExtractor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const setupMocks = ({
    student = {},
    quizResults = [],
    totalExams = 0,
    totalViolations = 0,
    autoSubmitted = 0,
  } = {}) => {
    mockUserFindById.mockReturnValue({
      lean: jest.fn().mockResolvedValue(student),
    });
    mockQuizResultFind.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(quizResults),
        }),
      }),
    });
    mockQuizResultCountDocuments.mockResolvedValue(totalExams);
    mockIntegrityEventCountDocuments.mockImplementation((filter) => {
      if (filter.autoSubmitted) return Promise.resolve(autoSubmitted);
      return Promise.resolve(totalViolations);
    });
  };

  describe('extractFeatures', () => {
    it('should throw when student not found', async () => {
      mockUserFindById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      await expect(extractFeatures('missing')).rejects.toThrow('Student not found');
    });

    it('should return normalized features for a student with data', async () => {
      setupMocks({
        student: {
          _id: 's1',
          aiDoubtUsageCount: 5,
          revisionPlanCount: 2,
          materialViewCount: 10,
          weakTopics: [
            { topicName: 'DP', failureCount: 3 },
            { topicName: 'Arrays', failureCount: 1 },
          ],
          integrityScore: 85,
          loginCount: 20,
        },
        quizResults: [
          { accuracyPercentage: 70, timeTakenSeconds: 300 },
          { accuracyPercentage: 60, timeTakenSeconds: 350 },
          { accuracyPercentage: 50, timeTakenSeconds: 280 },
        ],
        totalExams: 5,
        totalViolations: 3,
      });

      const features = await extractFeatures('s1');

      // All features should be numbers between 0 and 1
      for (const name of FEATURE_NAMES) {
        expect(typeof features[name]).toBe('number');
        expect(features[name]).toBeGreaterThanOrEqual(0);
        expect(features[name]).toBeLessThanOrEqual(1);
      }

      // Check specific values
      expect(features.avgAccuracy3).toBeCloseTo(0.6, 1); // (70+60+50)/3 / 100
      expect(features.integrityScore).toBeCloseTo(0.85, 2);
      expect(features.weakTopicCount).toBeCloseTo(0.2, 1); // 2/10
    });

    it('should handle student with no quiz results', async () => {
      setupMocks({
        student: {
          _id: 's2',
          aiDoubtUsageCount: 0,
          revisionPlanCount: 0,
          materialViewCount: 0,
          weakTopics: [],
          integrityScore: 100,
          loginCount: 1,
        },
        quizResults: [],
        totalExams: 0,
        totalViolations: 0,
      });

      const features = await extractFeatures('s2');

      expect(features.avgAccuracy3).toBeCloseTo(0.5, 1); // neutral default
      expect(features.avgAccuracy5).toBeCloseTo(0.5, 1);
      expect(features.engagementScore).toBe(0);
      expect(features.weakTopicCount).toBe(0);
      expect(features.integrityScore).toBe(1.0); // 100/100
      expect(features.violationRate).toBe(0);
      expect(features.timeConsistency).toBe(1); // default high consistency
    });

    it('should detect HIGH risk pattern: low engagement + high violations', async () => {
      setupMocks({
        student: {
          _id: 's3',
          aiDoubtUsageCount: 0,
          revisionPlanCount: 0,
          materialViewCount: 0,
          weakTopics: [
            { topicName: 'A', failureCount: 5 },
            { topicName: 'B', failureCount: 4 },
            { topicName: 'C', failureCount: 3 },
          ],
          integrityScore: 30,
          loginCount: 2,
        },
        quizResults: [
          { accuracyPercentage: 20, timeTakenSeconds: 100 },
          { accuracyPercentage: 25, timeTakenSeconds: 500 },
          { accuracyPercentage: 15, timeTakenSeconds: 80 },
        ],
        totalExams: 3,
        totalViolations: 15,
      });

      const features = await extractFeatures('s3');

      // Low accuracy
      expect(features.avgAccuracy3).toBeLessThan(0.3);
      // Low engagement
      expect(features.engagementScore).toBe(0);
      // Low integrity
      expect(features.integrityScore).toBeLessThan(0.4);
      // High violation rate
      expect(features.violationRate).toBeGreaterThan(0);
    });

    it('should detect LOW risk pattern: high accuracy + low violations', async () => {
      setupMocks({
        student: {
          _id: 's4',
          aiDoubtUsageCount: 10,
          revisionPlanCount: 3,
          materialViewCount: 20,
          weakTopics: [],
          integrityScore: 98,
          loginCount: 50,
        },
        quizResults: [
          { accuracyPercentage: 95, timeTakenSeconds: 300 },
          { accuracyPercentage: 90, timeTakenSeconds: 310 },
          { accuracyPercentage: 92, timeTakenSeconds: 305 },
        ],
        totalExams: 10,
        totalViolations: 0,
      });

      const features = await extractFeatures('s4');

      // High accuracy
      expect(features.avgAccuracy3).toBeGreaterThan(0.9);
      // High engagement
      expect(features.engagementScore).toBeGreaterThan(0.5);
      // High integrity
      expect(features.integrityScore).toBeGreaterThan(0.95);
      // No violations
      expect(features.violationRate).toBe(0);
      // High consistency (similar time spent)
      expect(features.timeConsistency).toBeGreaterThan(0.8);
    });
  });

  describe('featuresToVector', () => {
    it('should convert feature object to array of correct length', () => {
      const features = {};
      FEATURE_NAMES.forEach(name => { features[name] = Math.random(); });

      const vector = featuresToVector(features);

      expect(vector).toHaveLength(FEATURE_COUNT);
      expect(vector.every(v => typeof v === 'number')).toBe(true);
    });

    it('should default to 0 for missing features', () => {
      const vector = featuresToVector({});

      expect(vector).toHaveLength(FEATURE_COUNT);
      expect(vector.every(v => v === 0)).toBe(true);
    });
  });

  describe('FEATURE_COUNT', () => {
    it('should match the number of FEATURE_NAMES', () => {
      expect(FEATURE_COUNT).toBe(FEATURE_NAMES.length);
      expect(FEATURE_COUNT).toBe(11);
    });
  });
});
