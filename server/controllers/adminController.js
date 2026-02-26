import {
    createAcademicStructure,
    listAcademicStructures,
    updateAcademicStructureById,
    deleteAcademicStructureById,
    createUser,
    listUsers,
    updateUserById,
    deleteUserById
} from '../services/adminService.js';

// ==========================================
// ACADEMIC STRUCTURE CONTROLLERS
// ==========================================

export const addAcademicStructure = async (req, res) => {
    try {
        const structure = await createAcademicStructure(req.body);
        res.status(201).json(structure);
    } catch (error) {
        res.status(error.statusCode || 500).json({ message: error.message });
    }
};

export const getAcademicStructures = async (req, res) => {
    try {
        const structures = await listAcademicStructures();
        res.json(structures);
    } catch (error) {
        res.status(error.statusCode || 500).json({ message: error.message });
    }
};

export const updateAcademicStructure = async (req, res) => {
    try {
        const structure = await updateAcademicStructureById(req.params.id, req.body);
        res.json(structure);
    } catch (error) {
        res.status(error.statusCode || 500).json({ message: error.message });
    }
};

export const deleteAcademicStructure = async (req, res) => {
    try {
        await deleteAcademicStructureById(req.params.id);
        res.json({ message: 'Structure removed' });
    } catch (error) {
        res.status(error.statusCode || 500).json({ message: error.message });
    }
};

// ==========================================
// USER CRUD CONTROLLERS
// ==========================================

export const addUser = async (req, res) => {
    try {
        const user = await createUser(req.body);
        res.status(201).json(user);
    } catch (error) {
        res.status(error.statusCode || 500).json({ message: error.message });
    }
};

export const getUsers = async (req, res) => {
    try {
        const users = await listUsers(req.query.role);
        res.json(users);
    } catch (error) {
        res.status(error.statusCode || 500).json({ message: error.message });
    }
};

export const updateUser = async (req, res) => {
    try {
        const user = await updateUserById(req.params.id, req.body);
        res.json(user);
    } catch (error) {
        res.status(error.statusCode || 500).json({ message: error.message });
    }
};

export const deleteUser = async (req, res) => {
    try {
        await deleteUserById(req.params.id);
        res.json({ message: 'User removed' });
    } catch (error) {
        res.status(error.statusCode || 500).json({ message: error.message });
    }
};
