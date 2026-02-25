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
    ]
}, { timestamps: true });

export default mongoose.model('User', UserSchema);
