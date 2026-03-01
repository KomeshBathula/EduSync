import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import mongoose from 'mongoose';
import User from '../../models/User.js';
import AcademicStructure from '../../models/AcademicStructure.js';
import { parseStudentExcel } from './excelStudentImporter.js';

/**
 * Bulk imports students from an Excel file buffer into a given academic section.
 *
 * @param {Buffer} fileBuffer - Excel file buffer
 * @param {string} sectionId - AcademicStructure ObjectId
 * @returns {{ totalRows: number, insertedCount: number, duplicateCount: number, errors: string[] }}
 */
export const bulkImportStudents = async (fileBuffer, sectionId) => {
    // 1. Validate section exists
    const structure = await AcademicStructure.findById(sectionId);
    if (!structure) {
        const error = new Error('Academic structure not found');
        error.statusCode = 404;
        throw error;
    }

    // 2. Parse Excel
    const students = parseStudentExcel(fileBuffer);

    const totalRows = students.length;
    const errors = [];
    const duplicates = [];
    const toInsert = [];

    // 3. Collect all roll numbers and emails to check duplicates in one query
    const rollNumbers = students.map(s => s.rollNumber);
    const emails = students.map(s => `${s.rollNumber.toLowerCase()}@edusync.com`);

    const existingByRoll = await User.find(
        { rollNumber: { $in: rollNumbers } },
        { rollNumber: 1 }
    ).lean();
    const existingRollSet = new Set(existingByRoll.map(u => u.rollNumber));

    const existingByEmail = await User.find(
        { email: { $in: emails } },
        { email: 1 }
    ).lean();
    const existingEmailSet = new Set(existingByEmail.map(u => u.email));

    // Also track duplicates within the file itself
    const seenRolls = new Set();
    const seenEmails = new Set();

    // 4. Generate a single salt for all users (performance optimization)
    const salt = await bcrypt.genSalt(10);

    for (let i = 0; i < students.length; i++) {
        const { name, rollNumber } = students[i];
        const email = `${rollNumber.toLowerCase()}@edusync.com`;

        // Check DB duplicates
        if (existingRollSet.has(rollNumber)) {
            duplicates.push(`Row ${i + 2}: Roll number "${rollNumber}" already exists in database`);
            continue;
        }

        if (existingEmailSet.has(email)) {
            duplicates.push(`Row ${i + 2}: Email "${email}" already exists in database`);
            continue;
        }

        // Check intra-file duplicates
        if (seenRolls.has(rollNumber)) {
            duplicates.push(`Row ${i + 2}: Duplicate roll number "${rollNumber}" within file`);
            continue;
        }

        if (seenEmails.has(email)) {
            duplicates.push(`Row ${i + 2}: Duplicate email "${email}" within file`);
            continue;
        }

        seenRolls.add(rollNumber);
        seenEmails.add(email);

        const password = crypto.randomBytes(6).toString('hex');
        const passwordHash = await bcrypt.hash(password, salt);

        toInsert.push({
            name,
            email,
            passwordHash,
            role: 'STUDENT',
            academicContext: new mongoose.Types.ObjectId(sectionId),
            rollNumber
        });
    }

    if (toInsert.length === 0) {
        return {
            totalRows,
            insertedCount: 0,
            duplicateCount: duplicates.length,
            errors: duplicates
        };
    }

    // 5. Batch insert with ordered: false so partial success is possible,
    //    then use a session for the AcademicStructure update
    const session = await mongoose.startSession();
    try {
        session.startTransaction();

        const insertedDocs = await User.insertMany(toInsert, {
            ordered: false,
            session
        });

        // Add all inserted student IDs to the academic structure
        const insertedIds = insertedDocs.map(doc => doc._id);
        await AcademicStructure.findByIdAndUpdate(
            sectionId,
            { $addToSet: { students: { $each: insertedIds } } },
            { session }
        );

        await session.commitTransaction();

        return {
            totalRows,
            insertedCount: insertedDocs.length,
            duplicateCount: duplicates.length,
            errors: duplicates
        };
    } catch (err) {
        await session.abortTransaction();

        // If it's a bulk write error, some may have inserted
        if (err.code === 11000) {
            const error = new Error('Duplicate key error during bulk insert. Transaction rolled back.');
            error.statusCode = 409;
            throw error;
        }

        throw err;
    } finally {
        session.endSession();
    }
};
