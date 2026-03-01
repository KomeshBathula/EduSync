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
    totalScore: { type: Number, required: true },
    timeTakenSeconds: { type: Number, required: true },
    accuracyPercentage: { type: Number, required: true },
    marksAssigned: Number,
    questionMetrics: [
        {
            questionId: mongoose.Schema.Types.ObjectId,
            isCorrect: Boolean,
            timeSpent: Number,
        }
    ],
    submissionType: {
        type: String,
        enum: ['NORMAL', 'FORCED_SECURITY', 'FORCED_TIMEOUT'],
        default: 'NORMAL',
    },
    violationType: {
        type: String,
        default: null,
    },
    sessionLocked: {
        type: Boolean,
        default: false,
    },
}, { timestamps: true });

// Performance indexes
QuizResultSchema.index({ studentId: 1, createdAt: -1 });
QuizResultSchema.index({ quizId: 1 });

export default mongoose.model('QuizResult', QuizResultSchema);
