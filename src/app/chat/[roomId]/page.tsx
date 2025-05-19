// src/app/chat/[roomId]/page.tsx
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import styled from 'styled-components';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Container, Alert } from '@/styles/StyledComponents';
import Chat from '@/components/shared/Chat';
import type { Chatbot } from '@/types/database.types';
import LoadingSpinner from '@/components/shared/LoadingSpinner';

const PageWrapper = styled.div`
  padding: ${({ theme }) => theme.spacing.lg} 0;
  min-height: 100vh;
`;

const Header = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.lg};
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const RoomInfo = styled.div`
  h1 {
    color: ${({ theme }) => theme.colors.text};
    margin-bottom: ${({ theme }) => theme.spacing.sm};
    font-size: 1.75rem;
  }

  p {
    color: ${({ theme }) => theme.colors.textLight};
  }
`;

const BackButton = styled.button`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  background: ${({ theme }) => theme.colors.backgroundCard};
  color: ${({ theme }) => theme.colors.text};
  border: 1px solid ${({ theme }) => theme.colors.border};
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  cursor: pointer;
  transition: all ${({ theme }) => theme.transitions.fast};

  &:hover {
    background: ${({ theme }) => theme.colors.backgroundDark};
  }
`;

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 50vh;
  gap: ${({ theme }) => theme.spacing.md};
`;

interface RoomQueryResult {
  room_id: string;
  room_name: string;
  room_code: string;
  teacher_id: string;
  school_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
  room_chatbots: {
    chatbots: Chatbot; // This Chatbot type already includes welcome_message
  }[] | null;
}

export default function ChatPage() {
  const [room, setRoom] = useState<RoomQueryResult | null>(null);
  const [chatbot, setChatbot] = useState<Chatbot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = createClient();

  const roomId = params?.roomId ? String(params.roomId) : null;
  const chatbotIdFromUrl = searchParams.get('chatbot');
  
  // SECURITY ENHANCEMENT: Check for access_signature
  const accessSignature = searchParams.get('access_signature');
  const timestamp = searchParams.get('ts');
  let uidFromUrl = searchParams.get('uid'); // For backward compatibility
  const directAccessMode = searchParams.get('direct') === 'true';
  
  // Decode access signature if present
  if (accessSignature && timestamp) {
    try {
      const decoded = atob(accessSignature);
      const [userId, signatureTimestamp] = decoded.split(':');
      
      // Verify timestamp matches to prevent tampering
      if (signatureTimestamp === timestamp) {
        console.log('[ChatPage] Successfully decoded access signature for user:', userId);
        uidFromUrl = userId;
      } else {
        console.error('[ChatPage] Timestamp mismatch in access signature');
      }
    } catch (e) {
      console.error('[ChatPage] Failed to decode access signature:', e);
    }
  }
  const instanceIdFromUrl = searchParams.get('instance');
  const initialFetchDoneRef = useRef(false);

  useEffect(() => {
    console.log('[ChatPage] Initializing/Params Update. Room ID:', roomId, 'Chatbot ID:', chatbotIdFromUrl);
    if (initialFetchDoneRef.current && (params?.roomId !== roomId || searchParams.get('chatbot') !== chatbotIdFromUrl)) {
        initialFetchDoneRef.current = false;
    }
  }, [roomId, chatbotIdFromUrl, params?.roomId, searchParams]);

  const fetchRoomData = useCallback(async () => {
    if (!roomId || !chatbotIdFromUrl) {
      console.warn("[ChatPage] fetchRoomData: Aborting fetch - RoomID or ChatbotID is missing.", { roomId, chatbotIdFromUrl });
      if (roomId && chatbotIdFromUrl === null) {
          setError("Chatbot ID is required in the URL (e.g., ?chatbot=...).");
      } else if (!roomId && chatbotIdFromUrl){
          setError("Room ID is missing from the URL path.");
      } else if (!roomId && !chatbotIdFromUrl) {
          setError("Both Room ID and Chatbot ID are missing from the URL.");
      }
      setLoading(false);
      return;
    }
    console.log(`[ChatPage] fetchRoomData: Attempting fetch. RoomID: ${roomId}, ChatbotID: ${chatbotIdFromUrl}`);
    setLoading(true);
    setError(null);
    
    // User ID comes from either access_signature or direct uid parameter
    // uidFromUrl is already set from the decoded signature or direct parameter
    if (uidFromUrl) {
      console.log('[ChatPage] User ID found for direct access:', uidFromUrl);
    }

    try {
      // First try normal authentication
      const { data: { user } } = await supabase.auth.getUser();
      
      // If no authenticated user but UID provided, try to verify access via API
      if (!user && uidFromUrl) {
        console.log('[ChatPage] No authenticated user but UID found, checking membership via API');
        
        try {
          // Use the verify-membership API to check and potentially add the user to the room
          const response = await fetch(`/api/student/verify-membership?roomId=${roomId}&userId=${uidFromUrl}`, {
            credentials: 'include'
          });
          
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('[ChatPage] Membership verification failed:', errorData);
            throw new Error(errorData.error || 'Failed to verify room access');
          }
          
          const membershipData = await response.json();
          
          if (!membershipData.isMember) {
            throw new Error('You do not have access to this room');
          }
          
          console.log('[ChatPage] Direct access granted via API');
          
          // Continue with fetch using admin API
          console.log('[ChatPage] Fetching chat data with params:', {
            roomId, 
            chatbotId: chatbotIdFromUrl,
            userId: uidFromUrl,
            direct: directAccessMode ? 'true' : 'false'
          });
          const chatResponseUrl = `/api/student/room-chatbot-data?roomId=${roomId}&chatbotId=${chatbotIdFromUrl}&userId=${uidFromUrl}&direct=${directAccessMode ? 'true' : 'false'}`;
          console.log('[ChatPage] API URL:', chatResponseUrl);
          
          const chatResponse = await fetch(chatResponseUrl, {
            credentials: 'include'
          });
          
          if (!chatResponse.ok) {
            const errorData = await chatResponse.json().catch(() => ({}));
            console.error('[ChatPage] Chat data fetch failed:', { 
              status: chatResponse.status, 
              statusText: chatResponse.statusText,
              error: errorData.error || 'No error details available' 
            });
            throw new Error(`Failed to fetch chat data: ${errorData.error || chatResponse.status}`);
          }
          
          const data = await chatResponse.json();
          
          setRoom(data.room);
          setChatbot(data.chatbot);
          initialFetchDoneRef.current = true;
          setLoading(false);
          return;
        } catch (apiError) {
          console.error('[ChatPage] API access verification failed:', apiError);
          initialFetchDoneRef.current = false;
          throw apiError;
        }
      }
      
      // Normal authenticated flow
      if (!user) {
        initialFetchDoneRef.current = false;
        throw new Error('Not authenticated');
      }

      const { data: profile } = await supabase.from('profiles').select('role').eq('user_id', user.id).single();
      if (!profile) {
        initialFetchDoneRef.current = false;
        throw new Error('User profile not found');
      }

      const { data: roomData, error: roomError } = await supabase.from('rooms')
        .select(`
          *, 
          room_chatbots!inner(
            chatbots!inner(
              chatbot_id, 
              name, 
              description, 
              system_prompt, 
              model, 
              max_tokens, 
              temperature, 
              enable_rag, 
              bot_type, 
              assessment_criteria_text,
              welcome_message
            )
          )
        `)
        .eq('room_id', roomId)
        .eq('room_chatbots.chatbot_id', chatbotIdFromUrl)
        .single();

      if (roomError) {
        initialFetchDoneRef.current = false;
        throw new Error(roomError.message || 'Data not found. Check room/chatbot association or permissions.');
      }
      if (!roomData) {
        initialFetchDoneRef.current = false;
        throw new Error('No data returned for room/chatbot. Check IDs and permissions.');
      }

      if (profile.role === 'student') {
        const { data: membership } = await supabase.from('room_memberships').select('room_id').eq('room_id', roomId).eq('student_id', user.id).single();
        if (!membership) {
            initialFetchDoneRef.current = false;
            throw new Error('You do not have access to this room');
        }
      } else if (profile.role === 'teacher') {
        const typedRoomData = roomData as RoomQueryResult;
        if (typedRoomData.teacher_id !== user.id) {
            initialFetchDoneRef.current = false;
            throw new Error('You do not own this room');
        }
      }

      const typedRoomData = roomData as RoomQueryResult;
      setRoom(typedRoomData);
      if (typedRoomData.room_chatbots && typedRoomData.room_chatbots.length > 0 && typedRoomData.room_chatbots[0].chatbots) {
        setChatbot(typedRoomData.room_chatbots[0].chatbots);
      } else {
        initialFetchDoneRef.current = false;
        throw new Error('Chatbot details missing in fetched room data.');
      }
      initialFetchDoneRef.current = true; // Mark as done only on full success
    } catch (err) {
      initialFetchDoneRef.current = false; // Allow retry on error
      setError(err instanceof Error ? err.message : 'Failed to load chat page data');
      setChatbot(null); setRoom(null);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, chatbotIdFromUrl, supabase]); // searchParams intentionally omitted for performance

  useEffect(() => {
    if (roomId && chatbotIdFromUrl && !initialFetchDoneRef.current) {
      fetchRoomData();
    }
  }, [roomId, chatbotIdFromUrl, fetchRoomData, searchParams]);

  const handleBack = () => { 
    // Use the resolved uidFromUrl value (from either access_signature or direct uid parameter)
    
    // Also store user ID in localStorage for reliability
    if (uidFromUrl) {
      localStorage.setItem('student_direct_access_id', uidFromUrl);
      localStorage.setItem('current_student_id', uidFromUrl);
    }
    
    // Generate timestamp for direct access - this prevents auth redirects
    const timestamp = Date.now();
    
    // Check if we have a roomId
    if (roomId) {
      // Generate secure access signature if we have a userId
      if (uidFromUrl) {
        // SECURITY ENHANCEMENT: Use access signature pattern with direct and legacy params
        // Include _t parameter to skip auth check in student layout
        const newAccessSignature = btoa(`${uidFromUrl}:${timestamp}`);
        router.push(`/room/${roomId}?direct=true&access_signature=${newAccessSignature}&ts=${timestamp}&uid=${uidFromUrl}&_t=${timestamp}`);
      } else {
        // Standard navigation for authenticated users
        router.push(`/room/${roomId}`);
      }
    } else {
      // If no room ID, go to dashboard (with user ID if available)
      if (uidFromUrl) {
        // SECURITY ENHANCEMENT: Use access signature pattern for dashboard too
        // Include _t parameter to skip auth check in student layout
        const newAccessSignature = btoa(`${uidFromUrl}:${timestamp}`);
        router.push(`/student/dashboard?direct=true&access_signature=${newAccessSignature}&ts=${timestamp}&uid=${uidFromUrl}&_t=${timestamp}`);
      } else {
        // Standard navigation for authenticated users
        router.push('/student/dashboard');
      }
    }
  };

  if (loading && !initialFetchDoneRef.current) {
    return <PageWrapper><Container><LoadingContainer><LoadingSpinner size="large" /><p>Loading chat environment...</p></LoadingContainer></Container></PageWrapper>;
  }
  if (error) {
    return <PageWrapper><Container><Alert variant="error">{error}</Alert><BackButton onClick={handleBack} style={{ marginTop: '16px' }}>{'< Back'}</BackButton></Container></PageWrapper>;
  }
  if (!room || !chatbot) {
    return <PageWrapper><Container><Alert variant="info">Chatbot or room information is unavailable. Ensure Chatbot ID is in URL.</Alert><BackButton onClick={handleBack} style={{ marginTop: '16px' }}>{'< Back'}</BackButton></Container></PageWrapper>;
  }

  return (
    <PageWrapper>
      <Container>
        <Header>
          <RoomInfo>
            <h1>{room.room_name}</h1>
            <p>Chatting with: <strong>{chatbot.name}</strong></p>
            {chatbot.bot_type === 'assessment' && <p style={{fontSize: '0.9em', fontStyle: 'italic', color: '#555'}}>This is an Assessment Bot.</p>}
          </RoomInfo>
          <BackButton onClick={handleBack}>
            {'< Back'}
          </BackButton>
        </Header>
        {roomId && <Chat roomId={roomId} chatbot={chatbot} instanceId={instanceIdFromUrl || undefined} />}
      </Container>
    </PageWrapper>
  );
}