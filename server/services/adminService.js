import bcrypt from 'bcryptjs';
import AcademicStructure from '../models/AcademicStructure.js';
import QuizResult from '../models/QuizResult.js';
import User from '../models/User.js';

const ensureRequired = (value, label) => {
    if (!value) {
        const error = new Error(`${label} is required`);
        error.statusCode = 400;
        throw error;
    }
};

const generateRollNumberPrefix = (structure) => {
    return `Y${structure.year}${structure.branch}-${structure.section}-`;
};

const generateUniqueRollNumber = async (structure) => {
    const prefix = generateRollNumberPrefix(structure);
    const existingCount = await User.countDocuments({
        role: 'STUDENT',
        academicContext: structure._id
    });

    let sequence = existingCount + 1;
    while (true) {
        const candidate = `${prefix}${String(sequence).padStart(3, '0')}`;
        const exists = await User.findOne({ rollNumber: candidate });
        if (!exists) {
            return candidate;
        }
        sequence += 1;
    }
};

export const createAcademicStructure = async ({ year, branch, section }) => {
    ensureRequired(year, 'Year');
    ensureRequired(branch, 'Branch');
    ensureRequired(section, 'Section');

    const exists = await AcademicStructure.findOne({ year, branch, section });
    if (exists) {
        const error = new Error('This structure already exists');
        error.statusCode = 400;
        throw error;
    }

    const structure = await AcademicStructure.create({ year, branch, section });
    return structure;
};

export const listAcademicStructures = async () => {
    return AcademicStructure.find({})
        .populate('students', 'name email rollNumber')
        .sort({ year: 1, branch: 1, section: 1 })
        .collation({ locale: 'en_US', numericOrdering: true });
};

export const updateAcademicStructureById = async (id, { year, branch, section }) => {
    const structure = await AcademicStructure.findById(id);
    if (!structure) {
        const error = new Error('Structure not found');
        error.statusCode = 404;
        throw error;
    }

    const nextYear = year || structure.year;
    const nextBranch = branch || structure.branch;
    const nextSection = section || structure.section;

    const duplicate = await AcademicStructure.findOne({
        year: nextYear,
        branch: nextBranch,
        section: nextSection,
        _id: { $ne: structure._id }
    });

    if (duplicate) {
        const error = new Error('This structure already exists');
        error.statusCode = 400;
        throw error;
    }

    structure.year = nextYear;
    structure.branch = nextBranch;
    structure.section = nextSection;
    await structure.save();

    return structure;
};

export const deleteAcademicStructureById = async (id) => {
    const structure = await AcademicStructure.findById(id);
    if (!structure) {
        const error = new Error('Structure not found');
        error.statusCode = 404;
        throw error;
    }

    await User.updateMany(
        { academicContext: id },
        { $unset: { academicContext: '', rollNumber: '' } }
    );

    await structure.deleteOne();
};

export const createUser = async ({ name, email, password, role, academicContextId }) => {
    ensureRequired(name, 'Name');
    ensureRequired(email, 'Email');

    const userExists = await User.findOne({ email });
    if (userExists) {
        const error = new Error('User already exists');
        error.statusCode = 400;
        throw error;
    }

    const targetRole = role || 'STUDENT';
    let contextId = undefined;
    let rollNumber = undefined;

    if (targetRole === 'STUDENT') {
        ensureRequired(academicContextId, 'Academic context');
        const structure = await AcademicStructure.findById(academicContextId);
        if (!structure) {
            const error = new Error('Academic structure not found');
            error.statusCode = 404;
            throw error;
        }
        contextId = structure._id;
        rollNumber = await generateUniqueRollNumber(structure);
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password || '12345678', salt);

    const user = await User.create({
        name,
        email,
        passwordHash,
        role: targetRole,
        academicContext: contextId,
        rollNumber
    });

    if (contextId) {
        await AcademicStructure.findByIdAndUpdate(contextId, {
            $addToSet: { students: user._id }
        });
    }

    return User.findById(user._id)
        .populate('academicContext', 'year branch section')
        .select('-passwordHash');
};

export const listUsers = async (role) => {
    const query = {};
    if (role) {
        query.role = role;
    }

    return User.find(query)
        .populate('academicContext', 'year branch section')
        .select('-passwordHash');
};

export const updateUserById = async (id, { name, email, role, academicContextId, rollNumber, password }) => {
    const user = await User.findById(id);
    if (!user) {
        const error = new Error('User not found');
        error.statusCode = 404;
        throw error;
    }

    // ─── Role Lock: STUDENT role is permanent ─────────────────────
    if (user.role === 'STUDENT' && role && role !== 'STUDENT') {
        const error = new Error('Student role is permanent and cannot be changed');
        error.statusCode = 403;
        throw error;
    }

    // ─── Academic Context Lock: once assigned, permanent for students ──
    if (user.role === 'STUDENT' && user.academicContext && academicContextId &&
        String(user.academicContext) !== String(academicContextId)) {
        const error = new Error('Academic context is permanently assigned for this student and cannot be changed');
        error.statusCode = 403;
        throw error;
    }

    const nextRole = role || user.role;
    user.name = name || user.name;
    user.email = email || user.email;
    user.role = nextRole;

    if (password && password.trim() !== '') {
        if (password.trim().length < 6) {
            const error = new Error('Password must be at least 6 characters');
            error.statusCode = 400;
            throw error;
        }
        const salt = await bcrypt.genSalt(10);
        user.passwordHash = await bcrypt.hash(password.trim(), salt);
        
        // Log the password reset action (fire and forget)
        import('./activityLogService.js').then(({ logActivity }) => {
            logActivity({
                actorId: id, // Typically would be the admin's ID, but using target ID as fallback in service layer
                actionType: 'PASSWORD_RESET',
                referenceId: user._id,
                referenceModel: 'User',
                description: `Password reset for user: ${user.email}`
            }).catch(err => console.error('Failed to log password reset', err));
        }).catch(() => {});
    }

    if (rollNumber) {
        user.rollNumber = rollNumber;
    }

    if (nextRole !== 'STUDENT') {
        if (user.academicContext) {
            await AcademicStructure.findByIdAndUpdate(user.academicContext, {
                $pull: { students: user._id }
            });
        }
        user.academicContext = undefined;
        user.rollNumber = undefined;
    } else {
        if (!academicContextId) {
            const error = new Error('Academic context is required for students');
            error.statusCode = 400;
            throw error;
        }

        if (!user.academicContext || String(user.academicContext) !== String(academicContextId)) {
            if (user.academicContext) {
                await AcademicStructure.findByIdAndUpdate(user.academicContext, {
                    $pull: { students: user._id }
                });
            }
            const newStructure = await AcademicStructure.findById(academicContextId);
            if (!newStructure) {
                const error = new Error('Academic structure not found');
                error.statusCode = 404;
                throw error;
            }
            await AcademicStructure.findByIdAndUpdate(academicContextId, {
                $addToSet: { students: user._id }
            });
            user.academicContext = academicContextId;
            user.rollNumber = await generateUniqueRollNumber(newStructure);
        }
    }

    await user.save();
    return User.findById(user._id)
        .populate('academicContext', 'year branch section')
        .select('-passwordHash');
};

export const deleteUserById = async (id) => {
    const user = await User.findById(id);
    if (!user) {
        const error = new Error('User not found');
        error.statusCode = 404;
        throw error;
    }

    if (user.role === 'ADMIN') {
        const error = new Error('Cannot delete admin users');
        error.statusCode = 403;
        throw error;
    }

    if (user.academicContext) {
        await AcademicStructure.findByIdAndUpdate(user.academicContext, {
            $pull: { students: user._id }
        });
    }

    if (user.role === 'STUDENT') {
        await QuizResult.deleteMany({ studentId: user._id });
    }

    await user.deleteOne();
};
