import mongoose from 'mongoose';

const AIChatConversationSchema = new mongoose.Schema({
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
        unique: true, // One active conversation per student
    },
    messages: [
        {
            role: {
                type: String,
                enum: ['USER', 'AI'],
                required: true,
            },
            content: {
                type: String,
                required: true,
                trim: true,
            },
            timestamp: {
                type: Date,
                default: Date.now,
            },
        },
    ],
    totalMessages: {
        type: Number,
        default: 0,
    },
}, { timestamps: true });

// Auto-truncate to 200 messages max to prevent unbounded growth
AIChatConversationSchema.pre('save', function (next) {
    if (this.messages.length > 200) {
        // Keep last 200 messages
        this.messages = this.messages.slice(-200);
    }
    this.totalMessages = this.messages.length;
    next();
});

export default mongoose.model('AIChatConversation', AIChatConversationSchema);
