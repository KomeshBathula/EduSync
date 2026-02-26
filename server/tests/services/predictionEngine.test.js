/**
 * Prediction Engine (Hybrid) Tests
 */
import { jest } from '@jest/globals';

const mockUserFindById = jest.fn();
const mockQuizResultFind = jest.fn();
const mockCreateNotification = jest.fn();
const mockPredictRisk = jest.fn();
const mockMLAuditLogCreate = jest.fn();

jest.unstable_mockModule('../../models/User.js', () => ({
  default: { findById: mockUserFindById },
}));

jest.unstable_mockModule('../../models/QuizResult.js', () => ({
  default: { find: mockQuizResultFind },
}));

jest.unstable_mockModule('../../services/notificationService.js', () => ({
  createNotification: mockCreateNotification,
}));

jest.unstable_mockModule('../../ml/inferenceService.js', () => ({
  predictRisk: mockPredictRisk,
}));

jest.unstable_mockModule('../../models/MLAuditLog.js', () => ({
  default: { create: mockMLAuditLogCreate },
}));

const { evaluateRisk, evaluateRiskRuleBased } =
  await import('../../services/ai/predictionEngine.js');

describe('predictionEngine (Hybrid)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateNotification.mockResolvedValue({});
    mockMLAuditLogCreate.mockResolvedValue({});
  });

  const createMockStudent = (overrides = {}) => ({
    _id: 'stu1',
    overallRiskLevel: 'LOW',
    aiDoubtUsageCount: 0,
    youtubeSummaryCount: 0,
    revisionPlanCount: 0,
    materialViewCount: 0,
    weakTopics: [],
    save: jest.fn().mockResolvedValue(true),
    ...overrides,
  });

  const setupMocks = ({ student, quizResults = [] }) => {
    mockUserFindById.mockResolvedValue(student);
    mockQuizResultFind.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        limit: jest.fn().mockResolvedValue(quizResults),
      }),
    });
  };

  describe('evaluateRiskRuleBased', () => {
    it('should return LOW for high accuracy and engagement', () => {
      const student = createMockStudent({
        aiDoubtUsageCount: 5,
        materialViewCount: 10,
      });
      const results = [
        { accuracyPercentage: 85 },
        { accuracyPercentage: 90 },
        { accuracyPercentage: 88 },
      ];

      expect(evaluateRiskRuleBased(student, results)).toBe('LOW');
    });

    it('should return HIGH for low accuracy, low engagement, many weaknesses', () => {
      const student = createMockStudent({
        weakTopics: [
          { topicName: 'A', failureCount: 3 },
          { topicName: 'B', failureCount: 4 },
        ],
      });
      const results = [
        { accuracyPercentage: 30 },
        { accuracyPercentage: 25 },
        { accuracyPercentage: 35 },
      ];

      expect(evaluateRiskRuleBased(student, results)).toBe('HIGH');
    });

    it('should return MEDIUM for moderate conditions', () => {
      const student = createMockStudent();
      const results = [
        { accuracyPercentage: 55 },
        { accuracyPercentage: 60 },
      ];

      expect(evaluateRiskRuleBased(student, results)).toBe('MEDIUM');
    });
  });

  describe('evaluateRisk (hybrid)', () => {
    it('should use rule-based when ML is not available', async () => {
      const student = createMockStudent();
      setupMocks({
        student,
        quizResults: [{ accuracyPercentage: 85 }, { accuracyPercentage: 90 }],
      });
      mockPredictRisk.mockResolvedValue(null);

      const result = await evaluateRisk('stu1');

      expect(result).toBe('LOW');
      expect(student.save).toHaveBeenCalled();
    });

    it('should use ML prediction when confidence exceeds threshold', async () => {
      const student = createMockStudent();
      setupMocks({
        student,
        quizResults: [{ accuracyPercentage: 85 }, { accuracyPercentage: 90 }],
      });
      mockPredictRisk.mockResolvedValue({
        predictedClass: 'MEDIUM',
        confidence: 0.85,
        probabilityDistribution: { LOW: 0.1, MEDIUM: 0.85, HIGH: 0.05 },
      });

      const result = await evaluateRisk('stu1');

      // ML says MEDIUM with high confidence, should override rule-based LOW
      expect(result).toBe('MEDIUM');
      expect(student.lastMLPrediction).toBe('MEDIUM');
      expect(student.predictionConfidence).toBe(0.85);
    });

    it('should fall back to rule-based when ML confidence is low', async () => {
      const student = createMockStudent();
      setupMocks({
        student,
        quizResults: [{ accuracyPercentage: 85 }, { accuracyPercentage: 90 }],
      });
      mockPredictRisk.mockResolvedValue({
        predictedClass: 'HIGH',
        confidence: 0.40,
        probabilityDistribution: { LOW: 0.3, MEDIUM: 0.3, HIGH: 0.4 },
      });

      const result = await evaluateRisk('stu1');

      // ML confidence too low, should use rule-based
      expect(result).toBe('LOW');
    });

    it('should fall back to rule-based when ML throws', async () => {
      const student = createMockStudent();
      setupMocks({
        student,
        quizResults: [{ accuracyPercentage: 85 }, { accuracyPercentage: 90 }],
      });
      mockPredictRisk.mockRejectedValue(new Error('ML service down'));

      const result = await evaluateRisk('stu1');

      expect(result).toBe('LOW');
    });

    it('should notify on risk level change', async () => {
      const student = createMockStudent({ overallRiskLevel: 'LOW' });
      setupMocks({
        student,
        quizResults: [
          { accuracyPercentage: 30 },
          { accuracyPercentage: 25 },
          { accuracyPercentage: 35 },
        ],
      });
      mockPredictRisk.mockResolvedValue(null);

      // Student has low accuracy + low engagement + weaknesses added manually
      student.weakTopics = [
        { topicName: 'A', failureCount: 3 },
        { topicName: 'B', failureCount: 4 },
      ];

      await evaluateRisk('stu1');

      expect(mockCreateNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'stu1',
          type: 'RISK',
        }),
      );
    });

    it('should store both ML and rule predictions', async () => {
      const student = createMockStudent();
      setupMocks({
        student,
        quizResults: [{ accuracyPercentage: 85 }, { accuracyPercentage: 90 }],
      });
      mockPredictRisk.mockResolvedValue({
        predictedClass: 'MEDIUM',
        confidence: 0.9,
        probabilityDistribution: { LOW: 0.05, MEDIUM: 0.9, HIGH: 0.05 },
      });

      await evaluateRisk('stu1');

      expect(student.lastMLPrediction).toBe('MEDIUM');
      expect(student.lastRulePrediction).toBe('LOW');
      expect(student.predictionConfidence).toBe(0.9);
    });

    it('should handle missing student gracefully', async () => {
      mockUserFindById.mockResolvedValue(null);

      const result = await evaluateRisk('missing');

      expect(result).toBeUndefined();
    });
  });
});
