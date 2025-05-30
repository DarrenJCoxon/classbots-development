// src/components/teacher/DocumentList.tsx
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import styled from 'styled-components';
import { Card } from '@/styles/StyledComponents';
import { GlassCard } from '@/components/shared/GlassCard';
import { ModernButton } from '@/components/shared/ModernButton';
import type { Document as KnowledgeDocument, DocumentStatus, DocumentType } from '@/types/knowledge-base.types'; // MODIFIED: Added DocumentType
import { createClient } from '@/lib/supabase/client';

const ModernBadge = styled.span<{ $variant?: 'success' | 'warning' | 'error' | 'default' }>`
  display: inline-flex;
  align-items: center;
  padding: ${({ theme }) => theme.spacing.xs} ${({ theme }) => theme.spacing.sm};
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  line-height: 1;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  backdrop-filter: blur(10px);
  transition: all 0.2s ease;

  ${({ $variant, theme }) => {
    switch ($variant) {
      case 'success':
        return `
          background: rgba(34, 197, 94, 0.1);
          color: ${theme.colors.green};
          border: 1px solid rgba(34, 197, 94, 0.2);
        `;
      case 'warning':
        return `
          background: rgba(251, 191, 36, 0.1);
          color: ${theme.colors.secondary};
          border: 1px solid rgba(251, 191, 36, 0.2);
        `;
      case 'error':
        return `
          background: rgba(239, 68, 68, 0.1);
          color: ${theme.colors.red};
          border: 1px solid rgba(239, 68, 68, 0.2);
        `;
      default:
        return `
          background: rgba(152, 93, 215, 0.1);
          color: ${theme.colors.primary};
          border: 1px solid rgba(152, 93, 215, 0.2);
        `;
    }
  }}
`;

const ListContainer = styled.div`
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  padding: 32px;
  border: 1px solid rgba(152, 93, 215, 0.1);
  box-shadow: 0 8px 32px rgba(152, 93, 215, 0.05);
  margin-top: ${({ theme }) => theme.spacing.lg};
  margin-bottom: ${({ theme }) => theme.spacing.xl};
  overflow-x: auto;
`;

const Table = styled.table`
  width: 100%;
  min-width: 700px; 
  border-collapse: separate;
  border-spacing: 0;
  
  thead {
    background: rgba(152, 93, 215, 0.03);
  }
  
  th, td {
    text-align: left;
    padding: ${({ theme }) => theme.spacing.md};
    border-bottom: 1px solid rgba(152, 93, 215, 0.08);
    vertical-align: middle; 
  }

  th {
    color: ${({ theme }) => theme.colors.primary};
    font-size: 0.875rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    white-space: nowrap;
    font-family: ${({ theme }) => theme.fonts.heading};
  }

  tbody tr {
    transition: all 0.2s ease;
    
    &:hover {
      background: rgba(152, 93, 215, 0.02);
      
      td {
        color: ${({ theme }) => theme.colors.text};
      }
    }
  }

  td {
    color: ${({ theme }) => theme.colors.textMuted};
    font-size: 0.875rem;
    font-family: ${({ theme }) => theme.fonts.body};
  }

  .actions-cell {
    width: 1%; 
    white-space: nowrap;
  }
  
  .filename-cell {
    max-width: 250px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-weight: 500;
    color: ${({ theme }) => theme.colors.text};
    
    a {
      color: ${({ theme }) => theme.colors.primary};
      text-decoration: none;
      transition: color 0.2s ease;
      
      &:hover {
        color: ${({ theme }) => theme.colors.magenta};
      }
    }
  }
`;

const MobileList = styled.div`
  display: none; 
  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    /* display: block; */
  }
`;

const MobileCard = styled.div`
  padding: ${({ theme }) => theme.spacing.lg};
  border-bottom: 1px solid rgba(152, 93, 215, 0.08);
  transition: background 0.2s ease;
  
  &:hover {
    background: rgba(152, 93, 215, 0.02);
  }
  
  &:last-child {
    border-bottom: none;
  }
`;

const MobileHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spacing.sm};
`;

const FileNameMobile = styled.div`
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
  word-break: break-all;
  font-family: ${({ theme }) => theme.fonts.heading};
  
  a {
    color: ${({ theme }) => theme.colors.primary};
    text-decoration: none;
    transition: color 0.2s ease;
    
    &:hover {
      color: ${({ theme }) => theme.colors.magenta};
    }
  }
`;

const MobileDetails = styled.div`
  display: grid;
  grid-template-columns: auto 1fr;
  gap: ${({ theme }) => theme.spacing.xs} ${({ theme }) => theme.spacing.md};
  margin-bottom: ${({ theme }) => theme.spacing.md};
  font-size: 0.875rem;
  font-family: ${({ theme }) => theme.fonts.body};
  
  .label {
    color: ${({ theme }) => theme.colors.primary};
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-size: 0.75rem;
  }
  
  .value {
    color: ${({ theme }) => theme.colors.text};
    word-break: break-all;
  }
`;

const MobileActions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.sm};
  margin-top: ${({ theme }) => theme.spacing.sm};
  flex-wrap: wrap;
  button {
    flex-grow: 1;
    min-width: 100px;
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing.xl};
  color: ${({ theme }) => theme.colors.textMuted};
  font-family: ${({ theme }) => theme.fonts.body};
  
  p {
    margin-bottom: ${({ theme }) => theme.spacing.md};
  }
`;

const ModernAlert = styled.div<{ $variant?: 'success' | 'error' }>`
  padding: ${({ theme }) => theme.spacing.md};
  border-radius: 12px;
  margin-bottom: ${({ theme }) => theme.spacing.md};
  backdrop-filter: blur(10px);
  font-family: ${({ theme }) => theme.fonts.body};
  animation: fadeIn 0.3s ease-in-out;
  
  ${({ $variant, theme }) => {
    switch ($variant) {
      case 'success':
        return `
          background: rgba(34, 197, 94, 0.1);
          color: ${theme.colors.green};
          border: 1px solid rgba(34, 197, 94, 0.2);
        `;
      case 'error':
        return `
          background: rgba(239, 68, 68, 0.1);
          color: ${theme.colors.red};
          border: 1px solid rgba(239, 68, 68, 0.2);
        `;
      default:
        return `
          background: rgba(152, 93, 215, 0.1);
          color: ${theme.colors.primary};
          border: 1px solid rgba(152, 93, 215, 0.2);
        `;
    }
  }}
  
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

const FilterBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${({ theme }) => theme.spacing.lg};
  padding: ${({ theme }) => theme.spacing.md};
  background: rgba(152, 93, 215, 0.03);
  border-radius: 12px;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.sm};
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    flex-direction: column;
    align-items: flex-start;
  }
`;

const FilterGroup = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.sm};
  flex-wrap: wrap;
`;

const FilterButton = styled.button<{ $active: boolean }>`
  background: ${({ theme, $active }) => 
    $active 
      ? `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.magenta})`
      : 'rgba(255, 255, 255, 0.8)'};
  color: ${({ theme, $active }) => 
    $active ? '#fff' : theme.colors.text};
  border: 1px solid ${({ theme, $active }) => 
    $active ? 'transparent' : 'rgba(152, 93, 215, 0.2)'};
  border-radius: 8px;
  padding: ${({ theme }) => `${theme.spacing.xs} ${theme.spacing.md}`};
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 600;
  font-family: ${({ theme }) => theme.fonts.body};
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
  
  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px ${({ theme, $active }) => 
      $active ? 'rgba(152, 93, 215, 0.3)' : 'rgba(152, 93, 215, 0.1)'};
    background: ${({ theme, $active }) => 
      !$active && 'rgba(152, 93, 215, 0.1)'};
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

const SearchInput = styled.input`
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  border: 1px solid rgba(152, 93, 215, 0.2);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
  color: ${({ theme }) => theme.colors.text};
  min-width: 200px;
  font-family: ${({ theme }) => theme.fonts.body};
  transition: all 0.2s ease;
  
  &::placeholder {
    color: ${({ theme }) => theme.colors.textMuted};
  }
  
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 0 0 2px rgba(152, 93, 215, 0.1);
  }
`;


// MODIFIED: getStatusBadgeVariant to include 'fetched' status
const getStatusBadgeVariant = (status: DocumentStatus): 'success' | 'warning' | 'error' | 'default' => {
    switch (status) {
      case 'completed': return 'success';
      case 'processing': return 'default';
      case 'error': return 'error';
      case 'uploaded': return 'warning';
      case 'fetched': return 'warning'; // 'fetched' can also be warning or default
      default: return 'default';
    }
};


interface DocumentListProps {
  documents: KnowledgeDocument[];
  onProcessDocument: (documentId: string) => Promise<void>;
  onDeleteDocument: (documentId: string) => Promise<void>;
  onViewStatus: (documentId: string) => void;
}

export default function DocumentList({
  documents: initialDocuments,
  onProcessDocument,
  onDeleteDocument,
  onViewStatus
}: DocumentListProps) {
  const [documents, setDocuments] = useState<KnowledgeDocument[]>(initialDocuments);
  const [filteredDocuments, setFilteredDocuments] = useState<KnowledgeDocument[]>(initialDocuments);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [subscriptionMessage, setSubscriptionMessage] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<DocumentStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<DocumentType | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // Initialize state with ref to avoid useEffect race conditions
  const isInitialMount = useRef(true);
  
  // Get document counts for filter badges
  const getFilterCounts = () => {
    const statusCounts: Record<DocumentStatus | 'all', number> = {
      'all': documents.length,
      'uploaded': documents.filter(d => d.status === 'uploaded').length,
      'fetched': documents.filter(d => d.status === 'fetched').length,
      'processing': documents.filter(d => d.status === 'processing').length,
      'completed': documents.filter(d => d.status === 'completed').length,
      'error': documents.filter(d => d.status === 'error').length
    };
    
    const typeCounts: Record<DocumentType | 'all', number> = {
      'all': documents.length,
      'pdf': documents.filter(d => d.file_type === 'pdf').length,
      'docx': documents.filter(d => d.file_type === 'docx').length,
      'txt': documents.filter(d => d.file_type === 'txt').length,
      'webpage': documents.filter(d => d.file_type === 'webpage').length
    };
    
    return { statusCounts, typeCounts };
  };
  
  const counts = getFilterCounts();
  
  // Use callback to update document based on realtime events
  const updateDocumentStatus = useCallback((updatedDocument: KnowledgeDocument) => {
    setDocuments(prevDocs => 
      prevDocs.map(doc => 
        doc.document_id === updatedDocument.document_id 
          ? { ...doc, ...updatedDocument } 
          : doc
      )
    );
    
    // Show a notification message for completed documents
    if (updatedDocument.status === 'completed') {
      setSubscriptionMessage(`Document "${updatedDocument.file_name}" processing completed!`);
      // Clear message after 5 seconds
      setTimeout(() => setSubscriptionMessage(null), 5000);
    } else if (updatedDocument.status === 'error') {
      setSubscriptionMessage(`Error processing document "${updatedDocument.file_name}". Check status for details.`);
      // Clear message after 8 seconds for errors (give more time to read)
      setTimeout(() => setSubscriptionMessage(null), 8000);
    }
  }, []);
  
  // Set up Supabase real-time subscription
  useEffect(() => {
    const supabase = createClient();
    
    // Get all document IDs to filter the subscription
    const documentIds = documents.map(doc => doc.document_id);
    if (documentIds.length === 0) return;
    
    console.log(`[DocumentList] Setting up subscription for ${documentIds.length} documents`);
    
    // Create a unique channel name to avoid conflicts
    const channelName = `document-status-changes-${Date.now()}`;
    
    // Subscribe to changes in documents table
    // Note: Supabase realtime doesn't support IN filters, so we'll filter client-side
    const subscription = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'documents'
        },
        (payload) => {
          const updatedDocument = payload.new as KnowledgeDocument;
          
          // Client-side filter: only process if document is in our list
          if (documentIds.includes(updatedDocument.document_id)) {
            console.log('[DocumentList] Received real-time UPDATE for document:', updatedDocument.document_id);
            
            // Immediately update the document in the local state
            setDocuments(prevDocs => 
              prevDocs.map(doc => 
                doc.document_id === updatedDocument.document_id 
                  ? { ...doc, ...updatedDocument } 
                  : doc
              )
            );
            
            // Also call the updateDocumentStatus callback which handles notifications
            updateDocumentStatus(updatedDocument);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'documents'
        },
        (payload) => {
          const newDocument = payload.new as KnowledgeDocument;
          
          // Check if this document belongs to the current chatbot
          // We need to match on chatbot_id since we don't have the document ID yet
          if (documents.length > 0 && documents[0].chatbot_id === newDocument.chatbot_id) {
            console.log('[DocumentList] Received real-time INSERT for new document:', newDocument.document_id);
            
            // Add the new document to the state
            setDocuments(prevDocs => [...prevDocs, newDocument]);
            
            // Show notification for new document
            setSubscriptionMessage(`New document "${newDocument.file_name}" added!`);
            setTimeout(() => setSubscriptionMessage(null), 5000);
          }
        }
      )
      .subscribe((status) => {
        console.log(`[DocumentList] Subscription status: ${status}`);
      });
      
    // Clean up subscription on unmount
    return () => {
      console.log('[DocumentList] Cleaning up subscription');
      subscription.unsubscribe();
    };
  }, [initialDocuments, updateDocumentStatus]);
  
  // Update local state when prop documents change
  useEffect(() => {
    setDocuments(initialDocuments);
    // Apply current filters to new documents
    applyFilters(initialDocuments);
    
    // Mark initial mount as complete
    isInitialMount.current = false;
  }, [initialDocuments]);
  
  // Filter documents based on current filter settings
  const applyFilters = useCallback((docs: KnowledgeDocument[]) => {
    let result = [...docs];
    
    // Apply status filter
    if (statusFilter !== 'all') {
      result = result.filter(doc => doc.status === statusFilter);
    }
    
    // Apply type filter
    if (typeFilter !== 'all') {
      result = result.filter(doc => doc.file_type === typeFilter);
    }
    
    // Apply search term filter
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      result = result.filter(doc => 
        doc.file_name.toLowerCase().includes(term) || 
        (doc.file_type === 'webpage' && doc.file_path.toLowerCase().includes(term))
      );
    }
    
    // Use functional update to ensure we're working with the latest state
    setFilteredDocuments(result);
  }, [statusFilter, typeFilter, searchTerm]);
  
  // Update filtered documents when filters change or documents update
  useEffect(() => {
    // If this is the initial mount, skip as we already set this in the initialDocuments effect
    if (isInitialMount.current) return;
    
    // Apply filters to the current document state
    applyFilters(documents);
  }, [documents, statusFilter, typeFilter, searchTerm, applyFilters]);

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  // MODIFIED: formatFileSize to handle webpage type (size is text length)
  const formatFileSize = (bytes: number, fileType: DocumentType): string => {
    if (fileType === 'webpage') {
        // For webpages, 'bytes' is actually character count of extracted text
        if (bytes === 0) return 'No text extracted';
        return `${bytes.toLocaleString()} chars`;
    }
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + ['Bytes', 'KB', 'MB', 'GB', 'TB'][i];
  };

  // MODIFIED: getStatusLabel to include 'fetched'
  const getStatusLabel = (status: DocumentStatus): string => {
    const labels: Record<DocumentStatus, string> = {
      uploaded: 'Pending Processing',
      processing: 'Processing',
      completed: 'In Knowledge Base',
      error: 'Error',
      fetched: 'Pending Processing', // New label
    };
    return labels[status] || status;
  };

  const handleProcess = async (documentId: string) => {
    setProcessingId(documentId);
    setActionError(null);
    try {
      await onProcessDocument(documentId);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to start processing.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleDelete = async (documentId: string, documentName: string) => {
    if (!window.confirm(`Are you sure you want to delete the document "${documentName}"? This action cannot be undone.`)) {
        return;
    }
    setDeletingId(documentId);
    setActionError(null);
    try {
      await onDeleteDocument(documentId);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to delete document.");
    } finally {
      setDeletingId(null);
    }
  };

  if (documents.length === 0) {
    return (
      <ListContainer>
        <EmptyState>
          <p>No documents have been added to this chatbot&apos;s knowledge base yet.</p>
        </EmptyState>
      </ListContainer>
    );
  }
  
  // Check if filtered documents is empty
  if (filteredDocuments.length === 0 && (statusFilter !== 'all' || typeFilter !== 'all' || searchTerm !== '')) {
    return (
      <ListContainer>
        {actionError && <ModernAlert $variant="error">{actionError}</ModernAlert>}
        {subscriptionMessage && <ModernAlert $variant="success">{subscriptionMessage}</ModernAlert>}
        
        <FilterBar>
          <FilterGroup>
            <FilterButton 
              $active={statusFilter === 'all'}
              onClick={() => setStatusFilter('all')}
            >
              All ({counts.statusCounts.all})
            </FilterButton>
            
            {counts.statusCounts.completed > 0 && (
              <FilterButton 
                $active={statusFilter === 'completed'}
                onClick={() => setStatusFilter('completed')}
              >
                In Knowledge Base ({counts.statusCounts.completed})
              </FilterButton>
            )}
            
            {counts.statusCounts.processing > 0 && (
              <FilterButton 
                $active={statusFilter === 'processing'}
                onClick={() => setStatusFilter('processing')}
              >
                Processing ({counts.statusCounts.processing})
              </FilterButton>
            )}
            
            {(counts.statusCounts.uploaded > 0 || counts.statusCounts.fetched > 0) && (
              <FilterButton 
                $active={statusFilter === 'uploaded' || statusFilter === 'fetched'}
                onClick={() => setStatusFilter(counts.statusCounts.uploaded > 0 ? 'uploaded' : 'fetched')}
              >
                Pending ({counts.statusCounts.uploaded + counts.statusCounts.fetched})
              </FilterButton>
            )}
            
            {counts.statusCounts.error > 0 && (
              <FilterButton 
                $active={statusFilter === 'error'}
                onClick={() => setStatusFilter('error')}
              >
                Failed ({counts.statusCounts.error})
              </FilterButton>
            )}
          </FilterGroup>
          
          <SearchInput
            type="text"
            placeholder="Search documents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </FilterBar>
        
        <EmptyState>
          <p>No documents match your current filters.</p>
          <ModernButton size="small" variant="ghost" onClick={() => {
            setStatusFilter('all');
            setTypeFilter('all');
            setSearchTerm('');
          }}>Clear filters</ModernButton>
        </EmptyState>
      </ListContainer>
    );
  }

  const renderActions = (doc: KnowledgeDocument) => (
    <>
      {/* Documents now auto-process on upload - show pending status */}
      {(doc.status === 'uploaded' || doc.status === 'fetched') && (
        <ModernButton           size="small"
          variant="ghost"
          disabled
          title="Document will be processed automatically"
        >
          Auto-processing...
        </ModernButton>
      )}
      {(doc.status === 'processing' || doc.status === 'completed' || doc.status === 'error') && (
        <ModernButton           size="small"
          variant="ghost"
          onClick={() => onViewStatus(doc.document_id)}
          title="View detailed processing status"
        >
          View Status
        </ModernButton>
      )}
      <ModernButton         size="small"
        variant="danger" 
        onClick={() => handleDelete(doc.document_id, doc.file_name)}
        disabled={deletingId === doc.document_id}
        title="Delete this document/webpage"
      >
        {deletingId === doc.document_id ? 'Deleting...' : 'Delete'}
      </ModernButton>
    </>
  );


  return (
    <ListContainer>
      {actionError && <ModernAlert $variant="error">{actionError}</ModernAlert>}
      {subscriptionMessage && <ModernAlert $variant="success">{subscriptionMessage}</ModernAlert>}
      
      {documents.length > 0 && (
        <FilterBar>
          <FilterGroup>
            <FilterButton 
              $active={statusFilter === 'all'}
              onClick={() => setStatusFilter('all')}
            >
              All ({counts.statusCounts.all})
            </FilterButton>
            
            {counts.statusCounts.completed > 0 && (
              <FilterButton 
                $active={statusFilter === 'completed'}
                onClick={() => setStatusFilter('completed')}
              >
                In Knowledge Base ({counts.statusCounts.completed})
              </FilterButton>
            )}
            
            {counts.statusCounts.processing > 0 && (
              <FilterButton 
                $active={statusFilter === 'processing'}
                onClick={() => setStatusFilter('processing')}
              >
                Processing ({counts.statusCounts.processing})
              </FilterButton>
            )}
            
            {(counts.statusCounts.uploaded > 0 || counts.statusCounts.fetched > 0) && (
              <FilterButton 
                $active={statusFilter === 'uploaded' || statusFilter === 'fetched'}
                onClick={() => setStatusFilter(counts.statusCounts.uploaded > 0 ? 'uploaded' : 'fetched')}
              >
                Pending ({counts.statusCounts.uploaded + counts.statusCounts.fetched})
              </FilterButton>
            )}
            
            {counts.statusCounts.error > 0 && (
              <FilterButton 
                $active={statusFilter === 'error'}
                onClick={() => setStatusFilter('error')}
              >
                Failed ({counts.statusCounts.error})
              </FilterButton>
            )}
          </FilterGroup>
          
          <SearchInput
            type="text"
            placeholder="Search documents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </FilterBar>
      )}
      <Table>
        <thead>
          <tr>
            <th>Name / URL</th> 
            <th>Type</th>
            <th>Size / Content Length</th>
            <th>Status</th>
            <th>Added</th>
            <th className="actions-cell">Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredDocuments.map((doc) => (
            <tr key={doc.document_id}>
              {/* MODIFIED: Display filename for files, and file_path (URL) for webpages */}
              <td className="filename-cell" title={doc.file_type === 'webpage' ? doc.file_path : doc.file_name}>
                {doc.file_type === 'webpage' ? 
                  <a href={doc.file_path} target="_blank" rel="noopener noreferrer" title={`Open: ${doc.file_path}`}>
                    {doc.file_name} {/* file_name for webpage is its title */}
                  </a>
                  : doc.file_name
                }
              </td>
              <td>{doc.file_type.toUpperCase()}</td>
              {/* MODIFIED: Pass file_type to formatFileSize */}
              <td>{formatFileSize(doc.file_size, doc.file_type)}</td>
              <td>
                <ModernBadge $variant={getStatusBadgeVariant(doc.status)}>
                  {getStatusLabel(doc.status)}
                </ModernBadge>
                {doc.status === 'error' && doc.error_message && (
                  <div style={{ 
                    marginTop: '4px', 
                    fontSize: '0.75rem', 
                    color: '#dc2626',
                    maxWidth: '200px',
                    lineHeight: '1.3'
                  }}>
                    {doc.error_message}
                  </div>
                )}
              </td>
              <td>{formatDate(doc.created_at)}</td>
              <td className="actions-cell">
                <div style={{ display: 'flex', gap: '8px' }}>
                  {renderActions(doc)}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

      <MobileList>
        {filteredDocuments.map((doc) => (
          <MobileCard key={`mobile-${doc.document_id}`}> {/* MODIFIED: Added unique key prefix for mobile */}
            <MobileHeader>
              {/* MODIFIED: Mobile display for filename/URL */}
              <FileNameMobile title={doc.file_type === 'webpage' ? doc.file_path : doc.file_name}>
                {doc.file_type === 'webpage' ? 
                  <a href={doc.file_path} target="_blank" rel="noopener noreferrer">
                    {doc.file_name}
                  </a>
                  : doc.file_name
                }
              </FileNameMobile>
              <ModernBadge $variant={getStatusBadgeVariant(doc.status)}>
                {getStatusLabel(doc.status)}
              </ModernBadge>
            </MobileHeader>
            <MobileDetails>
              <span className="label">Type:</span>
              <span className="value">{doc.file_type.toUpperCase()}</span>
              <span className="label">Size:</span>
              {/* MODIFIED: Pass file_type to formatFileSize for mobile */}
              <span className="value">{formatFileSize(doc.file_size, doc.file_type)}</span>
              <span className="label">Added:</span>
              <span className="value">{formatDate(doc.created_at)}</span>
              {doc.error_message && (
                <>
                    <span className="label" style={{color: 'red'}}>Error:</span>
                    <span className="value" style={{color: 'red', whiteSpace: 'normal'}}>{doc.error_message}</span>
                </>
              )}
            </MobileDetails>
            <MobileActions>
                {renderActions(doc)}
            </MobileActions>
          </MobileCard>
        ))}
      </MobileList>
    </ListContainer>
  );
}