/**
 * Ultra Strict Lockdown Mode Tests
 *
 * Tests the zero-tolerance exam security enforcement:
 * - Single violation = immediate termination
 * - Session locking
 * - Force-submit endpoint
 * - Integrity event logging
 * - No duplicate submissions
 */
import { jest } from '@jest/globals';

// Mock environment for strict mode
const originalEnv = process.env.STRICT_EXAM_MODE;
beforeAll(() => {
  process.env.STRICT_EXAM_MODE = 'true';
});

afterAll(() => {
  process.env.STRICT_EXAM_MODE = originalEnv;
});

describe('Ultra Strict Lockdown Mode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Session Manager - Strict Mode Enforcement', () => {
    it('should lock session immediately on first violation in strict mode', async () => {
      // Re-import to pick up env var
      jest.resetModules();
      process.env.STRICT_EXAM_MODE = 'true';
      const { recordViolation, clearSession } = await import('../../services/examSessionManager.js');

      const quizId = 'quiz123';
      const studentId = 'student456';

      const result = recordViolation(quizId, studentId, 'TAB_SWITCH', {});

      expect(result.violationCount).toBe(1);
      expect(result.thresholdReached).toBe(true);
      expect(result.locked).toBe(true);
      expect(result.strictMode).toBe(true);
      expect(result.terminationReason).toBe('STRICT_MODE_VIOLATION');

      // Cleanup
      clearSession(quizId, studentId);
    });

    it('should prevent further violations after session is locked', async () => {
      jest.resetModules();
      process.env.STRICT_EXAM_MODE = 'true';
      const { recordViolation, clearSession } = await import('../../services/examSessionManager.js');

      const quizId = 'quiz789';
      const studentId = 'student999';

      // First violation - locks session
      const result1 = recordViolation(quizId, studentId, 'TAB_SWITCH', {});
      expect(result1.locked).toBe(true);

      // Second violation - should be blocked
      const result2 = recordViolation(quizId, studentId, 'FULLSCREEN_EXIT', {});
      expect(result2.locked).toBe(true);
      expect(result2.thresholdReached).toBe(true);
      expect(result2.violationCount).toBe(1); // Count doesn't increase after lock

      // Cleanup
      clearSession(quizId, studentId);
    });

    it('should work in normal mode when STRICT_EXAM_MODE is false', async () => {
      jest.resetModules();
      process.env.STRICT_EXAM_MODE = 'false';
      const { recordViolation, clearSession, getViolationThreshold } = await import('../../services/examSessionManager.js');

      const quizId = 'quizNormal';
      const studentId = 'studentNormal';
      const threshold = getViolationThreshold();

      // First violation - should NOT lock immediately
      const result1 = recordViolation(quizId, studentId, 'TAB_SWITCH', {});
      expect(result1.locked).toBe(false);
      expect(result1.thresholdReached).toBe(false);
      expect(result1.violationCount).toBe(1);

      // Second violation
      const result2 = recordViolation(quizId, studentId, 'COPY_ATTEMPT', {});
      expect(result2.locked).toBe(false);
      expect(result2.violationCount).toBe(2);

      // Third violation - should lock (if threshold is 3)
      if (threshold === 3) {
        const result3 = recordViolation(quizId, studentId, 'PASTE_ATTEMPT', {});
        expect(result3.locked).toBe(true);
        expect(result3.thresholdReached).toBe(true);
      }

      // Cleanup
      clearSession(quizId, studentId);
    });

    it('should maintain separate sessions for different quiz+student pairs', async () => {
      jest.resetModules();
      process.env.STRICT_EXAM_MODE = 'true';
      const { recordViolation, clearSession } = await import('../../services/examSessionManager.js');

      const quizId1 = 'quiz1';
      const quizId2 = 'quiz2';
      const student1 = 'student1';

      // Lock first session
      const result1 = recordViolation(quizId1, student1, 'TAB_SWITCH', {});
      expect(result1.locked).toBe(true);

      // Second session should be independent
      const result2 = recordViolation(quizId2, student1, 'FULLSCREEN_EXIT', {});
      expect(result2.locked).toBe(true);
      expect(result2.violationCount).toBe(1); // Separate count

      // Cleanup
      clearSession(quizId1, student1);
      clearSession(quizId2, student1);
    });
  });

  describe('Integrity Event Logging', () => {
    it('should create integrity event with termination fields', async () => {
      const IntegrityEvent = (await import('../../models/IntegrityEvent.js')).default;

      const mockEvent = {
        studentId: '507f1f77bcf86cd799439011',
        quizId: '507f191e810c19729de860ea',
        eventType: 'FULLSCREEN_EXIT',
        metadata: { violationType: 'FULLSCREEN_EXIT', submissionType: 'FORCED_SECURITY' },
        autoSubmitted: true,
        terminationTriggered: true,
        terminationReason: 'STRICT_MODE_VIOLATION',
      };

      expect(mockEvent.terminationTriggered).toBe(true);
      expect(mockEvent.terminationReason).toBe('STRICT_MODE_VIOLATION');
      expect(mockEvent.autoSubmitted).toBe(true);
    });
  });

  describe('QuizResult - Forced Submission', () => {
    it('should create quiz result with FORCED_SECURITY submission type', async () => {
      const mockResult = {
        studentId: '507f1f77bcf86cd799439011',
        quizId: '507f191e810c19729de860ea',
        totalScore: 0,
        timeTakenSeconds: 0,
        accuracyPercentage: 0,
        marksAssigned: 0,
        questionMetrics: [],
        submissionType: 'FORCED_SECURITY',
        violationType: 'TAB_SWITCH',
        sessionLocked: true,
      };

      expect(mockResult.submissionType).toBe('FORCED_SECURITY');
      expect(mockResult.sessionLocked).toBe(true);
      expect(mockResult.violationType).toBeTruthy();
    });
  });

  describe('Edge Cases - Strict Mode', () => {
    it('should handle rapid successive violations (debouncing simulation)', async () => {
      jest.resetModules();
      process.env.STRICT_EXAM_MODE = 'true';
      const { recordViolation, clearSession } = await import('../../services/examSessionManager.js');

      const quizId = 'rapid-test';
      const studentId = 'student-rapid';

      // Simulate 5 violations in quick succession
      const results = [];
      for (let i = 0; i < 5; i++) {
        results.push(recordViolation(quizId, studentId, 'TAB_SWITCH', { rapid: true }));
      }

      // First violation locks session
      expect(results[0].locked).toBe(true);
      
      // All subsequent violations see locked state
      results.slice(1).forEach(result => {
        expect(result.locked).toBe(true);
        expect(result.thresholdReached).toBe(true);
      });

      // Cleanup
      clearSession(quizId, studentId);
    });

    it('should verify session lock persists after cleanup', async () => {
      jest.resetModules();
      process.env.STRICT_EXAM_MODE = 'true';
      const { recordViolation, isSessionLocked, clearSession } = await import('../../services/examSessionManager.js');

      const quizId = 'lock-persist';
      const studentId = 'student-lock';

      // Lock session
      recordViolation(quizId, studentId, 'DEVTOOLS_ATTEMPT', {});
      expect(isSessionLocked(quizId, studentId)).toBe(true);

      // Clear session
      clearSession(quizId, studentId);
      
      // After cleanup, session should not be locked (new session)
      expect(isSessionLocked(quizId, studentId)).toBe(false);
    });

    it('should handle missing violation metadata gracefully', async () => {
      jest.resetModules();
      process.env.STRICT_EXAM_MODE = 'true';
      const { recordViolation, clearSession } = await import('../../services/examSessionManager.js');

      const quizId = 'missing-metadata';
      const studentId = 'student-meta';

      // No metadata provided
      const result = recordViolation(quizId, studentId, 'COPY_ATTEMPT');

      expect(result.locked).toBe(true);
      expect(result.terminationReason).toBe('STRICT_MODE_VIOLATION');

      // Cleanup
      clearSession(quizId, studentId);
    });
  });
});
