import mongoose from 'mongoose';

const MLAuditLogSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  featuresSnapshot: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
  predictedClass: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH'],
    required: true,
  },
  confidence: {
    type: Number,
    required: true,
    min: 0,
    max: 1,
  },
  predictionSource: {
    type: String,
    enum: ['ML', 'RULE'],
    required: true,
  },
  modelVersion: {
    type: String,
    default: 'v1',
  },
  predictionTimeMs: {
    type: Number,
  },
}, { timestamps: true });

MLAuditLogSchema.index({ studentId: 1, createdAt: -1 });

export default mongoose.model('MLAuditLog', MLAuditLogSchema);
