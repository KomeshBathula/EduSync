import mongoose from 'mongoose';

const MaterialSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
    },
    originalFileName: {
        type: String,
        required: true,
    },
    fileData: {
        type: Buffer,
        required: true,
    },
    fileSize: {
        type: Number,
        required: true,
    },
    mimetype: {
        type: String,
        required: true,
    },
    uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    academicContext: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AcademicStructure',
        required: true,
    }
}, { timestamps: true });

export default mongoose.model('Material', MaterialSchema);
