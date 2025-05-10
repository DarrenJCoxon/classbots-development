// src/components/teacher/DocumentList.tsx
'use client';

import { useState } from 'react';
import styled from 'styled-components';
import { Card, Button, Badge, Alert } from '@/styles/StyledComponents';
import type { Document as KnowledgeDocument, DocumentStatus } from '@/types/knowledge-base.types';

const ListContainer = styled(Card)`
  margin-top: ${({ theme }) => theme.spacing.lg};
  margin-bottom: ${({ theme }) => theme.spacing.xl};
  overflow-x: auto; // Ensure table is scrollable horizontally if it overflows
`;

const Table = styled.table`
  width: 100%;
  min-width: 700px; // Ensure table has a minimum width for all columns
  border-collapse: collapse; // Corrected from seperate to collapse
  
  th, td {
    text-align: left;
    padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
    border-bottom: 1px solid ${({ theme }) => theme.colors.border};
    vertical-align: middle; // Changed from top for better alignment with buttons
  }

  th {
    color: ${({ theme }) => theme.colors.textLight};
    font-size: 0.8rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    white-space: nowrap; // Prevent headers from wrapping
  }

  td {
    color: ${({ theme }) => theme.colors.text};
    font-size: 0.875rem;
  }

  .actions-cell {
    width: 1%; // Allow this column to shrink but also expand for multiple buttons
    white-space: nowrap;
  }

  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    /* Forcing table display for now, mobile list can be a future enhancement */
    /* display: none; */ 
  }
`;

// MobileList and related components are kept but not used if Table is always displayed
const MobileList = styled.div`
  display: none; /* Hidden for now, enable if switching views */
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

const FileNameMobile = styled.div` // Renamed to avoid conflict with Table's FileName
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

// StatusBadge is imported from StyledComponents, so it should use its defined props
// The $status prop was correct if Badge in StyledComponents expects it for styling.
// If Badge in StyledComponents uses 'variant', then we adjust.
// Assuming Badge uses 'variant' prop and we map status to variant:
// Removed unused StyledStatusBadge

const getStatusBadgeVariant = (status: DocumentStatus): 'success' | 'warning' | 'error' | 'default' => {
    switch (status) {
      case 'completed': return 'success';
      case 'processing': return 'default'; // Or a 'info' / 'blue' if you have one
      case 'error': return 'error';
      case 'uploaded': return 'warning'; // 'uploaded' might be better as 'warning' or 'default'
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

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + ['Bytes', 'KB', 'MB', 'GB', 'TB'][i];
  };

  const getStatusLabel = (status: DocumentStatus): string => {
    const labels: Record<DocumentStatus, string> = {
      uploaded: 'Uploaded',
      processing: 'Processing',
      completed: 'Completed',
      error: 'Error',
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
          <p>No documents have been uploaded for this chatbot yet.</p>
        </EmptyState>
      </ListContainer>
    );
  }

  const renderActions = (doc: KnowledgeDocument) => (
    <>
      {doc.status === 'uploaded' && (
        <Button
          size="small"
          onClick={() => handleProcess(doc.document_id)}
          disabled={processingId === doc.document_id}
          title="Process this document for RAG"
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
        title="Delete this document"
      >
        {deletingId === doc.document_id ? 'Deleting...' : 'Delete'}
      </Button>
    </>
  );

  // The main issue was likely `className` on `TableHeader` and `TableCell` which are styled components.
  // Styled components pass props directly, or use transient props ($prop) for styling only.
  // For `actions-cell`, it's better to create a specific styled TD or handle width via CSS.

  return (
    <ListContainer>
      {actionError && <Alert variant="error" style={{ marginBottom: '16px'}}>{actionError}</Alert>}
      <Table>
        <thead>
          <tr>
            <th>Name</th> {/* Changed from TableHeader component to direct th */}
            <th>Type</th>
            <th>Size</th>
            <th>Status</th>
            <th>Uploaded</th>
            <th className="actions-cell">Actions</th> {/* Using a className for specific styling */}
          </tr>
        </thead>
        <tbody>
          {documents.map((doc) => (
            <tr key={doc.document_id}>
              <td title={doc.file_name}>{doc.file_name}</td> {/* Changed from TableCell to direct td */}
              <td>{doc.file_type.toUpperCase()}</td>
              <td>{formatFileSize(doc.file_size)}</td>
              <td>
                {/* Using the imported Badge and determining its variant */}
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

      {/* MobileList remains unchanged for now, as the focus is fixing the table errors */}
      <MobileList>
        {documents.map((doc) => (
          <MobileCard key={doc.document_id}>
            <MobileHeader>
              <FileNameMobile title={doc.file_name}>{doc.file_name}</FileNameMobile>
              <Badge variant={getStatusBadgeVariant(doc.status)}>
                {getStatusLabel(doc.status)}
              </Badge>
            </MobileHeader>
            <MobileDetails>
              <span className="label">Type:</span>
              <span className="value">{doc.file_type.toUpperCase()}</span>
              <span className="label">Size:</span>
              <span className="value">{formatFileSize(doc.file_size)}</span>
              <span className="label">Uploaded:</span>
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