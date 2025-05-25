// src/lib/document-processing/extractor.ts
import mammoth from 'mammoth';
import { DocumentType } from '@/types/knowledge-base.types';
import { extractTextFromPDF } from './pdf-extractor';

/**
 * Extract text from different document types
 */
export async function extractTextFromFile(
  fileBuffer: Buffer,
  fileType: DocumentType
): Promise<string> {
  try {
    switch (fileType) {
      case 'pdf':
        return extractTextFromPDF(fileBuffer);
      case 'docx':
        return extractFromDocx(fileBuffer);
      case 'txt':
        return extractFromTxt(fileBuffer);
      default:
        throw new Error(`Unsupported file type: ${fileType}`);
    }
  } catch (error) {
    console.error(`Error extracting text from ${fileType} file:`, error);
    throw new Error(`Failed to extract text from ${fileType} file: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Extract text from DOCX files
 */
async function extractFromDocx(fileBuffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer: fileBuffer });
    return result.value;
  } catch (error) {
    console.error('Error extracting text from DOCX:', error);
    throw error;
  }
}

/**
 * Extract text from TXT files
 */
function extractFromTxt(fileBuffer: Buffer): Promise<string> {
  return Promise.resolve(fileBuffer.toString('utf-8'));
}