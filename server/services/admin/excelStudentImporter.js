import XLSX from 'xlsx';

const REQUIRED_COLUMNS = [
    'Name of the Student',
    'Roll Number',
    'Section'
];

/**
 * Parses an Excel file buffer and extracts student rows.
 * Validates required columns and row data.
 *
 * @param {Buffer} fileBuffer - The Excel file buffer
 * @returns {Array<{ name: string, rollNumber: string, section: string }>}
 */
export const parseStudentExcel = (fileBuffer) => {
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];

    if (!sheetName) {
        const error = new Error('Excel file contains no sheets');
        error.statusCode = 400;
        throw error;
    }

    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    if (rows.length === 0) {
        const error = new Error('Excel file contains no data rows');
        error.statusCode = 400;
        throw error;
    }

    // Validate required columns exist
    const headers = Object.keys(rows[0]);
    const missingColumns = REQUIRED_COLUMNS.filter(col => !headers.includes(col));

    if (missingColumns.length > 0) {
        const error = new Error(
            `Missing required columns: ${missingColumns.join(', ')}. ` +
            `Required columns are: ${REQUIRED_COLUMNS.join(', ')}`
        );
        error.statusCode = 400;
        throw error;
    }

    const parsed = [];

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const name = String(row['Name of the Student'] || '').trim();
        const rollNumber = String(row['Roll Number'] || '').trim();
        const section = String(row['Section'] || '').trim();

        // Skip entirely empty rows
        if (!name && !rollNumber && !section) {
            continue;
        }

        const rowErrors = [];
        if (!name) rowErrors.push('Name is empty');
        if (!rollNumber) rowErrors.push('Roll Number is empty');
        if (!section) rowErrors.push('Section is empty');

        if (rowErrors.length > 0) {
            const error = new Error(
                `Row ${i + 2} validation failed: ${rowErrors.join(', ')}`
            );
            error.statusCode = 400;
            throw error;
        }

        parsed.push({ name, rollNumber, section });
    }

    if (parsed.length === 0) {
        const error = new Error('No valid student rows found in the Excel file');
        error.statusCode = 400;
        throw error;
    }

    return parsed;
};
