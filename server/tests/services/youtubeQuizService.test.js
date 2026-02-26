/**
 * YouTube Quiz Service Tests
 *
 * Tests controlled quiz generation with user-selected parameters.
 */
import { jest } from '@jest/globals';

const mockChatCompletion = jest.fn();
const mockSafeParseJSON = jest.fn();

jest.unstable_mockModule('../../services/ai/groqClient.js', () => ({
  chatCompletion: mockChatCompletion,
  safeParseJSON: mockSafeParseJSON,
}));

const { generateYoutubeQuiz } = await import('../../services/ai/youtubeQuizService.js');

describe('youtubeQuizService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const validQuizResponse = [
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
  ];

  it('should generate a quiz with valid questions and user-selected parameters', async () => {
    mockChatCompletion.mockResolvedValue('raw-json');
    mockSafeParseJSON.mockReturnValue(validQuizResponse);

    const result = await generateYoutubeQuiz({
      summaryContent: 'This video is about sorting algorithms with merge sort and quick sort.',
      questionCount: 10,
      difficulty: 'MEDIUM',
      userId: 'u1',
    });

    expect(result.questions).toHaveLength(2);
    expect(result.difficulty).toBe('MEDIUM');
    expect(result.questionCount).toBe(2);
    expect(result.generatedAt).toBeDefined();
    expect(result.questions[0].questionText).toBe('What is X?');
    expect(result.questions[0].options).toHaveLength(4);
    expect(result.questions[0].correctOptionIndex).toBe(0);
    expect(result.questions[0].explanation).toBeDefined();
  });

  it('should generate EASY difficulty questions with appropriate temperature', async () => {
    mockChatCompletion.mockResolvedValue('raw-json');
    mockSafeParseJSON.mockReturnValue(validQuizResponse);

    await generateYoutubeQuiz({
      summaryContent: 'Test summary content',
      questionCount: 5,
      difficulty: 'EASY',
      userId: 'u2',
    });

    expect(mockChatCompletion).toHaveBeenCalledWith(
      expect.objectContaining({
        temperature: 0.3,
      })
    );
  });

  it('should generate HARD difficulty questions with appropriate temperature', async () => {
    mockChatCompletion.mockResolvedValue('raw-json');
    mockSafeParseJSON.mockReturnValue(validQuizResponse);

    await generateYoutubeQuiz({
      summaryContent: 'Test summary content',
      questionCount: 15,
      difficulty: 'HARD',
      userId: 'u3',
    });

    expect(mockChatCompletion).toHaveBeenCalledWith(
      expect.objectContaining({
        temperature: 0.5,
      })
    );
  });

  it('should return fallback when AI returns invalid JSON format', async () => {
    mockChatCompletion.mockResolvedValue('garbage');
    mockSafeParseJSON.mockReturnValue(null);

    const result = await generateYoutubeQuiz({
      summaryContent: 'Test content',
      questionCount: 10,
      difficulty: 'MEDIUM',
      userId: 'u4',
    });

    expect(result.questions).toEqual([]);
    expect(result.error).toBeDefined();
  });

  it('should return fallback when AI returns non-array response', async () => {
    mockChatCompletion.mockResolvedValue('raw');
    mockSafeParseJSON.mockReturnValue({
      text: 'Not an array',
    });

    const result = await generateYoutubeQuiz({
      summaryContent: 'Test content',
      questionCount: 5,
      difficulty: 'EASY',
      userId: 'u5',
    });

    expect(result.questions).toEqual([]);
    expect(result.error).toBeDefined();
  });

  it('should filter out invalid questions but keep valid ones', async () => {
    mockChatCompletion.mockResolvedValue('raw');
    mockSafeParseJSON.mockReturnValue([
      { 
        questionText: 'Valid Q', 
        options: ['A', 'B', 'C', 'D'], 
        correctOptionIndex: 1, 
        explanation: 'This is correct because...' 
      },
      { questionText: 'Invalid', options: ['A', 'B'] },
      { 
        questionText: 'Another valid', 
        options: ['W', 'X', 'Y', 'Z'], 
        correctOptionIndex: 3, 
        explanation: 'Explanation here' 
      },
    ]);

    const result = await generateYoutubeQuiz({
      summaryContent: 'Test content',
      questionCount: 10,
      difficulty: 'MEDIUM',
      userId: 'u6',
    });

    expect(result.questions).toHaveLength(2);
    expect(result.questions[0].questionText).toBe('Valid Q');
    expect(result.questions[1].questionText).toBe('Another valid');
  });

  it('should reject empty summary content', async () => {
    const result = await generateYoutubeQuiz({
      summaryContent: '',
      questionCount: 10,
      difficulty: 'MEDIUM',
      userId: 'u7',
    });

    expect(result.questions).toEqual([]);
    expect(result.error).toContain('empty');
  });
});
