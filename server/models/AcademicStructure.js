import mongoose from 'mongoose';

const AcademicStructureSchema = new mongoose.Schema({
    year: {
        type: String,
        required: true,
    },
    branch: {
        type: String,
        required: true,
    },
    section: {
        type: String,
        required: true,
    },
    students: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        }
    ]
}, { timestamps: true });

export default mongoose.model('AcademicStructure', AcademicStructureSchema);
