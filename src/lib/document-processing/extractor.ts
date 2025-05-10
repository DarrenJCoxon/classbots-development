// src/lib/document-processing/extractor.ts
import * as pdfParse from 'pdf-parse/lib/pdf-parse.js';
import mammoth from 'mammoth';
import { DocumentType } from '@/types/knowledge-base.types';

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
        return extractFromPdf(fileBuffer);
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
 * Extract text from PDF files
 */
async function extractFromPdf(fileBuffer: Buffer): Promise<string> {
  try {
    // Use a minimal options object to avoid looking for test files
    const options = {
      // No version testing, no page rendering
      max: 0,
      pagerender: null
    };
    
    const data = await pdfParse(fileBuffer, options);
    return data.text;
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw error;
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