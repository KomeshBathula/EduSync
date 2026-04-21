import Quiz from '../models/Quiz.js';
import QuizResult from '../models/QuizResult.js';
import IntegrityEvent from '../models/IntegrityEvent.js';
import { generateQuizFromGroq } from '../services/ai/groqQuizService.js';
import { updateStudentGraph } from '../services/ai/weakAreaDetector.js';
import { evaluateRisk } from '../services/ai/predictionEngine.js';
import { evaluateAssignment } from '../services/ai/assignmentEvaluator.js';
import { logActivity } from '../services/activityLogService.js';
import { notifyStudentsInContext } from '../services/notificationService.js';
import { cleanupExamSession, updateBehaviorProfile, checkSessionLocked } from '../services/integrityService.js';
import examSessionManager from '../services/examSessionManager.js';

const MAX_QUESTIONS = 50;
const DEFAULT_QUESTION_WEIGHT = 1;

const normalizeQuestionWeight = (weight) => {
    if (typeof weight === 'number' && Number.isFinite(weight) && weight > 0) {
        return weight;
    }
    return DEFAULT_QUESTION_WEIGHT;
};

const ensureStudentHasQuizAccess = (quiz, user) => {
    if (!quiz?.targetAudience) {
        return;
    }

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

// @desc    Generate AI Quiz
// @route   POST /api/quiz/generate
// @access  Teacher
export const generateQuiz = async (req, res) => {
    try {
        const { title, topic, difficulty, numQuestions, targetAudienceId } = req.body;
        const sourceType = req.file ? 'PDF' : 'TOPIC';
        const sourceFileUrl = req.file ? buildPdfSourceUrl(req.file) : null;

        let finalTitle;
        if (title && title.trim() !== "") {
            finalTitle = title.trim();
        } else if (topic && topic.trim() !== "") {
            finalTitle = `${topic.trim()} Quiz (${difficulty || "MEDIUM"})`;
        } else if (req.file) {
            finalTitle = `Document-Based Quiz (${difficulty || "MEDIUM"})`;
        } else {
            return res.status(400).json({
                message: "Either title, topic, or PDF must be provided",
            });
        }

        const clampedNumQuestions = Math.min(Math.max(parseInt(numQuestions) || 5, 1), MAX_QUESTIONS);

        // Generate quiz using Groq
        const generatedQuestions = await generateQuizFromGroq({
            sourceType,
            topicName: topic,
            pdfBuffer: req.file?.buffer || null,
            difficulty: difficulty || 'MEDIUM',
            numQuestions: clampedNumQuestions,
        });

        const quiz = await Quiz.create({
            title: finalTitle,
            createdBy: req.user._id,
            sourceType,
            sourceFileUrl,
            topicName: topic,
            baseDifficulty: difficulty || 'MEDIUM',
            questions: generatedQuestions,
            targetAudience: targetAudienceId,
            status: 'PUBLISHED'
        });

        // Faculty activity tracking (fire-and-forget)
        logActivity({
            actorId: req.user._id,
            actionType: 'QUIZ_CREATE',
            referenceId: quiz._id,
            referenceModel: 'Quiz',
            academicContextId: targetAudienceId,
            description: `Generated quiz: ${quiz.title} (${generatedQuestions.length} questions)`,
        });

        // Notify students in the target section
        if (targetAudienceId) {
            notifyStudentsInContext({
                academicContextId: targetAudienceId,
                title: 'New Quiz Available',
                message: `A new quiz "${quiz.title}" has been assigned. Attempt it from your dashboard.`,
                type: 'QUIZ',
                referenceId: quiz._id,
            });
        }

        res.status(201).json(quiz);
    } catch (error) {
        console.error("Quiz Generation Error: ", error);
        res.status(error.statusCode || 500).json({ message: error.message });
    }
};

// @desc    List quizzes for a specific section
// @route   GET /api/quiz/section/:contextId
// @access  Teacher/Admin
export const getQuizzesBySection = async (req, res) => {
    try {
        const { contextId } = req.params;

        if (!contextId) {
            return res.status(400).json({ message: 'Context ID is required' });
        }

        if (
            req.user?.role === 'TEACHER' &&
            req.user?.academicContext &&
            String(req.user.academicContext) !== String(contextId)
        ) {
            return res.status(403).json({ message: 'Not authorized to view quizzes for this section' });
        }

        const quizzes = await Quiz.find({
            targetAudience: contextId,
            status: 'PUBLISHED',
        })
            .select('title baseDifficulty questions createdAt')
            .sort({ createdAt: -1 });

        res.json({ success: true, quizzes });
    } catch (error) {
        res.status(error.statusCode || 500).json({ message: error.message });
    }
};

// @desc    Fetch quiz for student (Adaptive / Shuffled)
// @route   GET /api/quiz/:id/attempt
// @access  Student
export const getQuizForStudent = async (req, res) => {
    try {
        const quiz = await Quiz.findById(req.params.id);
        if (!quiz) return res.status(404).json({ message: 'Quiz not found' });
        ensureStudentHasQuizAccess(quiz, req.user);

        // Fisher-Yates (Knuth) Shuffle for questions
        const shuffledQuestions = [...quiz.questions];
        for (let i = shuffledQuestions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffledQuestions[i], shuffledQuestions[j]] = [shuffledQuestions[j], shuffledQuestions[i]];
        }

        // Shuffle options and remap correctOptionIndex
        const sanitizedQuestions = shuffledQuestions.map(q => {
            const optionsWithIndex = q.options.map((opt, index) => ({ text: opt, originalIndex: index }));
            for (let i = optionsWithIndex.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [optionsWithIndex[i], optionsWithIndex[j]] = [optionsWithIndex[j], optionsWithIndex[i]];
            }

            return {
                _id: q._id,
                questionText: q.questionText,
                options: optionsWithIndex.map(o => o.text),
                // We do NOT send correctOptionIndex to the client to prevent cheating
                weight: q.weight
            };
        });

        res.json({
            _id: quiz._id,
            title: quiz.title,
            questions: sanitizedQuestions
        });
    } catch (error) {
        res.status(error.statusCode || 500).json({ message: error.message });
    }
};

// @desc    Submit Quiz attempt
// @route   POST /api/quiz/:id/submit
// @access  Student
export const submitQuiz = async (req, res) => {
    try {
        const { timeTakenSeconds, answers } = req.body; // answers: [{ questionId, selectedOptionText, timeSpent }]
        const quizId = req.params.id;
        const studentId = req.user._id;

        // Check if quiz was already force-submitted
        if (checkSessionLocked(quizId, studentId)) {
            return res.status(409).json({
                message: 'Quiz already force-submitted due to integrity violations.',
                forced: true,
            });
        }

        if (!Array.isArray(answers)) {
            return res.status(400).json({ message: 'Answers must be an array' });
        }

        const quiz = await Quiz.findById(req.params.id);
        if (!quiz) {
            return res.status(404).json({ message: 'Quiz not found' });
        }

        ensureStudentHasQuizAccess(quiz, req.user);

        let totalScore = 0;
        const maxScore = quiz.questions.reduce((sum, q) => sum + normalizeQuestionWeight(q.weight), 0);
        let weakNodes = [];
        const questionMetrics = [];

        const dedupedAnswers = new Map();
        answers.forEach((ans) => {
            if (ans?.questionId) {
                dedupedAnswers.set(String(ans.questionId), ans);
            }
        });

        dedupedAnswers.forEach(ans => {
            const q = quiz.questions.id(ans.questionId);
            if (q) {
                const questionWeight = normalizeQuestionWeight(q.weight);
                const selectedOptionText = typeof ans.selectedOptionText === 'string' ? ans.selectedOptionText : '';
                const timeSpent = Number.isFinite(Number(ans.timeSpent)) ? Math.max(0, Number(ans.timeSpent)) : 0;

                // Verify answer
                const isCorrect = q.options[q.correctOptionIndex] === selectedOptionText;
                if (isCorrect) {
                    totalScore += questionWeight;
                } else if (q.topicTag) {
                    weakNodes.push(q.topicTag);
                }

                questionMetrics.push({
                    questionId: q._id,
                    selectedOptionText,
                    isCorrect,
                    timeSpent,
                });
            }
        });

        const accuracyPercentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
        const marksAssigned = await evaluateAssignment(totalScore, maxScore);

        // AI Service Updates asynchronously (with error handling)
        updateStudentGraph(req.user._id, weakNodes).catch(err =>
            console.error('weakAreaDetector failed:', err.message)
        );

        const result = await QuizResult.create({
            studentId: req.user._id,
            quizId: quiz._id,
            totalScore,
            timeTakenSeconds,
            accuracyPercentage,
            marksAssigned,
            questionMetrics
        });

        // Evaluate Risk after new attempt
        evaluateRisk(req.user._id).catch(err =>
            console.error('predictionEngine failed:', err.message)
        );

        // Clean up exam session and update behavioral profile
        cleanupExamSession(quizId, studentId);
        updateBehaviorProfile(studentId, quizId).catch(err =>
            console.error('behaviorProfile update failed:', err.message)
        );

        res.status(201).json({
            message: 'Quiz evaluated successfully',
            marksAssigned,
            accuracyPercentage,
            weakNodesDetected: weakNodes
        });
    } catch (error) {
        res.status(error.statusCode || 500).json({ message: error.message });
    }
};

// @desc    Delete a quiz
// @route   DELETE /api/quiz/:id
// @access  Teacher
export const deleteQuiz = async (req, res) => {
    try {
        const quizId = req.params.id;
        const quiz = await Quiz.findById(quizId);
        if (!quiz) {
            return res.status(404).json({ message: 'Quiz not found' });
        }

        // Clean up linked results
        await QuizResult.deleteMany({ quizId: quiz._id });
        await quiz.deleteOne();

        // Faculty activity tracking
        logActivity({
            actorId: req.user._id,
            actionType: 'QUIZ_DELETE',
            referenceId: quizId,
            referenceModel: 'Quiz',
            description: `Deleted quiz: ${quiz.title}`,
        });

        res.json({ message: 'Quiz deleted successfully' });
    } catch (error) {
        res.status(error.statusCode || 500).json({ message: error.message });
    }
};

// @desc    Get Quiz Review with explanations
// @route   GET /api/quiz/:id/review
// @access  Student
export const getQuizReview = async (req, res) => {
    try {
        const quizId = req.params.id;
        const studentId = req.user._id;

        // Verify that the student has attempted this quiz
        const quizResult = await QuizResult.findOne({
            quizId,
            studentId,
        });

        if (!quizResult) {
            return res.status(403).json({
                message: 'You must attempt this quiz before viewing the review.'
            });
        }

        // Fetch the quiz with all questions
        const quiz = await Quiz.findById(quizId);
        if (!quiz) {
            return res.status(404).json({ message: 'Quiz not found' });
        }

        ensureStudentHasQuizAccess(quiz, req.user);

        // Build review structure with student answers
        const reviewQuestions = quiz.questions.map((q, idx) => {
            const metric = quizResult.questionMetrics.find(
                m => m.questionId.toString() === q._id.toString()
            );

            let studentSelectedIndex = -1;
            if (typeof metric?.selectedOptionText === 'string') {
                const resolvedIndex = q.options.indexOf(metric.selectedOptionText);
                if (resolvedIndex >= 0) {
                    studentSelectedIndex = resolvedIndex;
                }
            } else if (metric?.isCorrect) {
                // Backward compatibility with older results that did not store selectedOptionText
                studentSelectedIndex = q.correctOptionIndex;
            }

            return {
                position: idx + 1,
                questionText: q.questionText,
                options: q.options,
                correctOptionIndex: q.correctOptionIndex,
                studentSelectedIndex,
                isCorrect: metric?.isCorrect || false,
                explanation: q.explanation || 'No explanation available',
                topicTag: q.topicTag,
            };
        });

        res.json({
            success: true,
            quizId: quiz._id,
            quizTitle: quiz.title,
            score: quizResult.totalScore,
            accuracy: Math.round(quizResult.accuracyPercentage),
            timeTakenSeconds: quizResult.timeTakenSeconds,
            attemptedAt: quizResult.createdAt,
            questions: reviewQuestions,
        });
    } catch (error) {
        console.error(JSON.stringify({
            level: 'error',
            service: 'quizController',
            event: 'quiz_review_failed',
            error: error.message,
        }));
        res.status(error.statusCode || 500).json({ message: error.message });
    }
};

// @desc    Force-submit quiz due to security violation
// @route   POST /api/quiz/:id/force-submit
// @access  Student (protected)
//
// ULTRA STRICT LOCKDOWN MODE:
// - Lock session immediately
// - Calculate score from saved answers
// - Mark as FORCED_SECURITY submission
// - Log integrity event with termination reason
// - Prevent duplicate submissions (409 Conflict)
export const forceSubmitQuiz = async (req, res) => {
    try {
        const quizId = req.params.id;
        const studentId = req.user._id;
        const { violationType, answers } = req.body;

        // Check if session is already locked (prevent duplicate submissions)
        if (examSessionManager.isSessionLocked(quizId, studentId)) {
            return res.status(409).json({
                message: 'Quiz session already locked due to security violation.',
                terminated: true,
            });
        }

        // Lock session immediately
        examSessionManager.lockSession(quizId, studentId);

        // Fetch quiz
        const quiz = await Quiz.findById(quizId);
        if (!quiz) {
            return res.status(404).json({ message: 'Quiz not found' });
        }

        ensureStudentHasQuizAccess(quiz, req.user);

        // Calculate score from saved answers (or zero if none)
        let totalScore = 0;
        let maxScore = 0;
        let weakNodes = [];
        const questionMetrics = [];

        const answerMap = new Map();
        if (Array.isArray(answers)) {
            answers.forEach((answer) => {
                if (answer?.questionId) {
                    answerMap.set(String(answer.questionId), answer);
                }
            });
        }

        quiz.questions.forEach(q => {
            const questionWeight = normalizeQuestionWeight(q.weight);
            maxScore += questionWeight;

            const ans = answerMap.get(String(q._id));
            if (ans) {
                const selectedOptionText = typeof ans.selectedOptionText === 'string' ? ans.selectedOptionText : '';
                const timeSpent = Number.isFinite(Number(ans.timeSpent)) ? Math.max(0, Number(ans.timeSpent)) : 0;
                const isCorrect = q.options[q.correctOptionIndex] === selectedOptionText;

                if (isCorrect) {
                    totalScore += questionWeight;
                } else if (q.topicTag) {
                    weakNodes.push(q.topicTag);
                }

                questionMetrics.push({
                    questionId: q._id,
                    selectedOptionText,
                    isCorrect,
                    timeSpent,
                });
            }
        });

        const accuracyPercentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
        const marksAssigned = await evaluateAssignment(totalScore, maxScore);

        // Create forced submission result
        const result = await QuizResult.create({
            studentId,
            quizId,
            totalScore,
            timeTakenSeconds: 0,
            accuracyPercentage,
            marksAssigned,
            questionMetrics,
            submissionType: 'FORCED_SECURITY',
            violationType: violationType || 'UNKNOWN',
            sessionLocked: true,
        });

        // Log integrity event with termination reason
        await IntegrityEvent.create({
            studentId,
            quizId,
            eventType: 'MULTIPLE_VIOLATIONS',
            metadata: { violationType, submissionType: 'FORCED_SECURITY' },
            autoSubmitted: true,
            terminationTriggered: true,
            terminationReason: 'STRICT_MODE_VIOLATION',
        });

        // AI Services (async, best-effort)
        updateStudentGraph(studentId, weakNodes).catch(err =>
            console.error('weakAreaDetector failed in forced submit:', err.message)
        );
        evaluateRisk(studentId).catch(err =>
            console.error('predictionEngine failed in forced submit:', err.message)
        );
        updateBehaviorProfile(studentId, quizId).catch(err =>
            console.error('behaviorProfile update failed in forced submit:', err.message)
        );

        // Clean up session
        examSessionManager.clearSession(quizId, studentId);

        console.log(JSON.stringify({
            level: 'warn',
            service: 'quizController',
            event: 'force_submit_executed',
            quizId,
            studentId,
            violationType,
            accuracy: Math.round(accuracyPercentage),
        }));

        res.status(201).json({
            message: 'Quiz force-submitted due to security violation',
            terminated: true,
            terminationReason: 'Security violation detected',
            marksAssigned,
            accuracyPercentage: Math.round(accuracyPercentage),
            submissionType: 'FORCED_SECURITY',
            quizId,
        });
    } catch (error) {
        console.error(JSON.stringify({
            level: 'error',
            service: 'quizController',
            event: 'force_submit_failed',
            error: error.message,
        }));
        res.status(error.statusCode || 500).json({ message: error.message });
    }
};

