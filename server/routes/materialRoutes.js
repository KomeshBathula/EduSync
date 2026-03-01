import express from 'express';
import multer from 'multer';
import { protect, roleGuard } from '../middleware/authMiddleware.js';
import { uploadMaterial, getMaterialsByContext, deleteMaterial, downloadMaterial } from '../controllers/materialController.js';

const router = express.Router();

const ALLOWED_MIMETYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
];

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 16 * 1024 * 1024 }, // 16 MB max (MongoDB doc limit is 16MB)
    fileFilter: (req, file, cb) => {
        if (ALLOWED_MIMETYPES.includes(file.mimetype)) {
            cb(null, true);
        } else {
            const err = new Error(`File type not allowed: ${file.mimetype}`);
            err.statusCode = 415;
            cb(err);
        }
    }
});

// Multer error handler middleware
const handleMulterError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        return res.status(400).json({ message: err.message });
    }
    if (err && err.statusCode) {
        return res.status(err.statusCode).json({ message: err.message });
    }
    next(err);
};

router.post('/upload', protect, roleGuard('TEACHER'), upload.single('document'), handleMulterError, uploadMaterial);
router.get('/download/:id', protect, downloadMaterial);
router.get('/context/:contextId', protect, getMaterialsByContext);
router.delete('/:id', protect, roleGuard('TEACHER'), deleteMaterial);

export default router;
