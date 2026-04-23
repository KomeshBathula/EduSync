import mongoose from 'mongoose';

const QuizResultSchema = new mongoose.Schema({
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    quizId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Quiz',
        required: true,
    },
    // Raw weighted score (sum of correct question weights)
    totalScore: { type: Number, required: true },
    // Count of questions answered correctly
    correctAnswers: { type: Number, default: 0 },
    // Total questions in the quiz at submission time
    totalQuestions: { type: Number, default: 0 },
    // (correctAnswers / totalQuestions) * 100
    percentage: { type: Number, default: 0 },
    // (correctAnswers / totalQuestions) * totalMarks
    score: { type: Number, default: null },
    timeTakenSeconds: { type: Number, required: true },
    // Kept for backward compat (same as percentage)
    accuracyPercentage: { type: Number, required: true },
    marksAssigned: { type: Number, default: null },
    questionMetrics: [
        {
            questionId: mongoose.Schema.Types.ObjectId,
            selectedOptionText: { type: String, default: '' },
            isCorrect: { type: Boolean, default: false },
            timeSpent: { type: Number, default: 0 },
        }
    ],
    submissionType: {
        type: String,
        enum: ['NORMAL', 'FORCED_SECURITY', 'FORCED_TIMEOUT'],
        default: 'NORMAL',
    },
    violationType: { type: String, default: null },
    sessionLocked: { type: Boolean, default: false },
}, { timestamps: true });

// Prevent duplicate submissions at DB level (one result per student per quiz)
QuizResultSchema.index({ studentId: 1, quizId: 1 }, { unique: true });
QuizResultSchema.index({ studentId: 1, createdAt: -1 });
QuizResultSchema.index({ quizId: 1 });

export default mongoose.model('QuizResult', QuizResultSchema);
