import Quiz from '../models/Quiz.js';
import QuizResult from '../models/QuizResult.js';
import ExamAttempt from '../models/ExamAttempt.js';
import User from '../models/User.js';
import IntegrityEvent from '../models/IntegrityEvent.js';
import { generateQuizFromGroq } from '../services/ai/groqQuizService.js';
import { updateStudentGraph } from '../services/ai/weakAreaDetector.js';
import { evaluateRisk } from '../services/ai/predictionEngine.js';
import { evaluateAssignment } from '../services/ai/assignmentEvaluator.js';
import { logActivity } from '../services/activityLogService.js';
import { notifyStudentsInContext } from '../services/notificationService.js';
import { cleanupExamSession, updateBehaviorProfile, checkSessionLocked } from '../services/integrityService.js';
import examSessionManager from '../services/examSessionManager.js';
import { sendSuccess, sendError, sendCatchError } from '../utils/apiResponse.js';

const MAX_QUESTIONS = 50;
const DEFAULT_QUESTION_WEIGHT = 1;
const SECONDS_PER_QUESTION = 120;

// ── Helpers ──────────────────────────────────────────────────────────

const normalizeQuestionWeight = (weight) => {
    if (typeof weight === 'number' && Number.isFinite(weight) && weight > 0) return weight;
    return DEFAULT_QUESTION_WEIGHT;
};

const ensureStudentHasQuizAccess = (quiz, user) => {
    if (!quiz?.targetAudience) return;
    if (!user?.academicContext || String(user.academicContext) !== String(quiz.targetAudience)) {
        const error = new Error('You are not authorized to access this quiz');
        error.statusCode = 403;
        throw error;
    }
};

const buildPdfSourceUrl = (file) => {
    const safeFileName = encodeURIComponent(file?.originalname || 'uploaded-document.pdf');
    return `uploaded://${safeFileName}`;
};

const calcScore = (quiz, answers) => {
    const answerMap = new Map();
    if (Array.isArray(answers)) {
        answers.forEach((a) => { if (a?.questionId) answerMap.set(String(a.questionId), a); });
    }
    let totalScore = 0;
    let correctAnswers = 0;
    const totalQuestions = quiz.questions.length;
    const maxScore = quiz.questions.reduce((s, q) => s + normalizeQuestionWeight(q.weight), 0);
    const weakNodes = [];
    const questionMetrics = [];

    quiz.questions.forEach((q) => {
        const qw = normalizeQuestionWeight(q.weight);
        const ans = answerMap.get(String(q._id));
        if (ans) {
            const selectedOptionText = typeof ans.selectedOptionText === 'string' ? ans.selectedOptionText : '';
            const timeSpent = Number.isFinite(Number(ans.timeSpent)) ? Math.max(0, Number(ans.timeSpent)) : 0;
            const isCorrect = q.options[q.correctOptionIndex] === selectedOptionText;
            if (isCorrect) { totalScore += qw; correctAnswers += 1; }
            else if (q.topicTag) weakNodes.push(q.topicTag);
            questionMetrics.push({ questionId: q._id, selectedOptionText, isCorrect, timeSpent });
        }
    });

    const accuracyPercentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
    const percentage = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;
    return { totalScore, maxScore, correctAnswers, totalQuestions, accuracyPercentage, percentage, weakNodes, questionMetrics };
};

// ── Generate Quiz (Teacher) ───────────────────────────────────────────
// @route POST /api/quiz/generate  @access Teacher
export const generateQuiz = async (req, res) => {
    try {
        const { title, topic, difficulty, numQuestions, targetAudienceId, duration, totalMarks } = req.body;

        if (!req.file && !topic?.trim()) {
            return sendError(res, { status: 400, message: 'Either a topic or a PDF document is required', error: 'VALIDATION_ERROR' });
        }

        const validDifficulties = ['EASY', 'MEDIUM', 'HARD'];
        const safeDifficulty = validDifficulties.includes(difficulty) ? difficulty : 'MEDIUM';
        const clampedNumQuestions = Math.min(Math.max(parseInt(numQuestions) || 5, 1), MAX_QUESTIONS);

        const sourceType = req.file ? 'PDF' : 'TOPIC';
        const sourceFileUrl = req.file ? buildPdfSourceUrl(req.file) : null;

        let finalTitle;
        if (title?.trim()) finalTitle = title.trim();
        else if (topic?.trim()) finalTitle = `${topic.trim()} Quiz (${safeDifficulty})`;
        else finalTitle = `Document-Based Quiz (${safeDifficulty})`;

        // Generate questions (async, may retry internally)
        const generatedQuestions = await generateQuizFromGroq({
            sourceType,
            topicName: topic,
            pdfBuffer: req.file?.buffer || null,
            difficulty: safeDifficulty,
            numQuestions: clampedNumQuestions,
        });

        // Calculate duration: use explicit value or default 2 min/question
        const safeDuration = (Number.isFinite(Number(duration)) && Number(duration) >= 60)
            ? Number(duration)
            : clampedNumQuestions * SECONDS_PER_QUESTION;

        const safeTotalMarks = (Number.isFinite(Number(totalMarks)) && Number(totalMarks) >= 1)
            ? Number(totalMarks)
            : null;

        // Save as DRAFT — teacher must review and publish
        const quiz = await Quiz.create({
            title: finalTitle,
            createdBy: req.user._id,
            sourceType,
            sourceFileUrl,
            topicName: topic,
            baseDifficulty: safeDifficulty,
            questions: generatedQuestions,
            targetAudience: targetAudienceId || null,
            status: 'DRAFT',
            duration: safeDuration,
            totalMarks: safeTotalMarks,
        });

        // Fire-and-forget activity log
        logActivity({
            actorId: req.user._id,
            actionType: 'QUIZ_CREATE',
            referenceId: quiz._id,
            referenceModel: 'Quiz',
            academicContextId: targetAudienceId,
            description: `Generated quiz (DRAFT): ${quiz.title} (${generatedQuestions.length} questions)`,
        });

        return sendSuccess(res, {
            status: 201,
            message: 'Quiz generated successfully. Review and publish when ready.',
            data: { quiz },
        });
    } catch (error) {
        console.error(JSON.stringify({ level: 'error', service: 'quizController', event: 'generate_quiz_failed', error: error.message }));
        return sendCatchError(res, error, 'Failed to generate quiz');
    }
};

// ── Publish Quiz (Teacher) ────────────────────────────────────────────
// @route POST /api/quiz/:id/publish  @access Teacher
export const publishQuiz = async (req, res) => {
    try {
        const quiz = await Quiz.findById(req.params.id);
        if (!quiz) return sendError(res, { status: 404, message: 'Quiz not found', error: 'NOT_FOUND' });

        if (String(quiz.createdBy) !== String(req.user._id) && req.user.role !== 'ADMIN') {
            return sendError(res, { status: 403, message: 'Only the quiz creator can publish it', error: 'FORBIDDEN' });
        }

        if (quiz.status === 'PUBLISHED') {
            return sendError(res, { status: 409, message: 'Quiz is already published', error: 'ALREADY_PUBLISHED' });
        }

        if (!quiz.questions || quiz.questions.length === 0) {
            return sendError(res, { status: 400, message: 'Cannot publish a quiz with no questions', error: 'EMPTY_QUIZ' });
        }

        quiz.status = 'PUBLISHED';
        await quiz.save();

        // Notify students now that it is published
        if (quiz.targetAudience) {
            notifyStudentsInContext({
                academicContextId: quiz.targetAudience,
                title: 'New Quiz Available',
                message: `A new quiz "${quiz.title}" has been assigned. Attempt it from your dashboard.`,
                type: 'QUIZ',
                referenceId: quiz._id,
            });
        }

        logActivity({
            actorId: req.user._id,
            actionType: 'QUIZ_PUBLISH',
            referenceId: quiz._id,
            referenceModel: 'Quiz',
            description: `Published quiz: ${quiz.title}`,
        });

        return sendSuccess(res, { message: 'Quiz published successfully', data: { quizId: quiz._id, status: 'PUBLISHED' } });
    } catch (error) {
        return sendCatchError(res, error, 'Failed to publish quiz');
    }
};

// ── List Quizzes for Section ──────────────────────────────────────────
// @route GET /api/quiz/section/:contextId  @access Teacher/Admin
export const getQuizzesBySection = async (req, res) => {
    try {
        const { contextId } = req.params;
        if (!contextId) return sendError(res, { status: 400, message: 'Context ID is required', error: 'VALIDATION_ERROR' });

        if (req.user?.role === 'TEACHER' && req.user?.academicContext && String(req.user.academicContext) !== String(contextId)) {
            return sendError(res, { status: 403, message: 'Not authorized to view quizzes for this section', error: 'FORBIDDEN' });
        }

        // Teachers see both DRAFT and PUBLISHED; students see PUBLISHED only
        const statusFilter = req.user?.role === 'STUDENT' ? { status: 'PUBLISHED' } : {};

        const quizzes = await Quiz.find({ targetAudience: contextId, ...statusFilter })
            .select('title baseDifficulty questions status duration totalMarks createdAt')
            .sort({ createdAt: -1 })
            .lean();

        return sendSuccess(res, {
            message: 'Quizzes fetched successfully',
            data: { quizzes: quizzes ?? [] },
        });
    } catch (error) {
        return sendCatchError(res, error, 'Failed to fetch quizzes');
    }
};

// ── Start Exam (Student) ──────────────────────────────────────────────
// @route POST /api/quiz/:id/start  @access Student
// Creates or resumes an ExamAttempt. Blocks if already SUBMITTED.
export const startExam = async (req, res) => {
    try {
        const quizId = req.params.id;
        const userId = req.user._id;

        const quiz = await Quiz.findById(quizId);
        if (!quiz) return sendError(res, { status: 404, message: 'Quiz not found', error: 'NOT_FOUND' });
        if (quiz.status !== 'PUBLISHED') return sendError(res, { status: 403, message: 'This quiz is not yet available', error: 'NOT_PUBLISHED' });
        ensureStudentHasQuizAccess(quiz, req.user);

        let attempt = await ExamAttempt.findOne({ userId, quizId });

        if (attempt?.status === 'SUBMITTED') {
            return sendError(res, { status: 409, message: 'You have already submitted this quiz. Re-attempts are not allowed.', error: 'ALREADY_SUBMITTED' });
        }

        // Lazy sweep ghost attempts for this quiz in background
        sweepGhostAttempts(quiz).catch(() => {});

        const durationSeconds = quiz.duration || quiz.questions.length * SECONDS_PER_QUESTION;

        if (attempt?.status === 'IN_PROGRESS') {
            // Check if time already expired — auto-submit
            if (attempt.isExpired(durationSeconds)) {
                await autoSubmitExpiredAttempt(attempt, quiz);
                return sendError(res, { status: 409, message: 'Your exam time expired. The quiz has been auto-submitted.', error: 'TIME_EXPIRED' });
            }
            return sendSuccess(res, {
                message: 'Resuming in-progress exam',
                data: { attemptId: attempt._id, status: 'IN_PROGRESS', remainingSeconds: attempt.remainingSeconds(durationSeconds) },
            });
        }

        // Create fresh attempt
        attempt = await ExamAttempt.create({ userId, quizId, status: 'IN_PROGRESS', startedAt: new Date() });

        return sendSuccess(res, {
            status: 201,
            message: 'Exam started successfully',
            data: { attemptId: attempt._id, status: 'IN_PROGRESS', durationSeconds },
        });
    } catch (error) {
        return sendCatchError(res, error, 'Failed to start exam');
    }
};

// ── Fetch Quiz for Student (Shuffled) ────────────────────────────────
// @route GET /api/quiz/:id/attempt  @access Student
export const getQuizForStudent = async (req, res) => {
    try {
        const quizId = req.params.id;
        const userId = req.user._id;

        const quiz = await Quiz.findById(quizId);
        if (!quiz) return sendError(res, { status: 404, message: 'Quiz not found', error: 'NOT_FOUND' });
        if (quiz.status !== 'PUBLISHED') return sendError(res, { status: 403, message: 'This quiz is not yet available', error: 'NOT_PUBLISHED' });
        ensureStudentHasQuizAccess(quiz, req.user);

        // Block if already submitted
        const attempt = await ExamAttempt.findOne({ userId, quizId });
        if (attempt?.status === 'SUBMITTED') {
            return sendError(res, { status: 409, message: 'You have already submitted this quiz.', error: 'ALREADY_SUBMITTED' });
        }

        // Fisher-Yates shuffle questions
        const shuffledQuestions = [...quiz.questions];
        for (let i = shuffledQuestions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffledQuestions[i], shuffledQuestions[j]] = [shuffledQuestions[j], shuffledQuestions[i]];
        }

        // Shuffle options (do NOT send correctOptionIndex to client)
        const sanitizedQuestions = shuffledQuestions.map((q) => {
            const optionsWithIndex = q.options.map((opt, index) => ({ text: opt, originalIndex: index }));
            for (let i = optionsWithIndex.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [optionsWithIndex[i], optionsWithIndex[j]] = [optionsWithIndex[j], optionsWithIndex[i]];
            }
            return { _id: q._id, questionText: q.questionText, options: optionsWithIndex.map((o) => o.text), weight: q.weight };
        });

        const durationSeconds = quiz.duration || quiz.questions.length * SECONDS_PER_QUESTION;
        const remainingSeconds = attempt?.startedAt ? attempt.remainingSeconds(durationSeconds) : durationSeconds;

        return sendSuccess(res, {
            message: 'Quiz loaded successfully',
            data: {
                _id: quiz._id,
                title: quiz.title ?? 'Untitled Quiz',
                durationSeconds,
                remainingSeconds,
                questions: sanitizedQuestions,
            },
        });
    } catch (error) {
        return sendCatchError(res, error, 'Failed to load quiz');
    }
};

// ── Submit Quiz (Student) ─────────────────────────────────────────────
// @route POST /api/quiz/:id/submit  @access Student
export const submitQuiz = async (req, res) => {
    try {
        const { timeTakenSeconds, answers } = req.body;
        const quizId = req.params.id;
        const studentId = req.user._id;

        // Input validation
        if (!Array.isArray(answers)) {
            return sendError(res, { status: 400, message: 'answers must be an array', error: 'VALIDATION_ERROR' });
        }
        const safeTaken = Number.isFinite(Number(timeTakenSeconds)) ? Math.max(0, Number(timeTakenSeconds)) : 0;

        // Check in-memory session lock (integrity violation already auto-submitted)
        if (checkSessionLocked(quizId, studentId)) {
            return sendError(res, { status: 409, message: 'Quiz already force-submitted due to integrity violations.', error: 'SESSION_LOCKED' });
        }

        // Check persistent attempt status (server-side enforcement)
        const attempt = await ExamAttempt.findOne({ userId: studentId, quizId });
        if (attempt?.status === 'SUBMITTED') {
            return sendError(res, { status: 409, message: 'Quiz already submitted. Re-attempts are not allowed.', error: 'ALREADY_SUBMITTED' });
        }

        // Also block if a QuizResult already exists (duplicate submission guard)
        const existingResult = await QuizResult.findOne({ studentId, quizId }).lean();
        if (existingResult) {
            return sendError(res, { status: 409, message: 'You have already submitted this quiz.', error: 'ALREADY_SUBMITTED' });
        }

        const quiz = await Quiz.findById(quizId);
        if (!quiz) return sendError(res, { status: 404, message: 'Quiz not found', error: 'NOT_FOUND' });
        ensureStudentHasQuizAccess(quiz, req.user);

        // Payload Validation to block Partial Answer Exploits
        if (answers.length > quiz.questions.length) {
            console.warn(JSON.stringify({ level: 'warn', service: 'quizController', event: 'invalid_payload_too_many_answers', userId: studentId, quizId }));
            return sendError(res, { status: 400, message: 'Invalid payload: too many answers', error: 'VALIDATION_ERROR' });
        }
        
        const validQuestionIds = new Set(quiz.questions.map(q => String(q._id)));
        const seenQuestionIds = new Set();
        for (const ans of answers) {
            const qIdStr = String(ans.questionId);
            if (ans?.questionId && !validQuestionIds.has(qIdStr)) {
                 console.warn(JSON.stringify({ level: 'warn', service: 'quizController', event: 'invalid_payload_unknown_q', userId: studentId, quizId, qIdStr }));
                 return sendError(res, { status: 400, message: 'Invalid payload: unknown question ID', error: 'VALIDATION_ERROR' });
            }
            if (ans?.questionId && seenQuestionIds.has(qIdStr)) {
                 console.warn(JSON.stringify({ level: 'warn', service: 'quizController', event: 'invalid_payload_duplicate_q', userId: studentId, quizId, qIdStr }));
                 return sendError(res, { status: 400, message: 'Invalid payload: duplicate question IDs found', error: 'VALIDATION_ERROR' });
            }
            if (ans?.questionId) seenQuestionIds.add(qIdStr);
        }

        // Time Enforcement (Strict absolute expiry)
        const durationSeconds = quiz.duration || quiz.questions.length * SECONDS_PER_QUESTION;
        // Grace period defaults to 30s but ideally reads from env process.env.SUBMISSION_GRACE_PERIOD_SEC
        const gracePeriod = process.env.SUBMISSION_GRACE_PERIOD_SEC ? parseInt(process.env.SUBMISSION_GRACE_PERIOD_SEC) : 30;
        
        if (attempt?.startedAt) {
            const expiresAt = new Date(attempt.startedAt.getTime() + durationSeconds * 1000);
            const absoluteCutoff = new Date(expiresAt.getTime() + gracePeriod * 1000);
            
            if (new Date() > absoluteCutoff) {
                console.warn(JSON.stringify({ level: 'warn', service: 'quizController', event: 'late_submission_rejected', userId: studentId, quizId, expectedCutoff: absoluteCutoff.toISOString() }));
                return sendError(res, { status: 403, message: 'Exam time expired. Submission rejected.', error: 'TIME_EXPIRED' });
            }
        }

        // Deduplicate answers
        const dedupedAnswers = new Map();
        answers.forEach((a) => { if (a?.questionId) dedupedAnswers.set(String(a.questionId), a); });

        const {
            totalScore, maxScore, correctAnswers, totalQuestions,
            accuracyPercentage, percentage, weakNodes, questionMetrics,
        } = calcScore(quiz, [...dedupedAnswers.values()]);

        const marksAssigned = await evaluateAssignment(totalScore, maxScore);
        // score = (correctAnswers / totalQuestions) * totalMarks
        const scoreByMarks = (quiz.totalMarks && totalQuestions > 0)
            ? (correctAnswers / totalQuestions) * quiz.totalMarks
            : null;

        // Persist result with all Phase 4 fields
        await QuizResult.create({
            studentId, quizId,
            totalScore, correctAnswers, totalQuestions,
            percentage: Math.round(percentage * 100) / 100,
            score: scoreByMarks !== null ? Math.round(scoreByMarks * 100) / 100 : null,
            timeTakenSeconds: safeTaken,
            accuracyPercentage,
            marksAssigned,
            questionMetrics,
        });

        // Mark attempt as SUBMITTED
        if (attempt) {
            attempt.status = 'SUBMITTED';
            attempt.submittedAt = new Date();
            attempt.score = totalScore;
            attempt.answers = [...dedupedAnswers.values()];
            await attempt.save();
        } else {
            await ExamAttempt.create({ userId: studentId, quizId, status: 'SUBMITTED', startedAt: new Date(), submittedAt: new Date(), score: totalScore });
        }

        // Async AI updates (best-effort)
        updateStudentGraph(req.user._id, weakNodes).catch((e) => console.error('weakAreaDetector failed:', e.message));
        evaluateRisk(req.user._id).catch((e) => console.error('predictionEngine failed:', e.message));
        cleanupExamSession(quizId, studentId);
        updateBehaviorProfile(studentId, quizId).catch((e) => console.error('behaviorProfile update failed:', e.message));

        // Lazy sweep ghost attempts for this quiz in background
        sweepGhostAttempts(quiz).catch(() => {});

        return sendSuccess(res, {
            status: 201,
            message: 'Quiz submitted and evaluated successfully',
            data: {
                correctAnswers,
                totalQuestions,
                score: scoreByMarks !== null ? Math.round(scoreByMarks * 100) / 100 : null,
                totalMarks: quiz.totalMarks ?? null,
                percentage: Math.round(percentage * 100) / 100,
                marksAssigned,
                accuracyPercentage: Math.round(accuracyPercentage),
                weakNodesDetected: weakNodes ?? [],
            },
        });
    } catch (error) {
        // Handle duplicate key error from DB unique index gracefully
        if (error.code === 11000) {
            console.warn(JSON.stringify({ level: 'warn', service: 'quizController', event: 'duplicate_submission_blocked', userId: req.user._id, quizId: req.params.id }));
            return sendError(res, { status: 409, message: 'You have already submitted this quiz.', error: 'ALREADY_SUBMITTED' });
        }
        console.error(JSON.stringify({ level: 'error', service: 'quizController', event: 'submit_quiz_failed', userId: req.user._id, quizId: req.params.id, error: error.message }));
        return sendCatchError(res, error, 'Failed to submit quiz');
    }
};


// ── Force-Submit (Security Violation) ────────────────────────────────
// @route POST /api/quiz/:id/force-submit  @access Student
export const forceSubmitQuiz = async (req, res) => {
    try {
        const quizId = req.params.id;
        const studentId = req.user._id;
        const { violationType, answers } = req.body;

        if (examSessionManager.isSessionLocked(quizId, studentId)) {
            return sendError(res, { status: 409, message: 'Quiz session already locked due to security violation.', error: 'SESSION_LOCKED' });
        }

        // Check DB-level block too
        const attempt = await ExamAttempt.findOne({ userId: studentId, quizId });
        if (attempt?.status === 'SUBMITTED') {
            return sendError(res, { status: 409, message: 'Quiz already submitted.', error: 'ALREADY_SUBMITTED' });
        }

        examSessionManager.lockSession(quizId, studentId);

        const quiz = await Quiz.findById(quizId);
        if (!quiz) return sendError(res, { status: 404, message: 'Quiz not found', error: 'NOT_FOUND' });
        ensureStudentHasQuizAccess(quiz, req.user);

        const { totalScore, maxScore, accuracyPercentage, weakNodes, questionMetrics } = calcScore(quiz, answers);
        const marksAssigned = await evaluateAssignment(totalScore, maxScore);

        await QuizResult.create({ studentId, quizId, totalScore, timeTakenSeconds: 0, accuracyPercentage, marksAssigned, questionMetrics, submissionType: 'FORCED_SECURITY', violationType: violationType || 'UNKNOWN', sessionLocked: true });

        await IntegrityEvent.create({ studentId, quizId, eventType: 'MULTIPLE_VIOLATIONS', metadata: { violationType, submissionType: 'FORCED_SECURITY' }, autoSubmitted: true, terminationTriggered: true, terminationReason: 'STRICT_MODE_VIOLATION' });

        // Mark attempt SUBMITTED in DB
        if (attempt) {
            attempt.status = 'SUBMITTED';
            attempt.submittedAt = new Date();
            attempt.score = totalScore;
            attempt.submissionType = 'FORCED_SECURITY';
            await attempt.save();
        }

        // Async cleanup
        updateStudentGraph(studentId, weakNodes).catch((e) => console.error('weakAreaDetector failed in forced submit:', e.message));
        evaluateRisk(studentId).catch((e) => console.error('predictionEngine failed in forced submit:', e.message));
        updateBehaviorProfile(studentId, quizId).catch((e) => console.error('behaviorProfile update failed in forced submit:', e.message));
        examSessionManager.clearSession(quizId, studentId);

        console.log(JSON.stringify({ level: 'warn', service: 'quizController', event: 'force_submit_executed', quizId, studentId: String(studentId), violationType, accuracy: Math.round(accuracyPercentage) }));

        return sendSuccess(res, {
            status: 201,
            message: 'Quiz force-submitted due to security violation',
            data: { terminated: true, terminationReason: 'Security violation detected', marksAssigned, accuracyPercentage: Math.round(accuracyPercentage), submissionType: 'FORCED_SECURITY', quizId },
        });
    } catch (error) {
        console.error(JSON.stringify({ level: 'error', service: 'quizController', event: 'force_submit_failed', error: error.message }));
        return sendCatchError(res, error, 'Failed to force-submit quiz');
    }
};

// ── Delete Quiz (Teacher) ─────────────────────────────────────────────
// @route DELETE /api/quiz/:id  @access Teacher
export const deleteQuiz = async (req, res) => {
    try {
        const quiz = await Quiz.findById(req.params.id);
        if (!quiz) return sendError(res, { status: 404, message: 'Quiz not found', error: 'NOT_FOUND' });

        await QuizResult.deleteMany({ quizId: quiz._id });
        await ExamAttempt.deleteMany({ quizId: quiz._id });
        await quiz.deleteOne();

        logActivity({ actorId: req.user._id, actionType: 'QUIZ_DELETE', referenceId: req.params.id, referenceModel: 'Quiz', description: `Deleted quiz: ${quiz.title}` });

        return sendSuccess(res, { message: 'Quiz deleted successfully', data: null });
    } catch (error) {
        return sendCatchError(res, error, 'Failed to delete quiz');
    }
};

// ── Quiz Review (Student) ─────────────────────────────────────────────
// @route GET /api/quiz/:id/review  @access Student
export const getQuizReview = async (req, res) => {
    try {
        const quizId = req.params.id;
        const studentId = req.user._id;

        const quizResult = await QuizResult.findOne({ quizId, studentId });
        if (!quizResult) return sendError(res, { status: 403, message: 'You must attempt this quiz before viewing the review.', error: 'NO_ATTEMPT' });

        const quiz = await Quiz.findById(quizId);
        if (!quiz) return sendError(res, { status: 404, message: 'Quiz not found', error: 'NOT_FOUND' });
        ensureStudentHasQuizAccess(quiz, req.user);

        const reviewQuestions = quiz.questions.map((q, idx) => {
            const metric = quizResult.questionMetrics.find((m) => m.questionId.toString() === q._id.toString());
            let studentSelectedIndex = -1;
            if (typeof metric?.selectedOptionText === 'string') {
                const resolvedIndex = q.options.indexOf(metric.selectedOptionText);
                if (resolvedIndex >= 0) studentSelectedIndex = resolvedIndex;
            } else if (metric?.isCorrect) {
                studentSelectedIndex = q.correctOptionIndex;
            }
            return {
                position: idx + 1,
                questionText: q.questionText ?? 'N/A',
                options: q.options ?? [],
                correctOptionIndex: q.correctOptionIndex,
                studentSelectedIndex,
                isCorrect: metric?.isCorrect ?? false,
                explanation: q.explanation ?? 'No explanation available',
                topicTag: q.topicTag ?? null,
            };
        });

        return sendSuccess(res, {
            message: 'Quiz review loaded',
            data: {
                quizId: quiz._id,
                quizTitle: quiz.title ?? 'N/A',
                score: quizResult.totalScore ?? 0,
                accuracy: Math.round(quizResult.accuracyPercentage ?? 0),
                timeTakenSeconds: quizResult.timeTakenSeconds ?? 0,
                attemptedAt: quizResult.createdAt,
                questions: reviewQuestions,
            },
        });
    } catch (error) {
        console.error(JSON.stringify({ level: 'error', service: 'quizController', event: 'quiz_review_failed', error: error.message }));
        return sendCatchError(res, error, 'Failed to load quiz review');
    }
};

// ── Internal: Auto-submit expired attempt ─────────────────────────────
async function autoSubmitExpiredAttempt(attempt, quiz) {
    const studentId = attempt.userId;
    const quizId = attempt.quizId;

    const { totalScore, maxScore, accuracyPercentage, weakNodes, questionMetrics } = calcScore(quiz, attempt.answers ?? []);
    const marksAssigned = await evaluateAssignment(totalScore, maxScore);

    await QuizResult.create({ studentId, quizId, totalScore, timeTakenSeconds: 0, accuracyPercentage, marksAssigned, questionMetrics, submissionType: 'FORCED_TIMEOUT', sessionLocked: false });

    attempt.status = 'SUBMITTED';
    attempt.submittedAt = new Date();
    attempt.score = totalScore;
    attempt.submissionType = 'FORCED_TIMEOUT';
    await attempt.save();

    updateStudentGraph(studentId, weakNodes).catch(() => {});
    evaluateRisk(studentId).catch(() => {});
    cleanupExamSession(String(quizId), String(studentId));

    console.log(JSON.stringify({ level: 'info', service: 'quizController', event: 'auto_submit_timeout', quizId: String(quizId), studentId: String(studentId) }));

    return { marksAssigned, accuracyPercentage: Math.round(accuracyPercentage), weakNodesDetected: weakNodes };
}

// ── Internal: Auto-Expire Ghost Attempts (Lazy Sweep) ────────────────
async function sweepGhostAttempts(quiz) {
    if (!quiz || !quiz._id) return;
    try {
        const durationSeconds = quiz.duration || (quiz.questions?.length || 0) * SECONDS_PER_QUESTION;
        const cutoffTime = new Date(Date.now() - (durationSeconds + 120) * 1000);
        
        const ghostAttempts = await ExamAttempt.find({ 
            quizId: quiz._id, 
            status: 'IN_PROGRESS', 
            startedAt: { $lt: cutoffTime } 
        });
        
        if (ghostAttempts.length > 0) {
            console.log(JSON.stringify({ level: 'info', service: 'quizController', event: 'ghost_cleanup_start', quizId: quiz._id, count: ghostAttempts.length }));
            for (const ghost of ghostAttempts) {
                try {
                    await autoSubmitExpiredAttempt(ghost, quiz);
                } catch (err) {
                    console.error(JSON.stringify({ level: 'error', service: 'quizController', event: 'ghost_cleanup_failed', attemptId: ghost._id, error: err.message }));
                }
            }
        }
    } catch (err) {
        console.error(JSON.stringify({ level: 'error', service: 'quizController', event: 'ghost_cleanup_error', error: err.message }));
    }
}

// ── Get Quiz Detail (Teacher Preview) ────────────────────────────────
// @route GET /api/quiz/:id/detail  @access Teacher, Admin
// Returns full quiz with correct answers visible — intended for teacher review before publish.
export const getQuizDetail = async (req, res) => {
    try {
        const quiz = await Quiz.findById(req.params.id).lean();
        if (!quiz) return sendError(res, { status: 404, message: 'Quiz not found', error: 'NOT_FOUND' });

        // Teachers can only preview quizzes they created (or admin can see all)
        if (req.user.role === 'TEACHER' && String(quiz.createdBy) !== String(req.user._id)) {
            return sendError(res, { status: 403, message: 'You can only preview your own quizzes', error: 'FORBIDDEN' });
        }

        const questions = (quiz.questions ?? []).map((q, idx) => ({
            position: idx + 1,
            questionText: q.questionText ?? 'N/A',
            options: q.options ?? [],
            correctOptionIndex: q.correctOptionIndex,
            correctAnswer: q.options?.[q.correctOptionIndex] ?? 'N/A',
            explanation: q.explanation ?? 'No explanation provided',
            topicTag: q.topicTag ?? null,
            weight: q.weight ?? 1,
        }));

        return sendSuccess(res, {
            message: 'Quiz detail loaded',
            data: {
                _id: quiz._id,
                title: quiz.title ?? 'Untitled',
                status: quiz.status,
                baseDifficulty: quiz.baseDifficulty,
                sourceType: quiz.sourceType,
                topicName: quiz.topicName ?? null,
                duration: quiz.duration ?? null,
                totalMarks: quiz.totalMarks ?? null,
                createdAt: quiz.createdAt,
                questionCount: questions.length,
                questions,
            },
        });
    } catch (error) {
        return sendCatchError(res, error, 'Failed to load quiz detail');
    }
};

// ── Update Quiz (DRAFT only) ──────────────────────────────────────────
// @route PUT /api/quiz/:id  @access Teacher
// Allows editing questions while quiz is still DRAFT. PUBLISHED quizzes are read-only.
export const updateQuiz = async (req, res) => {
    try {
        const quiz = await Quiz.findById(req.params.id);
        if (!quiz) return sendError(res, { status: 404, message: 'Quiz not found', error: 'NOT_FOUND' });

        // Only the creator can edit
        if (String(quiz.createdBy) !== String(req.user._id) && req.user.role !== 'ADMIN') {
            return sendError(res, { status: 403, message: 'Only the quiz creator can edit it', error: 'FORBIDDEN' });
        }

        // Check if ANY attempt exists (regardless of DRAFT or PUBLISHED, though DRAFT shouldn't have attempts)
        const attemptCount = await ExamAttempt.countDocuments({ quizId: quiz._id });
        if (attemptCount > 0) {
            return sendError(res, { status: 409, message: 'Cannot edit quiz because students have already started attempting it.', error: 'LOCKED' });
        }

        // PUBLISHED quizzes are read-only
        if (quiz.status !== 'DRAFT') {
            return sendError(res, { status: 409, message: 'Only DRAFT quizzes can be edited. Published quizzes are read-only.', error: 'NOT_DRAFT' });
        }

        const { title, questions, duration, totalMarks } = req.body;

        // Validate and apply title
        if (title !== undefined) {
            if (typeof title !== 'string' || !title.trim()) {
                return sendError(res, { status: 400, message: 'title must be a non-empty string', error: 'VALIDATION_ERROR' });
            }
            quiz.title = title.trim();
        }

        // Validate and apply questions
        if (questions !== undefined) {
            if (!Array.isArray(questions) || questions.length === 0) {
                return sendError(res, { status: 400, message: 'questions must be a non-empty array', error: 'VALIDATION_ERROR' });
            }
            for (let i = 0; i < questions.length; i++) {
                const q = questions[i];
                if (typeof q.questionText !== 'string' || !q.questionText.trim()) {
                    return sendError(res, { status: 400, message: `Question ${i + 1}: questionText is required and cannot be empty`, error: 'VALIDATION_ERROR' });
                }
                if (!Array.isArray(q.options) || q.options.length !== 4) {
                    return sendError(res, { status: 400, message: `Question ${i + 1}: exactly 4 options are required`, error: 'VALIDATION_ERROR' });
                }
                
                const uniqueOptions = new Set();
                for (let j = 0; j < q.options.length; j++) {
                    const opt = q.options[j];
                    if (typeof opt !== 'string' || !opt.trim()) {
                        return sendError(res, { status: 400, message: `Question ${i + 1}: option cannot be empty`, error: 'VALIDATION_ERROR' });
                    }
                    uniqueOptions.add(opt.trim());
                }
                if (uniqueOptions.size !== q.options.length) {
                    return sendError(res, { status: 400, message: `Question ${i + 1}: options must be unique`, error: 'VALIDATION_ERROR' });
                }

                if (typeof q.correctOptionIndex !== 'number' || !Number.isInteger(q.correctOptionIndex) || q.correctOptionIndex < 0 || q.correctOptionIndex > 3) {
                    return sendError(res, { status: 400, message: `Question ${i + 1}: correctOptionIndex must be an integer between 0 and 3`, error: 'VALIDATION_ERROR' });
                }
            }
            quiz.questions = questions;
        }

        // Validate duration
        if (duration !== undefined) {
            const d = Number(duration);
            if (!Number.isFinite(d) || d <= 0) {
                return sendError(res, { status: 400, message: 'duration must be a positive number (seconds)', error: 'VALIDATION_ERROR' });
            }
            quiz.duration = d;
        }

        // Validate totalMarks
        if (totalMarks !== undefined) {
            const tm = Number(totalMarks);
            if (!Number.isFinite(tm) || tm <= 0) {
                return sendError(res, { status: 400, message: 'totalMarks must be a positive number', error: 'VALIDATION_ERROR' });
            }
            quiz.totalMarks = tm;
        }

        // Re-check attempts immediately before save to close race window
        const finalAttemptCount = await ExamAttempt.countDocuments({ quizId: quiz._id });
        if (finalAttemptCount > 0) {
            console.warn(JSON.stringify({ level: 'warn', service: 'quizController', event: 'race_condition_prevented', quizId: quiz._id }));
            return sendError(res, { status: 409, message: 'Cannot save quiz. A student just started an attempt.', error: 'LOCKED_DURING_EDIT' });
        }

        await quiz.save();

        return sendSuccess(res, {
            message: 'Quiz updated successfully',
            data: {
                _id: quiz._id,
                title: quiz.title,
                status: quiz.status,
                questionCount: quiz.questions.length,
                duration: quiz.duration,
                totalMarks: quiz.totalMarks ?? null,
            },
        });
    } catch (error) {
        console.error(JSON.stringify({ level: 'error', service: 'quizController', event: 'update_quiz_failed', error: error.message }));
        return sendCatchError(res, error, 'Failed to update quiz');
    }
};

// ── Get Quiz Results (Teacher) ────────────────────────────────────────
// @route GET /api/quiz/:id/results  @access Teacher, Admin
// Returns all student submissions with class-level analytics (avg, high, low).
export const getQuizResults = async (req, res) => {
    try {
        const quizId = req.params.id;

        const quiz = await Quiz.findById(quizId).select('title totalMarks createdBy status duration questions targetAudience').lean();
        if (!quiz) return sendError(res, { status: 404, message: 'Quiz not found', error: 'NOT_FOUND' });

        if (req.user.role === 'TEACHER' && String(quiz.createdBy) !== String(req.user._id)) {
            return sendError(res, { status: 403, message: 'You can only view results for your own quizzes', error: 'FORBIDDEN' });
        }

        // --- Auto-Expire Ghost Attempts (Lazy Sweep) ---
        await sweepGhostAttempts(quiz);
        // -----------------------------------------------

        // Paginate — default page 1, limit 50
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
        const skip = (page - 1) * limit;

        const [results, total] = await Promise.all([
            QuizResult.find({ quizId })
                .populate('studentId', 'name email rollNumber')
                .select('studentId correctAnswers totalQuestions score percentage accuracyPercentage submissionType createdAt timeTakenSeconds')
                .sort({ score: -1, createdAt: 1 }) // ranked: highest first, earliest first on tie
                .skip(skip)
                .limit(limit)
                .lean(),
            QuizResult.countDocuments({ quizId }),
        ]);

        // Class analytics (Load-aware with absent calculation)
        let avgScore = 0, highScore = 0, lowScore = Infinity;
        let avgPercentage = 0;
        let passCount = 0;
        let failCount = 0;
        
        // Fetch total enrolled for authentic analytics
        let enrolledCount = total; // fallback
        if (quiz.targetAudience) {
            enrolledCount = await User.countDocuments({ role: 'STUDENT', academicContext: quiz.targetAudience });
        }
        const absentCount = Math.max(0, enrolledCount - total);

        const distribution = {
            '0-25': 0,
            '26-50': 0,
            '51-75': 0,
            '76-100': 0,
        };

        if (results.length > 0) {
            const scores = results.map(r => r.score ?? r.percentage ?? 0);
            highScore = Math.max(...scores);
            lowScore = Math.min(...scores);
            avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
            avgPercentage = results.reduce((a, r) => a + (r.percentage ?? 0), 0) / results.length;
            
            results.forEach(r => {
                const pct = r.percentage ?? 0;
                if (pct >= 40) passCount++;
                else failCount++;

                
                if (pct <= 25) distribution['0-25']++;
                else if (pct <= 50) distribution['26-50']++;
                else if (pct <= 75) distribution['51-75']++;
                else distribution['76-100']++;
            });
        } else {
            lowScore = 0;
        }

        const formatted = results.map((r, idx) => ({
            rank: skip + idx + 1,
            studentName: r.studentId?.name ?? 'N/A',
            studentEmail: r.studentId?.email ?? 'N/A',
            rollNumber: r.studentId?.rollNumber ?? 'N/A',
            correctAnswers: r.correctAnswers ?? 0,
            totalQuestions: r.totalQuestions ?? 0,
            score: r.score ?? null,
            totalMarks: quiz.totalMarks ?? null,
            percentage: r.percentage ?? 0,
            submissionType: r.submissionType ?? 'NORMAL',
            timeTakenSeconds: r.timeTakenSeconds ?? 0,
            submittedAt: r.createdAt,
        }));

        return sendSuccess(res, {
            message: 'Quiz results fetched successfully',
            data: {
                quiz: { title: quiz.title ?? 'N/A', totalMarks: quiz.totalMarks ?? null, status: quiz.status },
                analytics: {
                    totalEnrolled: enrolledCount,
                    totalSubmissions: total,
                    absentCount,
                    submissionRate: enrolledCount > 0 ? Math.round((total / enrolledCount) * 100) : 0,
                    averageScore: total > 0 ? Math.round(avgScore * 100) / 100 : 0,
                    averagePercentage: total > 0 ? Math.round(avgPercentage * 100) / 100 : 0,
                    highestScore: total > 0 ? Math.round(highScore * 100) / 100 : 0,
                    lowestScore: total > 0 ? Math.round(lowScore * 100) / 100 : 0,
                    passRateTotal: enrolledCount > 0 ? Math.round((passCount / enrolledCount) * 100) : 0,
                    passRateSubmissions: total > 0 ? Math.round((passCount / total) * 100) : 0,
                    failCount: failCount + absentCount, // Absent students fail
                    distribution,
                },
                pagination: { page, limit, total, pages: Math.ceil(total / limit) },
                results: formatted,
            },
        });
    } catch (error) {
        return sendCatchError(res, error, 'Failed to fetch quiz results');
    }
};
