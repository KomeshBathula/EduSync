import rateLimit from 'express-rate-limit';

// ─── Per-User Key Generator ──────────────────────────────────────
const userKeyGenerator = (req) => {
  // Use authenticated user ID if available, avoids IP-based issues
  if (req.user?._id) {
    return req.user._id.toString();
  }
  // Fallback: return a stable key (express-rate-limit handles IP internally)
  return 'anonymous';
};

// ─── AI Rate Limiter — General (per user) ─────────────────────────
export const aiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 AI requests per minute per user
  keyGenerator: userKeyGenerator,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many AI requests. Please wait a moment before trying again.',
    retryAfter: 60,
  },
  handler: (req, res, next, options) => {
    console.warn(JSON.stringify({
      level: 'warn',
      service: 'rateLimiter',
      event: 'ai_rate_limit_hit',
      userId: req.user?._id?.toString() || 'anonymous',
      ip: req.ip,
      path: req.path,
    }));
    res.status(429).json(options.message);
  },
});

// ─── Doubt Solver Rate Limiter ───────────────────────────────────
export const doubtRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 15, // 15 messages per minute (chat can be fast)
  keyGenerator: userKeyGenerator,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many messages. Please slow down.',
    retryAfter: 60,
  },
  handler: (req, res, next, options) => {
    console.warn(JSON.stringify({
      level: 'warn',
      service: 'rateLimiter',
      event: 'doubt_rate_limit_hit',
      userId: req.user?._id?.toString() || 'anonymous',
      ip: req.ip,
    }));
    res.status(429).json(options.message);
  },
});

// ─── Revision Rate Limiter ───────────────────────────────────────
export const revisionRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 3, // 3 revision plans per 10 minutes
  keyGenerator: userKeyGenerator,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Revision plan generation rate limit reached. Please try again later.',
    retryAfter: 600,
  },
  handler: (req, res, next, options) => {
    console.warn(JSON.stringify({
      level: 'warn',
      service: 'rateLimiter',
      event: 'revision_rate_limit_hit',
      userId: req.user?._id?.toString() || 'anonymous',
      ip: req.ip,
    }));
    res.status(429).json(options.message);
  },
});