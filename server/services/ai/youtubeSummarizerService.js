import { randomUUID } from 'crypto';
import { chatCompletion, safeParseJSON, trimToTokenLimit, estimateTokens } from './groqClient.js';
import { buildYoutubeSummaryPrompt } from './promptTemplates.js';
import { getTranscript, extractVideoId } from './youtubeTranscriptService.js';

// ─── Constants ────────────────────────────────────────────────────
const YOUTUBE_URL_REGEX = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/)[\w-]{11}/;

// ─── Validate YouTube URL ─────────────────────────────────────────
const validateYoutubeUrl = (url) => {
  if (!url || typeof url !== 'string') {
    return { valid: false, error: 'URL is required' };
  }
  if (url.length > 200) {
    return { valid: false, error: 'URL is too long' };
  }
  if (!YOUTUBE_URL_REGEX.test(url)) {
    return { valid: false, error: 'Invalid YouTube URL format' };
  }
  try {
    const videoId = extractVideoId(url);
    if (!videoId) {
      return { valid: false, error: 'Could not extract video ID from URL' };
    }
    return { valid: true, videoId };
  } catch (error) {
    return { valid: false, error: 'Could not extract video ID from URL' };
  }
};

// ─── Fetch Transcript via youtube-transcript ─────────────────────────
// Logic moved to youtubeTranscriptService.js

// ─── Default Fallback Response ────────────────────────────────────
const FALLBACK_RESPONSE = {
  title: 'Summary Unavailable',
  summary: 'The AI was unable to generate a structured summary. Please try again.',
  keyConcepts: [],
  detailedNotes: [],
  practiceQuestions: [],
  timestamps: [],
};

// ─── Main Service Function ────────────────────────────────────────
export const summarizeYoutubeVideo = async ({ url, language = 'English', userId = 'unknown', noteSize = 'Medium' }) => {
  // Step 1: Validate URL
  const validation = validateYoutubeUrl(url);
  if (!validation.valid) {
    throw Object.assign(new Error(validation.error), { statusCode: 400 });
  }

  // Step 2: Fetch transcript via youtube-transcript
  let transcript;
  try {
    transcript = await getTranscript(url);
  } catch (error) {
    if (error.statusCode) throw error;
    throw Object.assign(
      new Error('Failed to fetch video transcript. The video might not have captions enabled.'),
      { statusCode: 422 }
    );
  }

  // Step 3: Validate transcript
  if (!transcript || transcript.length < 50) {
    throw Object.assign(new Error('Transcript is too short or empty to summarize'), { statusCode: 422 });
  }

  // Step 4: Trim to token limit
  const trimmedTranscript = trimToTokenLimit(transcript);

  console.log(JSON.stringify({
    level: 'info',
    service: 'youtubeSummarizer',
    event: 'transcript_fetched',
    userId,
    videoId: validation.videoId,
    originalLength: transcript.length,
    trimmedLength: trimmedTranscript.length,
    estimatedTokens: estimateTokens(trimmedTranscript),
  }));

  // Step 5: Build prompt and call Groq
  const validNoteSizes = ['Small', 'Medium', 'Detailed'];
  const normalizedNoteSize = validNoteSizes.includes(noteSize) ? noteSize : 'Medium';
  const prompt = buildYoutubeSummaryPrompt({ transcript: trimmedTranscript, language, noteSize: normalizedNoteSize });

  const rawResponse = await chatCompletion({
    messages: [
      { role: 'system', content: prompt.system },
      { role: 'user', content: prompt.user },
    ],
    temperature: 0.3,
    maxTokens: 4096,
    jsonMode: true,
    userId,
    requestType: 'youtube_summary',
  });

  // Step 6: Parse and validate response
  const parsed = safeParseJSON(rawResponse, null);
  
  // Check if parsing failed or summary is missing/empty
  if (!parsed || !parsed.summary || typeof parsed.summary !== 'string' || parsed.summary.trim().length === 0) {
    console.error(JSON.stringify({
      level: 'error',
      service: 'youtubeSummarizer',
      event: 'invalid_ai_response',
      userId,
      reason: !parsed ? 'parse_failed' : !parsed.summary ? 'no_summary' : 'empty_summary',
      rawPreview: rawResponse?.slice(0, 300),
    }));
    return { ...FALLBACK_RESPONSE, videoId: validation.videoId };
  }

  // Step 7: Normalize structure and ensure summary has minimum length
  const normalizedSummary = parsed.summary.trim();
  if (normalizedSummary.length < 50) {
    console.warn(JSON.stringify({
      level: 'warn',
      service: 'youtubeSummarizer',
      event: 'short_summary',
      userId,
      summaryLength: normalizedSummary.length,
    }));
    // Still return it but user might have issues generating quiz
  }

  return {
    videoId: validation.videoId,
    title: parsed.title || 'Untitled Video Summary',
    summary: normalizedSummary,
    keyConcepts: Array.isArray(parsed.keyConcepts) ? parsed.keyConcepts : [],
    detailedNotes: Array.isArray(parsed.detailedNotes) ? parsed.detailedNotes : [],
    practiceQuestions: Array.isArray(parsed.practiceQuestions) ? parsed.practiceQuestions : [],
    timestamps: Array.isArray(parsed.timestamps) ? parsed.timestamps : [],
  };
};
