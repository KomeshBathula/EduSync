import mongoose from 'mongoose';

const ActivityLogSchema = new mongoose.Schema({
  actorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  actionType: {
    type: String,
    enum: [
      'QUIZ_CREATE',
      'QUIZ_DELETE',
      'MATERIAL_UPLOAD',
      'MATERIAL_DELETE',
      'USER_CREATE',
      'USER_UPDATE',
      'USER_DELETE',
      'STRUCTURE_CREATE',
      'STRUCTURE_UPDATE',
      'STRUCTURE_DELETE',
    ],
    required: true,
  },
  referenceId: {
    type: mongoose.Schema.Types.ObjectId,
  },
  referenceModel: {
    type: String,
    enum: ['Quiz', 'Material', 'User', 'AcademicStructure'],
  },
  academicContextId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AcademicStructure',
  },
  description: {
    type: String,
    maxlength: 500,
  },
}, { timestamps: true });

// Index for efficient querying by actor and time
ActivityLogSchema.index({ actorId: 1, createdAt: -1 });
ActivityLogSchema.index({ academicContextId: 1, createdAt: -1 });

export default mongoose.model('ActivityLog', ActivityLogSchema);
