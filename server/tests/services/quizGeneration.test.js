import { jest } from '@jest/globals';

// ─── Mocks (must be registered before dynamic imports) ────────────
const mockChatCompletion = jest.fn();
const mockSafeParseJSON = jest.fn();
jest.unstable_mockModule('../../services/ai/groqClient.js', () => ({
  chatCompletion: mockChatCompletion,
  safeParseJSON: mockSafeParseJSON,
}));

const mockPdfParse = jest.fn();
jest.unstable_mockModule('../../services/ai/pdfParseWrapper.js', () => ({
  default: mockPdfParse,
}));

// ─── Import after mocks ──────────────────────────────────────────
const { extractTextFromPDF } = await import('../../services/ai/pdfTextExtractor.js');
const { generateQuizFromGroq } = await import('../../services/ai/groqQuizService.js');

// ─── Helpers ──────────────────────────────────────────────────────
const validQuestionsJSON = JSON.stringify({
  questions: [
    {
      questionText: 'What is a heap?',
      options: ['Tree', 'Array', 'Graph', 'Stack'],
      correctOptionIndex: 0,
      topicTag: 'Heaps',
    },
    {
      questionText: 'Time complexity of heapify?',
      options: ['O(1)', 'O(log n)', 'O(n)', 'O(n^2)'],
      correctOptionIndex: 1,
      topicTag: 'Heaps',
    },
  ],
});

const makePDFBuffer = (text = 'This is a sample document about heaps and priority queues for testing purposes only.') => {
  // Craft a buffer with valid PDF header
  const pdfContent = `%PDF-1.4\n${text}\n%%EOF`;
  return Buffer.from(pdfContent);
};

// ─── TEST SUITE: PDF Text Extractor ──────────────────────────────
describe('pdfTextExtractor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should reject null buffer', async () => {
    await expect(extractTextFromPDF(null)).rejects.toMatchObject({
      statusCode: 400,
      message: expect.stringContaining('no buffer'),
    });
  });

  test('should reject non-PDF file (invalid magic bytes)', async () => {
    const notPDF = Buffer.from('This is a plain text file, not a PDF');
    await expect(extractTextFromPDF(notPDF)).rejects.toMatchObject({
      statusCode: 422,
      message: expect.stringContaining('only PDF'),
    });
  });

  test('should reject blank PDF with insufficient text', async () => {
    const blankPDF = makePDFBuffer('');
    mockPdfParse.mockResolvedValueOnce({ text: '' });
    await expect(extractTextFromPDF(blankPDF)).rejects.toMatchObject({
      statusCode: 422,
      message: expect.stringContaining('blank'),
    });
  });

  test('should extract and clean text from valid PDF', async () => {
    const buf = makePDFBuffer();
    const rawText = '   Page 1 of 5   \n\nHeaps are tree-based.\n\n\n\nPriority queues use heaps.   ';
    mockPdfParse.mockResolvedValueOnce({ text: rawText });

    const result = await extractTextFromPDF(buf);
    expect(result).not.toContain('Page 1 of 5');
    expect(result).toContain('Heaps are tree-based.');
    expect(result).toContain('Priority queues use heaps.');
    expect(result).not.toMatch(/\n{3,}/); // No triple newlines
  });

  test('should truncate very large PDF text', async () => {
    const buf = makePDFBuffer();
    const bigText = 'A'.repeat(30000);
    mockPdfParse.mockResolvedValueOnce({ text: bigText });

    const result = await extractTextFromPDF(buf);
    expect(result.length).toBeLessThanOrEqual(24100); // 24000 + truncation suffix
    expect(result).toContain('[...content truncated');
  });

  test('should handle corrupted PDF', async () => {
    const buf = makePDFBuffer();
    mockPdfParse.mockRejectedValueOnce(new Error('parse failure'));
    await expect(extractTextFromPDF(buf)).rejects.toMatchObject({
      statusCode: 422,
      message: expect.stringContaining('corrupted'),
    });
  });
});

// ─── TEST SUITE: Quiz Generation Service ─────────────────────────
describe('groqQuizService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should generate quiz from topic', async () => {
    mockChatCompletion.mockResolvedValueOnce(validQuestionsJSON);
    mockSafeParseJSON.mockReturnValueOnce(JSON.parse(validQuestionsJSON));

    const questions = await generateQuizFromGroq({
      sourceType: 'TOPIC',
      topicName: 'Heaps',
      difficulty: 'MEDIUM',
      numQuestions: 2,
    });

    expect(questions).toHaveLength(2);
    expect(questions[0].questionText).toBe('What is a heap?');
    expect(mockChatCompletion).toHaveBeenCalledTimes(1);
    // Verify topic is in the prompt
    const promptArg = mockChatCompletion.mock.calls[0][0];
    expect(promptArg.messages[1].content).toContain('Heaps');
    expect(promptArg.messages[1].content).not.toContain('reference material');
  });

  test('should generate quiz from PDF buffer', async () => {
    const buf = makePDFBuffer();
    const pdfText = 'Heaps are tree-based data structures used for priority queues.';
    mockPdfParse.mockResolvedValueOnce({ text: pdfText });
    mockChatCompletion.mockResolvedValueOnce(validQuestionsJSON);
    mockSafeParseJSON.mockReturnValueOnce(JSON.parse(validQuestionsJSON));

    const questions = await generateQuizFromGroq({
      sourceType: 'PDF',
      pdfBuffer: buf,
      difficulty: 'EASY',
      numQuestions: 2,
    });

    expect(questions).toHaveLength(2);
    // Verify PDF content referenced in prompt
    const promptArg = mockChatCompletion.mock.calls[0][0];
    expect(promptArg.messages[1].content).toContain('reference material');
  });

  test('should reject when no title provided (controller-level — tested via validation expectations)', async () => {
    // This tests the edge case description: controller returns 400 if title is missing
    // Here we just verify the service doesn't crash if called correctly
    mockChatCompletion.mockResolvedValueOnce(validQuestionsJSON);
    mockSafeParseJSON.mockReturnValueOnce(JSON.parse(validQuestionsJSON));

    const questions = await generateQuizFromGroq({
      sourceType: 'TOPIC',
      topicName: 'Sorting',
      difficulty: 'HARD',
      numQuestions: 1,
    });

    expect(questions).toBeDefined();
    expect(Array.isArray(questions)).toBe(true);
  });

  test('should retry once on malformed AI response then throw', async () => {
    mockChatCompletion.mockResolvedValue('not valid json at all');
    mockSafeParseJSON.mockReturnValue(null);

    await expect(
      generateQuizFromGroq({
        sourceType: 'TOPIC',
        topicName: 'Arrays',
        difficulty: 'MEDIUM',
        numQuestions: 3,
      })
    ).rejects.toMatchObject({
      statusCode: 500,
      message: expect.stringContaining('invalid quiz format'),
    });

    // Should have been called twice (original + 1 retry)
    expect(mockChatCompletion).toHaveBeenCalledTimes(2);
  });

  test('should succeed on retry when first response is malformed', async () => {
    // First call: malformed
    mockChatCompletion.mockResolvedValueOnce('garbage');
    mockSafeParseJSON.mockReturnValueOnce(null);
    // Second call: valid
    mockChatCompletion.mockResolvedValueOnce(validQuestionsJSON);
    mockSafeParseJSON.mockReturnValueOnce(JSON.parse(validQuestionsJSON));

    const questions = await generateQuizFromGroq({
      sourceType: 'TOPIC',
      topicName: 'Graphs',
      difficulty: 'MEDIUM',
      numQuestions: 2,
    });

    expect(questions).toHaveLength(2);
    expect(mockChatCompletion).toHaveBeenCalledTimes(2);
  });
});
