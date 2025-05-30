// src/app/api/teacher/students/year-groups/route.ts
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const supabaseAdmin = createAdminClient();
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get teacher's profile to find their school
    const { data: profile } = await supabase
      .from('profiles')
      .select('school_id')
      .eq('id', user.id)
      .single();
      
    if (!profile || !profile.school_id) {
      return NextResponse.json({ error: 'Teacher profile not found' }, { status: 404 });
    }
    
    // Get distinct year groups from the teacher's school
    const { data: yearGroups, error } = await supabaseAdmin
      .from('student_profiles')
      .select('year_group')
      .eq('school_id', profile.school_id)
      .not('year_group', 'is', null)
      .order('year_group');
      
    if (error) {
      console.error('Error fetching year groups:', error);
      return NextResponse.json({ error: 'Failed to fetch year groups' }, { status: 500 });
    }
    
    // Get unique year groups and count students in each
    const yearGroupCounts = new Map<string, number>();
    yearGroups?.forEach(item => {
      if (item.year_group) {
        yearGroupCounts.set(
          item.year_group, 
          (yearGroupCounts.get(item.year_group) || 0) + 1
        );
      }
    });
    
    // Convert to array format
    const formattedYearGroups = Array.from(yearGroupCounts.entries())
      .map(([year_group, count]) => ({
        year_group,
        student_count: count
      }))
      .sort((a, b) => {
        // Try to sort numerically if possible (e.g., Year 7, Year 8)
        const aNum = parseInt(a.year_group.match(/\d+/)?.[0] || '0');
        const bNum = parseInt(b.year_group.match(/\d+/)?.[0] || '0');
        if (aNum !== bNum) return aNum - bNum;
        return a.year_group.localeCompare(b.year_group);
      });
    
    return NextResponse.json({
      year_groups: formattedYearGroups,
      total: formattedYearGroups.length
    });
    
  } catch (error) {
    console.error('Year groups error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch year groups' },
      { status: 500 }
    );
  }
}