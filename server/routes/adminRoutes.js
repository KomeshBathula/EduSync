import express from 'express';
import multer from 'multer';
import {
    addAcademicStructure,
    getAcademicStructures,
    updateAcademicStructure,
    deleteAcademicStructure,
    getUsers,
    updateUser,
    deleteUser,
    addUser,
    bulkImportUsers
} from '../controllers/adminController.js';
import { protect, roleGuard } from '../middleware/authMiddleware.js';

const router = express.Router();

// Multer config for Excel file uploads
const EXCEL_MIMETYPES = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel'
];

const excelUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (EXCEL_MIMETYPES.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only Excel files (.xlsx, .xls) are allowed'));
        }
    }
});

router.use(protect, roleGuard('ADMIN'));

// Academic Structures
router.route('/academic')
    .post(addAcademicStructure)
    .get(getAcademicStructures);

router.route('/academic/:id')
    .put(updateAcademicStructure)
    .delete(deleteAcademicStructure);

// Users (Students / Faculty)
router.route('/users')
    .post(addUser)
    .get(getUsers);

router.route('/users/:id')
    .put(updateUser)
    .delete(deleteUser);

// Bulk Import
router.post('/users/bulk-import', excelUpload.single('file'), bulkImportUsers);

export default router;
