/**
 * Bulk Import & Role Lock Tests
 *
 * Tests for:
 * 1. Excel parsing (excelStudentImporter) — pure function, no mocks
 * 2. Bulk import service (bulkImportService)
 * 3. Role lock (STUDENT role immutable)
 * 4. Academic context lock (permanent after assignment)
 *
 * Uses manual mocks — no DB connection needed.
 */
import { jest } from '@jest/globals';
import XLSX from 'xlsx';

// ─── Helper: create an Excel buffer from rows ────────────────────
const createExcelBuffer = (rows, sheetName = 'Sheet1') => {
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
};

// ─── 1. Excel Parser Tests (no mocks needed, pure function) ─────
describe('excelStudentImporter', () => {
    let parseStudentExcel;

    beforeAll(async () => {
        const mod = await import('../../services/admin/excelStudentImporter.js');
        parseStudentExcel = mod.parseStudentExcel;
    });

    it('should parse a valid Excel file with correct columns', () => {
        const buffer = createExcelBuffer([
            { 'Name of the Student': 'Alice', 'Roll Number': 'CS101', 'Section': 'A' },
            { 'Name of the Student': 'Bob', 'Roll Number': 'CS102', 'Section': 'A' },
        ]);

        const result = parseStudentExcel(buffer);

        expect(result).toHaveLength(2);
        expect(result[0]).toEqual({ name: 'Alice', rollNumber: 'CS101', section: 'A' });
        expect(result[1]).toEqual({ name: 'Bob', rollNumber: 'CS102', section: 'A' });
    });

    it('should throw 400 if required columns are missing', () => {
        const buffer = createExcelBuffer([
            { 'Student Name': 'Alice', 'Roll': 'CS101' },
        ]);

        expect(() => parseStudentExcel(buffer)).toThrow(/Missing required columns/);
        try {
            parseStudentExcel(buffer);
        } catch (err) {
            expect(err.statusCode).toBe(400);
        }
    });

    it('should skip entirely empty rows', () => {
        const buffer = createExcelBuffer([
            { 'Name of the Student': 'Alice', 'Roll Number': 'CS101', 'Section': 'A' },
            { 'Name of the Student': '', 'Roll Number': '', 'Section': '' },
            { 'Name of the Student': 'Bob', 'Roll Number': 'CS102', 'Section': 'A' },
        ]);

        const result = parseStudentExcel(buffer);
        expect(result).toHaveLength(2);
    });

    it('should throw on partially empty row (name missing)', () => {
        const buffer = createExcelBuffer([
            { 'Name of the Student': '', 'Roll Number': 'CS101', 'Section': 'A' },
        ]);

        expect(() => parseStudentExcel(buffer)).toThrow(/Name is empty/);
    });

    it('should throw on partially empty row (roll number missing)', () => {
        const buffer = createExcelBuffer([
            { 'Name of the Student': 'Alice', 'Roll Number': '', 'Section': 'A' },
        ]);

        expect(() => parseStudentExcel(buffer)).toThrow(/Roll Number is empty/);
    });

    it('should throw when Excel has no data rows', () => {
        const ws = XLSX.utils.aoa_to_sheet([
            ['Name of the Student', 'Roll Number', 'Section']
        ]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
        const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

        expect(() => parseStudentExcel(buffer)).toThrow(/no data rows/);
    });

    it('should trim whitespace from values', () => {
        const buffer = createExcelBuffer([
            { 'Name of the Student': '  Alice  ', 'Roll Number': ' CS101 ', 'Section': ' A ' },
        ]);

        const result = parseStudentExcel(buffer);
        expect(result[0]).toEqual({ name: 'Alice', rollNumber: 'CS101', section: 'A' });
    });

    it('should handle large files (500+ rows)', () => {
        const rows = [];
        for (let i = 1; i <= 600; i++) {
            rows.push({
                'Name of the Student': `Student ${i}`,
                'Roll Number': `CS${String(i).padStart(4, '0')}`,
                'Section': 'A'
            });
        }
        const buffer = createExcelBuffer(rows);

        const result = parseStudentExcel(buffer);
        expect(result).toHaveLength(600);
    });
});

// ─── 2. Bulk Import Service Tests ───────────────────────────────
describe('bulkImportService', () => {
    const mockUserFind = jest.fn();
    const mockUserInsertMany = jest.fn();
    const mockAcademicFindById = jest.fn();
    const mockAcademicFindByIdAndUpdate = jest.fn();
    const mockStartSession = jest.fn();

    const mockSession = {
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        abortTransaction: jest.fn(),
        endSession: jest.fn(),
    };

    let bulkImportStudents;

    beforeAll(async () => {
        jest.unstable_mockModule('../../models/User.js', () => ({
            default: {
                find: mockUserFind,
                insertMany: mockUserInsertMany,
            },
        }));

        jest.unstable_mockModule('../../models/AcademicStructure.js', () => ({
            default: {
                findById: mockAcademicFindById,
                findByIdAndUpdate: mockAcademicFindByIdAndUpdate,
            },
        }));

        jest.unstable_mockModule('mongoose', () => {
            const actualTypes = {
                ObjectId: class ObjectId {
                    constructor(id) { this.id = id; }
                    toString() { return this.id; }
                }
            };
            return {
                default: {
                    startSession: mockStartSession,
                    Types: actualTypes,
                },
                Types: actualTypes,
            };
        });

        const mod = await import('../../services/admin/bulkImportService.js');
        bulkImportStudents = mod.bulkImportStudents;
    });

    beforeEach(() => {
        jest.clearAllMocks();
        mockStartSession.mockResolvedValue(mockSession);
    });

    // Helper to set up User.find to return chainable .lean()
    const setupUserFind = (...returnValues) => {
        for (const val of returnValues) {
            mockUserFind.mockReturnValueOnce({
                lean: jest.fn().mockResolvedValue(val),
            });
        }
    };

    it('should throw 404 when section not found', async () => {
        mockAcademicFindById.mockResolvedValue(null);

        const buffer = createExcelBuffer([
            { 'Name of the Student': 'Alice', 'Roll Number': 'CS101', 'Section': 'A' },
        ]);

        await expect(bulkImportStudents(buffer, 'invalid-id')).rejects.toMatchObject({
            statusCode: 404,
        });
    });

    it('should import students and return correct summary', async () => {
        mockAcademicFindById.mockResolvedValue({
            _id: 'section1',
            year: '2',
            branch: 'CSE',
            section: 'A',
        });

        // No existing duplicates
        setupUserFind([], []);

        const insertedDocs = [
            { _id: 'u1', name: 'Alice', rollNumber: 'CS101' },
            { _id: 'u2', name: 'Bob', rollNumber: 'CS102' },
        ];
        mockUserInsertMany.mockResolvedValue(insertedDocs);
        mockAcademicFindByIdAndUpdate.mockResolvedValue({});

        const buffer = createExcelBuffer([
            { 'Name of the Student': 'Alice', 'Roll Number': 'CS101', 'Section': 'A' },
            { 'Name of the Student': 'Bob', 'Roll Number': 'CS102', 'Section': 'A' },
        ]);

        const result = await bulkImportStudents(buffer, 'section1');

        expect(result.totalRows).toBe(2);
        expect(result.insertedCount).toBe(2);
        expect(result.duplicateCount).toBe(0);
        expect(result.errors).toHaveLength(0);
        expect(mockSession.commitTransaction).toHaveBeenCalled();
    });

    it('should skip duplicate roll numbers from database', async () => {
        mockAcademicFindById.mockResolvedValue({
            _id: 'section1',
            year: '2',
            branch: 'CSE',
            section: 'A',
        });

        // CS101 already exists in DB
        setupUserFind(
            [{ rollNumber: 'CS101' }],  // existing by roll
            []                           // existing by email
        );

        const insertedDocs = [
            { _id: 'u2', name: 'Bob', rollNumber: 'CS102' },
        ];
        mockUserInsertMany.mockResolvedValue(insertedDocs);
        mockAcademicFindByIdAndUpdate.mockResolvedValue({});

        const buffer = createExcelBuffer([
            { 'Name of the Student': 'Alice', 'Roll Number': 'CS101', 'Section': 'A' },
            { 'Name of the Student': 'Bob', 'Roll Number': 'CS102', 'Section': 'A' },
        ]);

        const result = await bulkImportStudents(buffer, 'section1');

        expect(result.insertedCount).toBe(1);
        expect(result.duplicateCount).toBe(1);
        expect(result.errors[0]).toMatch(/CS101/);
    });

    it('should handle intra-file duplicate roll numbers', async () => {
        mockAcademicFindById.mockResolvedValue({
            _id: 'section1',
            year: '2',
            branch: 'CSE',
            section: 'A',
        });

        setupUserFind([], []);

        const insertedDocs = [
            { _id: 'u1', name: 'Alice', rollNumber: 'CS101' },
        ];
        mockUserInsertMany.mockResolvedValue(insertedDocs);
        mockAcademicFindByIdAndUpdate.mockResolvedValue({});

        const buffer = createExcelBuffer([
            { 'Name of the Student': 'Alice', 'Roll Number': 'CS101', 'Section': 'A' },
            { 'Name of the Student': 'Alice Duplicate', 'Roll Number': 'CS101', 'Section': 'A' },
        ]);

        const result = await bulkImportStudents(buffer, 'section1');

        expect(result.insertedCount).toBe(1);
        expect(result.duplicateCount).toBe(1);
        expect(result.errors[0]).toMatch(/Duplicate roll number.*CS101.*within file/);
    });

    it('should rollback on insert failure', async () => {
        mockAcademicFindById.mockResolvedValue({
            _id: 'section1',
            year: '2',
            branch: 'CSE',
            section: 'A',
        });

        setupUserFind([], []);

        const dupError = new Error('E11000 duplicate key error');
        dupError.code = 11000;
        mockUserInsertMany.mockRejectedValue(dupError);

        const buffer = createExcelBuffer([
            { 'Name of the Student': 'Alice', 'Roll Number': 'CS101', 'Section': 'A' },
        ]);

        await expect(bulkImportStudents(buffer, 'section1')).rejects.toMatchObject({
            statusCode: 409,
        });

        expect(mockSession.abortTransaction).toHaveBeenCalled();
        expect(mockSession.endSession).toHaveBeenCalled();
    });

    it('should return zero inserts when all are duplicates', async () => {
        mockAcademicFindById.mockResolvedValue({
            _id: 'section1',
            year: '2',
            branch: 'CSE',
            section: 'A',
        });

        // All rolls already exist
        setupUserFind(
            [{ rollNumber: 'CS101' }, { rollNumber: 'CS102' }],
            []
        );

        const buffer = createExcelBuffer([
            { 'Name of the Student': 'Alice', 'Roll Number': 'CS101', 'Section': 'A' },
            { 'Name of the Student': 'Bob', 'Roll Number': 'CS102', 'Section': 'A' },
        ]);

        const result = await bulkImportStudents(buffer, 'section1');

        expect(result.totalRows).toBe(2);
        expect(result.insertedCount).toBe(0);
        expect(result.duplicateCount).toBe(2);
        // Should NOT call insertMany when nothing to insert
        expect(mockUserInsertMany).not.toHaveBeenCalled();
    });
});
