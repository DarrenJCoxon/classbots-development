// src/components/teacher/DocumentList.tsx
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import styled from 'styled-components';
import { Card, Button, Badge, Alert } from '@/styles/StyledComponents';
import type { Document as KnowledgeDocument, DocumentStatus, DocumentType } from '@/types/knowledge-base.types'; // MODIFIED: Added DocumentType
import { createClient } from '@/lib/supabase/client';

const ListContainer = styled(Card)`
  margin-top: ${({ theme }) => theme.spacing.lg};
  margin-bottom: ${({ theme }) => theme.spacing.xl};
  overflow-x: auto; 
`;

const Table = styled.table`
  width: 100%;
  min-width: 700px; 
  border-collapse: collapse; 
  
  th, td {
    text-align: left;
    padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
    border-bottom: 1px solid ${({ theme }) => theme.colors.border};
    vertical-align: middle; 
  }

  th {
    color: ${({ theme }) => theme.colors.textLight};
    font-size: 0.8rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    white-space: nowrap; 
  }

  td {
    color: ${({ theme }) => theme.colors.text};
    font-size: 0.875rem;
  }

  .actions-cell {
    width: 1%; 
    white-space: nowrap;
  }
  
  .filename-cell { // MODIFIED: Added for better filename display
    max-width: 250px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

const MobileList = styled.div`
  display: none; 
  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    /* display: block; */
  }
`;

const MobileCard = styled.div`
  padding: ${({ theme }) => theme.spacing.md};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
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
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text};
  word-break: break-all;
`;

const MobileDetails = styled.div`
  display: grid;
  grid-template-columns: auto 1fr;
  gap: ${({ theme }) => theme.spacing.xs} ${({ theme }) => theme.spacing.md};
  margin-bottom: ${({ theme }) => theme.spacing.md};
  font-size: 0.8rem;
  .label {
    color: ${({ theme }) => theme.colors.textMuted};
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
`;

const SuccessNotification = styled(Alert)`
  animation: fadeIn 0.3s ease-in-out;
  
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
  margin-bottom: ${({ theme }) => theme.spacing.md};
  padding: ${({ theme }) => theme.spacing.sm} 0;
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
  background-color: ${({ theme, $active }) => 
    $active ? theme.colors.primary : theme.colors.backgroundDark};
  color: ${({ theme, $active }) => 
    $active ? '#fff' : theme.colors.text};
  border: 1px solid ${({ theme, $active }) => 
    $active ? theme.colors.primary : theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.small};
  padding: ${({ theme }) => `${theme.spacing.xs} ${theme.spacing.sm}`};
  cursor: pointer;
  font-size: 0.875rem;
  transition: all 0.2s ease;
  
  &:hover {
    background-color: ${({ theme, $active }) => 
      $active ? theme.colors.primary : theme.colors.backgroundDark};
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const SearchInput = styled.input`
  padding: ${({ theme }) => theme.spacing.xs} ${({ theme }) => theme.spacing.sm};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.small};
  background-color: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.text};
  min-width: 200px;
  
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
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
    
    // Subscribe to changes in documents table for these document IDs
    const subscription = supabase
      .channel('document-status-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'documents',
          filter: `document_id=in.(${documentIds.join(',')})`,
        },
        (payload) => {
          console.log('[DocumentList] Received real-time update:', payload);
          const updatedDocument = payload.new as KnowledgeDocument;
          
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
      )
      .subscribe();
      
    // Clean up subscription on unmount
    return () => {
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
      uploaded: 'Uploaded',
      processing: 'Processing',
      completed: 'Completed',
      error: 'Error',
      fetched: 'Fetched', // New label
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
        {actionError && <Alert variant="error" style={{ marginBottom: '16px'}}>{actionError}</Alert>}
        {subscriptionMessage && <SuccessNotification variant="success" style={{ marginBottom: '16px'}}>{subscriptionMessage}</SuccessNotification>}
        
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
          <Button size="small" variant="outline" onClick={() => {
            setStatusFilter('all');
            setTypeFilter('all');
            setSearchTerm('');
          }}>Clear filters</Button>
        </EmptyState>
      </ListContainer>
    );
  }

  const renderActions = (doc: KnowledgeDocument) => (
    <>
      {/* MODIFIED: Allow processing for 'fetched' status as well */}
      {(doc.status === 'uploaded' || doc.status === 'fetched') && (
        <Button
          size="small"
          onClick={() => handleProcess(doc.document_id)}
          disabled={processingId === doc.document_id}
          title="Process this document/webpage for RAG"
        >
          {processingId === doc.document_id ? 'Starting...' : 'Process'}
        </Button>
      )}
      {(doc.status === 'processing' || doc.status === 'completed' || doc.status === 'error') && (
        <Button
          size="small"
          variant="outline"
          onClick={() => onViewStatus(doc.document_id)}
          title="View detailed processing status"
        >
          View Status
        </Button>
      )}
      <Button
        size="small"
        variant="danger" 
        onClick={() => handleDelete(doc.document_id, doc.file_name)}
        disabled={deletingId === doc.document_id}
        title="Delete this document/webpage"
      >
        {deletingId === doc.document_id ? 'Deleting...' : 'Delete'}
      </Button>
    </>
  );


  return (
    <ListContainer>
      {actionError && <Alert variant="error" style={{ marginBottom: '16px'}}>{actionError}</Alert>}
      {subscriptionMessage && <SuccessNotification variant="success" style={{ marginBottom: '16px'}}>{subscriptionMessage}</SuccessNotification>}
      
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
                <Badge variant={getStatusBadgeVariant(doc.status)}>
                  {getStatusLabel(doc.status)}
                </Badge>
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
              <Badge variant={getStatusBadgeVariant(doc.status)}>
                {getStatusLabel(doc.status)}
              </Badge>
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