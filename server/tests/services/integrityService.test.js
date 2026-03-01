/**
 * IntegrityService Tests
 *
 * Tests violation handling, forced quiz submission, integrity summaries,
 * and behavioral profile updates.
 */
import { jest } from '@jest/globals';

// ── Mock Models ──
const mockIntegrityEventCreate = jest.fn();
const mockIntegrityEventFind = jest.fn();
const mockIntegrityEventAggregate = jest.fn();

jest.unstable_mockModule('../../models/IntegrityEvent.js', () => ({
  default: {
    create: mockIntegrityEventCreate,
    find: mockIntegrityEventFind,
    aggregate: mockIntegrityEventAggregate,
  },
  VIOLATION_TYPES: [
    'TAB_SWITCH', 'WINDOW_BLUR', 'COPY_ATTEMPT', 'PASTE_ATTEMPT',
    'RIGHT_CLICK', 'DEVTOOLS_ATTEMPT', 'SCREENSHOT_KEY',
    'FULLSCREEN_EXIT', 'MULTIPLE_VIOLATIONS',
  ],
}));

const mockUserFindByIdAndUpdate = jest.fn();
jest.unstable_mockModule('../../models/User.js', () => ({
  default: {
    findByIdAndUpdate: mockUserFindByIdAndUpdate,
  },
}));

const mockProfileFindOneAndUpdate = jest.fn();
jest.unstable_mockModule('../../models/UserBehaviorProfile.js', () => ({
  default: {
    findOneAndUpdate: mockProfileFindOneAndUpdate,
  },
}));

const mockQuizFindById = jest.fn();
jest.unstable_mockModule('../../models/Quiz.js', () => ({
  default: {
    findById: mockQuizFindById,
  },
}));

const mockQuizResultCreate = jest.fn();
const mockQuizResultFindOne = jest.fn();
jest.unstable_mockModule('../../models/QuizResult.js', () => ({
  default: {
    create: mockQuizResultCreate,
    findOne: mockQuizResultFindOne,
  },
}));

// Mock AI services (fire-and-forget)
jest.unstable_mockModule('../../services/ai/weakAreaDetector.js', () => ({
  updateStudentGraph: jest.fn().mockResolvedValue(undefined),
}));

jest.unstable_mockModule('../../services/ai/predictionEngine.js', () => ({
  evaluateRisk: jest.fn().mockResolvedValue(undefined),
}));

jest.unstable_mockModule('../../services/ai/assignmentEvaluator.js', () => ({
  evaluateAssignment: jest.fn().mockResolvedValue(0),
}));

// Mock exam session manager
const mockRecordViolation = jest.fn();
const mockLockSession = jest.fn();
const mockClearSession = jest.fn();
const mockIsSessionLocked = jest.fn();
const mockGetViolationThreshold = jest.fn().mockReturnValue(3);

jest.unstable_mockModule('../../services/examSessionManager.js', () => ({
  recordViolation: mockRecordViolation,
  lockSession: mockLockSession,
  clearSession: mockClearSession,
  isSessionLocked: mockIsSessionLocked,
  getViolationThreshold: mockGetViolationThreshold,
}));

// ── Import module under test ──
const {
  handleViolation,
  forceSubmitQuiz,
  getQuizIntegrityEvents,
  updateBehaviorProfile,
  cleanupExamSession,
  checkSessionLocked,
} = await import('../../services/integrityService.js');

describe('integrityService', () => {
  const studentId = 'stu123';
  const quizId = 'quiz456';

  beforeEach(() => {
    jest.clearAllMocks();
    mockUserFindByIdAndUpdate.mockResolvedValue({});
  });

  describe('handleViolation', () => {
    it('should record a violation and return WARNING on first violation', async () => {
      mockRecordViolation.mockReturnValue({
        violationCount: 1,
        thresholdReached: false,
        locked: false,
      });
      mockIntegrityEventCreate.mockResolvedValue({ _id: 'ev1' });

      const result = await handleViolation(studentId, quizId, 'TAB_SWITCH', {});

      expect(mockRecordViolation).toHaveBeenCalledWith(quizId, studentId, 'TAB_SWITCH', {});
      expect(mockIntegrityEventCreate).toHaveBeenCalledWith({
        studentId,
        quizId,
        eventType: 'TAB_SWITCH',
        metadata: {},
        autoSubmitted: false,
      });
      expect(result.violationCount).toBe(1);
      expect(result.warning).toBe('WARNING');
      expect(result.thresholdReached).toBe(false);
    });

    it('should return STRONG_WARNING on second violation', async () => {
      mockRecordViolation.mockReturnValue({
        violationCount: 2,
        thresholdReached: false,
        locked: false,
      });
      mockIntegrityEventCreate.mockResolvedValue({ _id: 'ev2' });

      const result = await handleViolation(studentId, quizId, 'COPY_ATTEMPT');

      expect(result.violationCount).toBe(2);
      expect(result.warning).toBe('STRONG_WARNING');
      expect(result.thresholdReached).toBe(false);
    });

    it('should return AUTO_SUBMIT when threshold reached', async () => {
      mockRecordViolation.mockReturnValue({
        violationCount: 3,
        thresholdReached: true,
        locked: true,
      });
      mockIntegrityEventCreate.mockResolvedValue({ _id: 'ev3' });
      // forceSubmitQuiz needs these
      mockQuizResultFindOne.mockResolvedValue(null);
      mockQuizFindById.mockResolvedValue({
        _id: quizId,
        questions: [
          { topicTag: 'Trees', weight: 1 },
          { topicTag: 'Graphs', weight: 1 },
        ],
      });
      mockQuizResultCreate.mockResolvedValue({
        _id: 'result1',
        totalScore: 0,
      });

      const result = await handleViolation(studentId, quizId, 'MULTIPLE_VIOLATIONS');

      expect(result.warning).toBe('AUTO_SUBMIT');
      expect(result.thresholdReached).toBe(true);
      expect(result.forcedResult).toBeDefined();
      expect(result.forcedResult.forced).toBe(true);
    });

    it('should increment user totalViolations', async () => {
      mockRecordViolation.mockReturnValue({
        violationCount: 1,
        thresholdReached: false,
        locked: false,
      });
      mockIntegrityEventCreate.mockResolvedValue({ _id: 'ev4' });

      await handleViolation(studentId, quizId, 'RIGHT_CLICK');

      expect(mockUserFindByIdAndUpdate).toHaveBeenCalledWith(studentId, {
        $inc: { totalViolations: 1 },
      });
    });
  });

  describe('forceSubmitQuiz', () => {
    it('should skip if quiz result already exists', async () => {
      mockQuizResultFindOne.mockResolvedValue({ _id: 'existing_result' });

      const result = await forceSubmitQuiz(studentId, quizId);

      expect(result.alreadySubmitted).toBe(true);
      expect(result.resultId).toBe('existing_result');
      expect(mockLockSession).toHaveBeenCalledWith(quizId, studentId);
    });

    it('should return error if quiz not found', async () => {
      mockQuizResultFindOne.mockResolvedValue(null);
      mockQuizFindById.mockResolvedValue(null);

      const result = await forceSubmitQuiz(studentId, quizId);

      expect(result.error).toBe('Quiz not found');
      expect(mockLockSession).toHaveBeenCalledWith(quizId, studentId);
    });

    it('should create a 0-score result and lock session', async () => {
      mockQuizResultFindOne.mockResolvedValue(null);
      mockQuizFindById.mockResolvedValue({
        _id: quizId,
        questions: [
          { topicTag: 'Sorting', weight: 2 },
          { topicTag: 'Searching', weight: 1 },
        ],
      });
      mockQuizResultCreate.mockResolvedValue({ _id: 'forced_result' });

      const result = await forceSubmitQuiz(studentId, quizId);

      expect(result.forced).toBe(true);
      expect(result.resultId).toBe('forced_result');
      expect(result.accuracyPercentage).toBe(0);
      expect(mockQuizResultCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          studentId,
          quizId,
          totalScore: 0,
          accuracyPercentage: 0,
          questionMetrics: [],
        })
      );
      expect(mockLockSession).toHaveBeenCalledWith(quizId, studentId);
      expect(mockUserFindByIdAndUpdate).toHaveBeenCalledWith(studentId, {
        $inc: { suspiciousExamCount: 1 },
      });
    });
  });

  describe('getQuizIntegrityEvents', () => {
    it('should query events and populate student data', async () => {
      const mockEvents = [
        { _id: 'e1', studentId: { name: 'Alice' }, eventType: 'TAB_SWITCH' },
      ];
      mockIntegrityEventFind.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue(mockEvents),
          }),
        }),
      });

      const events = await getQuizIntegrityEvents(quizId);

      expect(mockIntegrityEventFind).toHaveBeenCalledWith({ quizId });
      expect(events).toEqual(mockEvents);
    });
  });

  describe('updateBehaviorProfile', () => {
    it('should upsert profile with violation data', async () => {
      const events = [
        { eventType: 'TAB_SWITCH', autoSubmitted: false, createdAt: new Date() },
        { eventType: 'TAB_SWITCH', autoSubmitted: false, createdAt: new Date() },
        { eventType: 'COPY_ATTEMPT', autoSubmitted: true, createdAt: new Date() },
      ];
      mockIntegrityEventFind.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(events),
        }),
      });

      const mockProfile = {
        _id: 'p1',
        totalViolations: 3,
        totalExams: 1,
        autoSubmitCount: 1,
        integrityScore: 70,
        save: jest.fn().mockResolvedValue(undefined),
      };
      mockProfileFindOneAndUpdate.mockResolvedValue(mockProfile);

      const result = await updateBehaviorProfile(studentId, quizId);

      expect(mockProfileFindOneAndUpdate).toHaveBeenCalledWith(
        { studentId },
        expect.objectContaining({
          $inc: expect.objectContaining({
            totalViolations: 3,
            totalExams: 1,
            suspiciousExamCount: 1,
            autoSubmitCount: 1,
            'violationBreakdown.TAB_SWITCH': 2,
            'violationBreakdown.COPY_ATTEMPT': 1,
          }),
        }),
        { upsert: true, new: true }
      );
      expect(mockProfile.save).toHaveBeenCalled();
      expect(mockUserFindByIdAndUpdate).toHaveBeenCalledWith(
        studentId,
        expect.objectContaining({ integrityScore: expect.any(Number) })
      );
    });

    it('should not throw if profile update fails', async () => {
      mockIntegrityEventFind.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockRejectedValue(new Error('DB error')),
        }),
      });

      // Should not throw
      await expect(updateBehaviorProfile(studentId, quizId)).resolves.toBeUndefined();
    });
  });

  describe('cleanupExamSession', () => {
    it('should delegate to clearSession', () => {
      cleanupExamSession(quizId, studentId);
      expect(mockClearSession).toHaveBeenCalledWith(quizId, studentId);
    });
  });

  describe('checkSessionLocked', () => {
    it('should delegate to isSessionLocked', () => {
      mockIsSessionLocked.mockReturnValue(true);
      expect(checkSessionLocked(quizId, studentId)).toBe(true);
      expect(mockIsSessionLocked).toHaveBeenCalledWith(quizId, studentId);
    });

    it('should return false when session is not locked', () => {
      mockIsSessionLocked.mockReturnValue(false);
      expect(checkSessionLocked(quizId, studentId)).toBe(false);
    });
  });
});
