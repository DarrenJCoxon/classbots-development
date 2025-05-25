'use client';

import { useState, useEffect } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { Container, Alert } from '@/styles/StyledComponents';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { ModernButton } from '@/components/shared/ModernButton';
import { FiLogOut, FiArrowRight } from 'react-icons/fi';
import { ModernStudentNav } from '@/components/student/ModernStudentNav';

const PageWrapper = styled.div`
  min-height: 100vh;
  background: ${({ theme }) => theme.colors.background};
  position: relative;
  display: flex;
  
  /* Subtle animated background */
  &::before {
    content: '';
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: 
      radial-gradient(circle at 20% 50%, rgba(76, 190, 243, 0.03) 0%, transparent 50%),
      radial-gradient(circle at 80% 80%, rgba(152, 93, 215, 0.03) 0%, transparent 50%),
      radial-gradient(circle at 40% 20%, rgba(200, 72, 175, 0.03) 0%, transparent 50%);
    pointer-events: none;
    z-index: 0;
  }
`;

const MainContent = styled.div`
  flex: 1;
  margin-left: 250px;
  width: 100%;
  position: relative;
  z-index: 1;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    margin-left: 0;
  }
`;

const StyledContainer = styled(Container)`
  position: relative;
  z-index: 1;
  padding: 60px 24px;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    padding: 40px 16px;
  }
`;

const Title = styled.h1`
  font-family: ${({ theme }) => theme.fonts.heading};
  text-transform: uppercase;
  font-size: 32px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text};
  text-align: center;
  margin-bottom: 40px;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    font-size: 28px;
  }
`;

const StyledCard = styled(motion.div)`
  max-width: 500px;
  margin: 0 auto;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  padding: 40px;
  border: 1px solid rgba(152, 93, 215, 0.1);
  box-shadow: 0 10px 40px rgba(152, 93, 215, 0.05);
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    padding: 24px;
  }
`;

const StyledForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const Label = styled.label`
  font-weight: 500;
  margin-bottom: 8px;
  display: block;
  color: ${({ theme }) => theme.colors.text};
`;

const InputGroup = styled.div`
  display: flex;
  flex-direction: column;
`;

const StyledInput = styled.input`
  width: 100%;
  padding: 14px 20px;
  background: rgba(255, 255, 255, 0.8);
  border: 2px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  font-size: 16px;
  color: ${({ theme }) => theme.colors.text};
  transition: all 0.2s ease;
  
  &:focus {
    outline: none;
    background: white;
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.primary}20;
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  &::placeholder {
    color: ${({ theme }) => theme.colors.textLight};
  }
`;

const PinInput = styled(StyledInput)`
  letter-spacing: 0.5rem;
  text-align: center;
  font-size: 24px;
  font-weight: bold;
`;

const ResultBox = styled.div`
  margin-bottom: 24px;
  padding: 20px;
  background: linear-gradient(135deg, 
    rgba(152, 93, 215, 0.05), 
    rgba(76, 190, 243, 0.05)
  );
  border-radius: 12px;
  border: 1px solid rgba(152, 93, 215, 0.1);
  
  h3 {
    margin: 0 0 8px 0;
    color: ${({ theme }) => theme.colors.primary};
    font-family: ${({ theme }) => theme.fonts.heading};
    font-size: 20px;
  }
  
  p {
    margin: 0;
    color: ${({ theme }) => theme.colors.textLight};
    font-size: 14px;
  }
`;

const StyledAlert = styled(Alert)`
  margin-bottom: 20px;
`;

const RoomButton = styled(ModernButton)`
  width: 100%;
  margin-bottom: 12px;
  justify-content: space-between;
  padding: 20px 24px;
  font-size: 16px;
  
  svg {
    transition: transform 0.2s ease;
  }
  
  &:hover svg {
    transform: translateX(4px);
  }
`;

const InfoText = styled.p`
  color: ${({ theme }) => theme.colors.textLight};
  margin-bottom: 24px;
  line-height: 1.6;
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
        <ModernStudentNav />
        <MainContent>
          <StyledContainer>
            <Title>Student Room Access</Title>
            <StyledCard
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <InfoText>Enter your name and PIN to access your rooms.</InfoText>
              
              {error && <StyledAlert variant="error">{error}</StyledAlert>}
              
              <StyledForm onSubmit={handleSubmit}>
                <InputGroup>
                  <Label htmlFor="identifier">Your Name or Username</Label>
                  <StyledInput
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
                
                <ModernButton 
                  type="submit" 
                  disabled={loading}
                  variant="primary"
                  size="large"
                  fullWidth
                >
                  {loading ? 'Checking...' : 'Access Rooms'}
                </ModernButton>
              </StyledForm>
            </StyledCard>
          </StyledContainer>
        </MainContent>
      </PageWrapper>
    );
  }
  
  // Show the student's rooms when logged in
  return (
    <PageWrapper>
      <ModernStudentNav />
      <MainContent>
        <StyledContainer>
          <Title>Your Classrooms</Title>
          
          <StyledCard
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <ResultBox>
              <h3>Welcome, {student.full_name || 'Student'}!</h3>
              <p>You are directly accessing your classrooms.</p>
            </ResultBox>
            
            {rooms.length === 0 ? (
              <StyledAlert variant="info">
                You haven&apos;t joined any rooms yet.
              </StyledAlert>
            ) : (
              <div>
                <InfoText style={{ marginBottom: '16px' }}>Select a room to enter:</InfoText>
                {rooms.map(room => (
                  <RoomButton
                    key={room.room_id}
                    onClick={() => handleRoomClick(room.room_id)}
                    variant="ghost"
                  >
                    {room.room_name}
                    <FiArrowRight />
                  </RoomButton>
                ))}
              </div>
            )}
            
            <ModernButton 
              variant="ghost" 
              onClick={handleLogout}
              style={{ marginTop: '24px' }}
              fullWidth
            >
              <FiLogOut />
              Log Out
            </ModernButton>
          </StyledCard>
        </StyledContainer>
      </MainContent>
    </PageWrapper>
  );
}