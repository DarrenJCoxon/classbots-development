'use client';

import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { FiDownload, FiExternalLink } from 'react-icons/fi';
import { ModernButton } from '@/components/shared/ModernButton';
import { getFileTypeInfo, formatFileSize, truncateFileName } from '@/utils/file-icons';

interface Resource {
  id: string;
  name: string;
  url?: string;
  size?: number;
  type?: string;
}

interface ResourcesListProps {
  resources: Resource[];
  title?: string;
  compact?: boolean;
}

const ResourcesContainer = styled.div<{ $compact?: boolean }>`
  background: white;
  border-radius: 16px;
  border: 1px solid rgba(152, 93, 215, 0.1);
  box-shadow: 0 2px 8px rgba(152, 93, 215, 0.05);
  overflow: hidden;
  ${({ $compact }) => $compact && 'margin-top: auto;'}
`;

const ResourcesHeader = styled.div`
  padding: 16px 20px;
  border-bottom: 1px solid rgba(152, 93, 215, 0.1);
  background: rgba(250, 248, 254, 0.5);
`;

const ResourcesTitle = styled.h3`
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
  display: flex;
  align-items: center;
  gap: 8px;
`;

const ResourcesBody = styled.div`
  padding: 16px 20px;
`;

const ResourcesListContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const ResourceItem = styled(motion.div)`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: rgba(250, 248, 254, 0.3);
  border-radius: 10px;
  border: 1px solid rgba(152, 93, 215, 0.1);
  transition: all 0.2s ease;
  cursor: pointer;
  
  &:hover {
    background: rgba(152, 93, 215, 0.05);
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(152, 93, 215, 0.1);
  }
`;

const FileIcon = styled.div<{ $color: string }>`
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: ${({ $color }) => $color}15;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  
  svg {
    width: 18px;
    height: 18px;
    color: ${({ $color }) => $color};
  }
`;

const ResourceInfo = styled.div`
  flex: 1;
  min-width: 0; // Allow text truncation
`;

const ResourceName = styled.div`
  font-size: 14px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const ResourceMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.textLight};
`;

const ResourceCategory = styled.span<{ $color: string }>`
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 500;
  text-transform: uppercase;
  background: ${({ $color }) => $color}15;
  color: ${({ $color }) => $color};
`;

const DownloadButton = styled.button`
  background: none;
  border: none;
  padding: 8px;
  cursor: pointer;
  border-radius: 6px;
  color: ${({ theme }) => theme.colors.primary};
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  
  &:hover {
    background: rgba(152, 93, 215, 0.1);
    transform: scale(1.1);
  }
  
  svg {
    width: 16px;
    height: 16px;
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 24px 16px;
  color: ${({ theme }) => theme.colors.textLight};
  
  p {
    margin: 0;
    font-size: 14px;
  }
`;

export const ResourcesList: React.FC<ResourcesListProps> = ({
  resources,
  title = "Resources",
  compact = false
}) => {
  const handleDownload = (resource: Resource) => {
    if (resource.url) {
      const link = document.createElement('a');
      link.href = resource.url;
      link.download = resource.name;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  if (!resources || resources.length === 0) {
    return (
      <ResourcesContainer $compact={compact}>
        <ResourcesHeader>
          <ResourcesTitle>
            <FiDownload size={16} />
            {title}
          </ResourcesTitle>
        </ResourcesHeader>
        <ResourcesBody>
          <EmptyState>
            <p>No resources available</p>
          </EmptyState>
        </ResourcesBody>
      </ResourcesContainer>
    );
  }

  return (
    <ResourcesContainer $compact={compact}>
      <ResourcesHeader>
        <ResourcesTitle>
          <FiDownload size={16} />
          {title} ({resources.length})
        </ResourcesTitle>
      </ResourcesHeader>
      
      <ResourcesBody>
        <ResourcesListContainer>
          {resources.map((resource, index) => {
            const fileTypeInfo = getFileTypeInfo(resource.name, resource.type);
            const IconComponent = fileTypeInfo.icon;
            
            return (
              <ResourceItem
                key={resource.id || index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => handleDownload(resource)}
              >
                <FileIcon $color={fileTypeInfo.color}>
                  <IconComponent />
                </FileIcon>
                
                <ResourceInfo>
                  <ResourceName title={resource.name}>
                    {truncateFileName(resource.name, 20)}
                  </ResourceName>
                  <ResourceMeta>
                    <ResourceCategory $color={fileTypeInfo.color}>
                      {fileTypeInfo.category}
                    </ResourceCategory>
                    {resource.size && (
                      <span>{formatFileSize(resource.size)}</span>
                    )}
                  </ResourceMeta>
                </ResourceInfo>
                
                <DownloadButton
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownload(resource);
                  }}
                  title={`Download ${resource.name}`}
                >
                  <FiDownload />
                </DownloadButton>
              </ResourceItem>
            );
          })}
        </ResourcesListContainer>
      </ResourcesBody>
    </ResourcesContainer>
  );
};