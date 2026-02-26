import { chatCompletion, safeParseJSON } from './groqClient.js';

// ─── Default Fallback ─────────────────────────────────────────────
const FALLBACK_RESPONSE = {
  questions: [],
  error: 'Unable to generate a quiz from this content. Please try again.',
};

/**
 * Build a prompt for controlled YouTube quiz generation
 * @param {string} summaryContent - The AI-generated summary text
 * @param {number} questionCount - Number of questions to generate (5, 10, or 15)
 * @param {string} difficulty - Difficulty level (EASY, MEDIUM, HARD)
 */
const buildYoutubeQuizPrompt = (summaryContent, questionCount, difficulty) => {
  const difficultyInstructions = {
    EASY: 'Basic comprehension questions that test understanding of main concepts. Simple vocabulary, straightforward answers.',
    MEDIUM: 'Intermediate questions that require understanding connections and details. Some inference needed, clear distinctions between options.',
    HARD: 'Challenging questions that test deep understanding, critical thinking, and nuanced comprehension. Tricky distractors, requires careful analysis.',
  };

  return {
    system: `You are an expert educational quiz generator. Generate exactly ${questionCount} multiple-choice questions at ${difficulty} difficulty level strictly from the provided summary. Each question MUST have:
- questionText: Clear, specific question
- options: Array of exactly 4 answer options (A, B, C, D format)
- correctOptionIndex: Index of correct answer (0-3)
- explanation: 2-4 sentence explanation of why the correct answer is right

Difficulty guidelines: ${difficultyInstructions[difficulty]}

CRITICAL: Return ONLY valid JSON array. No markdown, no code blocks.`,
    user: `Generate exactly ${questionCount} ${difficulty} level multiple-choice questions from this summary content:

${summaryContent}

Return JSON array format: [{"questionText":"...","options":["...","...","...","..."],"correctOptionIndex":0,"explanation":"..."}]`,
  };
};

/**
 * Generate a post-reading comprehension quiz from YouTube summary with user-controlled parameters.
 * @param {Object} params
 * @param {string} params.summaryContent - The AI-generated summary text
 * @param {number} params.questionCount - Number of questions (5, 10, or 15)
 * @param {string} params.difficulty - Difficulty level (EASY, MEDIUM, HARD)
 * @param {string} params.userId
 */
export const generateYoutubeQuiz = async ({ summaryContent, questionCount = 10, difficulty = 'MEDIUM', userId }) => {
  console.log(JSON.stringify({
    level: 'info',
    service: 'youtubeQuiz',
    event: 'generating_controlled_quiz',
    userId,
    questionCount,
    difficulty,
    summaryLength: summaryContent?.length || 0,
  }));

  if (!summaryContent || summaryContent.trim().length === 0) {
    return {
      ...FALLBACK_RESPONSE,
      error: 'Cannot generate quiz from empty summary.',
    };
  }

  // Build prompt with user-selected parameters
  const prompt = buildYoutubeQuizPrompt(summaryContent, questionCount, difficulty);

  // Temperature based on difficulty for consistency
  const temperature = difficulty === 'EASY' ? 0.3 : difficulty === 'MEDIUM' ? 0.4 : 0.5;

  try {
    // Call Groq
    const rawResponse = await chatCompletion({
      messages: [
        { role: 'system', content: prompt.system },
        { role: 'user', content: prompt.user },
      ],
      temperature,
      maxTokens: 3000,
      jsonMode: true,
      userId,
      requestType: 'youtube_quiz_controlled',
    });

    // Parse and validate
    const parsed = safeParseJSON(rawResponse, null);
    
    // Must be an array
    if (!Array.isArray(parsed)) {
      console.error(JSON.stringify({
        level: 'error',
        service: 'youtubeQuiz',
        event: 'invalid_response_format',
        userId,
        expectedArray: true,
        received: typeof parsed,
      }));
      return FALLBACK_RESPONSE;
    }

    // Must have questions
    if (parsed.length === 0) {
      console.error(JSON.stringify({
        level: 'error',
        service: 'youtubeQuiz',
        event: 'no_questions_generated',
        userId,
      }));
      return FALLBACK_RESPONSE;
    }

    // Normalize and validate each question
    const validQuestions = parsed
      .filter((q) => {
        return (
          q.questionText &&
          typeof q.questionText === 'string' &&
          Array.isArray(q.options) &&
          q.options.length === 4 &&
          q.options.every((opt) => typeof opt === 'string' && opt.trim().length > 0) &&
          typeof q.correctOptionIndex === 'number' &&
          q.correctOptionIndex >= 0 &&
          q.correctOptionIndex <= 3 &&
          q.explanation &&
          typeof q.explanation === 'string' &&
          q.explanation.trim().length > 0
        );
      })
      .map((q) => ({
        questionText: q.questionText.trim(),
        options: q.options.map((opt) => opt.trim()),
        correctOptionIndex: q.correctOptionIndex,
        explanation: q.explanation.trim(),
      }));

    // Check if we got enough valid questions
    if (validQuestions.length === 0) {
      console.error(JSON.stringify({
        level: 'error',
        service: 'youtubeQuiz',
        event: 'no_valid_questions',
        userId,
        totalParsed: parsed.length,
        previewFirst: parsed[0] ? JSON.stringify(parsed[0]).slice(0, 200) : 'N/A',
      }));
      return FALLBACK_RESPONSE;
    }

    console.log(JSON.stringify({
      level: 'info',
      service: 'youtubeQuiz',
      event: 'quiz_generated_success',
      userId,
      requestedCount: questionCount,
      validCount: validQuestions.length,
      difficulty,
    }));

    return {
      questions: validQuestions,
      questionCount: validQuestions.length,
      difficulty,
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error(JSON.stringify({
      level: 'error',
      service: 'youtubeQuiz',
      event: 'generation_failed',
      userId,
      error: error.message,
    }));
    throw error;
  }
};
