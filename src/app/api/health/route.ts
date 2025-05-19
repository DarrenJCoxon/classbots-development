// src/app/api/health/route.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const check = searchParams.get('check');

    // If checking realtime specifically
    if (check === 'realtime') {
      try {
        const supabaseAdmin = createAdminClient();
        
        // Query to check if safety_notifications is in the publication
        const { data, error } = await supabaseAdmin.from('pg_publication_tables')
          .select('tablename, schemaname')
          .eq('pubname', 'supabase_realtime');
          
        if (error) {
          console.error('Error checking realtime publication:', error);
          return NextResponse.json({ 
            status: 'error', 
            message: 'Failed to check realtime publication', 
            error: error.message,
            timestamp: new Date().toISOString()
          }, { status: 500 });
        }
        
        // Check if safety_notifications is included
        const hasSafetyNotifications = data.some(row => 
          row.tablename === 'safety_notifications' && row.schemaname === 'public'
        );
        
        return NextResponse.json({ 
          status: 'ok', 
          realtime: {
            publication: 'supabase_realtime',
            tables: data.map(row => `${row.schemaname}.${row.tablename}`),
            hasSafetyNotifications
          },
          timestamp: new Date().toISOString()
        });
      } catch (realtimeError) {
        console.error('Error checking realtime:', realtimeError);
        return NextResponse.json({ 
          status: 'error', 
          message: 'Error checking realtime configuration',
          error: realtimeError instanceof Error ? realtimeError.message : String(realtimeError),
          timestamp: new Date().toISOString()
        }, { status: 500 });
      }
    }
    
    // Regular health check
    const supabase = await createServerSupabaseClient();
    
    // Test database connection
    const { error } = await supabase
      .from('schools')
      .select('count')
      .limit(1);

    if (error) {
      return NextResponse.json({ 
        status: 'error', 
        message: 'Database connection failed',
        error: error.message,
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }

    return NextResponse.json({ 
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({ 
      status: 'error', 
      message: 'Server error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}