import mongoose from 'mongoose';

const QuizSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    sourceMode: {
        type: String,
        enum: ['TOPIC', 'NOTES'],
        required: true,
    },
    baseDifficulty: {
        type: String,
        enum: ['EASY', 'MEDIUM', 'HARD'],
        required: true,
    },
    questions: [
        {
            questionText: String,
            options: [String],
            correctOptionIndex: Number, // Use index to allow shuffling securely
            topicTag: String,
            weight: { type: Number, default: 1 }
        }
    ]
}, { timestamps: true });

export default mongoose.model('Quiz', QuizSchema);
