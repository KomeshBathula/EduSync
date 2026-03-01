import mongoose from 'mongoose';

const NotificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  title: {
    type: String,
    required: true,
    maxlength: 200,
  },
  message: {
    type: String,
    required: true,
    maxlength: 1000,
  },
  type: {
    type: String,
    enum: ['QUIZ', 'MATERIAL', 'RISK', 'SYSTEM', 'RECOMMENDATION'],
    required: true,
  },
  referenceId: {
    type: mongoose.Schema.Types.ObjectId,
    // Flexible reference — can point to Quiz, Material, etc.
  },
  isRead: {
    type: Boolean,
    default: false,
    index: true,
  },
}, { timestamps: true });

// Compound index for efficient polling queries
NotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

// Auto-cleanup: TTL index to remove notifications older than 30 days
NotificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

export default mongoose.model('Notification', NotificationSchema);
