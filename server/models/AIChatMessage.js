import mongoose from 'mongoose';

const AIChatMessageSchema = new mongoose.Schema({
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    role: {
        type: String,
        enum: ['USER', 'AI'],
        required: true,
        index: true,
    },
    content: {
        type: String,
        required: true,
        trim: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
        index: true,
    }
}, { timestamps: true });

// Compound index to optimize paginated fetching by student
AIChatMessageSchema.index({ studentId: 1, createdAt: -1 });

export default mongoose.model('AIChatMessage', AIChatMessageSchema);
