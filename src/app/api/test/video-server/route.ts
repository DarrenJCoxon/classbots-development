import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const videoServerUrl = process.env.NEXT_PUBLIC_VIDEO_SERVER_URL;
    
    if (!videoServerUrl) {
      return NextResponse.json({
        success: false,
        error: 'Video server URL not configured',
        message: 'Please set NEXT_PUBLIC_VIDEO_SERVER_URL in your environment variables'
      }, { status: 500 });
    }

    // Test connection to video server
    const testResponse = await fetch(`${videoServerUrl}/api/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (testResponse.ok) {
      const healthData = await testResponse.json();
      return NextResponse.json({
        success: true,
        message: 'Successfully connected to video server',
        videoServerUrl,
        serverStatus: healthData
      });
    } else {
      return NextResponse.json({
        success: false,
        error: 'Failed to connect to video server',
        videoServerUrl,
        status: testResponse.status,
        statusText: testResponse.statusText
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Video server connection test failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Connection test failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      videoServerUrl: process.env.NEXT_PUBLIC_VIDEO_SERVER_URL
    }, { status: 500 });
  }
}