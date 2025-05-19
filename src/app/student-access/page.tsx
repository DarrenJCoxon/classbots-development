'use client';

import { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Container, Card, Button, Input, Alert } from '@/styles/StyledComponents';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

const PageWrapper = styled.div`
  padding: 2rem 0;
  min-height: 100vh;
  background: ${({ theme }) => theme.colors.backgroundDark};
`;

const Title = styled.h1`
  font-size: 2rem;
  color: ${({ theme }) => theme.colors.primary};
  text-align: center;
  margin-bottom: 2rem;
`;

const StyledCard = styled(Card)`
  max-width: 500px;
  margin: 0 auto;
  padding: 2rem;
`;

const StyledForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const Label = styled.label`
  font-weight: 500;
  margin-bottom: 0.5rem;
  display: block;
`;

const InputGroup = styled.div`
  display: flex;
  flex-direction: column;
`;

const PinInput = styled(Input)`
  letter-spacing: 0.5rem;
  text-align: center;
  font-size: 1.5rem;
  font-weight: bold;
`;

const ResultBox = styled.div`
  margin-top: 1rem;
  padding: 1rem;
  background: ${({ theme }) => theme.colors.backgroundDark};
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  
  h3 {
    margin-top: 0;
    color: ${({ theme }) => theme.colors.primary};
  }
  
  p {
    margin: 0.5rem 0;
  }
`;

export default function DirectStudentAccess() {
  const [identifier, setIdentifier] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Define interface for student data
  interface Student {
    user_id: string;
    full_name?: string;
    email?: string;
    pin_code?: string;
  }
  
  // Define interface for room data
  interface Room {
    room_id: string;
    room_name: string;
    room_code: string;
    teacher_id?: string;
  }
  
  const [student, setStudent] = useState<Student | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  
  const router = useRouter();
  const supabase = createClient();
  
  // Check if we're already logged in
  useEffect(() => {
    const checkLoginStatus = async () => {
      // Check localStorage first
      const storedUserId = localStorage.getItem('student_direct_access_id');
      const storedName = localStorage.getItem('student_direct_access_name');
      
      if (storedUserId && storedName) {
        console.log('Found stored access info, checking validity...');
        try {
          // Verify the student exists in the database
          const { data, error } = await supabase
            .from('profiles')
            .select('user_id, full_name')
            .eq('user_id', storedUserId)
            .single();
            
          if (data && !error) {
            console.log('Valid stored user, loading rooms...');
            setStudent(data);
            fetchStudentRooms(storedUserId);
          } else {
            console.log('Stored user invalid, clearing storage');
            localStorage.removeItem('student_direct_access_id');
            localStorage.removeItem('student_direct_access_name');
          }
        } catch (err) {
          console.error('Error checking stored user:', err);
        }
      }
    };
    
    checkLoginStatus();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]); // fetchStudentRooms intentionally omitted
  
  const fetchStudentRooms = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('room_memberships')
        .select(`
          rooms (
            room_id,
            room_name,
            room_code
          )
        `)
        .eq('student_id', userId);
        
      if (error) throw error;
      
      // Extract the rooms from the memberships
      // Process with type safety
      const roomsList: Room[] = [];
      if (data && Array.isArray(data)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data.forEach((item: any) => {
          if (item && item.rooms) {
            roomsList.push({
              room_id: String(item.rooms.room_id || ''),
              room_name: String(item.rooms.room_name || 'Unnamed Room'),
              room_code: String(item.rooms.room_code || ''),
              teacher_id: item.rooms.teacher_id ? String(item.rooms.teacher_id) : undefined
            });
          }
        });
      }
      
      setRooms(roomsList);
    } catch (err) {
      console.error('Error fetching rooms:', err);
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      // Step 1: First use the student lookup API endpoint to verify PIN and get user_id
      const lookupResponse = await fetch('/api/auth/student-username-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, pin })
      });
      
      const lookupData = await lookupResponse.json();
      
      if (!lookupResponse.ok) {
        throw new Error(lookupData.error || 'Failed to find student');
      }
      
      if (!lookupData.pin_verified) {
        throw new Error('PIN verification failed');
      }
      
      // Store the relevant user info in localStorage (needed for direct access)
      const studentData = lookupData.best_match || { full_name: 'Student' };
      const userId = lookupData.user_id;
      
      // *** STORE USER INFO IN ALL POSSIBLE FORMATS FOR MAXIMUM COMPATIBILITY ***
      localStorage.setItem('student_direct_access_id', userId);
      localStorage.setItem('student_direct_access_name', studentData.full_name || 'Student');
      localStorage.setItem('current_student_id', userId);
      localStorage.setItem('direct_pin_login', 'true');
      localStorage.setItem('direct_pin_login_time', Date.now().toString());
      localStorage.setItem('direct_pin_login_user', userId);
      
      // Record successful authentication
      console.log("PIN verified successfully, redirecting to dashboard with direct access...");
      
      // SUCCESS! Now redirect directly to dashboard with all necessary params
      // This actually works better than calling the direct-student-login API which has issues
      const redirectParams = new URLSearchParams({
        direct: '1',
        user_id: userId,
        _t: Date.now().toString(), // Cache busting timestamp
        pin_verified: 'true'      // Signal that PIN was verified
      });
      
      // Set directly to window.location for a full page reload with the params
      window.location.href = `/student/dashboard?${redirectParams.toString()}`;
      return;
      
    } catch (err) {
      console.error('Login error:', err);
      setError(err instanceof Error ? err.message : 'Login failed');
      setLoading(false);
    }
  };
  
  const handleRoomClick = (roomId: string) => {
    // Navigate to the room page with direct access parameters
    router.push(`/room/${roomId}?direct=1&student_id=${localStorage.getItem('student_direct_access_id')}`);
  };
  
  // No longer needed - we handle the redirect directly in handleSubmit
  
  const handleLogout = () => {
    setStudent(null);
    setRooms([]);
    localStorage.removeItem('student_direct_access_id');
    localStorage.removeItem('student_direct_access_name');
  };
  
  // Show the login form if not logged in
  if (!student) {
    return (
      <PageWrapper>
        <Container>
          <Title>Student Room Access</Title>
          <StyledCard>
            <p>Enter your name and PIN to access your rooms.</p>
            
            {error && <Alert variant="error">{error}</Alert>}
            
            <StyledForm onSubmit={handleSubmit}>
              <InputGroup>
                <Label htmlFor="identifier">Your Name or Username</Label>
                <Input
                  id="identifier"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Enter your name"
                  disabled={loading}
                  required
                />
              </InputGroup>
              
              <InputGroup>
                <Label htmlFor="pin">PIN Code</Label>
                <PinInput
                  id="pin"
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  pattern="\d{4}"
                  value={pin}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    setPin(value);
                  }}
                  placeholder="****"
                  disabled={loading}
                  required
                />
              </InputGroup>
              
              <Button type="submit" disabled={loading}>
                {loading ? 'Checking...' : 'Access Rooms'}
              </Button>
            </StyledForm>
          </StyledCard>
        </Container>
      </PageWrapper>
    );
  }
  
  // Show the student's rooms when logged in
  return (
    <PageWrapper>
      <Container>
        <Title>Your Classrooms</Title>
        
        <StyledCard>
          <ResultBox>
            <h3>Welcome, {student.full_name || 'Student'}!</h3>
            <p>You are directly accessing your classrooms.</p>
          </ResultBox>
          
          {rooms.length === 0 ? (
            <Alert variant="info" style={{ marginTop: '1rem' }}>
              You haven&apos;t joined any rooms yet.
            </Alert>
          ) : (
            <div style={{ marginTop: '1rem' }}>
              <p>Select a room to enter:</p>
              {rooms.map(room => (
                <Button
                  key={room.room_id}
                  onClick={() => handleRoomClick(room.room_id)}
                  style={{ width: '100%', marginBottom: '0.5rem' }}
                >
                  {room.room_name}
                </Button>
              ))}
            </div>
          )}
          
          <Button 
            variant="outline" 
            style={{ marginTop: '1rem' }}
            onClick={handleLogout}
          >
            Log Out
          </Button>
        </StyledCard>
      </Container>
    </PageWrapper>
  );
}