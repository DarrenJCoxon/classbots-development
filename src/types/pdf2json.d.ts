// Type definitions for pdf2json
declare module 'pdf2json' {
  export default class PDFParser {
    constructor();
    
    on(event: 'pdfParser_dataError', handler: (errData: { parserError: string }) => void): void;
    on(event: 'pdfParser_dataReady', handler: (pdfData: PDFData) => void): void;
    
    parseBuffer(buffer: Buffer): void;
    loadPDF(path: string): void;
  }
  
  interface PDFData {
    Pages: PDFPage[];
    Meta?: any;
  }
  
  interface PDFPage {
    Texts: PDFText[];
    Width?: number;
    Height?: number;
  }
  
  interface PDFText {
    x?: number;
    y?: number;
    w?: number;
    R: TextRun[];
  }
  
  interface TextRun {
    T: string; // URL encoded text
    S?: number; // Font size
    TS?: number[]; // Text style
  }
}