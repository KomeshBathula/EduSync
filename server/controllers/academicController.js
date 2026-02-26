import { getAcademicAnalytics, listPublicAcademicStructures } from '../services/academicService.js';

export const getPublicAcademicStructures = async (req, res) => {
    try {
        const structures = await listPublicAcademicStructures();
        res.json(structures);
    } catch (error) {
        res.status(error.statusCode || 500).json({ message: error.message });
    }
};

export const getAcademicAnalyticsById = async (req, res) => {
    try {
        const analytics = await getAcademicAnalytics(req.params.id);
        res.json(analytics);
    } catch (error) {
        res.status(error.statusCode || 500).json({ message: error.message });
    }
};
