import Groq from 'groq-sdk';
import dotenv from 'dotenv';
dotenv.config();

// ─── Environment Validation ───────────────────────────────────────
const GROQ_API_KEY = process.env.GROQ_API_KEY;
if (!GROQ_API_KEY) {
  console.error('[FATAL] GROQ_API_KEY is not set in environment variables.');
  process.exit(1);
}

// ─── Singleton Groq Client ───────────────────────────────────────
const groqClient = new Groq({ apiKey: GROQ_API_KEY });

// ─── Constants ────────────────────────────────────────────────────
const MAX_RETRIES = 2;
const BASE_DELAY_MS = 1000;
const AI_TIMEOUT_MS = 20000;
const MAX_INPUT_TOKENS = 6000; // ~24k chars rough estimate

// ─── Token Estimation ─────────────────────────────────────────────
export const estimateTokens = (text) => {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
};

// ─── Token Trimming ───────────────────────────────────────────────
export const trimToTokenLimit = (text, maxTokens = MAX_INPUT_TOKENS) => {
  if (!text) return '';
  const maxChars = maxTokens * 4;
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars) + '\n[...content truncated for token limit]';
};

// ─── Sleep Utility ────────────────────────────────────────────────
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ─── Rate Limit Tracker ──────────────────────────────────────────
const rateLimitState = {
  lastRequestTime: 0,
  minIntervalMs: 200,
};

const enforceRateLimit = async () => {
  const now = Date.now();
  const elapsed = now - rateLimitState.lastRequestTime;
  if (elapsed < rateLimitState.minIntervalMs) {
    await sleep(rateLimitState.minIntervalMs - elapsed);
  }
  rateLimitState.lastRequestTime = Date.now();
};

// ─── Core Chat Completion with Retry ──────────────────────────────
export const chatCompletion = async ({
  messages,
  model = 'llama-3.3-70b-versatile',
  temperature = 0.3,
  maxTokens = 4096,
  jsonMode = true,
  userId = 'unknown',
  requestType = 'unknown',
}) => {
  const startTime = Date.now();
  let lastError = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      await enforceRateLimit();

      const options = {
        messages,
        model,
        temperature,
        max_tokens: maxTokens,
      };

      if (jsonMode) {
        options.response_format = { type: 'json_object' };
      }

      // Timeout wrapper using Promise.race
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`AI request timed out after ${AI_TIMEOUT_MS}ms`)), AI_TIMEOUT_MS)
      );

      const response = await Promise.race([
        groqClient.chat.completions.create(options),
        timeoutPromise,
      ]);

      const latency = Date.now() - startTime;
      const usage = response.usage || {};

      // ─── Structured Logging ─────────────────────────────────
      console.log(JSON.stringify({
        level: 'info',
        service: 'groqClient',
        event: 'ai_request_complete',
        requestType,
        userId,
        model,
        promptTokens: usage.prompt_tokens || 0,
        completionTokens: usage.completion_tokens || 0,
        totalTokens: usage.total_tokens || 0,
        latencyMs: latency,
        attempt: attempt + 1,
      }));

      const content = response.choices?.[0]?.message?.content || '';
      return content;
    } catch (error) {
      lastError = error;
      const latency = Date.now() - startTime;

      console.error(JSON.stringify({
        level: 'error',
        service: 'groqClient',
        event: 'ai_request_failed',
        requestType,
        userId,
        attempt: attempt + 1,
        errorMessage: error.message,
        errorStatus: error.status || error.statusCode || null,
        latencyMs: latency,
      }));

      // Don't retry on client errors (4xx) except 429 (rate limit)
      if (error.status && error.status >= 400 && error.status < 500 && error.status !== 429) {
        break;
      }

      if (attempt < MAX_RETRIES) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt);
        console.log(JSON.stringify({
          level: 'warn',
          service: 'groqClient',
          event: 'ai_retry',
          requestType,
          userId,
          retryIn: delay,
          attempt: attempt + 1,
        }));
        await sleep(delay);
      }
    }
  }

  throw new Error(`AI service unavailable after ${MAX_RETRIES + 1} attempts: ${lastError?.message || 'Unknown error'}`);
};

// ─── Safe JSON Parse ──────────────────────────────────────────────
export const safeParseJSON = (raw, fallback = null) => {
  try {
    if (!raw || typeof raw !== 'string') return fallback;
    let cleaned = raw.trim();
    // Try to extract JSON if wrapped in markdown code blocks
    const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      cleaned = jsonMatch[1].trim();
    } else {
      // Fallback: extract substring from first { to last } or [ to ]
      const startObj = cleaned.indexOf('{');
      const endObj = cleaned.lastIndexOf('}');
      const startArr = cleaned.indexOf('[');
      const endArr = cleaned.lastIndexOf(']');
      
      let startIdx = -1;
      let endIdx = -1;
      
      // Determine if object or array is the outermost structure
      if (startObj !== -1 && (startArr === -1 || startObj < startArr)) {
        startIdx = startObj;
        endIdx = endObj;
      } else if (startArr !== -1) {
        startIdx = startArr;
        endIdx = endArr;
      }
      
      if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
        cleaned = cleaned.substring(startIdx, endIdx + 1);
      }
    }
    return JSON.parse(cleaned);
  } catch (error) {
    console.error(JSON.stringify({
      level: 'error',
      service: 'groqClient',
      event: 'json_parse_failed',
      rawLength: raw?.length || 0,
      rawPreview: raw?.slice(0, 200) || '',
      error: error.message
    }));
    return fallback;
  }
};

export default groqClient;
