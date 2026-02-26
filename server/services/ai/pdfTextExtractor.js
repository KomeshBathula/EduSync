import pdfParse from './pdfParseWrapper.js';

// ─── Constants ────────────────────────────────────────────────────
const MAX_TEXT_LENGTH = 24000; // ~6000 tokens, safe for Groq context window
const MIN_TEXT_LENGTH = 20;   // Reject near-empty PDFs

/**
 * Extract and clean text from a PDF buffer.
 * @param {Buffer} buffer - The raw PDF file buffer
 * @returns {Promise<string>} - Cleaned text content
 * @throws Structured error with statusCode
 */
export const extractTextFromPDF = async (buffer) => {
  if (!buffer || !Buffer.isBuffer(buffer)) {
    console.error(JSON.stringify({
      level: 'error',
      service: 'pdfTextExtractor',
      event: 'no_buffer',
      bufferType: typeof buffer,
      isBuffer: Buffer.isBuffer(buffer),
    }));
    const err = new Error('Invalid file: no buffer provided.');
    err.statusCode = 400;
    throw err;
  }

  // Validate PDF magic bytes (%PDF)
  const header = buffer.slice(0, 5).toString('ascii');
  console.log(JSON.stringify({
    level: 'debug',
    service: 'pdfTextExtractor',
    event: 'buffer_received',
    length: buffer.length,
    header: header,
    isPDF: header.startsWith('%PDF'),
  }));

  if (!header.startsWith('%PDF')) {
    console.error(JSON.stringify({
      level: 'error',
      service: 'pdfTextExtractor',
      event: 'invalid_pdf_header',
      header,
    }));
    const err = new Error('Invalid file format: only PDF files are supported.');
    err.statusCode = 422;
    throw err;
  }

  let pdfData;
  try {
    console.log(JSON.stringify({
      level: 'debug',
      service: 'pdfTextExtractor',
      event: 'parsing_pdf',
      bufferLength: buffer.length,
    }));
    pdfData = await pdfParse(buffer);
  } catch (parseError) {
    console.error(JSON.stringify({
      level: 'error',
      service: 'pdfTextExtractor',
      event: 'pdf_parse_failed',
      error: parseError.message,
      errorStack: parseError.stack?.split('\n').slice(0, 3).join(' | '),
    }));
    const err = new Error('Failed to parse PDF: the file may be corrupted or password-protected.');
    err.statusCode = 422;
    throw err;
  }

  let text = pdfData.text || '';

  console.log(JSON.stringify({
    level: 'info',
    service: 'pdfTextExtractor',
    event: 'pdf_text_extracted',
    rawLength: text.length,
    pdfDataKeys: Object.keys(pdfData).join(','),
  }));

  // ─── Clean text ─────────────────────────────────────────────
  text = text
    .replace(/Page\s*\d+\s*(of\s*\d+)?/gi, '')       // Remove "Page X of Y"
    .replace(/\f/g, '\n')                              // Form feeds → newlines
    .replace(/\r\n/g, '\n')                            // Normalize line endings
    .replace(/[ \t]+/g, ' ')                           // Collapse horizontal whitespace
    .replace(/\n{3,}/g, '\n\n')                        // Collapse excessive newlines
    .trim();

  // ─── Validate content ───────────────────────────────────────
  if (text.length < MIN_TEXT_LENGTH) {
    console.warn(JSON.stringify({
      level: 'warn',
      service: 'pdfTextExtractor',
      event: 'pdf_insufficient_text',
      cleanedLength: text.length,
      minRequired: MIN_TEXT_LENGTH,
      textPreview: text,
    }));
    const err = new Error('PDF appears to be blank or contains insufficient text content.');
    err.statusCode = 422;
    throw err;
  }

  // ─── Truncate if too long ───────────────────────────────────
  if (text.length > MAX_TEXT_LENGTH) {
    text = text.slice(0, MAX_TEXT_LENGTH) + '\n\n[...content truncated for processing limits]';
  }

  console.log(JSON.stringify({
    level: 'info',
    service: 'pdfTextExtractor',
    event: 'pdf_ready',
    finalLength: text.length,
    preview: text.slice(0, 150),
  }));

  return text;
};
