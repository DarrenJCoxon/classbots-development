'use client';

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { createClient } from '@/lib/supabase/client';
import { ModernNav } from '@/components/teacher/ModernNav';
import { ModernButton } from '@/components/shared/ModernButton';
import { FiShield, FiAlertTriangle, FiUser, FiClock } from 'react-icons/fi';

const PageWrapper = styled.div`
  min-height: 100vh;
  background: ${({ theme }) => theme.colors.background};
`;

const ContentWrapper = styled.div`
  padding: 40px;
  max-width: 1400px;
  margin: 0 auto;
`;

const Header = styled.div`
  margin-bottom: 32px;
`;

const Title = styled.h1`
  font-size: 36px;
  font-weight: 800;
  font-family: ${({ theme }) => theme.fonts.heading};
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: 8px;
`;

const Subtitle = styled.p`
  font-size: 18px;
  color: ${({ theme }) => theme.colors.textLight};
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 24px;
  margin-bottom: 32px;
`;

const StatCard = styled.div<{ $color: string }>`
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 16px;
  padding: 24px;
  border: 1px solid ${props => props.$color}20;
  
  h3 {
    font-size: 14px;
    text-transform: uppercase;
    color: ${({ theme }) => theme.colors.textMuted};
    margin-bottom: 8px;
    display: flex;
    align-items: center;
    gap: 8px;
    
    svg {
      color: ${props => props.$color};
    }
  }
  
  .value {
    font-size: 32px;
    font-weight: 700;
    color: ${props => props.$color};
  }
`;

const FilteredMessagesTable = styled.div`
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 16px;
  padding: 24px;
  border: 1px solid rgba(152, 93, 215, 0.1);
`;

const Table = styled.table`
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  
  th {
    text-align: left;
    padding: 12px;
    color: ${({ theme }) => theme.colors.primary};
    font-weight: 600;
    border-bottom: 2px solid rgba(152, 93, 215, 0.1);
  }
  
  td {
    padding: 12px;
    border-bottom: 1px solid rgba(152, 93, 215, 0.05);
  }
  
  tr:hover {
    background: rgba(152, 93, 215, 0.02);
  }
`;

const FilterBadge = styled.span<{ $type: string }>`
  display: inline-block;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  background: ${props => {
    switch(props.$type) {
      case 'phone number': return 'rgba(239, 68, 68, 0.1)';
      case 'email address': return 'rgba(245, 158, 11, 0.1)';
      case 'social media platform': return 'rgba(139, 92, 246, 0.1)';
      case 'external link': return 'rgba(236, 72, 153, 0.1)';
      default: return 'rgba(107, 114, 128, 0.1)';
    }
  }};
  color: ${props => {
    switch(props.$type) {
      case 'phone number': return '#dc2626';
      case 'email address': return '#d97706';
      case 'social media platform': return '#7c3aed';
      case 'external link': return '#db2777';
      default: return '#4b5563';
    }
  }};
`;

interface FilteredMessage {
  filter_id: string;
  user_id: string;
  room_id: string;
  original_message: string;
  filter_reason: string;
  flagged_patterns: string[];
  created_at: string;
  student_name?: string;
  room_name?: string;
}

export default function ContentFiltersPage() {
  const [filteredMessages, setFilteredMessages] = useState<FilteredMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    today: 0,
    uniqueStudents: 0,
    mostCommon: ''
  });
  
  const supabase = createClient();

  useEffect(() => {
    fetchFilteredMessages();
  }, []);

  const fetchFilteredMessages = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get teacher's students
      const { data: rooms } = await supabase
        .from('rooms')
        .select('room_id, room_name')
        .eq('teacher_id', user.id);

      if (!rooms || rooms.length === 0) {
        setLoading(false);
        return;
      }

      const roomIds = rooms.map(r => r.room_id);

      // Get filtered messages
      const { data: messages } = await supabase
        .from('filtered_messages')
        .select(`
          *,
          student_profiles!user_id(first_name, surname)
        `)
        .in('room_id', roomIds)
        .order('created_at', { ascending: false })
        .limit(100);

      if (messages) {
        // Add room names
        const messagesWithDetails = messages.map(msg => {
          const room = rooms.find(r => r.room_id === msg.room_id);
          return {
            ...msg,
            room_name: room?.room_name || 'Unknown Room',
            student_name: msg.student_profiles 
              ? `${msg.student_profiles.first_name} ${msg.student_profiles.surname}`
              : 'Unknown Student'
          };
        });

        setFilteredMessages(messagesWithDetails);

        // Calculate stats
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const todayMessages = messages.filter(m => 
          new Date(m.created_at) >= today
        );

        const uniqueStudents = new Set(messages.map(m => m.user_id)).size;

        // Find most common filter reason
        const reasonCounts: Record<string, number> = {};
        messages.forEach(m => {
          if (m.filter_reason) {
            reasonCounts[m.filter_reason] = (reasonCounts[m.filter_reason] || 0) + 1;
          }
        });
        const mostCommon = Object.entries(reasonCounts)
          .sort(([,a], [,b]) => b - a)[0]?.[0] || 'None';

        setStats({
          total: messages.length,
          today: todayMessages.length,
          uniqueStudents,
          mostCommon
        });
      }
    } catch (error) {
      console.error('Error fetching filtered messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <>
      <ModernNav />
      <PageWrapper>
        <ContentWrapper>
          <Header>
            <Title>Content Filter Monitor</Title>
            <Subtitle>
              Track blocked messages and protect student privacy
            </Subtitle>
          </Header>

          <StatsGrid>
            <StatCard $color="#dc2626">
              <h3><FiShield /> Total Blocked</h3>
              <div className="value">{stats.total}</div>
            </StatCard>
            <StatCard $color="#f59e0b">
              <h3><FiClock /> Today</h3>
              <div className="value">{stats.today}</div>
            </StatCard>
            <StatCard $color="#8b5cf6">
              <h3><FiUser /> Unique Students</h3>
              <div className="value">{stats.uniqueStudents}</div>
            </StatCard>
            <StatCard $color="#10b981">
              <h3><FiAlertTriangle /> Most Common</h3>
              <div className="value" style={{ fontSize: '16px' }}>{stats.mostCommon}</div>
            </StatCard>
          </StatsGrid>

          <FilteredMessagesTable>
            <h2 style={{ marginBottom: '24px' }}>Recent Blocked Messages</h2>
            
            {loading ? (
              <p>Loading filtered messages...</p>
            ) : filteredMessages.length === 0 ? (
              <p style={{ color: '#6b7280', textAlign: 'center', padding: '40px' }}>
                No messages have been filtered yet. This is good news!
              </p>
            ) : (
              <Table>
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Student</th>
                    <th>Classroom</th>
                    <th>Blocked Content</th>
                    <th>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMessages.map((msg) => (
                    <tr key={msg.filter_id}>
                      <td>{formatDate(msg.created_at)}</td>
                      <td>{msg.student_name}</td>
                      <td>{msg.room_name}</td>
                      <td style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {msg.original_message}
                      </td>
                      <td>
                        <FilterBadge $type={msg.filter_reason}>
                          {msg.filter_reason}
                        </FilterBadge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </FilteredMessagesTable>
        </ContentWrapper>
      </PageWrapper>
    </>
  );
}