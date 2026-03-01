/**
 * ExamSessionManager Tests
 *
 * Tests the in-memory exam session tracking, violation recording,
 * threshold enforcement, session locking, and cleanup.
 */

import {
  getSession,
  recordViolation,
  lockSession,
  isSessionLocked,
  clearSession,
  getViolationThreshold,
} from '../../services/examSessionManager.js';

describe('examSessionManager', () => {
  const quizId = 'quiz_test_001';
  const studentId = 'student_test_001';

  afterEach(() => {
    // Clean up sessions between tests
    clearSession(quizId, studentId);
    clearSession('quiz2', studentId);
    clearSession(quizId, 'student2');
  });

  describe('getSession', () => {
    it('should create a new session if none exists', () => {
      const session = getSession(quizId, studentId);

      expect(session).toBeDefined();
      expect(session.violationCount).toBe(0);
      expect(session.events).toEqual([]);
      expect(session.locked).toBe(false);
      expect(session.startedAt).toBeDefined();
    });

    it('should return the same session on subsequent calls', () => {
      const s1 = getSession(quizId, studentId);
      s1.violationCount = 5;
      const s2 = getSession(quizId, studentId);

      expect(s2.violationCount).toBe(5);
      expect(s1).toBe(s2);
    });

    it('should create separate sessions for different quiz+student pairs', () => {
      const s1 = getSession(quizId, studentId);
      const s2 = getSession('quiz2', studentId);
      const s3 = getSession(quizId, 'student2');

      s1.violationCount = 1;
      expect(s2.violationCount).toBe(0);
      expect(s3.violationCount).toBe(0);
    });
  });

  describe('recordViolation', () => {
    it('should increment violation count', () => {
      const r1 = recordViolation(quizId, studentId, 'TAB_SWITCH');
      expect(r1.violationCount).toBe(1);
      expect(r1.thresholdReached).toBe(false);
      expect(r1.locked).toBe(false);

      const r2 = recordViolation(quizId, studentId, 'COPY_ATTEMPT');
      expect(r2.violationCount).toBe(2);
      expect(r2.thresholdReached).toBe(false);
    });

    it('should record event details in the session', () => {
      recordViolation(quizId, studentId, 'RIGHT_CLICK', { x: 100, y: 200 });
      const session = getSession(quizId, studentId);

      expect(session.events).toHaveLength(1);
      expect(session.events[0].eventType).toBe('RIGHT_CLICK');
      expect(session.events[0].metadata).toEqual({ x: 100, y: 200 });
      expect(session.events[0].timestamp).toBeDefined();
    });

    it('should reach threshold and lock session at configured limit', () => {
      const threshold = getViolationThreshold();

      for (let i = 1; i < threshold; i++) {
        const r = recordViolation(quizId, studentId, 'TAB_SWITCH');
        expect(r.thresholdReached).toBe(false);
      }

      // This one should trigger threshold
      const final = recordViolation(quizId, studentId, 'MULTIPLE_VIOLATIONS');
      expect(final.violationCount).toBe(threshold);
      expect(final.thresholdReached).toBe(true);
      expect(final.locked).toBe(true);
    });

    it('should not increment count on a locked session', () => {
      const threshold = getViolationThreshold();

      // Fill up to threshold
      for (let i = 0; i < threshold; i++) {
        recordViolation(quizId, studentId, 'TAB_SWITCH');
      }

      // Try one more on locked session
      const extra = recordViolation(quizId, studentId, 'COPY_ATTEMPT');
      expect(extra.violationCount).toBe(threshold);
      expect(extra.locked).toBe(true);
      expect(extra.thresholdReached).toBe(true);
    });
  });

  describe('lockSession', () => {
    it('should lock an existing session', () => {
      getSession(quizId, studentId);
      lockSession(quizId, studentId);

      expect(isSessionLocked(quizId, studentId)).toBe(true);
    });

    it('should create and lock a session that did not exist', () => {
      lockSession(quizId, studentId);

      expect(isSessionLocked(quizId, studentId)).toBe(true);
      const session = getSession(quizId, studentId);
      expect(session.locked).toBe(true);
    });
  });

  describe('isSessionLocked', () => {
    it('should return false for non-existent sessions', () => {
      expect(isSessionLocked('nonexistent', 'nobody')).toBe(false);
    });

    it('should return false for unlocked sessions', () => {
      getSession(quizId, studentId);
      expect(isSessionLocked(quizId, studentId)).toBe(false);
    });

    it('should return true for locked sessions', () => {
      lockSession(quizId, studentId);
      expect(isSessionLocked(quizId, studentId)).toBe(true);
    });
  });

  describe('clearSession', () => {
    it('should remove a session', () => {
      recordViolation(quizId, studentId, 'TAB_SWITCH');
      clearSession(quizId, studentId);

      // New session should start fresh
      const session = getSession(quizId, studentId);
      expect(session.violationCount).toBe(0);
      expect(session.events).toEqual([]);
    });

    it('should not throw when clearing a non-existent session', () => {
      expect(() => clearSession('nonexistent', 'nobody')).not.toThrow();
    });
  });

  describe('getViolationThreshold', () => {
    it('should return a positive integer', () => {
      const threshold = getViolationThreshold();
      expect(typeof threshold).toBe('number');
      expect(threshold).toBeGreaterThan(0);
      expect(Number.isInteger(threshold)).toBe(true);
    });

    it('should default to 3', () => {
      // Unless EXAM_VIOLATION_THRESHOLD env var is set
      expect(getViolationThreshold()).toBe(3);
    });
  });
});
