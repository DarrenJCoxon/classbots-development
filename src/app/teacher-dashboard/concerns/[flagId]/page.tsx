// src/app/teacher-dashboard/concerns/[flagId]/page.tsx
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import styled from 'styled-components';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  Card,
  CardHeader,
  CardBody,
  Section,
  Stack,
  Flex,
  Text,
  Button,
  Badge,
  FormField,
  Label
} from '@/components/ui';
import { TextArea, Select, Alert } from '@/styles/StyledComponents';
import { ChatMessage as ChatMessageComponent } from '@/components/shared/ChatMessage';
import { SafetyMessage } from '@/components/shared/SafetyMessage';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import { ModernButton } from '@/components/shared/ModernButton';
import type { FlaggedMessage, ConcernStatus, ChatMessage as DatabaseChatMessage, Profile, Room } from '@/types/database.types';

interface FlagDetailsResponse extends FlaggedMessage {
    student: Pick<Profile, 'full_name' | 'email'> | null;
    room: Pick<Room, 'room_name'> | null;
    message: DatabaseChatMessage | null;
    student_name: string | null;
    student_email: string | null;
    room_name: string | null;
    message_content: string | null;
    surroundingMessages: DatabaseChatMessage[];
}

// Modern styled components
const PageWrapper = styled.div`
  min-height: 100vh;
  background: ${({ theme }) => theme.colors.background};
  position: relative;
  
  /* Subtle animated background */
  &::before {
    content: '';
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: 
      radial-gradient(circle at 20% 50%, rgba(254, 67, 114, 0.03) 0%, transparent 50%),
      radial-gradient(circle at 80% 80%, rgba(200, 72, 175, 0.03) 0%, transparent 50%),
      radial-gradient(circle at 40% 20%, rgba(152, 93, 215, 0.03) 0%, transparent 50%);
    pointer-events: none;
    z-index: 0;
  }
`;

const Container = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  padding: 40px 24px;
  position: relative;
  z-index: 1;
`;

const Header = styled.div`
  margin-bottom: 40px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 24px;
`;

const Title = styled.h1`
  margin: 0;
  font-size: 36px;
  font-weight: 800;
  font-family: ${({ theme }) => theme.fonts.heading};
  text-transform: uppercase;
  letter-spacing: 1px;
  background: linear-gradient(135deg, 
    ${({ theme }) => theme.colors.pink}, 
    ${({ theme }) => theme.colors.magenta}
  );
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr 400px;
  gap: 32px;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    grid-template-columns: 1fr;
  }
`;

const ConversationCard = styled(Card)`
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const MessagesList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  
  /* Custom scrollbar */
  &::-webkit-scrollbar {
    width: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.colors.border};
    border-radius: 4px;
    
    &:hover {
      background: ${({ theme }) => theme.colors.borderDark};
    }
  }
`;

const FlaggedMessageWrapper = styled(motion.div)`
  position: relative;
  margin: 16px 0;
  padding: 16px;
  border-radius: 16px;
  background: rgba(254, 67, 114, 0.05);
  border: 2px solid ${({ theme }) => theme.colors.pink};
  
  &::before {
    content: 'FLAGGED MESSAGE';
    position: absolute;
    top: -10px;
    left: 20px;
    background: ${({ theme }) => theme.colors.background};
    padding: 0 8px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 1px;
    color: ${({ theme }) => theme.colors.pink};
  }
`;

const DetailsCard = styled(Card)`
  position: sticky;
  top: 100px;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    position: static;
  }
`;

const DetailItem = styled.div`
  padding: 12px 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  
  &:last-child {
    border-bottom: none;
  }
`;

const DetailLabel = styled.div`
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: ${({ theme }) => theme.colors.textLight};
  margin-bottom: 4px;
`;

const DetailValue = styled.div`
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text};
`;

const AnalysisBox = styled.div`
  background: ${({ theme }) => theme.colors.backgroundDark};
  border-radius: 12px;
  padding: 16px;
  margin-top: 8px;
  font-style: italic;
  color: ${({ theme }) => theme.colors.textLight};
  font-size: 14px;
  line-height: 1.6;
`;

const ActionSection = styled.div`
  margin-top: 24px;
  padding-top: 24px;
  border-top: 2px solid ${({ theme }) => theme.colors.border};
`;

// Helper functions
function getConcernTypeText(type: string | undefined): string {
  if (!type) return 'Unknown';
  return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function getConcernLevelText(level: number | undefined): string {
  if (level === undefined) return 'N/A';
  if (level >= 5) return 'Critical';
  if (level >= 4) return 'High';
  if (level >= 3) return 'Significant';
  if (level >= 2) return 'Moderate';
  if (level >= 1) return 'Minor';
  return 'Low';
}

function getConcernLevelColor(level: number): string {
  if (level >= 4) return 'danger';
  if (level >= 3) return 'warning';
  return 'info';
}

export default function ConcernDetailPage() {
  const [concern, setConcern] = useState<FlagDetailsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<ConcernStatus>('pending');
  const [notes, setNotes] = useState('');

  const params = useParams();
  const router = useRouter();
  const flagId = params?.flagId as string;
  const flaggedMessageRef = useRef<HTMLDivElement>(null);

  const fetchConcernDetails = useCallback(async () => {
    if (!flagId) {
      setError("Flag ID missing from page parameters.");
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    setActionError(null);
    
    try {
      const response = await fetch(`/api/teacher/concerns?flagId=${flagId}`);
      
      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: `HTTP error ${response.status}` }));
        throw new Error(data.error || `Failed to fetch concern details (status: ${response.status})`);
      }
      
      const data: FlagDetailsResponse = await response.json();
      setConcern(data);
      setSelectedStatus(data.status || 'pending');
      setNotes(data.notes || '');
    } catch (err) {
      console.error("Error fetching concern:", err);
      setError(err instanceof Error ? err.message : 'Failed to load concern details');
      setConcern(null);
    } finally {
      setLoading(false);
    }
  }, [flagId]);

  useEffect(() => {
    fetchConcernDetails();
  }, [fetchConcernDetails]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (concern && flaggedMessageRef.current) {
        flaggedMessageRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [concern]);

  const handleStatusUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!concern?.flag_id) return;

    setIsSubmitting(true);
    setActionError(null);
    
    try {
      const response = await fetch(`/api/teacher/concerns`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flagId: concern.flag_id,
          status: selectedStatus,
          notes: notes
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Update failed' }));
        throw new Error(errorData.error || 'Failed to update status');
      }

      const updatedData = await response.json();
      setConcern(prev => prev ? ({ ...prev, ...updatedData }) : null);
      setSelectedStatus(updatedData.status);
      setNotes(updatedData.notes || '');
      
      // Show success feedback
      alert("Status updated successfully!");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render states
  if (loading) {
    return (
      <PageWrapper>
        <Container>
          <Card variant="elevated">
            <CardBody>
              <Flex align="center" justify="center" gap="md">
                <LoadingSpinner />
                <Text>Loading concern details...</Text>
              </Flex>
            </CardBody>
          </Card>
        </Container>
      </PageWrapper>
    );
  }

  if (error) {
    return (
      <PageWrapper>
        <Container>
          <Alert variant="error">{error}</Alert>
          <ModernButton 
            variant="ghost" 
            onClick={() => router.back()} 
            style={{ marginTop: '16px' }}
          >
            ← Back
          </ModernButton>
        </Container>
      </PageWrapper>
    );
  }

  if (!concern) {
    return (
      <PageWrapper>
        <Container>
          <Card variant="elevated">
            <CardBody>
              <Text align="center">Concern not found or permission denied.</Text>
            </CardBody>
          </Card>
          <ModernButton 
            variant="ghost" 
            onClick={() => router.back()} 
            style={{ marginTop: '16px' }}
          >
            ← Back
          </ModernButton>
        </Container>
      </PageWrapper>
    );
  }

  const actualFlaggedMessage = concern.surroundingMessages?.find(m => m.message_id === concern.message_id) || concern.message;

  return (
    <PageWrapper>
      <Container>
        <Header>
          <Title>Review Concern</Title>
          <ModernButton 
            variant="secondary" 
            onClick={() => router.push('/teacher-dashboard/concerns')}
          >
            ← Back to Concerns
          </ModernButton>
        </Header>

        <Grid>
          {/* Conversation Context */}
          <ConversationCard variant="elevated">
            <CardHeader>
              <Text size="lg" weight="semibold">Conversation Context</Text>
            </CardHeader>
            <MessagesList>
              {concern.surroundingMessages?.length > 0 ? (
                concern.surroundingMessages.map(msg => {
                  const isFlagged = msg.message_id === concern.message_id;
                  const chatbotName = concern.room_name || "Assistant";

                  // Check if this is a safety message
                  const isSafetyMessage = msg.role === 'system' && msg.metadata?.isSystemSafetyResponse === true;

                  if (isSafetyMessage) {
                    return (
                      <SafetyMessage 
                        key={msg.message_id} 
                        message={msg}
                        countryCode={msg.metadata?.countryCode as string | undefined}
                      />
                    );
                  }

                  const messageComponent = (
                    <ChatMessageComponent 
                      key={msg.message_id} 
                      message={msg} 
                      chatbotName={chatbotName}
                    />
                  );

                  return isFlagged ? (
                    <FlaggedMessageWrapper
                      key={msg.message_id}
                      ref={flaggedMessageRef}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      {messageComponent}
                    </FlaggedMessageWrapper>
                  ) : messageComponent;
                })
              ) : (
                actualFlaggedMessage ? (
                  <FlaggedMessageWrapper 
                    ref={flaggedMessageRef}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                  >
                    <ChatMessageComponent 
                      key={actualFlaggedMessage.message_id} 
                      message={actualFlaggedMessage} 
                      chatbotName={concern.room_name || "Assistant"}
                    />
                  </FlaggedMessageWrapper>
                ) : (
                  <Text align="center" color="light">
                    Conversation context unavailable.
                  </Text>
                )
              )}
            </MessagesList>
          </ConversationCard>

          {/* Details & Actions */}
          <DetailsCard variant="elevated">
            <CardHeader>
              <Text size="lg" weight="semibold">Concern Details</Text>
            </CardHeader>
            <CardBody>
              <Stack spacing="none">
                <DetailItem>
                  <DetailLabel>Student</DetailLabel>
                  <DetailValue>
                    {concern.student_name || 'N/A'}
                    {concern.student_email && (
                      <Text size="sm" color="light"> ({concern.student_email})</Text>
                    )}
                  </DetailValue>
                </DetailItem>

                <DetailItem>
                  <DetailLabel>Classroom</DetailLabel>
                  <DetailValue>{concern.room_name || 'N/A'}</DetailValue>
                </DetailItem>

                <DetailItem>
                  <DetailLabel>Concern Type</DetailLabel>
                  <DetailValue>{getConcernTypeText(concern.concern_type)}</DetailValue>
                </DetailItem>

                <DetailItem>
                  <DetailLabel>Assessed Level</DetailLabel>
                  <DetailValue>
                    <Badge $variant={getConcernLevelColor(concern.concern_level)}>
                      {getConcernLevelText(concern.concern_level)} (Level {concern.concern_level})
                    </Badge>
                  </DetailValue>
                </DetailItem>

                <DetailItem>
                  <DetailLabel>Detected At</DetailLabel>
                  <DetailValue>{new Date(concern.created_at).toLocaleString()}</DetailValue>
                </DetailItem>

                <DetailItem>
                  <DetailLabel>AI Analysis</DetailLabel>
                  <AnalysisBox>
                    {concern.analysis_explanation || 
                     "This message was flagged by the automated safety system. Please review the conversation context."}
                  </AnalysisBox>
                </DetailItem>

                {concern.reviewed_at && (
                  <DetailItem>
                    <DetailLabel>Last Reviewed</DetailLabel>
                    <DetailValue>{new Date(concern.reviewed_at).toLocaleString()}</DetailValue>
                  </DetailItem>
                )}
              </Stack>

              <ActionSection>
                <form onSubmit={handleStatusUpdate}>
                  <Stack spacing="md">
                    <FormField>
                      <Label htmlFor="status">Update Status</Label>
                      <Select 
                        id="status" 
                        value={selectedStatus} 
                        onChange={(e) => setSelectedStatus(e.target.value as ConcernStatus)}
                      >
                        <option value="pending">Pending Review</option>
                        <option value="reviewing">Reviewing</option>
                        <option value="resolved">Resolved</option>
                        <option value="false_positive">False Positive</option>
                      </Select>
                    </FormField>

                    <FormField>
                      <Label htmlFor="notes">Review Notes</Label>
                      <TextArea 
                        id="notes" 
                        rows={5} 
                        value={notes} 
                        onChange={(e) => setNotes(e.target.value)} 
                        placeholder="Add notes on actions taken, observations, or decision rationale..."
                      />
                    </FormField>

                    {actionError && (
                      <Alert variant="error">{actionError}</Alert>
                    )}

                    <ModernButton 
                      type="submit" 
                      variant="primary"
                      disabled={isSubmitting}
                      fullWidth
                    >
                      {isSubmitting ? 'Updating...' : 'Update Status & Notes'}
                    </ModernButton>
                  </Stack>
                </form>
              </ActionSection>
            </CardBody>
          </DetailsCard>
        </Grid>
      </Container>
    </PageWrapper>
  );
}