import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { Database } from '@/types/database.types'

export async function GET() {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies })
    
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch all data in parallel
    const [
      userResult,
      roomsResult,
      assessmentsResult,
      recentChatsResult
    ] = await Promise.all([
      // User profile
      supabase
        .from('students')
        .select('*')
        .eq('id', session.user.id)
        .single(),
      
      // User's rooms with chatbot counts
      supabase
        .from('student_room_associations')
        .select(`
          room_id,
          is_active,
          joined_at,
          rooms!inner (
            id,
            name,
            room_code,
            created_at,
            is_active
          )
        `)
        .eq('student_id', session.user.id)
        .eq('is_active', true)
        .order('joined_at', { ascending: false }),
      
      // Recent assessments
      supabase
        .from('assessments')
        .select(`
          id,
          title,
          status,
          score,
          feedback,
          created_at,
          student_id,
          chatbot_id,
          chatbots (
            id,
            name,
            subject
          )
        `)
        .eq('student_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(5),
      
      // Recent chat messages for activity
      supabase
        .from('chats')
        .select(`
          id,
          message,
          created_at,
          room_id,
          rooms (
            id,
            name
          )
        `)
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(10)
    ])

    // Check for errors
    if (userResult.error) throw userResult.error
    if (roomsResult.error) throw roomsResult.error
    if (assessmentsResult.error) throw assessmentsResult.error
    if (recentChatsResult.error) throw recentChatsResult.error

    // Get chatbot counts for each room
    const roomIds = roomsResult.data?.map(r => r.room_id) || []
    let chatbotCounts: Record<string, number> = {}
    
    if (roomIds.length > 0) {
      const { data: chatbotData } = await supabase
        .from('room_chatbot_associations')
        .select('room_id, chatbot_id')
        .in('room_id', roomIds)
        .eq('is_active', true)
      
      if (chatbotData) {
        chatbotCounts = chatbotData.reduce((acc, item) => {
          acc[item.room_id] = (acc[item.room_id] || 0) + 1
          return acc
        }, {} as Record<string, number>)
      }
    }

    // Format rooms with chatbot counts
    const roomsWithCounts = roomsResult.data?.map(room => ({
      ...room,
      chatbot_count: chatbotCounts[room.room_id] || 0
    })) || []

    // Calculate stats
    const totalRooms = roomsWithCounts.length
    const totalAssessments = assessmentsResult.data?.length || 0
    const averageScore = assessmentsResult.data?.length 
      ? assessmentsResult.data.reduce((sum, a) => sum + (a.score || 0), 0) / assessmentsResult.data.length
      : 0
    const recentActivity = recentChatsResult.data?.length || 0

    return NextResponse.json({
      user: userResult.data,
      rooms: roomsWithCounts,
      assessments: assessmentsResult.data || [],
      stats: {
        totalRooms,
        totalAssessments,
        averageScore: Math.round(averageScore),
        recentActivity
      }
    }, {
      headers: {
        'Cache-Control': 'private, max-age=60'
      }
    })

  } catch (error) {
    console.error('Dashboard data error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    )
  }
}