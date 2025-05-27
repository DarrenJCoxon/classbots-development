// src/components/teacher/DocumentGrid.tsx
'use client';

import { useState } from 'react';
import styled from 'styled-components';
import DocumentCard from './DocumentCard';
import { ModernButton } from '@/components/shared/ModernButton';
import type { Document as KnowledgeDocument, DocumentStatus, DocumentType } from '@/types/knowledge-base.types';

const GridContainer = styled.div`
  margin-top: ${({ theme }) => theme.spacing.lg};
`;

const FilterBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${({ theme }) => theme.spacing.lg};
  padding: ${({ theme }) => theme.spacing.md};
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(20px);
  border-radius: 12px;
  border: 1px solid rgba(152, 93, 215, 0.1);
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

const ViewToggle = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.xs};
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(152, 93, 215, 0.1);
  border-radius: 8px;
  padding: 2px;
`;

const ViewButton = styled.button<{ $active: boolean }>`
  background: ${({ $active }) => $active ? 'white' : 'transparent'};
  border: none;
  border-radius: 6px;
  padding: ${({ theme }) => theme.spacing.xs} ${({ theme }) => theme.spacing.sm};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  color: ${({ theme, $active }) => $active ? theme.colors.primary : theme.colors.textMuted};
  
  svg {
    width: 20px;
    height: 20px;
  }
  
  &:hover {
    background: ${({ $active }) => !$active && 'rgba(152, 93, 215, 0.05)'};
  }
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: ${({ theme }) => theme.spacing.lg};
  
  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    grid-template-columns: 1fr;
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing.xxl};
  color: ${({ theme }) => theme.colors.textMuted};
  font-family: ${({ theme }) => theme.fonts.body};
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  border: 1px solid rgba(152, 93, 215, 0.1);
  
  p {
    margin-bottom: ${({ theme }) => theme.spacing.md};
    font-size: 1.1rem;
  }
`;

interface DocumentGridProps {
  documents: KnowledgeDocument[];
  onProcessDocument: (documentId: string) => Promise<void>;
  onDeleteDocument: (documentId: string) => Promise<void>;
  onViewStatus: (documentId: string) => void;
  showListView?: boolean;
  onViewChange?: (isListView: boolean) => void;
}

export default function DocumentGrid({
  documents,
  onProcessDocument,
  onDeleteDocument,
  onViewStatus,
  showListView = false,
  onViewChange
}: DocumentGridProps) {
  const [statusFilter, setStatusFilter] = useState<DocumentStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<DocumentType | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  // Filter documents
  const filteredDocuments = documents.filter(doc => {
    // Status filter
    if (statusFilter !== 'all' && doc.status !== statusFilter) return false;
    
    // Type filter
    if (typeFilter !== 'all' && doc.file_type !== typeFilter) return false;
    
    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return doc.file_name.toLowerCase().includes(term) ||
        (doc.file_type === 'webpage' && doc.file_path.toLowerCase().includes(term));
    }
    
    return true;
  });

  // Get counts for filter badges
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

  const handleProcess = async (documentId: string) => {
    setProcessingIds(prev => new Set(prev).add(documentId));
    try {
      await onProcessDocument(documentId);
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(documentId);
        return next;
      });
    }
  };

  const handleDelete = async (documentId: string) => {
    setDeletingIds(prev => new Set(prev).add(documentId));
    try {
      await onDeleteDocument(documentId);
    } finally {
      setDeletingIds(prev => {
        const next = new Set(prev);
        next.delete(documentId);
        return next;
      });
    }
  };

  if (documents.length === 0) {
    return (
      <GridContainer>
        <EmptyState>
          <p>No documents have been added to this knowledge base yet.</p>
          <p style={{ fontSize: '0.9rem' }}>Upload documents above to get started.</p>
        </EmptyState>
      </GridContainer>
    );
  }

  return (
    <GridContainer>
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
              Ready ({counts.statusCounts.completed})
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
          
          {(counts.statusCounts.uploaded + counts.statusCounts.fetched) > 0 && (
            <FilterButton 
              $active={statusFilter === 'uploaded' || statusFilter === 'fetched'}
              onClick={() => setStatusFilter('uploaded')}
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
        
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <SearchInput
            type="text"
            placeholder="Search documents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          
          {onViewChange && (
            <ViewToggle>
              <ViewButton 
                $active={!showListView} 
                onClick={() => onViewChange(false)}
                title="Grid view"
              >
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </ViewButton>
              <ViewButton 
                $active={showListView} 
                onClick={() => onViewChange(true)}
                title="List view"
              >
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
              </ViewButton>
            </ViewToggle>
          )}
        </div>
      </FilterBar>

      {filteredDocuments.length === 0 ? (
        <EmptyState>
          <p>No documents match your current filters.</p>
          <ModernButton 
            size="small" 
            variant="ghost" 
            onClick={() => {
              setStatusFilter('all');
              setTypeFilter('all');
              setSearchTerm('');
            }}
          >
            Clear filters
          </ModernButton>
        </EmptyState>
      ) : (
        <Grid>
          {filteredDocuments.map(doc => (
            <DocumentCard
              key={doc.document_id}
              document={doc}
              onView={() => onViewStatus(doc.document_id)}
              onProcess={() => handleProcess(doc.document_id)}
              onDelete={() => handleDelete(doc.document_id)}
              isProcessing={processingIds.has(doc.document_id)}
              isDeleting={deletingIds.has(doc.document_id)}
            />
          ))}
        </Grid>
      )}
    </GridContainer>
  );
}