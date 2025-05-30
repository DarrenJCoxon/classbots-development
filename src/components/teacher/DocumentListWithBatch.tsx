// src/components/teacher/DocumentListWithBatch.tsx
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import styled from 'styled-components';
import { Card } from '@/styles/StyledComponents';
import { GlassCard } from '@/components/shared/GlassCard';
import { ModernButton } from '@/components/shared/ModernButton';
import type { Document as KnowledgeDocument, DocumentStatus, DocumentType } from '@/types/knowledge-base.types';
import { createClient } from '@/lib/supabase/client';
import DocumentList from './DocumentList';

const BatchProcessBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${({ theme }) => theme.spacing.md};
  background: rgba(152, 93, 215, 0.05);
  border-radius: 12px;
  margin-bottom: ${({ theme }) => theme.spacing.md};
  border: 1px solid rgba(152, 93, 215, 0.1);
  gap: ${({ theme }) => theme.spacing.md};
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const SelectionInfo = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  color: ${({ theme }) => theme.colors.text};
  font-family: ${({ theme }) => theme.fonts.body};
  font-size: 0.95rem;
`;

const BatchActions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.sm};
  flex-wrap: wrap;
`;

interface DocumentListWithBatchProps {
  documents: KnowledgeDocument[];
  onProcessDocument: (documentId: string) => Promise<void>;
  onDeleteDocument: (documentId: string) => Promise<void>;
  onViewStatus: (documentId: string) => void;
  onBatchProcess?: (documentIds: string[]) => Promise<void>;
  fastMode?: boolean;
}

export default function DocumentListWithBatch({
  documents,
  onProcessDocument,
  onDeleteDocument,
  onViewStatus,
  onBatchProcess,
  fastMode = false
}: DocumentListWithBatchProps) {
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set());
  const [batchProcessing, setBatchProcessing] = useState<boolean>(false);

  // Get selectable documents (those that can be processed)
  const selectableDocuments = documents.filter(doc => 
    doc.status === 'error' || doc.status === 'uploaded' || doc.status === 'fetched'
  );

  const handleSelectAll = () => {
    if (selectedDocuments.size === selectableDocuments.length) {
      setSelectedDocuments(new Set());
    } else {
      setSelectedDocuments(new Set(selectableDocuments.map(d => d.document_id)));
    }
  };

  const handleSelectDocument = (documentId: string) => {
    const newSelected = new Set(selectedDocuments);
    if (newSelected.has(documentId)) {
      newSelected.delete(documentId);
    } else {
      newSelected.add(documentId);
    }
    setSelectedDocuments(newSelected);
  };

  const handleBatchProcess = async () => {
    if (!onBatchProcess || selectedDocuments.size === 0) return;
    
    setBatchProcessing(true);
    try {
      await onBatchProcess(Array.from(selectedDocuments));
      setSelectedDocuments(new Set());
    } catch (error) {
      console.error('Batch processing error:', error);
    } finally {
      setBatchProcessing(false);
    }
  };

  const handleProcessDocument = async (documentId: string) => {
    await onProcessDocument(documentId);
    // Remove from selected if it was selected
    if (selectedDocuments.has(documentId)) {
      const newSelected = new Set(selectedDocuments);
      newSelected.delete(documentId);
      setSelectedDocuments(newSelected);
    }
  };

  // Create a wrapper component that adds checkboxes to the document list
  const EnhancedDocumentList = () => {
    const originalList = DocumentList({
      documents,
      onProcessDocument: handleProcessDocument,
      onDeleteDocument,
      onViewStatus
    });

    // This would require modifying the original DocumentList component
    // For now, we'll show the batch selection UI above the list
    return originalList;
  };

  return (
    <>
      {onBatchProcess && selectableDocuments.length > 0 && (
        <BatchProcessBar>
          <SelectionInfo>
            <input
              type="checkbox"
              checked={selectedDocuments.size === selectableDocuments.length && selectableDocuments.length > 0}
              onChange={handleSelectAll}
            />
            <span>
              {selectedDocuments.size > 0 
                ? `${selectedDocuments.size} document${selectedDocuments.size > 1 ? 's' : ''} selected`
                : `Select documents to process`
              }
            </span>
          </SelectionInfo>
          
          <BatchActions>
            {selectedDocuments.size > 0 && (
              <>
                <ModernButton
                  size="small"
                  variant="primary"
                  disabled={batchProcessing}
                  onClick={handleBatchProcess}
                >
                  {batchProcessing 
                    ? 'Processing...' 
                    : `Process ${selectedDocuments.size} Document${selectedDocuments.size > 1 ? 's' : ''} ${fastMode ? '(Fast Mode)' : ''}`
                  }
                </ModernButton>
                <ModernButton
                  size="small"
                  variant="ghost"
                  onClick={() => setSelectedDocuments(new Set())}
                >
                  Clear Selection
                </ModernButton>
              </>
            )}
            {selectedDocuments.size === 0 && selectableDocuments.length > 0 && (
              <ModernButton
                size="small"
                variant="ghost"
                onClick={handleSelectAll}
              >
                Select All Processable ({selectableDocuments.length})
              </ModernButton>
            )}
          </BatchActions>
        </BatchProcessBar>
      )}
      
      {/* Show selectable documents first */}
      {selectedDocuments.size > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <strong>Selected Documents:</strong>
          <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
            {Array.from(selectedDocuments).map(id => {
              const doc = documents.find(d => d.document_id === id);
              return doc ? (
                <li key={id} style={{ marginBottom: '4px' }}>
                  {doc.file_name} 
                  <ModernButton
                    size="small"
                    variant="ghost"
                    onClick={() => handleSelectDocument(id)}
                    style={{ marginLeft: '8px', padding: '2px 8px' }}
                  >
                    Remove
                  </ModernButton>
                </li>
              ) : null;
            })}
          </ul>
        </div>
      )}
      
      <DocumentList
        documents={documents}
        onProcessDocument={handleProcessDocument}
        onDeleteDocument={onDeleteDocument}
        onViewStatus={onViewStatus}
      />
    </>
  );
}