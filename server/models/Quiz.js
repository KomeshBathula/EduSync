import mongoose from 'mongoose';

const QuizSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Quiz title is required'],
        trim: true,
        minlength: [2, 'Title must be at least 2 characters'],
        maxlength: [200, 'Title must not exceed 200 characters'],
    },
    topicName: {
        type: String,
        default: null,
        trim: true,
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    sourceType: {
        type: String,
        enum: ['TOPIC', 'PDF'],
        required: [true, 'Source type is required'],
    },
    sourceFileUrl: {
        type: String,
        default: null,
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
            correctOptionIndex: Number,
            explanation: String, // Why the correct option is correct (2-4 sentences)
            topicTag: String,
            weight: { type: Number, default: 1 }
        }
    ],
    targetAudience: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AcademicStructure'
    },
    status: {
        type: String,
        enum: ['DRAFT', 'PUBLISHED'],
        default: 'DRAFT',   // Teachers must explicitly publish after preview
    },
    // Exam duration in seconds (default: 2 min per question, set on generate)
    duration: {
        type: Number,
        default: null,       // null = calculated dynamically from question count
        min: 60,
    },
    // Total marks pool for percentage-based scoring
    totalMarks: {
        type: Number,
        default: null,       // null = falls back to raw weighted score
        min: 1,
    },
}, { timestamps: true });

// Create indexes for faster queries
QuizSchema.index({ targetAudience: 1, createdBy: 1, createdAt: -1 });
QuizSchema.index({ targetAudience: 1 });
QuizSchema.index({ status: 1, targetAudience: 1 });

// Schema-level validation
QuizSchema.pre('validate', function (next) {
    if (this.sourceType === 'TOPIC' && !this.topicName) {
        this.invalidate('topicName', 'Topic name is required when sourceType is TOPIC');
    }
    if (this.sourceType === 'PDF' && !this.sourceFileUrl) {
        this.invalidate('sourceFileUrl', 'Source file URL is required when sourceType is PDF');
    }
    next();
});

export default mongoose.model('Quiz', QuizSchema);
