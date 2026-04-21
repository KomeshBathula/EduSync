import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    passwordHash: {
        type: String,
        required: true,
    },
    role: {
        type: String,
        enum: ['ADMIN', 'TEACHER', 'STUDENT'],
        required: true,
    },
    // Sub-profile specifics
    academicContext: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AcademicStructure',
    },
    rollNumber: {
        type: String,
        unique: true,
        sparse: true, // Only for students
    },
    overallRiskLevel: {
        type: String,
        enum: ['LOW', 'MEDIUM', 'HIGH'],
        default: 'LOW',
    },
    weakTopics: [
        {
            topicName: String,
            failureCount: Number,
        }
    ],

    // ─── ML-Ready Data Collection Fields ──────────────────────────
    loginCount: { type: Number, default: 0 },
    lastLoginAt: { type: Date },
    totalTimeSpentMinutes: { type: Number, default: 0 },
    materialViewCount: { type: Number, default: 0 },
    aiDoubtUsageCount: { type: Number, default: 0 },
    revisionPlanCount: { type: Number, default: 0 },

    // ─── Integrity / Behavioral Fields ──────────────────────────
    integrityScore: { type: Number, default: 100, min: 0, max: 100 },
    totalViolations: { type: Number, default: 0 },
    suspiciousExamCount: { type: Number, default: 0 },

    // ─── ML Prediction Fields ───────────────────────────────────
    lastMLPrediction: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH'] },
    lastRulePrediction: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH'] },
    predictionConfidence: { type: Number, min: 0, max: 1 },
}, { timestamps: true });

// ─── Indexes for Performance Optimization ────────────────────────
UserSchema.index({ role: 1 });
UserSchema.index({ academicContext: 1 });
UserSchema.index({ rollNumber: 1 });

export default mongoose.model('User', UserSchema);
