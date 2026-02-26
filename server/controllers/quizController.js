import Quiz from '../models/Quiz.js';
import QuizResult from '../models/QuizResult.js';
import { generateQuizFromGroq } from '../services/ai/groqQuizService.js';
import { updateStudentGraph } from '../services/ai/weakAreaDetector.js';
import { evaluateRisk } from '../services/ai/predictionEngine.js';
import { evaluateAssignment } from '../services/ai/assignmentEvaluator.js';
import { logActivity } from '../services/activityLogService.js';
import { notifyStudentsInContext } from '../services/notificationService.js';
import { cleanupExamSession, updateBehaviorProfile, checkSessionLocked } from '../services/integrityService.js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

const MAX_QUESTIONS = 50;

// @desc    Generate AI Quiz
// @route   POST /api/quiz/generate
// @access  Teacher
export const generateQuiz = async (req, res) => {
    try {
        const { topic, difficulty, numQuestions, contextText, targetAudienceId } = req.body;

        const clampedNumQuestions = Math.min(Math.max(parseInt(numQuestions) || 5, 1), MAX_QUESTIONS);
        let combinedContext = contextText || '';

        // If a file was uploaded, extract text from its in-memory buffer
        if (req.file) {
            try {
                if (req.file.mimetype === 'application/pdf') {
                    const pdfData = await pdfParse(req.file.buffer);
                    combinedContext += `\n\n[Extracted File Text]\n${pdfData.text}`;
                } else {
                    const stringData = req.file.buffer.toString('utf8');
                    combinedContext += `\n\n[Extracted File Text]\n${stringData}`;
                }
            } catch (extractError) {
                console.error('File text extraction failed:', extractError.message);
            }
        }

        // Generate quiz using Groq
        const generatedQuestions = await generateQuizFromGroq({
            topic,
            difficulty: difficulty || 'MEDIUM',
            numQuestions: clampedNumQuestions,
            contextText: combinedContext
        });

        const quiz = await Quiz.create({
            title: `${topic} Quiz (${difficulty || 'MEDIUM'})`,
            createdBy: req.user._id,
            sourceMode: combinedContext ? 'NOTES' : 'TOPIC',
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

// @desc    Fetch quiz for student (Adaptive / Shuffled)
// @route   GET /api/quiz/:id/attempt
// @access  Student
export const getQuizForStudent = async (req, res) => {
    try {
        const quiz = await Quiz.findById(req.params.id);
        if (!quiz) return res.status(404).json({ message: 'Quiz not found' });

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

        let totalScore = 0;
        let maxScore = 0;
        let weakNodes = [];
        const questionMetrics = [];

        answers.forEach(ans => {
            const q = quiz.questions.id(ans.questionId);
            if (q) {
                maxScore += q.weight;
                // Verify answer
                const isCorrect = q.options[q.correctOptionIndex] === ans.selectedOptionText;
                if (isCorrect) {
                    totalScore += q.weight;
                } else {
                    weakNodes.push(q.topicTag);
                }

                questionMetrics.push({
                    questionId: q._id,
                    isCorrect,
                    timeSpent: ans.timeSpent
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
