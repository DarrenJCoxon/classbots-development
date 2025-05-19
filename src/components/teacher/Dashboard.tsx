'use client';

import { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, Button, Alert, Badge } from '@/styles/StyledComponents'; // Added Alert and Badge
import ChatbotForm from '@/components/teacher/ChatbotForm';
import RoomForm from '@/components/teacher/RoomForm';
import RoomList from '@/components/teacher/RoomList';
import EditRoomModal from '@/components/teacher/EditRoomModal';
import ConcernsList from '@/components/teacher/ConcernsList'; // Import ConcernsList
import LoadingSpinner from '@/components/shared/LoadingSpinner'; // Import Loader
import { createClient } from '@/lib/supabase/client';
import type { Chatbot, Room as BaseRoom } from '@/types/database.types'; // Use BaseRoom alias

// --- Styled Components (Keep as previously defined) ---
const DashboardContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: ${({ theme }) => theme.spacing.xl};

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    grid-template-columns: 1fr;
  }
`;

const Section = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.xxl};
`;

const SectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spacing.lg};
  flex-wrap: wrap; /* Allow wrapping */
  gap: ${({ theme }) => theme.spacing.md};

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    button {
      width: 100%;
    }
  }
`;

const SectionTitle = styled.h2`
  color: ${({ theme }) => theme.colors.text};
  font-size: 1.5rem;
  margin: 0; /* Remove default margin */
`;

const StatsCard = styled(Card)`
  text-align: center;
  padding: ${({ theme }) => theme.spacing.lg};
  cursor: pointer; // Make stats cards clickable if they link somewhere
  transition: transform 0.2s ease, box-shadow 0.2s ease;

   &:hover {
      transform: translateY(-2px);
      box-shadow: ${({ theme }) => theme.shadows.md};
   }

  h3 {
    color: ${({ theme }) => theme.colors.textMuted};
    font-size: 0.875rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: ${({ theme }) => theme.spacing.sm};
  }

  .value {
    font-size: 2rem;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.primary};
  }
`;

const ChatbotList = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: ${({ theme }) => theme.spacing.lg};
  margin-top: ${({ theme }) => theme.spacing.lg};

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    grid-template-columns: 1fr;
  }
`;

const ChatbotCard = styled(Card)`
  position: relative;
  display: flex;
  flex-direction: column;
  transition: transform ${({ theme }) => theme.transitions.fast}, box-shadow ${({ theme }) => theme.transitions.fast};

  &:hover {
    transform: translateY(-2px);
    box-shadow: ${({ theme }) => theme.shadows.md};
  }

  h3 {
    color: ${({ theme }) => theme.colors.text};
    margin-bottom: ${({ theme }) => theme.spacing.sm};
    font-size: 1.25rem;
  }

  p.description {
    color: ${({ theme }) => theme.colors.textLight};
    margin-bottom: ${({ theme }) => theme.spacing.md};
    flex-grow: 1;
    min-height: 2.5rem;

    @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
      min-height: auto;
    }
  }

  .actions {
    display: flex;
    gap: ${({ theme }) => theme.spacing.sm};
    margin-top: ${({ theme }) => theme.spacing.md};
    flex-wrap: wrap;
    justify-content: flex-start;

    button, a {
        flex-grow: 1;
        min-width: 100px;
        text-align: center;
    }

     @media (max-width: 550px) {
         button, a {
            width: 100%;
            flex-grow: 0;
         }
     }
  }

  .model-info {
    font-size: 0.875rem;
    color: ${({ theme }) => theme.colors.textMuted};
    background: ${({ theme }) => theme.colors.backgroundDark};
    padding: ${({ theme }) => theme.spacing.xs} ${({ theme }) => theme.spacing.sm};
    border-radius: ${({ theme }) => theme.borderRadius.small};
    margin-bottom: ${({ theme }) => theme.spacing.md};
    display: inline-block;
  }
`;


const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  padding: ${({ theme }) => theme.spacing.md};
`;

const ModalContent = styled(Card)`
  width: 100%;
  max-width: 450px;
  margin: 20px;
  position: relative;
  text-align: center;
`;

const ModalTitle = styled.h3`
  margin-bottom: ${({ theme }) => theme.spacing.md};
  color: ${({ theme }) => theme.colors.text};
`;

const ModalText = styled.p`
  margin-bottom: ${({ theme }) => theme.spacing.lg};
  color: ${({ theme }) => theme.colors.textLight};
`;

const ModalActions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.md};
  justify-content: center;
`;

// --- Define the Room type WITH joined data (Matching API Response) ---
interface RoomWithChatbots extends BaseRoom {
  room_chatbots: {
    chatbots: {
      chatbot_id: string;
      name: string;
    } | null;
  }[] | null;
}
// ---------------------------------------------------------------


interface DeleteModalProps {
  isOpen: boolean;
  itemType: 'Chatbot' | 'Room';
  itemName: string;
  onConfirm: () => Promise<void>; // Make confirm async
  onCancel: () => void;
  isDeleting: boolean;
}

function DeleteModal({ isOpen, itemType, itemName, onConfirm, onCancel, isDeleting }: DeleteModalProps) {
  if (!isOpen) return null;

  return (
    <ModalOverlay>
      <ModalContent>
        <ModalTitle>Delete {itemType}</ModalTitle>
        <ModalText>
          Are you sure you want to delete the {itemType.toLowerCase()} &quot;
          <strong>{itemName}</strong>
          &quot;? This action cannot be undone and may affect associated data (e.g., student memberships, chat history).
        </ModalText>
        <ModalActions>
          <Button variant="outline" onClick={onCancel} disabled={isDeleting}>
            Cancel
          </Button>
          <Button
             variant="secondary" // Use secondary as base, style for danger
             style={{ backgroundColor: '#F87F7F', color: 'white', borderColor: '#F87F7F' }}
             onClick={onConfirm} // Directly call the passed async handler
             disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : `Yes, Delete ${itemType}`}
          </Button>
        </ModalActions>
      </ModalContent>
    </ModalOverlay>
  );
}

export default function Dashboard() {
  const [showChatbotForm, setShowChatbotForm] = useState(false);
  const [showRoomForm, setShowRoomForm] = useState(false);
  const [chatbots, setChatbots] = useState<Chatbot[]>([]);
  // --- FIX: Use the correct type for rooms state ---
  const [rooms, setRooms] = useState<RoomWithChatbots[]>([]);
  // --------------------------------------------------
  const [stats, setStats] = useState({
    totalChatbots: 0,
    totalRooms: 0,
    activeRooms: 0,
    pendingConcerns: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    type: 'Chatbot' | 'Room';
    id: string | null;
    name: string;
  }>({ isOpen: false, type: 'Chatbot', id: null, name: '' });
   const [isDeleting, setIsDeleting] = useState(false);
  const [editingRoom, setEditingRoom] = useState<BaseRoom | null>(null); // Edit modal likely needs BaseRoom
  const supabase = createClient();
  const router = useRouter();

  const fetchDashboardData = useCallback(async () => {
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth');
        return;
      }

      // Fetch all data concurrently
      const [chatbotsRes, roomsRes, concernsRes] = await Promise.all([
        supabase.from('chatbots').select('*').eq('teacher_id', user.id),
        // --- FIX: Fetch rooms using the API route which handles the join ---
        fetch('/api/teacher/rooms').then(res => {
            if (!res.ok) throw new Error('Failed to fetch rooms');
            return res.json();
        }),
        // --------------------------------------------------------------------
        supabase.from('flagged_messages')
          .select('flag_id', { count: 'exact', head: true })
          .eq('teacher_id', user.id)
          .eq('status', 'pending')
      ]);

      // Process Chatbots
      if (chatbotsRes.error) throw new Error(`Failed to fetch chatbots: ${chatbotsRes.error.message}`);
      const chatbotsData = chatbotsRes.data || [];
      setChatbots(chatbotsData);

      // Process Rooms (data is already fetched via API)
      const roomsData: RoomWithChatbots[] = roomsRes || []; // Type assertion based on API response
      setRooms(roomsData);

       // Process Concerns Count
       if (concernsRes.error) throw new Error(`Failed to fetch concerns count: ${concernsRes.error.message}`);
       const pendingConcernsCount = concernsRes.count || 0;

      // Update Stats
      setStats({
        totalChatbots: chatbotsData.length,
        totalRooms: roomsData.length,
        activeRooms: roomsData.filter(room => room.is_active).length,
        pendingConcerns: pendingConcernsCount,
      });

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError(error instanceof Error ? error.message : 'Failed to load dashboard data.');
      // Reset state on error
      setChatbots([]);
      setRooms([]);
      setStats({ totalChatbots: 0, totalRooms: 0, activeRooms: 0, pendingConcerns: 0 });
    } finally {
      setLoading(false);
    }
  }, [supabase, router]); // Dependencies

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleChatbotCreated = () => {
    setShowChatbotForm(false);
    fetchDashboardData();
  };

  const handleRoomCreated = () => {
    setShowRoomForm(false);
    fetchDashboardData();
  };

  // Test Chatbot (unused function removed)

  const handleEditChatbot = (chatbotId: string) => {
    router.push(`/teacher-dashboard/chatbots/${chatbotId}/edit`);
  };

  const openDeleteModal = (type: 'Chatbot' | 'Room', id: string, name: string) => {
    setDeleteModal({ isOpen: true, type, id, name });
  };

  const closeDeleteModal = () => {
    setDeleteModal({ isOpen: false, type: 'Chatbot', id: null, name: '' });
  };

  // --- Combined Delete Handler ---
  const handleDeleteConfirm = async () => {
    if (!deleteModal.id || !deleteModal.type) return;

    setIsDeleting(true);
    setError(null);

    const { type, id } = deleteModal;
    const endpoint = type === 'Chatbot' ? `/api/teacher/chatbots/${id}` : `/api/teacher/rooms/${id}`;

    try {
        const response = await fetch(endpoint, { method: 'DELETE' });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Failed to delete ${type.toLowerCase()}`);
        }

        console.log(`${type} ${id} deleted successfully.`);
        closeDeleteModal();
        fetchDashboardData(); // Refresh dashboard
    } catch (error) {
        console.error(`Error deleting ${type}:`, error);
        setError(error instanceof Error ? error.message : `Failed to delete ${type}.`);
        // Keep modal open on error to show feedback if desired, or close:
        // closeDeleteModal();
    } finally {
        setIsDeleting(false);
    }
};


  const handleEditRoom = (room: BaseRoom) => { // Use BaseRoom for editing modal
    setEditingRoom(room);
  };

  const handleCloseEditRoom = () => {
    setEditingRoom(null);
  };

  const handleRoomEditSuccess = () => {
    setEditingRoom(null);
    fetchDashboardData();
  };

  // Get model display name (no changes)
    const getModelDisplayName = (model: string | undefined) => {
      if (!model) return 'Default Model';
      const modelNames: Record<string, string> = {
        'x-ai/grok-3-mini-beta': 'Grok 3 Mini',
        'qwen/qwen3-235b-a22b': 'Qwen3 235B A22B',
        'google/gemini-2.5-flash-preview': 'Gemini 2.5 Flash'
      };
      return modelNames[model] || model;
    };


  if (loading) {
    return <Card style={{ textAlign: 'center', padding: '40px' }}><LoadingSpinner /> Loading dashboard...</Card>;
  }

  return (
    <div>
        {error && <Alert variant="error" style={{ marginBottom: '16px' }}>{error}</Alert>}

        {/* Quick Stats Section */}
        <Section>
            <DashboardContainer>
            <StatsCard onClick={() => document.getElementById('chatbots-section')?.scrollIntoView({ behavior: 'smooth' })}>
                <h3>Total Chatbots</h3>
                <div className="value">{stats.totalChatbots}</div>
            </StatsCard>
            <StatsCard onClick={() => document.getElementById('rooms-section')?.scrollIntoView({ behavior: 'smooth' })}>
                <h3>Total Rooms</h3>
                <div className="value">{stats.totalRooms}</div>
            </StatsCard>
            <StatsCard onClick={() => document.getElementById('rooms-section')?.scrollIntoView({ behavior: 'smooth' })}>
                <h3>Active Rooms</h3>
                <div className="value">{stats.activeRooms}</div>
            </StatsCard>
            <StatsCard style={{ cursor: 'pointer' }} onClick={() => document.getElementById('concerns-section')?.scrollIntoView({ behavior: 'smooth' })}>
                <h3>Pending Concerns</h3>
                <div className="value" style={{ color: stats.pendingConcerns > 0 ? '#F87F7F' : undefined }}>
                    {stats.pendingConcerns}
                </div>
                 {stats.pendingConcerns > 0 && <Badge variant='error' style={{ marginTop: '8px' }}>Review Needed</Badge>}
            </StatsCard>
            </DashboardContainer>
        </Section>

      {/* Concerns Section */}
      <Section id="concerns-section">
            <SectionHeader>
                 <SectionTitle>Welfare Concerns</SectionTitle>
                 {/* Can add a direct link/button to a dedicated concerns page if needed */}
            </SectionHeader>
            <ConcernsList />
       </Section>


      {/* Chatbots Section */}
      <Section id="chatbots-section">
        <SectionHeader>
          <SectionTitle>Your Chatbots</SectionTitle>
          <Button onClick={() => setShowChatbotForm(true)}>
            + Create Chatbot
          </Button>
        </SectionHeader>

        {showChatbotForm && (
          <ChatbotForm
            onClose={() => setShowChatbotForm(false)}
            onSuccess={handleChatbotCreated}
          />
        )}

        {chatbots.length > 0 ? (
          <ChatbotList>
            {chatbots.map(chatbot => (
              <ChatbotCard key={chatbot.chatbot_id}>
                <h3>{chatbot.name}</h3>
                <p className="description">{chatbot.description || 'No description provided.'}</p>
                <div className="model-info">
                  Model: {getModelDisplayName(chatbot.model)}
                </div>
                <div className="actions">
                  <Button
                    size="small"
                    variant="outline"
                    onClick={() => handleEditChatbot(chatbot.chatbot_id)}
                    title="Edit chatbot configuration"
                  >
                    Configure
                  </Button>
                   <Button
                        as={Link}
                        size="small"
                        variant="outline"
                        href={`/teacher-dashboard/chatbots/${chatbot.chatbot_id}/knowledge-base`}
                        title="Manage knowledge base documents"
                    >
                        Knowledge Base
                    </Button>
                   <Button
                        size="small"
                        variant="secondary"
                         style={{ backgroundColor: '#F87F7F', color: 'white', borderColor: '#F87F7F' }} // Danger style
                        onClick={() => openDeleteModal('Chatbot', chatbot.chatbot_id, chatbot.name)}
                        title="Delete this chatbot"
                    >
                        Delete
                    </Button>
                </div>
              </ChatbotCard>
            ))}
          </ChatbotList>
        ) : (
          <Card>
            <p>No chatbots created yet. Click &quot;+ Create Chatbot&quot; to get started!</p>
          </Card>
        )}
      </Section>

      {/* Rooms Section */}
      <Section id="rooms-section">
        <SectionHeader>
          <SectionTitle>Classroom Rooms</SectionTitle>
          <Button onClick={() => setShowRoomForm(true)} disabled={chatbots.length === 0}>
            + Create Room
          </Button>
           {chatbots.length === 0 && <Alert variant='info'>Create a chatbot before creating a room.</Alert>}
        </SectionHeader>

        {showRoomForm && (
          <RoomForm
            chatbots={chatbots}
            onClose={() => setShowRoomForm(false)}
            onSuccess={handleRoomCreated}
          />
        )}

        <RoomList
          rooms={rooms} // Pass the correctly typed rooms state
          onUpdate={fetchDashboardData}
          onEditRoom={handleEditRoom}
          onDeleteRoom={(room) => openDeleteModal('Room', room.room_id, room.room_name)} // Pass handler for delete button in list
          onArchiveRoom={(room) => router.push(`/teacher-dashboard/rooms/${room.room_id}`)} // Redirect to room page for archiving
        />
      </Section>

      {/* Delete Confirmation Modal */}
      <DeleteModal
        isOpen={deleteModal.isOpen}
        itemType={deleteModal.type}
        itemName={deleteModal.name}
        onConfirm={handleDeleteConfirm} // Use the combined handler
        onCancel={closeDeleteModal}
        isDeleting={isDeleting}
      />

      {/* Edit Room Modal */}
      {editingRoom && (
        <EditRoomModal
          room={editingRoom}
          chatbots={chatbots}
          onClose={handleCloseEditRoom}
          onSuccess={handleRoomEditSuccess}
        />
      )}
    </div>
  );
}