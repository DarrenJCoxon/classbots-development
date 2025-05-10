// src/app/teacher-dashboard/concerns/[flagId]/page.tsx
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import styled from 'styled-components';
import { useParams, useRouter } from 'next/navigation';
// Import necessary components and styles
import { Container, Card, Button, Alert, Badge, TextArea, Label, Select as StyledSelect } from '@/styles/StyledComponents';
import { ChatMessage as ChatMessageComponent } from '@/components/shared/ChatMessage';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
// Import types (ensure Profile includes full_name)
import type { FlaggedMessage, ConcernStatus, ChatMessage as DatabaseChatMessage, Profile, Room } from '@/types/database.types'; // Import necessary base types


// Interface for the data structure returned by the API GET request
// This includes the nested objects directly as returned by the join syntax used
// and the flattened fields for easier use, plus surroundingMessages
interface FlagDetailsResponse extends FlaggedMessage {
    student: Pick<Profile, 'full_name' | 'email'> | null; // Nested original
    room: Pick<Room, 'room_name'> | null; // Nested original
    message: DatabaseChatMessage | null; // Nested original
    student_name: string | null; // Flattened
    student_email: string | null; // Flattened
    room_name: string | null; // Flattened
    message_content: string | null; // Flattened
    surroundingMessages: DatabaseChatMessage[];
}


// --- Styled Components (Keep as previously defined) ---
const PageWrapper = styled.div` padding: ${({ theme }) => theme.spacing.xl} 0; min-height: 100vh; `;
const Header = styled.div` display: flex; justify-content: space-between; align-items: center; margin-bottom: ${({ theme }) => theme.spacing.xl}; flex-wrap: wrap; gap: ${({ theme }) => theme.spacing.md}; `;
const Title = styled.h1` color: ${({ theme }) => theme.colors.text}; margin: 0; font-size: 1.8rem; @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) { font-size: 1.5rem; } `;
const BackButton = styled(Button)``;
const Grid = styled.div` display: grid; grid-template-columns: 3fr 2fr; gap: ${({ theme }) => theme.spacing.xl}; @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) { grid-template-columns: 1fr; } `;
const ConversationContext = styled(Card)` max-height: 75vh; display: flex; flex-direction: column; overflow: hidden; `;
const ContextHeader = styled.h3` padding: 0 0 ${({ theme }) => theme.spacing.md} 0; margin: 0 0 ${({ theme }) => theme.spacing.md} 0; border-bottom: 1px solid ${({ theme }) => theme.colors.border}; font-size: 1.2rem; `;
const MessagesList = styled.div` flex: 1; overflow-y: auto; padding-right: ${({ theme }) => theme.spacing.sm}; margin-right: -${({ theme }) => theme.spacing.sm}; &::-webkit-scrollbar { width: 6px; } &::-webkit-scrollbar-thumb { background-color: ${({ theme }) => theme.colors.borderDark}; border-radius: 3px; } &::-webkit-scrollbar-track { background: transparent; } `;
const FlaggedMessageHighlight = styled.div` border: 3px solid ${({ theme }) => theme.colors.red}; border-radius: ${({ theme }) => theme.borderRadius.large}; margin: ${({ theme }) => theme.spacing.md} 0; background-color: rgba(248, 127, 127, 0.08); padding: 2px; & > div { margin-bottom: 0; } `;
const ConcernDetailsCard = styled(Card)` align-self: start; position: sticky; top: 80px; @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) { position: static; margin-top: ${({ theme }) => theme.spacing.xl}; } `;
const DetailsHeader = styled.h3` margin-bottom: ${({ theme }) => theme.spacing.lg}; font-size: 1.2rem; `;
const DetailItem = styled.div` margin-bottom: ${({ theme }) => theme.spacing.md}; font-size: 0.9rem; line-height: 1.5; strong { display: block; margin-bottom: ${({ theme }) => theme.spacing.xs}; color: ${({ theme }) => theme.colors.textLight}; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em; } span, p { color: ${({ theme }) => theme.colors.text}; word-wrap: break-word; } p { margin-bottom: 0; } `;
const AnalysisText = styled.p` font-style: italic; color: ${({ theme }) => theme.colors.textLight}; background-color: ${({ theme }) => theme.colors.backgroundDark}; padding: ${({ theme }) => theme.spacing.sm}; border-radius: ${({ theme }) => theme.borderRadius.small}; margin-top: ${({ theme }) => theme.spacing.xs}; `;
const ActionForm = styled.form` margin-top: ${({ theme }) => theme.spacing.lg}; padding-top: ${({ theme }) => theme.spacing.lg}; border-top: 1px solid ${({ theme }) => theme.colors.border}; `;
const FormActions = styled.div` margin-top: ${({ theme }) => theme.spacing.lg}; `;
const CustomSelect = styled(StyledSelect)` width: 100%; margin-bottom: ${({ theme }) => theme.spacing.md}; `; // Use imported Select
const StyledTextArea = styled(TextArea)` width: 100%; margin-bottom: ${({ theme }) => theme.spacing.md}; min-height: 100px; `;
// --- End Styled Components ---

// --- Helper Functions ---
function getConcernTypeText(type: string | undefined): string { if (!type) return 'Unknown'; return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()); }
function getConcernLevelText(level: number | undefined): string { if (level === undefined) return 'N/A'; if (level >= 5) return 'Critical'; if (level >= 4) return 'High'; if (level >= 3) return 'Significant'; if (level >= 2) return 'Moderate'; if (level >= 1) return 'Minor'; return 'Low'; }
// -----------------------

export default function ConcernDetailPage() {
    const [concern, setConcern] = useState<FlagDetailsResponse | null>(null); // Use the more specific type for fetched data
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
        if (!flagId) { setError("Flag ID missing from page parameters."); setLoading(false); return; }
        setLoading(true); setError(null); setActionError(null);
        try {
            console.log(`Fetching details for flag: ${flagId}`);
            // --- FIX: Fetch using query parameter to the collection route ---
            const response = await fetch(`/api/teacher/concerns?flagId=${flagId}`);
            // -------------------------------------------------------------
            if (!response.ok) {
                const data = await response.json().catch(() => ({ error: `HTTP error ${response.status}` }));
                throw new Error(data.error || `Failed to fetch concern details (status: ${response.status})`);
            }
            const data: FlagDetailsResponse = await response.json(); // Use the correct response type
            console.log("Fetched Concern Data:", data);
            setConcern(data);
            setSelectedStatus(data.status || 'pending');
            setNotes(data.notes || '');
        } catch (err) {
            console.error("Error fetching concern:", err);
            setError(err instanceof Error ? err.message : 'Failed to load concern details');
            setConcern(null);
        } finally { setLoading(false); }
    }, [flagId]); // Keep flagId as dependency

    useEffect(() => { fetchConcernDetails(); }, [fetchConcernDetails]);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (concern && flaggedMessageRef.current) {
                console.log("Scrolling to flagged message ref");
                flaggedMessageRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 100);
        return () => clearTimeout(timer);
    }, [concern]);

    const handleStatusUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!concern?.flag_id) return; // Ensure we have the concern and its ID

        setIsSubmitting(true); setActionError(null);
        try {
            console.log(`Updating flag ${concern.flag_id} with status ${selectedStatus}`);
            // --- FIX: Send PATCH to collection route, include flagId in body ---
            const response = await fetch(`/api/teacher/concerns`, { // Target the collection route
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    flagId: concern.flag_id, // Include flagId in the body
                    status: selectedStatus,
                    notes: notes
                 }),
            });
            // --- END FIX ---
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Update failed' }));
                throw new Error(errorData.error || 'Failed to update status');
            }

            const updatedData = await response.json();
            // Update state based on the response from the PATCH request
            setConcern(prev => prev ? ({ ...prev, ...updatedData }) : null);
            setSelectedStatus(updatedData.status);
            setNotes(updatedData.notes || '');
            alert("Status updated successfully!");

        } catch (err) {
            setActionError(err instanceof Error ? err.message : 'Failed to update status');
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- Render Logic ---
    if (loading) { return <PageWrapper><Container><Card><LoadingSpinner /> Loading concern details...</Card></Container></PageWrapper>; }
    if (error) { return <PageWrapper><Container><Alert variant="error">{error}</Alert><Button variant="outline" onClick={() => router.back()} style={{ marginTop: '16px' }}>← Back</Button></Container></PageWrapper>; }
    if (!concern) { return <PageWrapper><Container><Card>Concern not found or permission denied.</Card><Button variant="outline" onClick={() => router.back()} style={{ marginTop: '16px' }}>← Back</Button></Container></PageWrapper>; }

    // Find the actual flagged message within the surrounding messages (if fetched) or use the direct message object
    const actualFlaggedMessage = concern.surroundingMessages?.find(m => m.message_id === concern.message_id) || concern.message;

    return (
        <PageWrapper>
            <Container>
                <Header>
                    <Title>Review Concern</Title>
                    <BackButton variant="outline" onClick={() => router.push('/teacher-dashboard#concerns')}>← Back to Dashboard</BackButton>
                </Header>
                <Grid>
                    {/* Conversation Context */}
                    <ConversationContext>
                        <ContextHeader>Conversation Context</ContextHeader>
                        <MessagesList>
                            {concern.surroundingMessages?.length > 0 ? (
                                concern.surroundingMessages.map(msg => {
                                    const isFlagged = msg.message_id === concern.message_id;
                                    const chatbotName = concern.room_name || "Chatbot"; // Placeholder name

                                    const messageComponent = ( <ChatMessageComponent key={msg.message_id} message={msg} chatbotName={chatbotName} /> );
                                    return isFlagged ? ( <FlaggedMessageHighlight key={msg.message_id} ref={flaggedMessageRef}>{messageComponent}</FlaggedMessageHighlight> ) : messageComponent;
                                })
                            ) : ( actualFlaggedMessage ? ( <FlaggedMessageHighlight ref={flaggedMessageRef}><ChatMessageComponent key={actualFlaggedMessage.message_id} message={actualFlaggedMessage} chatbotName={concern.room_name || "Chatbot"} /></FlaggedMessageHighlight> )
                                : <p style={{ textAlign: 'center', padding: '20px', color: '#888' }}>Conversation context unavailable.</p>
                            )}
                        </MessagesList>
                    </ConversationContext>

                    {/* Details & Actions */}
                    <ConcernDetailsCard>
                        <DetailsHeader>Concern Details</DetailsHeader>
                        {/* Use flattened properties from FlagDetailsResponse */}
                        <DetailItem><strong>Student:</strong><span>{concern.student_name || 'N/A'} ({concern.student_email || 'No Email'})</span></DetailItem>
                        <DetailItem><strong>Classroom:</strong><span>{concern.room_name || 'N/A'}</span></DetailItem>
                        <DetailItem><strong>Concern Type:</strong><span>{getConcernTypeText(concern.concern_type)}</span></DetailItem>
                        <DetailItem><strong>Assessed Level:</strong><Badge variant="default" style={{ marginLeft: '8px' }}>{getConcernLevelText(concern.concern_level)} (Level {concern.concern_level})</Badge></DetailItem>
                        <DetailItem><strong>Detected At:</strong><span>{new Date(concern.created_at).toLocaleString()}</span></DetailItem>
                        {concern.analysis_explanation && (<DetailItem><strong>AI Analysis:</strong><AnalysisText>{concern.analysis_explanation}</AnalysisText></DetailItem>)}
                        {concern.reviewed_at && (<DetailItem><strong>Last Reviewed:</strong><span>{new Date(concern.reviewed_at).toLocaleString()}</span></DetailItem>)}

                        <ActionForm onSubmit={handleStatusUpdate}>
                             <Label htmlFor="status">Update Status:</Label>
                            <CustomSelect id="status" value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value as ConcernStatus)}>
                               <option value="pending">Pending Review</option>
                               <option value="reviewing">Reviewing</option>
                               <option value="resolved">Resolved</option>
                               <option value="false_positive">False Positive</option>
                            </CustomSelect>
                             <Label htmlFor="notes">Review Notes:</Label>
                             <StyledTextArea id="notes" rows={5} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add notes on actions taken, observations, or decision rationale..." />
                             {actionError && <Alert variant="error" style={{ marginBottom: '16px' }}>{actionError}</Alert>}
                             <FormActions><Button type="submit" disabled={isSubmitting} style={{ width: '100%' }}>{isSubmitting ? 'Updating...' : 'Update Status & Notes'}</Button></FormActions>
                        </ActionForm>
                    </ConcernDetailsCard>
                </Grid>
            </Container>
        </PageWrapper>
    );
}