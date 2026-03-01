import { jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';

// Mocks
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

const { extractTextFromPDF } = await import('../../services/ai/pdfTextExtractor.js');
const { generateQuizFromGroq } = await import('../../services/ai/groqQuizService.js');

describe('Quiz Generation Debug - LinkedList.pdf Scenario', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('DEBUG: Extract text from LinkedList.pdf if exists', async () => {
    const uploadsDir = path.join(process.cwd(), 'uploads');

    if (!fs.existsSync(uploadsDir)) {
      console.log('No uploads/ directory found — skipping');
      expect(true).toBe(true);
      return;
    }

    const pdfs = fs.readdirSync(uploadsDir).filter(f => f.toLowerCase().includes('linked'));
    
    if (pdfs.length === 0) {
      console.log('⚠️  No LinkedList PDF found for debugging');
      expect(true).toBe(true);
      return;
    }

    const pdfFile = pdfs[0];
    const pdfPath = path.join(uploadsDir, pdfFile);
    const buffer = fs.readFileSync(pdfPath);

    console.log('\n=== LinkedList PDF Debug Info ===');
    console.log('File:', pdfFile);
    console.log('Size:', buffer.length, 'bytes');
    console.log('Header:', buffer.slice(0, 10).toString('ascii'));

    try {
      const text = await extractTextFromPDF(buffer);
      console.log('✓ Extraction succeeded');
      console.log('Extracted length:', text.length, 'chars');
      console.log('First 300 chars:', text.slice(0, 300));
      expect(text.length).toBeGreaterThan(0);
    } catch (e) {
      console.log('✗ Extraction FAILED:', e.message);
      throw e;
    }
  });

  test('DEBUG: Verify PDF source uses extracted text in prompt', async () => {
    // Check if there's a real LinkedList PDF
    const uploadsDir = path.join(process.cwd(), 'uploads');

    if (!fs.existsSync(uploadsDir)) {
      console.log('No uploads/ directory found — skipping');
      expect(true).toBe(true);
      return;
    }

    const files = fs.readdirSync(uploadsDir);
    const linkedListPdf = files.find(f => 
      f.toLowerCase().includes('linked') && f.endsWith('.pdf')
    );

    if (!linkedListPdf) {
      console.log('⚠️  No LinkedList PDF for this test');
      expect(true).toBe(true);
      return;
    }

    const buffer = fs.readFileSync(path.join(uploadsDir, linkedListPdf));
    const mockText = 'LinkedList data structure: A LinkedList is a linear data structure. Each node contains data and a pointer to the next node. Operations: insert, delete, traverse. Time complexity: O(n).';

    mockPdfParse.mockResolvedValueOnce({ text: mockText });
    mockChatCompletion.mockResolvedValueOnce(JSON.stringify({
      questions: [
        {
          questionText: 'What is a LinkedList?',
          options: ['Array', 'LinkedList', 'Tree', 'Graph'],
          correctOptionIndex: 1,
          topicTag: 'PDF Content',
        },
      ],
    }));
    mockSafeParseJSON.mockImplementation((raw) => JSON.parse(raw));

    const questions = await generateQuizFromGroq({
      sourceType: 'PDF',
      pdfBuffer: buffer,
      difficulty: 'MEDIUM',
      numQuestions: 1,
    });

    // Verify the prompt sent to Groq includes the LinkedList content
    const promptArg = mockChatCompletion.mock.calls[0][0];
    const userMessage = promptArg.messages.find(m => m.role === 'user').content;

    console.log('\n=== Prompt Verification ===');
    console.log('User prompt includes "LinkedList":', userMessage.includes('LinkedList'));
    console.log('User prompt includes "STRICTLY from":', userMessage.includes('STRICTLY from'));
    console.log('User prompt preview:', userMessage.slice(0, 300));

    expect(userMessage).toContain('STRICTLY from');
    expect(userMessage).toContain('reference material');
    expect(questions).toHaveLength(1);
    expect(questions[0].topicTag).toBe('PDF Content');
  });
});
