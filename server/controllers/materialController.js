import { createMaterial, removeMaterial, listMaterialsByContext, getMaterialById } from '../services/materialService.js';
import { incrementUserMetric } from '../services/mlTrackingService.js';
import { logActivity } from '../services/activityLogService.js';
import { notifyStudentsInContext } from '../services/notificationService.js';

export const uploadMaterial = async (req, res) => {
    try {
        const { title, academicContextId } = req.body;

        const material = await createMaterial({
            title,
            academicContextId,
            file: req.file,
            uploaderId: req.user._id
        });

        // Faculty activity tracking (fire-and-forget)
        logActivity({
            actorId: req.user._id,
            actionType: 'MATERIAL_UPLOAD',
            referenceId: material._id,
            referenceModel: 'Material',
            academicContextId,
            description: `Uploaded material: ${title}`,
        });

        // Notify students in the target section
        if (academicContextId) {
            notifyStudentsInContext({
                academicContextId,
                title: 'New Study Material',
                message: `New material uploaded: "${title}". Check your course materials.`,
                type: 'MATERIAL',
                referenceId: material._id,
            });
        }

        res.status(201).json(material);
    } catch (error) {
        res.status(error.statusCode || 500).json({ message: error.message });
    }
};

export const getMaterialsByContext = async (req, res) => {
    try {
        const materials = await listMaterialsByContext(req.params.contextId, req.user);
        res.status(200).json(materials);
    } catch (error) {
        res.status(error.statusCode || 500).json({ message: error.message });
    }
};

export const downloadMaterial = async (req, res) => {
    try {
        const material = await getMaterialById(req.params.id, req.user);

        res.set({
            'Content-Type': material.mimetype,
            'Content-Disposition': `inline; filename="${encodeURIComponent(material.originalFileName)}"`,
            'Content-Length': material.fileSize,
        });

        // ML tracking: material view
        if (req.user?.role === 'STUDENT') {
            incrementUserMetric(req.user._id, 'materialViewCount');
        }

        res.send(material.fileData);
    } catch (error) {
        res.status(error.statusCode || 500).json({ message: error.message });
    }
};

export const deleteMaterial = async (req, res) => {
    try {
        await removeMaterial({
            materialId: req.params.id,
            requesterId: req.user._id
        });

        res.json({ message: 'Material deleted successfully' });
    } catch (error) {
        res.status(error.statusCode || 500).json({ message: error.message });
    }
};
