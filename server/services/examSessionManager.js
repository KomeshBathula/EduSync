/**
 * ExamSessionManager — In-memory tracking of active exam sessions.
 *
 * Tracks violation counts per student+quiz pair to enable server-side
 * enforcement of auto-submit thresholds without database round-trips.
 *
 * Structure:
 *   examSessions Map<string, SessionState>
 *   key = `${quizId}_${studentId}`
 *   SessionState = { violationCount, events[], startedAt, locked }
 *
 * Scales for multiple concurrent students. Cleans up after submission.
 */

const VIOLATION_THRESHOLD = parseInt(process.env.EXAM_VIOLATION_THRESHOLD, 10) || 3;
const STRICT_MODE = process.env.STRICT_EXAM_MODE === 'true';

// TTL for stale sessions (2 hours) — prevents memory leaks
const SESSION_TTL_MS = 2 * 60 * 60 * 1000;

const examSessions = new Map();

const sessionKey = (quizId, studentId) => `${quizId}_${studentId}`;

/**
 * Get or create a session for a student+quiz pair.
 */
export const getSession = (quizId, studentId) => {
  const key = sessionKey(quizId, studentId);
  if (!examSessions.has(key)) {
    examSessions.set(key, {
      violationCount: 0,
      events: [],
      startedAt: Date.now(),
      locked: false,
    });
  }
  return examSessions.get(key);
};

/**
 * Record a violation in the session.
 * Returns { violationCount, thresholdReached, locked }.
 */
export const recordViolation = (quizId, studentId, eventType, metadata = {}) => {
  const session = getSession(quizId, studentId);

  if (session.locked) {
    return { violationCount: session.violationCount, thresholdReached: true, locked: true, strictMode: STRICT_MODE };
  }

  session.violationCount += 1;
  session.events.push({ eventType, metadata, timestamp: Date.now() });

  // STRICT MODE: Any violation = immediate lock
  if (STRICT_MODE) {
    session.locked = true;
    return {
      violationCount: session.violationCount,
      thresholdReached: true,
      locked: true,
      strictMode: true,
      terminationReason: 'STRICT_MODE_VIOLATION',
    };
  }

  // NORMAL MODE: Threshold-based
  const thresholdReached = session.violationCount >= VIOLATION_THRESHOLD;
  if (thresholdReached) {
    session.locked = true;
  }

  return {
    violationCount: session.violationCount,
    thresholdReached,
    locked: session.locked,
    strictMode: false,
  };
};

/**
 * Lock a session (e.g. after forced submission).
 */
export const lockSession = (quizId, studentId) => {
  const session = getSession(quizId, studentId);
  session.locked = true;
};

/**
 * Check if a session is locked.
 */
export const isSessionLocked = (quizId, studentId) => {
  const key = sessionKey(quizId, studentId);
  const session = examSessions.get(key);
  return session ? session.locked : false;
};

/**
 * Remove session after quiz is submitted/completed.
 */
export const clearSession = (quizId, studentId) => {
  examSessions.delete(sessionKey(quizId, studentId));
};

/**
 * Get the current violation threshold.
 */
export const getViolationThreshold = () => VIOLATION_THRESHOLD;

/**
 * Periodic cleanup of stale sessions to prevent memory leaks.
 */
const cleanupStaleSessions = () => {
  const now = Date.now();
  for (const [key, session] of examSessions) {
    if (now - session.startedAt > SESSION_TTL_MS) {
      examSessions.delete(key);
    }
  }
};

// Run cleanup every 30 minutes
setInterval(cleanupStaleSessions, 30 * 60 * 1000).unref();

export default {
  getSession,
  recordViolation,
  lockSession,
  isSessionLocked,
  clearSession,
  getViolationThreshold,
};
