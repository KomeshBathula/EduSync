/**
 * Admin Service Role Lock & Academic Context Lock Tests
 *
 * Tests for:
 * 1. Role lock (STUDENT role cannot be changed)
 * 2. Academic context lock (permanent after assignment for students)
 *
 * Uses manual mocks — no DB connection needed.
 */
import { jest } from '@jest/globals';

// ─── Mock setup ─────────────────────────────────────────────────
const mockUserFindById = jest.fn();
const mockUserSave = jest.fn();
const mockAcademicFindByIdAndUpdate = jest.fn();
const mockAcademicFindById = jest.fn();
const mockUserCountDocuments = jest.fn();
const mockUserFindOne = jest.fn();

jest.unstable_mockModule('../../models/User.js', () => ({
    default: {
        findById: mockUserFindById,
        findOne: mockUserFindOne,
        find: jest.fn(),
        create: jest.fn(),
        countDocuments: mockUserCountDocuments,
        updateMany: jest.fn(),
    },
}));

jest.unstable_mockModule('../../models/AcademicStructure.js', () => ({
    default: {
        findById: mockAcademicFindById,
        findByIdAndUpdate: mockAcademicFindByIdAndUpdate,
        findOne: jest.fn(),
        find: jest.fn(),
        create: jest.fn(),
    },
}));

jest.unstable_mockModule('../../models/QuizResult.js', () => ({
    default: {
        deleteMany: jest.fn(),
    },
}));

jest.unstable_mockModule('bcryptjs', () => ({
    default: {
        genSalt: jest.fn().mockResolvedValue('salt'),
        hash: jest.fn().mockResolvedValue('hashedpassword'),
    },
}));

// ─── Import after mocks ─────────────────────────────────────────
const { updateUserById } = await import('../../services/adminService.js');

// ─── Tests ──────────────────────────────────────────────────────
describe('adminService role and context locks', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    // ── Role Lock Tests ─────────────────────────────────────────
    describe('Role Lock', () => {
        it('should reject role change for STUDENT users with 403', async () => {
            const mockUser = {
                _id: 'user1',
                name: 'Alice',
                email: 'alice@edusync.com',
                role: 'STUDENT',
                academicContext: 'ctx1',
                rollNumber: 'CS101',
                save: mockUserSave,
            };
            mockUserFindById.mockResolvedValue(mockUser);

            await expect(
                updateUserById('user1', {
                    name: 'Alice',
                    email: 'alice@edusync.com',
                    role: 'TEACHER',
                    academicContextId: 'ctx1',
                })
            ).rejects.toMatchObject({
                message: 'Student role is permanent and cannot be changed',
                statusCode: 403,
            });

            expect(mockUserSave).not.toHaveBeenCalled();
        });

        it('should reject role change to ADMIN for STUDENT', async () => {
            const mockUser = {
                _id: 'user1',
                name: 'Alice',
                email: 'alice@edusync.com',
                role: 'STUDENT',
                academicContext: 'ctx1',
                rollNumber: 'CS101',
                save: mockUserSave,
            };
            mockUserFindById.mockResolvedValue(mockUser);

            await expect(
                updateUserById('user1', {
                    name: 'Alice',
                    email: 'alice@edusync.com',
                    role: 'ADMIN',
                    academicContextId: 'ctx1',
                })
            ).rejects.toMatchObject({
                statusCode: 403,
            });

            expect(mockUserSave).not.toHaveBeenCalled();
        });

        it('should allow name/email update for STUDENT without changing role', async () => {
            const mockUser = {
                _id: 'user1',
                name: 'Alice',
                email: 'alice@edusync.com',
                role: 'STUDENT',
                academicContext: 'ctx1',
                rollNumber: 'CS101',
                save: mockUserSave,
            };
            mockUserFindById.mockResolvedValueOnce(mockUser);

            const savedUser = { ...mockUser, name: 'Alice Updated' };
            mockUserFindById.mockReturnValueOnce({
                populate: jest.fn().mockReturnValue({
                    select: jest.fn().mockResolvedValue(savedUser),
                }),
            });

            mockUserSave.mockResolvedValue();

            const result = await updateUserById('user1', {
                name: 'Alice Updated',
                email: 'alice@edusync.com',
                role: 'STUDENT',
                academicContextId: 'ctx1',
            });

            expect(mockUserSave).toHaveBeenCalled();
            expect(result.name).toBe('Alice Updated');
        });

        it('should allow role changes for TEACHER users', async () => {
            const mockUser = {
                _id: 'user2',
                name: 'Bob',
                email: 'bob@edusync.com',
                role: 'TEACHER',
                save: mockUserSave,
            };
            mockUserFindById.mockResolvedValueOnce(mockUser);

            mockAcademicFindById.mockResolvedValue({
                _id: 'ctx1',
                year: '2',
                branch: 'CSE',
                section: 'A',
            });
            mockAcademicFindByIdAndUpdate.mockResolvedValue({});
            mockUserCountDocuments.mockResolvedValue(0);
            mockUserFindOne.mockResolvedValue(null);

            const savedUser = { ...mockUser, role: 'STUDENT' };
            mockUserFindById.mockReturnValueOnce({
                populate: jest.fn().mockReturnValue({
                    select: jest.fn().mockResolvedValue(savedUser),
                }),
            });

            mockUserSave.mockResolvedValue();

            const result = await updateUserById('user2', {
                name: 'Bob',
                email: 'bob@edusync.com',
                role: 'STUDENT',
                academicContextId: 'ctx1',
            });

            expect(mockUserSave).toHaveBeenCalled();
        });
    });

    // ── Academic Context Lock Tests ─────────────────────────────
    describe('Academic Context Lock', () => {
        it('should reject academic context change for STUDENT with existing context', async () => {
            const mockUser = {
                _id: 'user1',
                name: 'Alice',
                email: 'alice@edusync.com',
                role: 'STUDENT',
                academicContext: 'ctx1',
                rollNumber: 'CS101',
                save: mockUserSave,
            };
            mockUserFindById.mockResolvedValue(mockUser);

            await expect(
                updateUserById('user1', {
                    name: 'Alice',
                    email: 'alice@edusync.com',
                    role: 'STUDENT',
                    academicContextId: 'ctx2',
                })
            ).rejects.toMatchObject({
                message: 'Academic context is permanently assigned for this student and cannot be changed',
                statusCode: 403,
            });

            expect(mockUserSave).not.toHaveBeenCalled();
        });

        it('should allow keeping the same academic context (no actual change)', async () => {
            const mockUser = {
                _id: 'user1',
                name: 'Alice',
                email: 'alice@edusync.com',
                role: 'STUDENT',
                academicContext: 'ctx1',
                rollNumber: 'CS101',
                save: mockUserSave,
            };
            mockUserFindById.mockResolvedValueOnce(mockUser);

            const savedUser = { ...mockUser };
            mockUserFindById.mockReturnValueOnce({
                populate: jest.fn().mockReturnValue({
                    select: jest.fn().mockResolvedValue(savedUser),
                }),
            });

            mockUserSave.mockResolvedValue();

            await updateUserById('user1', {
                name: 'Alice',
                email: 'alice@edusync.com',
                role: 'STUDENT',
                academicContextId: 'ctx1',
            });

            expect(mockUserSave).toHaveBeenCalled();
        });

        it('should allow assigning context to STUDENT with no existing context', async () => {
            const mockUser = {
                _id: 'user1',
                name: 'Alice',
                email: 'alice@edusync.com',
                role: 'STUDENT',
                academicContext: undefined,
                rollNumber: undefined,
                save: mockUserSave,
            };
            mockUserFindById.mockResolvedValueOnce(mockUser);

            mockAcademicFindById.mockResolvedValue({
                _id: 'ctx1',
                year: '2',
                branch: 'CSE',
                section: 'A',
            });
            mockAcademicFindByIdAndUpdate.mockResolvedValue({});
            mockUserCountDocuments.mockResolvedValue(0);
            mockUserFindOne.mockResolvedValue(null);

            const savedUser = { ...mockUser, academicContext: 'ctx1', rollNumber: 'Y2CSE-A-001' };
            mockUserFindById.mockReturnValueOnce({
                populate: jest.fn().mockReturnValue({
                    select: jest.fn().mockResolvedValue(savedUser),
                }),
            });

            mockUserSave.mockResolvedValue();

            const result = await updateUserById('user1', {
                name: 'Alice',
                email: 'alice@edusync.com',
                role: 'STUDENT',
                academicContextId: 'ctx1',
            });

            expect(mockUserSave).toHaveBeenCalled();
        });

        it('should return 404 if user not found', async () => {
            mockUserFindById.mockResolvedValue(null);

            await expect(
                updateUserById('nonexistent', {
                    name: 'Nobody',
                    role: 'STUDENT',
                    academicContextId: 'ctx1',
                })
            ).rejects.toMatchObject({
                statusCode: 404,
            });
        });
    });
});
