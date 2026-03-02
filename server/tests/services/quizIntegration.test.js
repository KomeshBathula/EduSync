/**
 * Integration test: Simulate exact quiz generation flow with PDF
 * This helps identify where PDFs get lost in the pipeline
 */
import { jest } from '@jest/globals';

// Mock Groq responses
const mockValidQuizResponse = JSON.stringify({
  questions: [
    {
      questionText: 'What data structure uses nodes with pointers?',
      options: ['Array', 'LinkedList', 'Stack', 'Queue'],
      correctOptionIndex: 1,
      explanation: 'A LinkedList uses nodes that contain data and pointers to the next node in the sequence.',
      topicTag: 'LinkedList',
    },
    {
      questionText: 'What is the time complexity of inserting at the beginning?',
      options: ['O(1)', 'O(n)', 'O(log n)', 'O(n\u00b2)'],
      correctOptionIndex: 0,
      explanation: 'Inserting at the beginning of a linked list is O(1) since we only update the head pointer.',
      topicTag: 'LinkedList',
    },
  ],
});

const mockRandomResponse = JSON.stringify({
  questions: [
    {
      questionText: 'Who wrote To Kill a Mockingbird?',
      options: ['Harper Lee', 'Mark Twain', 'F. Scott Fitzgerald', 'Jane Austen'],
      correctOptionIndex: 0,
      explanation: 'Harper Lee wrote To Kill a Mockingbird, published in 1960.',
      topicTag: 'Literature',
    },
  ],
});

// Setup mocks BEFORE importing
const mockChatCompletion = jest.fn();
const mockSafeParseJSON = jest.fn();

jest.unstable_mockModule('../../services/ai/groqClient.js', () => ({
  chatCompletion: mockChatCompletion,
  safeParseJSON: mockSafeParseJSON,
}));

const mockExtractTextFromPDF = jest.fn();
jest.unstable_mockModule('../../services/ai/pdfTextExtractor.js', () => ({
  extractTextFromPDF: mockExtractTextFromPDF,
}));

const { generateQuizFromGroq } = await import('../../services/ai/groqQuizService.js');

describe('Integration: PDF Quiz Generation Pipeline', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('Scenario 1: PDF with LinkedList content should generate LinkedList questions', async () => {
    // Simulate extracting LinkedList content from a PDF
    const linkedListText = `
      LinkedList Data Structure
      A LinkedList is a linear data structure where elements are stored in nodes.
      Each node contains data and a reference (pointer) to the next node.
      
      Operations:
      - Insert: Add element to beginning O(1), to end O(n)
      - Delete: Remove element O(n)
      - Traverse: Visit all nodes O(n)
      - Search: Find element O(n)
      
      Advantages: Dynamic size, efficient insertion/deletion at beginning
      Disadvantages: Random access not possible, extra memory for pointers
      
      Types: Singly LinkedList, Doubly LinkedList, Circular LinkedList
    `;

    // Mock the PDF extractor to return LinkedList content
    mockExtractTextFromPDF.mockResolvedValueOnce(linkedListText);
    
    // Mock Groq to return LinkedList-related questions
    mockChatCompletion.mockResolvedValueOnce(mockValidQuizResponse);
    mockSafeParseJSON.mockReturnValueOnce(JSON.parse(mockValidQuizResponse));

    // Generate quiz from PDF
    const questions = await generateQuizFromGroq({
      sourceType: 'PDF',
      pdfBuffer: Buffer.from('SomePDFBuffer'),
      difficulty: 'MEDIUM',
      numQuestions: 2,
    });

    // Verify the prompt to Groq contains LinkedList content
    expect(mockChatCompletion).toHaveBeenCalledTimes(1);
    const callArgs = mockChatCompletion.mock.calls[0][0];
    const userPrompt = callArgs.messages.find(m => m.role === 'user').content;

    console.log('\n=== SCENARIO 1: PDF with LinkedList Content ===');
    console.log('✓ PDF text extracted length:', linkedListText.length);
    console.log('✓ User prompt includes LinkedList:', userPrompt.includes('LinkedList'));
    console.log('✓ User prompt includes "STRICTLY":', userPrompt.includes('STRICTLY from'));
    console.log('✓ Generated questions about:', questions[0].topicTag);

    expect(userPrompt).toContain('LinkedList');
    expect(userPrompt).toContain('STRICTLY from');
    expect(questions).toHaveLength(2);
    expect(questions[0].options).toContain('LinkedList');
  });

  test('Scenario 2: PDF extraction error should NOT call Groq', async () => {
    // Simulate PDF extraction failure
    mockExtractTextFromPDF.mockRejectedValueOnce(new Error('PDF has no text'));

    console.log('\n=== SCENARIO 2: Empty/Corrupted PDF ===');

    try {
      await generateQuizFromGroq({
        sourceType: 'PDF',
        pdfBuffer: Buffer.from('CorruptedPDF'),
        difficulty: 'MEDIUM',
        numQuestions: 1,
      });
      fail('Should have thrown an error');
    } catch (e) {
      expect(e.message).toContain('PDF has no text');
      console.log('✓ Correctly threw error');
      console.log('✓ Groq was NOT called:', mockChatCompletion.mock.calls.length === 0);
      expect(mockChatCompletion).not.toHaveBeenCalled();
    }
  });

  test('Scenario 3: Topic mode should NOT extract PDF', async () => {
    mockChatCompletion.mockResolvedValueOnce(mockValidQuizResponse);
    mockSafeParseJSON.mockReturnValueOnce(JSON.parse(mockValidQuizResponse));

    const questions = await generateQuizFromGroq({
      sourceType: 'TOPIC',
      topicName: 'LinkedList',
      pdfBuffer: null, // PDF explicitly not used
      difficulty: 'MEDIUM',
      numQuestions: 1,
    });

    // Verify PDF extractor was NOT called
    expect(mockExtractTextFromPDF).not.toHaveBeenCalled();

    // Verify prompt mentions topic, not PDF reference material
    const callArgs = mockChatCompletion.mock.calls[0][0];
    const userPrompt = callArgs.messages.find(m => m.role === 'user').content;

    console.log('\n=== SCENARIO 3: Topic Mode ===');
    console.log('✓ PDF extractor NOT called');
    console.log('✓ Prompt mentions topic "LinkedList":', userPrompt.includes('LinkedList'));
    console.log('✓ Prompt says "Generate the questions on the topic":', userPrompt.includes('on the topic'));

    expect(userPrompt).toContain('LinkedList');
    expect(userPrompt).toContain('on the topic');
  });

  test('Scenario 4: Groq receives the actual PDF content in the prompt', async () => {
    const specificPDFContent = 'LinkedList: Each node stores data and a pointer to the next node. Insert O(1) at head, O(n) at tail.';
    
    mockExtractTextFromPDF.mockResolvedValueOnce(specificPDFContent);
    mockChatCompletion.mockResolvedValueOnce(mockValidQuizResponse);
    mockSafeParseJSON.mockReturnValueOnce(JSON.parse(mockValidQuizResponse));

    console.log('\n=== SCENARIO 4: Verify PDF Content Reaches Groq ===');

    const questions = await generateQuizFromGroq({
      sourceType: 'PDF',
      pdfBuffer: Buffer.from('RealPDFBuffer'),
      difficulty: 'MEDIUM',
      numQuestions: 1,
    });

    // Capture what was sent to Groq
    const callArgs = mockChatCompletion.mock.calls[0][0];
    const userPrompt = callArgs.messages.find(m => m.role === 'user').content;

    console.log('PDF content extracted:', specificPDFContent.slice(0, 50) + '...');
    console.log('✓ Prompt contains exact PDF content:', userPrompt.includes(specificPDFContent));
    console.log('✓ Prompt length:', userPrompt.length);

    // The critical assertion: Groq receives the exact PDF content!
    expect(userPrompt).toContain(specificPDFContent);
  });
});
