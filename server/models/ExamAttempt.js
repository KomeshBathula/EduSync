import mongoose from 'mongoose';

/**
 * ExamAttempt — Persistent exam session tracking.
 *
 * Replaces the previous in-memory-only approach.
 * Survives server restarts and supports multi-instance deployments.
 *
 * Status lifecycle:
 *   NOT_STARTED → IN_PROGRESS → SUBMITTED
 *
 * Once SUBMITTED the student is permanently blocked from re-attempting.
 */
const ExamAttemptSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    quizId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Quiz',
      required: true,
    },
    status: {
      type: String,
      enum: ['NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED'],
      default: 'NOT_STARTED',
    },
    startedAt: {
      type: Date,
      default: null,
    },
    submittedAt: {
      type: Date,
      default: null,
    },
    // Number of integrity violations recorded against this attempt
    violations: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Partial answers saved as student progresses (for resume/forced-submit recovery)
    answers: {
      type: [
        {
          questionId: mongoose.Schema.Types.ObjectId,
          selectedOptionText: { type: String, default: '' },
          timeSpent: { type: Number, default: 0 },
        },
      ],
      default: [],
    },
    // Final score (raw weighted score, same as QuizResult.totalScore)
    score: {
      type: Number,
      default: null,
    },
    submissionType: {
      type: String,
      enum: ['NORMAL', 'FORCED_SECURITY', 'FORCED_TIMEOUT'],
      default: 'NORMAL',
    },
  },
  { timestamps: true }
);

// --- Indexes ---
// Fast look-up by userId + quizId (used in every attempt access)
ExamAttemptSchema.index({ userId: 1, quizId: 1 }, { unique: true });
// Teacher/admin dashboards query by quizId + status
ExamAttemptSchema.index({ quizId: 1, status: 1 });
// Student history by userId
ExamAttemptSchema.index({ userId: 1, status: 1 });

// --- Helper to get remaining time (seconds) ---
ExamAttemptSchema.methods.remainingSeconds = function (durationSeconds) {
  if (!this.startedAt) return durationSeconds;
  const elapsed = Math.floor((Date.now() - this.startedAt.getTime()) / 1000);
  return Math.max(0, durationSeconds - elapsed);
};

// --- Helper: is attempt expired? ---
ExamAttemptSchema.methods.isExpired = function (durationSeconds) {
  if (!this.startedAt) return false;
  return this.remainingSeconds(durationSeconds) <= 0;
};

export default mongoose.model('ExamAttempt', ExamAttemptSchema);
