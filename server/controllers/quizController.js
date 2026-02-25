import Quiz from '../models/Quiz.js';
import QuizResult from '../models/QuizResult.js';
import { generateQuizFromTopic, generateQuizFromNotes } from '../services/ai/quizGeneratorService.js';
import { updateStudentGraph } from '../services/ai/weakAreaDetector.js';
import { evaluateRisk } from '../services/ai/predictionEngine.js';
import { evaluateAssignment } from '../services/ai/assignmentEvaluator.js';

// @desc    Generate AI Quiz
// @route   POST /api/quiz/generate
// @access  Teacher
export const generateQuiz = async (req, res) => {
    try {
        const { title, sourceMode, topic, notesText, baseDifficulty } = req.body;

        let generatedQuestions = [];
        if (sourceMode === 'TOPIC') {
            generatedQuestions = await generateQuizFromTopic(topic, baseDifficulty);
        } else if (sourceMode === 'NOTES') {
            generatedQuestions = await generateQuizFromNotes(notesText, baseDifficulty);
        }

        const quiz = await Quiz.create({
            title,
            createdBy: req.user._id,
            sourceMode,
            baseDifficulty,
            questions: generatedQuestions
        });

        res.status(201).json(quiz);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Fetch quiz for student (Adaptive / Shuffled)
// @route   GET /api/quiz/:id/attempt
// @access  Student
export const getQuizForStudent = async (req, res) => {
    try {
        const quiz = await Quiz.findById(req.params.id);
        if (!quiz) return res.status(404).json({ message: 'Quiz not found' });

        // Fisher-Yates Shuffle for questions
        const shuffledQuestions = [...quiz.questions].sort(() => Math.random() - 0.5);

        // Shuffle options and remap correctOptionIndex
        const sanitizedQuestions = shuffledQuestions.map(q => {
            const optionsWithIndex = q.options.map((opt, index) => ({ text: opt, originalIndex: index }));
            optionsWithIndex.sort(() => Math.random() - 0.5); // Shuffle options

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
        res.status(500).json({ message: error.message });
    }
};

// @desc    Submit Quiz attempt
// @route   POST /api/quiz/:id/submit
// @access  Student
export const submitQuiz = async (req, res) => {
    try {
        const { timeTakenSeconds, answers } = req.body; // answers: [{ questionId, selectedOptionText, timeSpent }]
        const quiz = await Quiz.findById(req.params.id);

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

        // AI Service Updates asynchronously
        updateStudentGraph(req.user._id, weakNodes);

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
        evaluateRisk(req.user._id);

        res.status(201).json({
            message: 'Quiz evaluated successfully',
            marksAssigned,
            accuracyPercentage,
            weakNodesDetected: weakNodes
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
