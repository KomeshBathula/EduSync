import { chatCompletion, safeParseJSON } from './groqClient.js';
import { extractTextFromPDF } from './pdfTextExtractor.js';

const MAX_RETRIES_PARSE = 2; // Up to two retries on malformed JSON

/**
 * Build the AI prompt based on source type.
 */
const buildQuizPrompt = ({ sourceType, topicName, pdfText, difficulty, numQuestions }) => {
  const systemPrompt = `You are an expert AI educational content creator. You generate multiple choice quiz questions in strict JSON format. Never include markdown, conversational text, or explanations outside the JSON structure.`;

  let sourceInstruction;
  let topicTag;

  if (sourceType === 'PDF') {
    sourceInstruction = `Generate the questions STRICTLY from the following reference material. Do NOT use any external knowledge — only the content below:\n\n"""${pdfText}"""`;
    topicTag = 'PDF Content';
  } else {
    sourceInstruction = `Generate the questions on the topic: ${topicName}`;
    topicTag = topicName;
  }

  const userPrompt = `Generate exactly ${numQuestions} multiple choice questions.
${sourceInstruction}
Difficulty level: ${difficulty}

Output STRICTLY in JSON format as a SINGLE object matching this exact structure containing a "questions" array:
{
  "questions": [
    {
      "questionText": "What is ...?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctOptionIndex": 0,
      "explanation": "Clear, 2-4 sentence explanation of why this option is correct. Should explain the concept and reasoning.",
      "topicTag": "${topicTag}"
    }
  ]
}
Ensure exactly 4 options per question. Each question should have a clear, unambiguous correct answer. 
IMPORTANT: The "explanation" field MUST be present for every question and should clearly explain why the correct option is correct (not just restate it).`;

  return { systemPrompt, userPrompt };
};

/**
 * Parse and validate the AI response into a questions array.
 */
const parseQuizResponse = (rawResponse) => {
  const parsed = safeParseJSON(rawResponse, null);
  if (!parsed || !parsed.questions || !Array.isArray(parsed.questions) || parsed.questions.length === 0) {
    return null;
  }

  // Validate each question structure (including explanation field)
  const valid = parsed.questions.every(q =>
    q.questionText &&
    Array.isArray(q.options) &&
    q.options.length === 4 &&
    typeof q.correctOptionIndex === 'number' &&
    q.correctOptionIndex >= 0 &&
    q.correctOptionIndex <= 3 &&
    q.explanation && // NEW: Explanation is required
    typeof q.explanation === 'string' &&
    q.explanation.trim().length > 0
  );

  return valid ? parsed.questions : null;
};

/**
 * Generate quiz questions from either a topic or a PDF buffer.
 *
 * @param {Object} params
 * @param {string} params.sourceType - 'TOPIC' or 'PDF'
 * @param {string} [params.topicName] - Required if sourceType is TOPIC
 * @param {Buffer} [params.pdfBuffer] - Required if sourceType is PDF
 * @param {string} params.difficulty - EASY | MEDIUM | HARD
 * @param {number} params.numQuestions
 * @returns {Promise<Array>} questions array
 */
export const generateQuizFromGroq = async ({ sourceType, topicName, pdfBuffer, difficulty, numQuestions }) => {
  let pdfText = null;

  // If PDF source, extract text first
  if (sourceType === 'PDF') {
    console.log(JSON.stringify({
      level: 'info',
      service: 'groqQuizService',
      event: 'extracting_pdf',
      pdfBufferLength: pdfBuffer?.length || 0,
    }));
    pdfText = await extractTextFromPDF(pdfBuffer);
    console.log(JSON.stringify({
      level: 'info',
      service: 'groqQuizService',
      event: 'pdf_extracted',
      extractedLength: pdfText?.length || 0,
      preview: pdfText?.slice(0, 150) || 'EMPTY',
    }));
  }

  const { systemPrompt, userPrompt } = buildQuizPrompt({
    sourceType,
    topicName,
    pdfText,
    difficulty,
    numQuestions,
  });

  console.log(JSON.stringify({
    level: 'info',
    service: 'groqQuizService',
    event: 'prompt_built',
    sourceType,
    topicName,
    userPromptLength: userPrompt.length,
    userPromptPreview: userPrompt.slice(0, 200),
  }));

  // Attempt generation with one retry on malformed JSON
  for (let attempt = 0; attempt <= MAX_RETRIES_PARSE; attempt++) {
    try {
      const rawResponse = await chatCompletion({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        model: 'llama-3.3-70b-versatile',
        temperature: attempt === 0 ? 0.3 : 0.2, // Lower temp on retry
        maxTokens: Math.min(numQuestions * 600, 4096),
        jsonMode: true,
        requestType: 'quiz_generation',
      });

      console.log(JSON.stringify({
        level: 'info',
        service: 'groqQuizService',
        event: 'ai_response_received',
        attempt: attempt + 1,
        responseLength: rawResponse?.length || 0,
        responsePreview: rawResponse?.slice(0, 250) || 'EMPTY',
      }));

      const questions = parseQuizResponse(rawResponse);
      if (questions) {
        console.log(JSON.stringify({
          level: 'info',
          service: 'groqQuizService',
          event: 'quiz_parsed_success',
          questionCount: questions.length,
          firstQuestion: questions[0]?.questionText?.slice(0, 80) || 'N/A',
        }));
        return questions;
      }

      if (attempt < MAX_RETRIES_PARSE) {
        console.warn(JSON.stringify({
          level: 'warn',
          service: 'groqQuizService',
          event: 'malformed_response_retrying',
          attempt: attempt + 1,
        }));
        continue;
      }

      const err = new Error('AI returned an invalid quiz format after retries.');
      err.statusCode = 500;
      throw err;
    } catch (error) {
      if (error.statusCode) throw error;

      console.error(JSON.stringify({
        level: 'error',
        service: 'groqQuizService',
        event: 'quiz_generation_failed',
        error: error.message,
        attempt: attempt + 1,
      }));

      if (attempt >= MAX_RETRIES_PARSE) {
        const err = new Error('Failed to generate quiz from AI service.');
        err.statusCode = 500;
        throw err;
      }
    }
  }
};
