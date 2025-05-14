// src/components/teacher/DocumentList.tsx
'use client';

import { useState } from 'react';
import styled from 'styled-components';
import { Card, Button, Badge, Alert } from '@/styles/StyledComponents';
import type { Document as KnowledgeDocument, DocumentStatus, DocumentType } from '@/types/knowledge-base.types'; // MODIFIED: Added DocumentType

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
  documents,
  onProcessDocument,
  onDeleteDocument,
  onViewStatus
}: DocumentListProps) {
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

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
          {documents.map((doc) => (
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
        {documents.map((doc) => (
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