import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const pdfUrl = searchParams.get('url');

  if (!pdfUrl) {
    return new NextResponse('PDF URL is required', { status: 400 });
  }

  try {
    console.log('📄 PDF Proxy: Starting request');
    console.log('🔗 Target URL:', pdfUrl.substring(0, 200) + '...');
    
    // Prepare headers for different sources
    const fetchHeaders: HeadersInit = {
      'User-Agent': 'Mozilla/5.0 (compatible; SkolrRead-PDF-Proxy/1.0)',
      'Accept': 'application/pdf,*/*',
      'Cache-Control': 'no-cache',
    };

    // Handle Supabase signed URLs - they might need specific headers
    if (pdfUrl.includes('.supabase.co')) {
      console.log('🔒 Handling Supabase storage URL');
      fetchHeaders['Accept-Encoding'] = 'identity'; // Prevent compression issues
    }
    
    // For large files, we don't want to timeout too quickly
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout for large files
    
    const response = await fetch(pdfUrl, {
      headers: fetchHeaders,
      method: 'GET',
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);

    console.log(`📊 PDF response: ${response.status} ${response.statusText}`);
    console.log(`📏 Content-Type: ${response.headers.get('content-type')}`);
    console.log(`📐 Content-Length: ${response.headers.get('content-length')}`);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // Verify it's actually a PDF
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/pdf') && !contentType.includes('application/octet-stream')) {
      console.warn('⚠️ Content-Type is not PDF:', contentType);
    }

    const pdfBuffer = await response.arrayBuffer();
    console.log(`✅ PDF loaded successfully: ${pdfBuffer.byteLength} bytes`);

    // Validate PDF magic number
    const pdfSignature = new Uint8Array(pdfBuffer.slice(0, 4));
    const isValidPDF = pdfSignature[0] === 0x25 && pdfSignature[1] === 0x50 && 
                      pdfSignature[2] === 0x44 && pdfSignature[3] === 0x46; // %PDF
    
    if (!isValidPDF) {
      console.error('❌ Invalid PDF file signature');
      return new NextResponse('Invalid PDF file', { status: 400 });
    }

    // Return the PDF with comprehensive headers
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Length': pdfBuffer.byteLength.toString(),
        'Cache-Control': 'public, max-age=1800', // 30 minutes
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Range',
        'Access-Control-Expose-Headers': 'Content-Length, Content-Range',
        'Accept-Ranges': 'bytes',
        'X-Content-Type-Options': 'nosniff',
        'Content-Disposition': 'inline',
      },
    });

  } catch (error) {
    console.error('❌ PDF proxy error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new NextResponse(`PDF Proxy Error: ${errorMessage}`, { 
      status: 500,
      headers: {
        'Content-Type': 'text/plain',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}

// Handle OPTIONS for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Range',
      'Access-Control-Max-Age': '86400',
    },
  });
}