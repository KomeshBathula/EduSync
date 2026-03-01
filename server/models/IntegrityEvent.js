import mongoose from 'mongoose';

const VIOLATION_TYPES = [
  'TAB_SWITCH',
  'WINDOW_BLUR',
  'COPY_ATTEMPT',
  'PASTE_ATTEMPT',
  'RIGHT_CLICK',
  'DEVTOOLS_ATTEMPT',
  'SCREENSHOT_KEY',
  'FULLSCREEN_EXIT',
  'MULTIPLE_VIOLATIONS',
];

const IntegrityEventSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  quizId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quiz',
    required: true,
    index: true,
  },
  eventType: {
    type: String,
    enum: VIOLATION_TYPES,
    required: true,
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  autoSubmitted: {
    type: Boolean,
    default: false,
  },
  terminationTriggered: {
    type: Boolean,
    default: false,
    index: true,
  },
  terminationReason: {
    type: String,
    enum: ['NONE', 'STRICT_MODE_VIOLATION', 'THRESHOLD_EXCEEDED', 'MANUAL'],
    default: 'NONE',
  },
}, { timestamps: true });

// Compound index for efficient queries
IntegrityEventSchema.index({ quizId: 1, studentId: 1 });
IntegrityEventSchema.index({ studentId: 1, createdAt: -1 });

export { VIOLATION_TYPES };
export default mongoose.model('IntegrityEvent', IntegrityEventSchema);
