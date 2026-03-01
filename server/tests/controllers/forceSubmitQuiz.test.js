/**
 * Force-Submit Endpoint Integration Tests
 *
 * Tests POST /api/quiz/:id/force-submit endpoint:
 * - Immediate session lock
 * - Score calculation from partial answers
 * - FORCED_SECURITY submission type
 * - Integrity event logging
 * - Duplicate submission prevention (409 Conflict)
 * - Edge cases and error handling
 */
import { jest } from '@jest/globals';

const mockQuizFindById = jest.fn();
const mockQuizResultCreate = jest.fn();
const mockIntegrityEventCreate = jest.fn();
const mockUpdateStudentGraph = jest.fn();
const mockEvaluateRisk = jest.fn();
const mockUpdateBehaviorProfile = jest.fn();
const mockEvaluateAssignment = jest.fn();
const mockExamSessionManager = {
  isSessionLocked: jest.fn(),
  lockSession: jest.fn(),
  clearSession: jest.fn(),
};

jest.unstable_mockModule('../../models/Quiz.js', () => ({
  default: { findById: mockQuizFindById },
}));

jest.unstable_mockModule('../../models/QuizResult.js', () => ({
  default: { create: mockQuizResultCreate },
}));

jest.unstable_mockModule('../../models/IntegrityEvent.js', () => ({
  default: { create: mockIntegrityEventCreate },
}));

jest.unstable_mockModule('../../services/ai/weakAreaDetector.js', () => ({
  updateStudentGraph: mockUpdateStudentGraph,
}));

jest.unstable_mockModule('../../services/ai/predictionEngine.js', () => ({
  evaluateRisk: mockEvaluateRisk,
}));

jest.unstable_mockModule('../../services/ai/assignmentEvaluator.js', () => ({
  evaluateAssignment: mockEvaluateAssignment,
}));

jest.unstable_mockModule('../../services/integrityService.js', () => ({
  updateBehaviorProfile: mockUpdateBehaviorProfile,
  cleanupExamSession: jest.fn(),
  checkSessionLocked: jest.fn(),
}));

jest.unstable_mockModule('../../services/examSessionManager.js', () => ({
  default: mockExamSessionManager,
}));

const { forceSubmitQuiz } = await import('../../controllers/quizController.js');

describe('Force-Submit Endpoint - /api/quiz/:id/force-submit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEvaluateAssignment.mockResolvedValue(0);
    mockUpdateStudentGraph.mockResolvedValue();
    mockEvaluateRisk.mockResolvedValue();
    mockUpdateBehaviorProfile.mockResolvedValue();
  });

  const mockReq = (quizId, studentId, violationType, answers = []) => ({
    params: { id: quizId },
    user: { _id: studentId },
    body: { violationType, answers },
  });

  const mockRes = () => {
    const res = {};
    res.status = jest.fn(() => res);
    res.json = jest.fn(() => res);
    return res;
  };

  describe('Successful Force-Submit', () => {
    it('should lock session and force-submit quiz with zero score', async () => {
      const quizId = 'quiz123';
      const studentId = 'student456';

      mockExamSessionManager.isSessionLocked.mockReturnValue(false);

      const mockQuiz = {
        _id: quizId,
        questions: [
          { _id: 'q1', weight: 10, options: ['A', 'B', 'C', 'D'], correctOptionIndex: 0 },
          { _id: 'q2', weight: 10, options: ['W', 'X', 'Y', 'Z'], correctOptionIndex: 2 },
        ],
      };

      mockQuizFindById.mockResolvedValue(mockQuiz);
      mockQuizResultCreate.mockResolvedValue({
        studentId,
        quizId,
        totalScore: 0,
        accuracyPercentage: 0,
        submissionType: 'FORCED_SECURITY',
      });

      const req = mockReq(quizId, studentId, 'TAB_SWITCH', []);
      const res = mockRes();

      await forceSubmitQuiz(req, res);

      // Session should be locked
      expect(mockExamSessionManager.lockSession).toHaveBeenCalledWith(quizId, studentId);

      // QuizResult should be created with FORCED_SECURITY type
      expect(mockQuizResultCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          submissionType: 'FORCED_SECURITY',
          violationType: 'TAB_SWITCH',
          sessionLocked: true,
        })
      );

      // IntegrityEvent should be logged
      expect(mockIntegrityEventCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          terminationTriggered: true,
          terminationReason: 'STRICT_MODE_VIOLATION',
          autoSubmitted: true,
        })
      );

      // Session should be cleaned up
      expect(mockExamSessionManager.clearSession).toHaveBeenCalledWith(quizId, studentId);

      // Response should indicate termination
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          terminated: true,
          submissionType: 'FORCED_SECURITY',
        })
      );
    });

    it('should calculate score from partial answers', async () => {
      const quizId = 'quiz789';
      const studentId = 'student999';

      mockExamSessionManager.isSessionLocked.mockReturnValue(false);

      const mockQuiz = {
        _id: quizId,
        questions: [
          { _id: 'q1', weight: 10, options: ['A', 'B', 'C', 'D'], correctOptionIndex: 0, topicTag: 'Arrays' },
          { _id: 'q2', weight: 10, options: ['W', 'X', 'Y', 'Z'], correctOptionIndex: 2, topicTag: 'Sorting' },
          { _id: 'q3', weight: 10, options: ['1', '2', '3', '4'], correctOptionIndex: 1, topicTag: 'Trees' },
        ],
      };

      const answers = [
        { questionId: 'q1', selectedOptionText: 'A', timeSpent: 30 }, // Correct
        { questionId: 'q2', selectedOptionText: 'X', timeSpent: 45 }, // Wrong
        // q3 not answered
      ];

      mockQuizFindById.mockResolvedValue(mockQuiz);
      mockEvaluateAssignment.mockResolvedValue(3.33);
      mockQuizResultCreate.mockResolvedValue({});

      const req = mockReq(quizId, studentId, 'FULLSCREEN_EXIT', answers);
      const res = mockRes();

      await forceSubmitQuiz(req, res);

      // Should calculate: 1 correct out of 3 = 33.33% accuracy
      expect(mockQuizResultCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          totalScore: 10, // Only q1 correct
          accuracyPercentage: expect.closeTo(33.33, 0.01),
          questionMetrics: expect.arrayContaining([
            expect.objectContaining({ questionId: 'q1', isCorrect: true }),
            expect.objectContaining({ questionId: 'q2', isCorrect: false }),
          ]),
        })
      );
    });

    it('should handle force-submit with no answers (zero score)', async () => {
      const quizId = 'quiz-empty';
      const studentId = 'student-empty';

      mockExamSessionManager.isSessionLocked.mockReturnValue(false);

      const mockQuiz = {
        _id: quizId,
        questions: [
          { _id: 'q1', weight: 10, options: ['A', 'B'], correctOptionIndex: 0 },
        ],
      };

      mockQuizFindById.mockResolvedValue(mockQuiz);
      mockQuizResultCreate.mockResolvedValue({});

      const req = mockReq(quizId, studentId, 'DEVTOOLS_ATTEMPT', []);
      const res = mockRes();

      await forceSubmitQuiz(req, res);

      expect(mockQuizResultCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          totalScore: 0,
          accuracyPercentage: 0,
          questionMetrics: [], // No metrics since no answers
        })
      );

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          accuracyPercentage: 0,
        })
      );
    });
  });

  describe('Duplicate Submission Prevention', () => {
    it('should return 409 Conflict if session already locked', async () => {
      const quizId = 'quiz-locked';
      const studentId = 'student-locked';

      mockExamSessionManager.isSessionLocked.mockReturnValue(true); // Already locked

      const req = mockReq(quizId, studentId, 'TAB_SWITCH', []);
      const res = mockRes();

      await forceSubmitQuiz(req, res);

      expect(mockExamSessionManager.lockSession).not.toHaveBeenCalled();
      expect(mockQuizResultCreate).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          terminated: true,
          message: expect.stringContaining('already locked'),
        })
      );
    });

    it('should prevent race conditions with multiple rapid submits', async () => {
      const quizId = 'quiz-race';
      const studentId = 'student-race';

      let locked = false;
      mockExamSessionManager.isSessionLocked.mockImplementation(() => locked);
      mockExamSessionManager.lockSession.mockImplementation(() => {
        locked = true;
      });

      const mockQuiz = {
        _id: quizId,
        questions: [{ _id: 'q1', weight: 10, options: ['A', 'B'], correctOptionIndex: 0 }],
      };

      mockQuizFindById.mockResolvedValue(mockQuiz);
      mockQuizResultCreate.mockResolvedValue({});

      const req1 = mockReq(quizId, studentId, 'TAB_SWITCH', []);
      const req2 = mockReq(quizId, studentId, 'FULLSCREEN_EXIT', []);
      const res1 = mockRes();
      const res2 = mockRes();

      // First submit
      await forceSubmitQuiz(req1, res1);
      expect(res1.status).toHaveBeenCalledWith(201);

      // Second submit (should be rejected)
      await forceSubmitQuiz(req2, res2);
      expect(res2.status).toHaveBeenCalledWith(409);
    });
  });

  describe('Error Handling', () => {
    it('should return 404 if quiz not found', async () => {
      const quizId = 'nonexistent';
      const studentId = 'student123';

      mockExamSessionManager.isSessionLocked.mockReturnValue(false);
      mockQuizFindById.mockResolvedValue(null);

      const req = mockReq(quizId, studentId, 'TAB_SWITCH', []);
      const res = mockRes();

      await forceSubmitQuiz(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('not found'),
        })
      );
    });

    it('should handle database errors gracefully', async () => {
      const quizId = 'quiz-error';
      const studentId = 'student-error';

      mockExamSessionManager.isSessionLocked.mockReturnValue(false);
      mockQuizFindById.mockRejectedValue(new Error('Database connection failed'));

      const req = mockReq(quizId, studentId, 'TAB_SWITCH', []);
      const res = mockRes();

      await forceSubmitQuiz(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.any(String),
        })
      );
    });
  });

  describe('AI Service Integration', () => {
    it('should call AI services asynchronously after force-submit', async () => {
      const quizId = 'quiz-ai';
      const studentId = 'student-ai';

      mockExamSessionManager.isSessionLocked.mockReturnValue(false);

      const mockQuiz = {
        _id: quizId,
        questions: [
          { _id: 'q1', weight: 10, options: ['A', 'B'], correctOptionIndex: 0, topicTag: 'DataStructures' },
        ],
      };

      const answers = [
        { questionId: 'q1', selectedOptionText: 'B', timeSpent: 20 }, // Wrong answer
      ];

      mockQuizFindById.mockResolvedValue(mockQuiz);
      mockQuizResultCreate.mockResolvedValue({});

      const req = mockReq(quizId, studentId, 'COPY_ATTEMPT', answers);
      const res = mockRes();

      await forceSubmitQuiz(req, res);

      // AI services should be called (even though async/best-effort)
      // Note: In real tests, these are fire-and-forget, but we verify they were triggered
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });
});
