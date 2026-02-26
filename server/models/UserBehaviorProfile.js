import mongoose from 'mongoose';

const UserBehaviorProfileSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true,
  },
  totalViolations: { type: Number, default: 0 },
  totalExams: { type: Number, default: 0 },
  suspiciousExamCount: { type: Number, default: 0 },
  autoSubmitCount: { type: Number, default: 0 },
  integrityScore: { type: Number, default: 100, min: 0, max: 100 },

  // Per-type violation breakdown
  violationBreakdown: {
    TAB_SWITCH: { type: Number, default: 0 },
    WINDOW_BLUR: { type: Number, default: 0 },
    COPY_ATTEMPT: { type: Number, default: 0 },
    PASTE_ATTEMPT: { type: Number, default: 0 },
    RIGHT_CLICK: { type: Number, default: 0 },
    DEVTOOLS_ATTEMPT: { type: Number, default: 0 },
    SCREENSHOT_KEY: { type: Number, default: 0 },
    FULLSCREEN_EXIT: { type: Number, default: 0 },
  },

  // Average violations per exam (for ML)
  avgViolationsPerExam: { type: Number, default: 0 },
  // Average time-to-first-violation in seconds (for ML)
  avgTimeToFirstViolation: { type: Number, default: 0 },

  lastUpdatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

export default mongoose.model('UserBehaviorProfile', UserBehaviorProfileSchema);
