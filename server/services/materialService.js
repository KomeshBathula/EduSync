import Material from '../models/Material.js';

const ensureContextAccess = ({ requester, contextId }) => {
    if (requester?.role === 'ADMIN') {
        return;
    }

    if (!requester?.academicContext || String(requester.academicContext) !== String(contextId)) {
        const error = new Error('Not authorized to access materials for this section');
        error.statusCode = 403;
        throw error;
    }
};

export const createMaterial = async ({ title, academicContextId, file, uploaderId }) => {
    if (!file) {
        const error = new Error('No file uploaded');
        error.statusCode = 400;
        throw error;
    }

    if (!title || !academicContextId) {
        const error = new Error('Title and academic context ID are required');
        error.statusCode = 400;
        throw error;
    }

    const material = await Material.create({
        title,
        originalFileName: file.originalname,
        fileData: file.buffer,
        fileSize: file.size,
        mimetype: file.mimetype,
        uploadedBy: uploaderId,
        academicContext: academicContextId
    });

    // Return without the binary data
    const result = material.toObject();
    delete result.fileData;
    return result;
};

export const removeMaterial = async ({ materialId, requesterId }) => {
    const material = await Material.findById(materialId).select('-fileData');
    if (!material) {
        const error = new Error('Material not found');
        error.statusCode = 404;
        throw error;
    }

    if (String(material.uploadedBy) !== String(requesterId)) {
        const error = new Error('Not authorized to delete this material');
        error.statusCode = 403;
        throw error;
    }

    await material.deleteOne();
};

/**
 * List materials for an academic context (without file binary data).
 */
export const listMaterialsByContext = async (contextId, requester) => {
    ensureContextAccess({ requester, contextId });

    return Material.find({ academicContext: contextId })
        .select('-fileData')
        .populate('uploadedBy', 'name')
        .sort({ createdAt: -1 });
};

/**
 * Fetch a material by ID (with file binary data for download).
 */
export const getMaterialById = async (materialId, requester) => {
    const material = await Material.findById(materialId);
    if (!material) {
        const error = new Error('Material not found');
        error.statusCode = 404;
        throw error;
    }

    ensureContextAccess({ requester, contextId: material.academicContext });

    return material;
};
