// Production-ready PDF text extraction using pdf2json
// This library is battle-tested and works reliably in Node.js environments

import PDFParser from 'pdf2json';

/**
 * Extract text from a PDF buffer using pdf2json
 * This is a robust solution that scales to thousands of users
 */
export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    console.log('[PDF Extractor] Starting PDF text extraction with pdf2json...');
    
    const pdfParser = new PDFParser();
    
    // Set up event handlers
    pdfParser.on('pdfParser_dataError', (errData: any) => {
      console.error('[PDF Extractor] Parse error:', errData.parserError);
      reject(new Error(`PDF parsing failed: ${errData.parserError}`));
    });
    
    pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
      try {
        console.log('[PDF Extractor] PDF parsed successfully, extracting text...');
        
        // Extract text from all pages
        let fullText = '';
        
        if (pdfData.Pages) {
          for (const page of pdfData.Pages) {
            if (page.Texts) {
              for (const textItem of page.Texts) {
                if (textItem.R) {
                  for (const textRun of textItem.R) {
                    if (textRun.T) {
                      // Decode the text (pdf2json encodes special characters)
                      const decodedText = decodeURIComponent(textRun.T);
                      fullText += decodedText + ' ';
                    }
                  }
                }
              }
              // Add page break
              fullText += '\n\n';
            }
          }
        }
        
        const cleanedText = fullText
          .replace(/\s+/g, ' ') // Normalize whitespace
          .replace(/\n\s*\n/g, '\n\n') // Normalize paragraph breaks
          .trim();
        
        console.log(`[PDF Extractor] Successfully extracted ${cleanedText.length} characters from ${pdfData.Pages?.length || 0} pages`);
        
        if (cleanedText.length === 0) {
          reject(new Error('No text content found in PDF'));
        } else {
          resolve(cleanedText);
        }
      } catch (error) {
        console.error('[PDF Extractor] Error processing PDF data:', error);
        reject(new Error(`Failed to process PDF data: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    });
    
    // Parse the PDF buffer
    try {
      pdfParser.parseBuffer(buffer);
    } catch (error) {
      console.error('[PDF Extractor] Error starting parse:', error);
      reject(new Error(`Failed to start PDF parsing: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  });
}