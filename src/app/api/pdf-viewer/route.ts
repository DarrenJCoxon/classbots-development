import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const pdfUrl = searchParams.get('url');

  if (!pdfUrl) {
    return new NextResponse('PDF URL is required', { status: 400 });
  }

  // Return an HTML page with PDF.js viewer
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <title>PDF Viewer</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body {
            margin: 0;
            padding: 0;
            background: #f0f0f0;
            font-family: Arial, sans-serif;
        }
        .viewer-container {
            width: 100%;
            height: 100vh;
            display: flex;
            flex-direction: column;
        }
        .toolbar {
            background: #333;
            color: white;
            padding: 10px;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }
        .pdf-frame {
            flex: 1;
            border: none;
            width: 100%;
        }
        .status {
            padding: 20px;
            text-align: center;
            background: white;
            margin: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .loading {
            color: #666;
        }
        .error {
            color: #e74c3c;
        }
        .success {
            color: #27ae60;
        }
    </style>
</head>
<body>
    <div class="viewer-container">
        <div class="toolbar">
            <span>📄 PDF Viewer</span>
            <button onclick="window.open('${pdfUrl.replace(/'/g, "\\'")}', '_blank')" style="padding: 5px 10px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
                Open Original
            </button>
        </div>
        <div id="status" class="status loading">
            Loading PDF...
        </div>
        <iframe id="pdf-frame" class="pdf-frame" style="display: none;"></iframe>
    </div>

    <script>
        const pdfUrl = '${pdfUrl.replace(/'/g, "\\'")}';
        const statusEl = document.getElementById('status');
        const frameEl = document.getElementById('pdf-frame');
        
        console.log('PDF Viewer: Loading', pdfUrl);
        
        // Test if the PDF URL is accessible
        fetch(pdfUrl, { method: 'HEAD' })
            .then(response => {
                console.log('PDF test response:', response.status, response.statusText);
                
                if (!response.ok) {
                    throw new Error(\`HTTP \${response.status}: \${response.statusText}\`);
                }
                
                // PDF is accessible, show it in iframe
                const viewerUrl = \`\${pdfUrl}#toolbar=1&navpanes=1&scrollbar=1&page=1&view=FitH\`;
                frameEl.src = viewerUrl;
                frameEl.style.display = 'block';
                statusEl.style.display = 'none';
                
                frameEl.onload = () => {
                    console.log('PDF iframe loaded successfully');
                };
                
                frameEl.onerror = () => {
                    console.error('PDF iframe failed to load');
                    statusEl.innerHTML = '❌ Failed to load PDF in viewer';
                    statusEl.className = 'status error';
                    statusEl.style.display = 'block';
                    frameEl.style.display = 'none';
                };
            })
            .catch(error => {
                console.error('PDF test failed:', error);
                statusEl.innerHTML = \`❌ Failed to access PDF: \${error.message}\`;
                statusEl.className = 'status error';
            });
    </script>
</body>
</html>`;

  return new NextResponse(htmlContent, {
    headers: {
      'Content-Type': 'text/html',
      'Cache-Control': 'no-cache',
    },
  });
}