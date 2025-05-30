import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  try {
    console.log('[Dashboard API] Starting request')
    const supabase = await createServerSupabaseClient()
    const supabaseAdmin = createAdminClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    console.log('[Dashboard API] Auth check:', { userId: user?.id, error: authError })
    
    if (authError || !user) {
      console.error('[Dashboard API] Auth error:', authError)
      return NextResponse.json({ error: 'Unauthorized', details: authError?.message }, { status: 401 })
    }

    // Fetch all data in parallel using admin client to bypass RLS
    const [
      userResult,
      roomsResult,
      assessmentsResult,
      recentChatsResult
    ] = await Promise.all([
      // User profile from student_profiles
      supabaseAdmin
        .from('student_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single(),
      
      // User's rooms with proper joins
      supabaseAdmin
        .from('room_memberships')
        .select(`
          room_id,
          joined_at,
          rooms!inner (
            room_id,
            room_name,
            room_code,
            created_at,
            is_active
          )
        `)
        .eq('student_id', user.id)
        .order('joined_at', { ascending: false }),
      
      // Recent assessments
      supabaseAdmin
        .from('student_assessments')
        .select(`
          assessment_id,
          status,
          ai_grade_raw,
          ai_feedback_student,
          assessed_at,
          student_id,
          chatbot_id,
          chatbots!student_assessments_chatbot_id_fkey (
            chatbot_id,
            name
          )
        `)
        .eq('student_id', user.id)
        .order('assessed_at', { ascending: false })
        .limit(5),
      
      // Recent chat messages for activity
      supabaseAdmin
        .from('chat_messages')
        .select(`
          message_id,
          content,
          created_at,
          room_id
        `)
        .eq('user_id', user.id)
        .eq('role', 'user')
        .order('created_at', { ascending: false })
        .limit(10)
    ])

    // Check for errors with detailed logging
    if (userResult.error) {
      console.error('[Dashboard API] User profile error:', userResult.error)
      throw new Error(`Failed to fetch user profile: ${userResult.error.message}`)
    }
    if (roomsResult.error) {
      console.error('[Dashboard API] Rooms error:', roomsResult.error)
      throw new Error(`Failed to fetch rooms: ${roomsResult.error.message}`)
    }
    if (assessmentsResult.error) {
      console.error('[Dashboard API] Assessments error:', assessmentsResult.error)
      throw new Error(`Failed to fetch assessments: ${assessmentsResult.error.message}`)
    }
    if (recentChatsResult.error) {
      console.error('[Dashboard API] Recent chats error:', recentChatsResult.error)
      throw new Error(`Failed to fetch recent chats: ${recentChatsResult.error.message}`)
    }
    
    // Debug logging for student profile
    console.log('[Dashboard API] Student profile data:', {
      user_id: user.id,
      first_name: userResult.data?.first_name,
      surname: userResult.data?.surname,
      full_name: userResult.data?.full_name,
      username: userResult.data?.username,
      pin_code: userResult.data?.pin_code
    })

    // Get chatbot counts for each room
    const roomIds = roomsResult.data?.map(r => r.room_id) || []
    let chatbotCounts: Record<string, number> = {}
    
    if (roomIds.length > 0) {
      const { data: chatbotData } = await supabaseAdmin
        .from('room_chatbots')
        .select('room_id, chatbot_id')
        .in('room_id', roomIds)
      
      if (chatbotData) {
        chatbotCounts = chatbotData.reduce((acc, item) => {
          acc[item.room_id] = (acc[item.room_id] || 0) + 1
          return acc
        }, {} as Record<string, number>)
      }
    }

    // Format rooms with chatbot counts and fix structure
    const formattedRooms = roomsResult.data?.map(membership => {
      const room = membership.rooms as any; // rooms is a single object from the join
      return {
        room_id: membership.room_id,
        joined_at: membership.joined_at,
        chatbot_count: chatbotCounts[membership.room_id] || 0,
        is_active: room?.is_active ?? true,
        rooms: {
          id: membership.room_id,
          name: room?.room_name || 'Unknown Room',
          room_code: room?.room_code || '',
          created_at: room?.created_at || membership.joined_at,
          is_active: room?.is_active ?? true
        }
      }
    }) || []

    // Format assessments 
    const formattedAssessments = assessmentsResult.data?.map(assessment => {
      // Use the correct property name from the foreign key relationship
      const chatbot = (assessment as any)['chatbots!student_assessments_chatbot_id_fkey'];
      return {
        id: assessment.assessment_id,
        title: chatbot?.name || 'Assessment', // Use chatbot name as title
        status: assessment.status || 'completed',
        score: assessment.ai_grade_raw ? parseFloat(assessment.ai_grade_raw) : null,
        feedback: assessment.ai_feedback_student || null,
        created_at: assessment.assessed_at,
        student_id: assessment.student_id,
        chatbot_id: assessment.chatbot_id,
        chatbots: chatbot ? {
          id: chatbot.chatbot_id,
          name: chatbot.name,
          subject: null // Not available in current query
        } : null
      }
    }) || []

    // Calculate stats
    const totalRooms = formattedRooms.length
    const totalAssessments = formattedAssessments.length
    const recentActivity = recentChatsResult.data?.length || 0

    // Return formatted user data with proper name
    const userData = userResult.data ? {
      id: user.id,
      full_name: userResult.data.full_name || (userResult.data.first_name && userResult.data.surname ? `${userResult.data.first_name} ${userResult.data.surname}` : null) || 'Student',
      first_name: userResult.data.first_name,
      surname: userResult.data.surname,
      username: userResult.data.username,
      school_id: userResult.data.school_id,
      pin_code: userResult.data.pin_code // Add pin_code to the response
    } : null

    return NextResponse.json({
      user: userData,
      rooms: formattedRooms,
      assessments: formattedAssessments,
      stats: {
        totalRooms,
        totalAssessments,
        averageScore: 0, // Can calculate if needed
        recentActivity
      }
    }, {
      headers: {
        'Cache-Control': 'private, max-age=60'
      }
    })

  } catch (error) {
    console.error('[Dashboard API] Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch dashboard data'
    return NextResponse.json(
      { 
        error: errorMessage,
        details: error instanceof Error ? error.stack : String(error)
      },
      { status: 500 }
    )
  }
}