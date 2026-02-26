/**
 * Adaptive Recommendation Service Tests
 */
import { jest } from '@jest/globals';

const mockUserFindById = jest.fn();
const mockQuizResultFind = jest.fn();
const mockMaterialFind = jest.fn();
const mockChatCompletion = jest.fn();
const mockSafeParseJSON = jest.fn();

jest.unstable_mockModule('../../models/User.js', () => ({
  default: { findById: mockUserFindById },
}));

jest.unstable_mockModule('../../models/QuizResult.js', () => ({
  default: { find: mockQuizResultFind },
}));

jest.unstable_mockModule('../../models/Material.js', () => ({
  default: { find: mockMaterialFind },
}));

jest.unstable_mockModule('../../services/ai/groqClient.js', () => ({
  chatCompletion: mockChatCompletion,
  safeParseJSON: mockSafeParseJSON,
}));

jest.unstable_mockModule('../../services/ai/promptTemplates.js', () => ({
  buildRecommendationPrompt: jest.fn(() => ({
    system: 'sys',
    user: 'usr',
  })),
}));

const { getAdaptiveRecommendations } =
  await import('../../services/adaptiveRecommendationService.js');

describe('adaptiveRecommendationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Helper to set up all mocks for a complete flow
  const setupFullMocks = ({ user, quizResults = [], materials = [] }) => {
    mockUserFindById.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(user),
      }),
    });

    mockQuizResultFind.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnValue({
              lean: jest.fn().mockResolvedValue(quizResults),
            }),
          }),
        }),
      }),
    });

    mockMaterialFind.mockReturnValue({
      select: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue(materials),
          }),
        }),
      }),
    });
  };

  describe('getAdaptiveRecommendations', () => {
    it('should return AI-generated recommendations', async () => {
      setupFullMocks({
        user: {
          _id: 'u1',
          weakTopics: [{ topicName: 'DP', failureCount: 4 }],
          overallRiskLevel: 'MEDIUM',
          academicContext: 'ctx1',
        },
        quizResults: [{ accuracyPercentage: 55, quizId: { title: 'DP Quiz' } }],
        materials: [{ _id: 'm1', title: 'DP Notes' }],
      });

      const aiResponse = {
        priorityTopics: ['DP'],
        studyPlan: ['Review basics', 'Practice problems'],
        youtubeSearchTerms: ['dynamic programming tutorial'],
        motivationalNote: 'Keep going!',
      };

      mockChatCompletion.mockResolvedValue('json-str');
      mockSafeParseJSON.mockReturnValue(aiResponse);

      const result = await getAdaptiveRecommendations('u1');

      expect(result.priorityTopics).toEqual(['DP']);
      expect(result.studyPlan).toHaveLength(2);
      expect(result.youtubeSearchTerms).toHaveLength(1);
      expect(result.motivationalNote).toBe('Keep going!');
      expect(result.metadata).toBeDefined();
    });

    it('should throw 404 when user not found', async () => {
      setupFullMocks({ user: null });

      await expect(getAdaptiveRecommendations('missing')).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    it('should handle empty profile gracefully', async () => {
      setupFullMocks({
        user: {
          _id: 'u2',
          weakTopics: [],
          overallRiskLevel: 'LOW',
          academicContext: null,
        },
      });

      const aiResponse = {
        priorityTopics: [],
        studyPlan: ['Explore new topics'],
        youtubeSearchTerms: [],
        motivationalNote: 'Great start!',
      };

      mockChatCompletion.mockResolvedValue('json');
      mockSafeParseJSON.mockReturnValue(aiResponse);

      const result = await getAdaptiveRecommendations('u2');

      // Empty profile returns the fallback with welcome message
      expect(result.studyPlan).toEqual([]);
      expect(result.motivationalNote).toContain('Welcome');
      expect(result.metadata.dataAvailable).toBe(false);
    });
  });
});
