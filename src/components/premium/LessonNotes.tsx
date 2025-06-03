'use client';

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiPlus, 
  FiEdit3, 
  FiTrash2, 
  FiClock, 
  FiBookmark, 
  FiEye, 
  FiEyeOff,
  FiSave,
  FiX
} from 'react-icons/fi';
import { ModernButton } from '@/components/shared/ModernButton';
import type { PremiumLessonNote } from '@/types/premium-course.types';

interface LessonNotesProps {
  courseId: string;
  lessonId: string;
  currentVideoTime?: number;
  isTeacher?: boolean;
}

const NotesContainer = styled.div`
  background: white;
  border-radius: 16px;
  border: 1px solid rgba(152, 93, 215, 0.1);
  box-shadow: 0 2px 8px rgba(152, 93, 215, 0.05);
  overflow: hidden;
`;

const NotesHeader = styled.div`
  padding: 20px 24px;
  border-bottom: 1px solid rgba(152, 93, 215, 0.1);
  background: rgba(250, 248, 254, 0.5);
  
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const NotesTitle = styled.h3`
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
`;

const NotesBody = styled.div`
  padding: 24px;
  max-height: 500px;
  overflow-y: auto;
`;

const NewNoteForm = styled(motion.div)`
  background: rgba(250, 248, 254, 0.3);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 20px;
  border: 1px solid rgba(152, 93, 215, 0.1);
`;

const NoteTextArea = styled.textarea`
  width: 100%;
  min-height: 80px;
  padding: 12px;
  border: 1px solid rgba(152, 93, 215, 0.2);
  border-radius: 8px;
  font-size: 14px;
  font-family: inherit;
  resize: vertical;
  transition: all 0.2s ease;
  
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 0 0 3px rgba(152, 93, 215, 0.1);
  }
  
  &::placeholder {
    color: ${({ theme }) => theme.colors.textLight};
  }
`;

const NoteOptions = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
  margin-top: 12px;
  flex-wrap: wrap;
`;

const NoteTypeSelector = styled.select`
  padding: 6px 12px;
  border: 1px solid rgba(152, 93, 215, 0.2);
  border-radius: 6px;
  font-size: 12px;
  background: white;
  color: ${({ theme }) => theme.colors.text};
  
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

const TimestampButton = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: 1px solid rgba(152, 93, 215, 0.2);
  border-radius: 6px;
  font-size: 12px;
  background: ${({ $active, theme }) => 
    $active ? theme.colors.primary : 'white'
  };
  color: ${({ $active, theme }) => 
    $active ? 'white' : theme.colors.text
  };
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${({ $active, theme }) => 
      $active ? theme.colors.primary : 'rgba(152, 93, 215, 0.1)'
    };
  }
  
  svg {
    width: 12px;
    height: 12px;
  }
`;

const NotesList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const NoteItem = styled(motion.div)<{ $pinned?: boolean }>`
  background: ${({ $pinned }) => 
    $pinned ? 'rgba(255, 193, 7, 0.1)' : 'rgba(250, 248, 254, 0.5)'
  };
  border: 1px solid ${({ $pinned, theme }) => 
    $pinned ? 'rgba(255, 193, 7, 0.3)' : 'rgba(152, 93, 215, 0.1)'
  };
  border-radius: 12px;
  padding: 16px;
  position: relative;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${({ $pinned }) => 
      $pinned ? 'rgba(255, 193, 7, 0.15)' : 'rgba(152, 93, 215, 0.05)'
    };
  }
`;

const NoteHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
`;

const NoteMetadata = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.textLight};
`;

const NoteType = styled.span<{ $type: string }>`
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  background: ${({ $type, theme }) => {
    switch ($type) {
      case 'timestamp': return theme.colors.primary + '20';
      case 'question': return theme.colors.warning + '20';
      case 'highlight': return theme.colors.success + '20';
      default: return theme.colors.textLight + '20';
    }
  }};
  color: ${({ $type, theme }) => {
    switch ($type) {
      case 'timestamp': return theme.colors.primary;
      case 'question': return theme.colors.warning;
      case 'highlight': return theme.colors.success;
      default: return theme.colors.textLight;
    }
  }};
`;

const NoteActions = styled.div`
  display: flex;
  gap: 4px;
  align-items: center;
  opacity: 0;
  transition: opacity 0.2s ease;
  
  ${NoteItem}:hover & {
    opacity: 1;
  }
`;

const ActionButton = styled.button`
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  border-radius: 4px;
  color: ${({ theme }) => theme.colors.textLight};
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(152, 93, 215, 0.1);
    color: ${({ theme }) => theme.colors.primary};
  }
  
  svg {
    width: 14px;
    height: 14px;
  }
`;

const NoteContent = styled.div`
  font-size: 14px;
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.text};
  white-space: pre-wrap;
`;

const Timestamp = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 6px;
  background: rgba(139, 92, 246, 0.1);
  color: ${({ theme }) => theme.colors.primary};
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  margin-bottom: 8px;
  cursor: pointer;
  
  &:hover {
    background: rgba(139, 92, 246, 0.2);
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 40px 20px;
  color: ${({ theme }) => theme.colors.textLight};
  
  h4 {
    margin: 0 0 8px 0;
    font-size: 16px;
    font-weight: 500;
  }
  
  p {
    margin: 0;
    font-size: 14px;
  }
`;

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const LessonNotes: React.FC<LessonNotesProps> = ({
  courseId,
  lessonId,
  currentVideoTime = 0,
  isTeacher = false
}) => {
  const [notes, setNotes] = useState<PremiumLessonNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewNote, setShowNewNote] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [newNoteType, setNewNoteType] = useState<'general' | 'timestamp' | 'question' | 'highlight'>('general');
  const [includeTimestamp, setIncludeTimestamp] = useState(false);
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchNotes();
  }, [courseId, lessonId]);

  const fetchNotes = async () => {
    try {
      const response = await fetch(`/api/premium/courses/${courseId}/lessons/${lessonId}/notes`);
      const data = await response.json();
      
      if (data.success) {
        setNotes(data.notes || []);
      }
    } catch (error) {
      console.error('Error fetching notes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNote = async () => {
    if (!newNoteContent.trim()) return;
    
    setSaving(true);
    try {
      const noteData = {
        content: newNoteContent.trim(),
        note_type: newNoteType,
        ...(includeTimestamp && currentVideoTime > 0 && {
          video_timestamp: currentVideoTime
        })
      };

      const response = await fetch(`/api/premium/courses/${courseId}/lessons/${lessonId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(noteData)
      });

      const data = await response.json();
      
      if (data.success) {
        setNotes(prev => [data.note, ...prev]);
        setNewNoteContent('');
        setShowNewNote(false);
        setIncludeTimestamp(false);
        setNewNoteType('general');
      }
    } catch (error) {
      console.error('Error creating note:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('Are you sure you want to delete this note?')) return;
    
    try {
      const response = await fetch(`/api/premium/courses/${courseId}/lessons/${lessonId}/notes/${noteId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setNotes(prev => prev.filter(note => note.note_id !== noteId));
      }
    } catch (error) {
      console.error('Error deleting note:', error);
    }
  };

  const handleTogglePin = async (noteId: string, currentPinned: boolean) => {
    try {
      const response = await fetch(`/api/premium/courses/${courseId}/lessons/${lessonId}/notes/${noteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_pinned: !currentPinned })
      });

      const data = await response.json();
      
      if (data.success) {
        setNotes(prev => prev.map(note => 
          note.note_id === noteId 
            ? { ...note, is_pinned: !currentPinned }
            : note
        ));
      }
    } catch (error) {
      console.error('Error updating note:', error);
    }
  };

  const handleJumpToTimestamp = (timestamp: number) => {
    // This would integrate with the video player to jump to the timestamp
    console.log('Jump to timestamp:', timestamp);
    // You can emit an event or call a callback prop here
  };

  if (loading) {
    return (
      <NotesContainer>
        <NotesHeader>
          <NotesTitle>Notes</NotesTitle>
        </NotesHeader>
        <NotesBody>
          <div style={{ textAlign: 'center', padding: '20px' }}>
            Loading notes...
          </div>
        </NotesBody>
      </NotesContainer>
    );
  }

  return (
    <NotesContainer>
      <NotesHeader>
        <NotesTitle>Notes ({notes.length})</NotesTitle>
        {!isTeacher && (
          <ModernButton
            variant="primary"
            size="small"
            onClick={() => setShowNewNote(!showNewNote)}
          >
            <FiPlus /> Add Note
          </ModernButton>
        )}
      </NotesHeader>

      <NotesBody>
        <AnimatePresence>
          {showNewNote && (
            <NewNoteForm
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <NoteTextArea
                value={newNoteContent}
                onChange={(e) => setNewNoteContent(e.target.value)}
                placeholder="Add your note here..."
                rows={3}
              />
              
              <NoteOptions>
                <NoteTypeSelector
                  value={newNoteType}
                  onChange={(e) => setNewNoteType(e.target.value as any)}
                >
                  <option value="general">General Note</option>
                  <option value="timestamp">Video Note</option>
                  <option value="question">Question</option>
                  <option value="highlight">Important</option>
                </NoteTypeSelector>

                {currentVideoTime > 0 && (
                  <TimestampButton
                    $active={includeTimestamp}
                    onClick={() => setIncludeTimestamp(!includeTimestamp)}
                  >
                    <FiClock />
                    {formatTime(currentVideoTime)}
                  </TimestampButton>
                )}

                <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
                  <ModernButton
                    variant="ghost"
                    size="small"
                    onClick={() => {
                      setShowNewNote(false);
                      setNewNoteContent('');
                      setIncludeTimestamp(false);
                    }}
                  >
                    <FiX /> Cancel
                  </ModernButton>
                  <ModernButton
                    variant="primary"
                    size="small"
                    onClick={handleCreateNote}
                    disabled={!newNoteContent.trim() || saving}
                  >
                    <FiSave /> {saving ? 'Saving...' : 'Save'}
                  </ModernButton>
                </div>
              </NoteOptions>
            </NewNoteForm>
          )}
        </AnimatePresence>

        {notes.length === 0 ? (
          <EmptyState>
            <h4>No notes yet</h4>
            <p>
              {isTeacher 
                ? 'Students will see their notes here as they take them during the lesson.'
                : 'Start taking notes to keep track of important points and questions.'
              }
            </p>
          </EmptyState>
        ) : (
          <NotesList>
            {notes
              .sort((a, b) => {
                // Pinned notes first, then by creation date
                if (a.is_pinned && !b.is_pinned) return -1;
                if (!a.is_pinned && b.is_pinned) return 1;
                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
              })
              .map((note) => (
                <NoteItem
                  key={note.note_id}
                  $pinned={note.is_pinned || false}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <NoteHeader>
                    <NoteMetadata>
                      <NoteType $type={note.note_type || 'general'}>{note.note_type || 'general'}</NoteType>
                      <span>{new Date(note.created_at).toLocaleDateString()}</span>
                      {note.is_private && (
                        <span><FiEyeOff size={12} /> Private</span>
                      )}
                    </NoteMetadata>
                    
                    {!isTeacher && (
                      <NoteActions>
                        <ActionButton
                          onClick={() => handleTogglePin(note.note_id, note.is_pinned || false)}
                          title={note.is_pinned ? 'Unpin note' : 'Pin note'}
                        >
                          <FiBookmark />
                        </ActionButton>
                        <ActionButton
                          onClick={() => setEditingNote(note.note_id)}
                          title="Edit note"
                        >
                          <FiEdit3 />
                        </ActionButton>
                        <ActionButton
                          onClick={() => handleDeleteNote(note.note_id)}
                          title="Delete note"
                        >
                          <FiTrash2 />
                        </ActionButton>
                      </NoteActions>
                    )}
                  </NoteHeader>

                  {note.video_timestamp && (
                    <Timestamp onClick={() => handleJumpToTimestamp(note.video_timestamp!)}>
                      <FiClock /> {formatTime(note.video_timestamp)}
                    </Timestamp>
                  )}

                  <NoteContent>{note.note_content}</NoteContent>
                </NoteItem>
              ))}
          </NotesList>
        )}
      </NotesBody>
    </NotesContainer>
  );
};