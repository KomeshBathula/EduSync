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
    ]
}, { timestamps: true });

export default mongoose.model('QuizResult', QuizResultSchema);
