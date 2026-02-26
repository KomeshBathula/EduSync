/**
 * YouTube Quiz Service Tests
 *
 * Tests risk-adaptive quiz generation via Groq.
 */
import { jest } from '@jest/globals';

const mockUserFindById = jest.fn();
const mockChatCompletion = jest.fn();
const mockSafeParseJSON = jest.fn();

jest.unstable_mockModule('../../models/User.js', () => ({
  default: {
    findById: mockUserFindById,
  },
}));

jest.unstable_mockModule('../../services/ai/groqClient.js', () => ({
  chatCompletion: mockChatCompletion,
  safeParseJSON: mockSafeParseJSON,
}));

jest.unstable_mockModule('../../services/ai/promptTemplates.js', () => ({
  buildYoutubeQuizPrompt: jest.fn(({ riskLevel }) => ({
    system: `system-prompt-${riskLevel}`,
    user: 'user-prompt',
  })),
}));

const { generateYoutubeQuiz } = await import('../../services/ai/youtubeQuizService.js');

describe('youtubeQuizService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const validQuizResponse = {
    questions: [
      {
        questionText: 'What is X?',
        options: ['A', 'B', 'C', 'D'],
        correctOptionIndex: 0,
        explanation: 'Because A is correct.',
      },
      {
        questionText: 'What is Y?',
        options: ['A', 'B', 'C', 'D'],
        correctOptionIndex: 2,
        explanation: 'Because C.',
      },
    ],
  };

  it('should generate a quiz with valid questions and risk level', async () => {
    mockUserFindById.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({ overallRiskLevel: 'MEDIUM' }),
      }),
    });
    mockChatCompletion.mockResolvedValue('raw-json');
    mockSafeParseJSON.mockReturnValue(validQuizResponse);

    const result = await generateYoutubeQuiz({
      summary: 'This video is about sorting algorithms.',
      keyConcepts: ['Merge Sort', 'Quick Sort'],
      title: 'Sorting Explained',
      userId: 'u1',
    });

    expect(result.questions).toHaveLength(2);
    expect(result.riskLevel).toBe('MEDIUM');
    expect(result.generatedAt).toBeDefined();
    expect(result.questions[0].questionText).toBe('What is X?');
    expect(result.questions[0].options).toHaveLength(4);
    expect(result.questions[0].correctOptionIndex).toBe(0);
  });

  it('should default to LOW risk when user has no riskLevel', async () => {
    mockUserFindById.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({}),
      }),
    });
    mockChatCompletion.mockResolvedValue('raw-json');
    mockSafeParseJSON.mockReturnValue(validQuizResponse);

    const result = await generateYoutubeQuiz({
      summary: 'Test summary',
      userId: 'u2',
    });

    expect(result.riskLevel).toBe('LOW');
  });

  it('should default to LOW risk when user lookup fails', async () => {
    mockUserFindById.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockRejectedValue(new Error('DB error')),
      }),
    });
    mockChatCompletion.mockResolvedValue('raw-json');
    mockSafeParseJSON.mockReturnValue(validQuizResponse);

    const result = await generateYoutubeQuiz({
      summary: 'Test summary',
      userId: 'u3',
    });

    expect(result.riskLevel).toBe('LOW');
  });

  it('should return fallback when AI returns invalid JSON', async () => {
    mockUserFindById.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({ overallRiskLevel: 'HIGH' }),
      }),
    });
    mockChatCompletion.mockResolvedValue('garbage');
    mockSafeParseJSON.mockReturnValue(null);

    const result = await generateYoutubeQuiz({
      summary: 'Test',
      userId: 'u4',
    });

    expect(result.questions).toEqual([]);
    expect(result.error).toBeDefined();
  });

  it('should return fallback when AI returns questions with invalid structure', async () => {
    mockUserFindById.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({}),
      }),
    });
    mockChatCompletion.mockResolvedValue('raw');
    mockSafeParseJSON.mockReturnValue({
      questions: [
        { questionText: 'No options' }, // Missing options
        { options: ['A', 'B'], correctOptionIndex: 0 }, // Missing questionText
      ],
    });

    const result = await generateYoutubeQuiz({
      summary: 'Test',
      userId: 'u5',
    });

    expect(result.questions).toEqual([]);
    expect(result.error).toBeDefined();
  });

  it('should filter out invalid questions but keep valid ones', async () => {
    mockUserFindById.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({}),
      }),
    });
    mockChatCompletion.mockResolvedValue('raw');
    mockSafeParseJSON.mockReturnValue({
      questions: [
        { questionText: 'Valid Q', options: ['A', 'B', 'C', 'D'], correctOptionIndex: 1, explanation: 'Ok' },
        { questionText: 'Invalid', options: ['A', 'B'] }, // Only 2 options
      ],
    });

    const result = await generateYoutubeQuiz({
      summary: 'Test',
      userId: 'u6',
    });

    expect(result.questions).toHaveLength(1);
    expect(result.questions[0].questionText).toBe('Valid Q');
  });
});
