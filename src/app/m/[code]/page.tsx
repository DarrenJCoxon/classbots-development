'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import styled from 'styled-components';
import { Card, Alert } from '@/styles/StyledComponents';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import { createClient } from '@/lib/supabase/client';

const PageContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 90vh;
  background: ${({ theme }) => theme.colors.backgroundDark};
  padding: ${({ theme }) => theme.spacing.lg};
`;

const JoinCard = styled(Card)`
  width: 100%;
  max-width: 500px;
  text-align: center;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
`;

const Title = styled.h1`
  font-size: 2rem;
  margin-bottom: ${({ theme }) => theme.spacing.md};
  color: ${({ theme }) => theme.colors.primary};
`;

const RoomCode = styled.div`
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: 2rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.primary};
  margin: ${({ theme }) => theme.spacing.md} 0;
  border: 3px dashed ${({ theme }) => theme.colors.primary};
  padding: ${({ theme }) => theme.spacing.md};
  border-radius: ${({ theme }) => theme.borderRadius.large};
  letter-spacing: 0.2em;
  background: ${({ theme }) => theme.colors.primary}10;
`;

const Text = styled.p`
  margin-bottom: ${({ theme }) => theme.spacing.md};
  color: ${({ theme }) => theme.colors.textLight};
  line-height: 1.5;
`;

export default function SimpleMagicLinkPage() {
  const [status, setStatus] = useState<'joining' | 'success' | 'error'>('joining');
  const [error, setError] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [studentName, setStudentName] = useState('');
  // We track userId but don't directly use it outside of the state update function
  const [, setUserId] = useState('');
  // router is used for redirection in future updates
  // const router = useRouter();
  
  // We create the client but use it via API calls instead of directly
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const supabase = createClient();
  const params = useParams();
  
  useEffect(() => {
    // Get the code from params in a Next.js 14-compatible way
    // params is now a ReadonlyURLSearchParams object in Next.js 14
    const codeParam = params?.code;
    const code = Array.isArray(codeParam) ? codeParam[0] : (codeParam?.toString() || '');
    
    if (!code) {
      setError('Invalid magic link');
      setStatus('error');
      return;
    }
    
    // Extract information from the code
    const parts = code.split('_');
    
    if (parts.length < 2) {
      setError('Invalid magic link format');
      setStatus('error');
      return;
    }
    
    let extractedRoomCode: string;
    let extractedUserId: string | null = null;
    let extractedStudentName: string[];
    
    if (parts.length >= 3) {
      // New format: roomCode_userId_studentName
      [extractedRoomCode, extractedUserId, ...extractedStudentName] = parts;
    } else {
      // Old format: roomCode_studentName
      [extractedRoomCode, ...extractedStudentName] = parts;
    }
    
    const normalizedRoomCode = extractedRoomCode.toUpperCase();
    setRoomCode(normalizedRoomCode);
    
    const decodedName = decodeURIComponent(extractedStudentName.join('_'));
    setStudentName(decodedName);
    
    if (extractedUserId) {
      setUserId(extractedUserId);
      // If we have a user ID, we can try to sign in as that user directly
      tryExistingUser(extractedUserId, normalizedRoomCode, decodedName);
    } else {
      // Otherwise fall back to creating a new user
      joinRoom(normalizedRoomCode, decodedName);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);
  
  const tryExistingUser = async (userId: string, roomCode: string, name: string) => {
    try {
      console.log(`[Magic Link] Attempting to join with existing user: ${userId}, room: ${roomCode}, name: ${name}`);
      
      // Try to directly join an existing student to the room
      // Instead of redirecting via router.push, we'll POST a form to trigger a full page reload
      // This ensures our session cookies are properly processed
      const requestBody = { 
        room_code: roomCode,
        student_name: name,
        user_id: userId,
        skip_auth: true
      };
      
      console.log(`[Magic Link] Existing user request payload:`, requestBody);
      
      const response = await fetch('/api/student/join-room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        // Ensures cookies are handled
        credentials: 'include'
      });
      
      console.log(`[Magic Link] Existing user response status:`, response.status);
      
      // Clone the response so we can read it multiple times
      const responseClone = response.clone();
      
      // Try to get the response text for debugging
      try {
        const textPromise = responseClone.text();
        textPromise.then(text => {
          console.log(`[Magic Link] Existing user raw response:`, text.substring(0, 200) + (text.length > 200 ? '...' : ''));
        }).catch(err => {
          console.error(`[Magic Link] Error reading existing user response text:`, err);
        });
        // Make sure the promise completes but don't wait for it
        Promise.resolve(textPromise).catch(() => {/* ignore errors */});
      } catch (err) {
        console.error(`[Magic Link] Exception trying to read response text:`, err);
      }
      
      if (!response.ok) {
        console.warn(`[Magic Link] Failed to join with existing user (status ${response.status}), falling back to creating new user`);
        joinRoom(roomCode, name);
        return;
      }
      
      const data = await response.json();
      console.log(`[Magic Link] Existing user successful response:`, data);
      
      // Show success message briefly
      setStatus('success');
      
      // Two-step redirect:
      // 1. First show success message
      // 2. Then redirect to room page which will show available chatbots
      setTimeout(async () => {
        console.log('Preparing redirect to room with cookies (existing user)...');
        
        if (data.roomId) {
          try {
            // Instead of directly going to the chat page, we need to:
            // 1. Find a chatbot for this room
            // 2. Then redirect to the proper URL
            console.log('Finding available chatbots for room:', data.roomId);
            
            const response = await fetch(`/api/student/room-chatbots?roomId=${data.roomId}`, {
              method: 'GET',
              credentials: 'include'
            });
            
            if (response.ok) {
              const chatbotData = await response.json();
              console.log('Available chatbots:', chatbotData);
              
              if (chatbotData.chatbots && chatbotData.chatbots.length > 0) {
                // Always redirect to room page first, regardless of chatbot count
                console.log(`Found ${chatbotData.chatbots.length} chatbots, redirecting to room selection page...`);
                window.location.href = `/room/${data.roomId}?uid=${data.userId || userId}&ts=${Date.now()}`;
              } else {
                // No chatbots - redirect to room page anyway
                console.log('No chatbots found for this room, redirecting to room page...');
                window.location.href = `/room/${data.roomId}?uid=${data.userId || userId}&ts=${Date.now()}`;
              }
            } else {
              // API error - go to room directly
              console.error('Failed to fetch chatbots, redirecting to room directly');
              window.location.href = `/room/${data.roomId}?uid=${data.userId || userId}&ts=${Date.now()}`;
            }
          } catch (error) {
            console.error('Error during chatbot lookup:', error);
            // Fallback to room page
            window.location.href = `/room/${data.roomId}?uid=${data.userId || userId}&ts=${Date.now()}`;
          }
        } else {
          // No room ID - go to student dashboard
          console.log('No room ID available, redirecting to student dashboard');
          window.location.href = '/student/dashboard';
        }
      }, 1500);
    } catch (err) {
      console.error('Error joining with existing user:', err);
      // Fall back to creating a new user
      joinRoom(roomCode, name);
    }
  };
  
  const joinRoom = async (roomCode: string, name: string) => {
    try {
      console.log(`[Magic Link] Attempting to join room: ${roomCode} with name: ${name}`);
      
      // Try the emergency fallback approach first - it's more reliable
      // This will bypass potential auth issues by using a more direct approach
      const bypassResult = await directBypass();
      if (bypassResult) {
        console.log(`[Magic Link] Emergency bypass initiated, waiting for redirect`);
        // The directBypass function handles the redirect, so we don't need to continue
        return;
      }
      
      // If directBypass fails, continue with the API approach
      console.log(`[Magic Link] Emergency bypass failed, using API fallback`);
      
      // Simple direct join with minimal complexity
      const requestBody = { 
        room_code: roomCode,
        student_name: name,
        skip_auth: true
      };
      
      console.log(`[Magic Link] Request payload:`, requestBody);
      
      const response = await fetch('/api/student/join-room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        // Ensures cookies are handled
        credentials: 'include'
      });
      
      console.log(`[Magic Link] Response status:`, response.status);
      
      // Clone the response so we can read it multiple times
      const responseClone = response.clone();
      
      // Try to get the response text for debugging
      try {
        const textPromise = responseClone.text();
        textPromise.then(text => {
          console.log(`[Magic Link] Raw response:`, text.substring(0, 200) + (text.length > 200 ? '...' : ''));
        }).catch(err => {
          console.error(`[Magic Link] Error reading response text:`, err);
        });
        // Make sure the promise completes but don't wait for it
        Promise.resolve(textPromise).catch(() => {/* ignore errors */});
      } catch (err) {
        console.error(`[Magic Link] Exception trying to read response text:`, err);
      }
      
      if (!response.ok) {
        // Try to get JSON error if available
        try {
          const errorData = await response.json();
          console.error(`[Magic Link] Error response:`, errorData);
          
          // If the API fails, try the emergency bypass as a last resort
          console.log(`[Magic Link] API failed, trying emergency bypass as last resort`);
          const bypassResult = await directBypass();
          if (bypassResult) {
            return; // Bypass initiated
          }
          
          throw new Error(errorData.error || `Error: Failed to join room`);
        } catch (parseError) {
          // If JSON parsing fails, use the response status
          console.error(`[Magic Link] Error parsing error response:`, parseError);
          
          // Try emergency bypass again
          console.log(`[Magic Link] API and JSON parsing failed, trying emergency bypass one more time`);
          const bypassResult = await directBypass();
          if (bypassResult) {
            return; // Bypass initiated
          }
          
          throw new Error(`Error: Failed to join room (${response.status})`);
        }
      }
      
      const data = await response.json();
      console.log(`[Magic Link] Successful response:`, data);
      
      // Show success message briefly
      setStatus('success');
      
      // Two-step redirect:
      // 1. First show success message
      // 2. Then redirect to room page which will show available chatbots
      setTimeout(async () => {
        console.log('Preparing redirect to room with cookies...');
        
        if (data.roomId) {
          try {
            // Instead of directly going to the chat page, we need to:
            // 1. Find a chatbot for this room
            // 2. Then redirect to the proper URL
            console.log('Finding available chatbots for room:', data.roomId);
            
            const response = await fetch(`/api/student/room-chatbots?roomId=${data.roomId}`, {
              method: 'GET',
              credentials: 'include'
            });
            
            if (response.ok) {
              const chatbotData = await response.json();
              console.log('Available chatbots:', chatbotData);
              
              if (chatbotData.chatbots && chatbotData.chatbots.length > 0) {
                // Always redirect to room page first, regardless of chatbot count
                console.log(`Found ${chatbotData.chatbots.length} chatbots, redirecting to room selection page...`);
                window.location.href = `/room/${data.roomId}?uid=${data.userId || ''}&ts=${Date.now()}`;
              } else {
                // No chatbots - redirect to student dashboard
                console.log('No chatbots found for this room, redirecting to student dashboard...');
                window.location.href = `/room/${data.roomId}?uid=${data.userId || ''}&ts=${Date.now()}`;
              }
            } else {
              // API error - go to room directly
              console.error('Failed to fetch chatbots, redirecting to room directly');
              window.location.href = `/room/${data.roomId}?uid=${data.userId || ''}&ts=${Date.now()}`;
            }
          } catch (error) {
            console.error('Error during chatbot lookup:', error);
            // Fallback to room page
            window.location.href = `/room/${data.roomId}?uid=${data.userId || ''}&ts=${Date.now()}`;
          }
        } else {
          // No room ID - go to student dashboard
          console.log('No room ID available, redirecting to student dashboard');
          window.location.href = '/student/dashboard';
        }
      }, 1500);
    } catch (err) {
      console.error('Error joining room:', err);
      setError(err instanceof Error ? err.message : 'Failed to join room');
      setStatus('error');
    }
  };
  
  // Loading state
  if (status === 'joining') {
    return (
      <PageContainer>
        <JoinCard>
          <Title>Joining Classroom</Title>
          {roomCode && <RoomCode>{roomCode}</RoomCode>}
          <Text>Welcome, {studentName || 'Student'}! Setting up your access...</Text>
          <LoadingSpinner />
        </JoinCard>
      </PageContainer>
    );
  }
  
  // Success state
  if (status === 'success') {
    return (
      <PageContainer>
        <JoinCard>
          <Title>Successfully Joined!</Title>
          {roomCode && <RoomCode>{roomCode}</RoomCode>}
          <Alert variant="success">Welcome, {studentName}! You&apos;ve joined the classroom.</Alert>
          <Text>Taking you to the classroom chat...</Text>
          <LoadingSpinner />
        </JoinCard>
      </PageContainer>
    );
  }
  
  // Define a direct bypass function for emergency room access
  const directBypass = async (code = roomCode, name = studentName): Promise<boolean> => {
    try {
      console.log(`[Magic Link] Attempting direct bypass for room ${code} with name ${name}`);
      
      // Method 1: Try the JSON API endpoint first
      const response = await fetch('/api/emergency-room-access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          roomCode: code || '',
          studentName: name || '',
          timestamp: Date.now()
        }),
        credentials: 'include' // Include cookies
      });
      
      // If this worked, process the response
      if (response.ok) {
        const data = await response.json();
        console.log('[Magic Link] Emergency access successful:', data);
        
        // Show success message briefly
        setStatus('success');
        
        // Redirect to the room after a short delay
        setTimeout(() => {
          if (data.roomId) {
            window.location.href = `/room/${data.roomId}?emergency=true&uid=${data.userId || ''}&ts=${Date.now()}`;
          } else {
            window.location.href = '/join-room?code=' + code;
          }
        }, 1500);
        
        return true;
      }
      
      console.log('[Magic Link] JSON emergency access failed, trying form submission');
      
      // Method 2: Fall back to form submission as a last resort
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = '/api/emergency-room-access';
      
      // Add all the data we have
      const codeField = document.createElement('input');
      codeField.type = 'hidden';
      codeField.name = 'room_code';
      codeField.value = code || '';
      form.appendChild(codeField);
      
      const nameField = document.createElement('input');
      nameField.type = 'hidden';
      nameField.name = 'student_name';
      nameField.value = name || '';
      form.appendChild(nameField);
      
      const tsField = document.createElement('input');
      tsField.type = 'hidden';
      tsField.name = 'timestamp';
      tsField.value = Date.now().toString();
      form.appendChild(tsField);
      
      // Add to document and submit
      document.body.appendChild(form);
      form.submit();
      
      return true;
    } catch (error) {
      console.error('[Magic Link] Emergency access error:', error);
      return false;
    }
  };
  
  // Error state
  return (
    <PageContainer>
      <JoinCard>
        <Title>Error Joining Classroom</Title>
        {roomCode && <RoomCode>{roomCode}</RoomCode>}
        <Alert variant="error">{error}</Alert>
        <Text>
          <a href={`/join-room?code=${roomCode}`} style={{ color: 'inherit', textDecoration: 'underline' }}>
            Try joining manually instead
          </a>
        </Text>
        <div style={{ marginTop: '20px' }}>
          <button 
            onClick={async () => {
              try {
                await directBypass(); // Use default parameters
              } catch (error) {
                console.error('Error in emergency access button handler:', error);
              }
            }}
            style={{ 
              background: '#555', 
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Try Emergency Access
          </button>
        </div>
      </JoinCard>
    </PageContainer>
  );
}