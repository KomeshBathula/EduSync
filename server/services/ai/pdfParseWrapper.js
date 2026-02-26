/**
 * v1-compatible wrapper around pdf-parse v2.
 * pdf-parse v2.x uses a class-based API: new PDFParse({ data }) → getText().
 * This wrapper provides the simple function signature the extractor expects:
 *   parsePDF(buffer) → { text: string }
 */
import { PDFParse } from 'pdf-parse';

export default async function parsePDF(buffer) {
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return { text: result.text || '' };
  } finally {
    await parser.destroy().catch(() => {});
  }
}
