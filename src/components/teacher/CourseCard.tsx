import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { 
  FiPlayCircle, 
  FiUsers, 
  FiBookOpen, 
  FiMoreVertical, 
  FiEdit,
  FiTrash2,
  FiCopy,
  FiExternalLink,
  FiEye,
  FiEyeOff
} from 'react-icons/fi';
import type { CourseWithDetails } from '@/types/database.types';
import { ModernButton } from '@/components/shared/ModernButton';
import { Badge, StatusBadge } from '@/components/ui';

interface CourseCardProps {
  course: CourseWithDetails;
  onEdit?: (course: CourseWithDetails) => void;
  onDelete?: (course: CourseWithDetails) => void;
  onDuplicate?: (course: CourseWithDetails) => void;
  viewMode?: 'grid' | 'list';
}

const CardContainer = styled(motion.div)<{ $viewMode: 'grid' | 'list' }>`
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(152, 93, 215, 0.1);
  border-radius: 16px;
  overflow: hidden;
  transition: all 0.3s ease;
  display: ${({ $viewMode }) => $viewMode === 'list' ? 'flex' : 'block'};
  align-items: ${({ $viewMode }) => $viewMode === 'list' ? 'center' : 'stretch'};
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 40px rgba(152, 93, 215, 0.15);
  }
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    &:hover {
      transform: none;
    }
  }
`;

const ThumbnailSection = styled.div<{ $viewMode: 'grid' | 'list' }>`
  position: relative;
  width: ${({ $viewMode }) => $viewMode === 'list' ? '180px' : '100%'};
  height: ${({ $viewMode }) => $viewMode === 'list' ? '120px' : '200px'};
  background: linear-gradient(135deg, 
    ${({ theme }) => theme.colors.primary}20, 
    ${({ theme }) => theme.colors.magenta}20
  );
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    width: ${({ $viewMode }) => $viewMode === 'list' ? '100px' : '100%'};
    height: ${({ $viewMode }) => $viewMode === 'list' ? '80px' : '150px'};
  }
`;

const ThumbnailOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(to bottom, transparent 0%, rgba(0, 0, 0, 0.6) 100%);
  opacity: 0;
  transition: opacity 0.3s ease;
  
  ${CardContainer}:hover & {
    opacity: 1;
  }
`;

const PlayButton = styled.div`
  width: 60px;
  height: 60px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
  
  svg {
    width: 28px;
    height: 28px;
    color: ${({ theme }) => theme.colors.primary};
    margin-left: 4px;
  }
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    width: 40px;
    height: 40px;
    
    svg {
      width: 20px;
      height: 20px;
    }
  }
`;

const CardContent = styled.div<{ $viewMode: 'grid' | 'list' }>`
  padding: ${({ $viewMode }) => $viewMode === 'list' ? '16px 24px' : '24px'};
  flex: 1;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    padding: ${({ $viewMode }) => $viewMode === 'list' ? '12px 16px' : '16px'};
  }
`;

const HeaderRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
`;

const Title = styled.h3`
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text};
  flex: 1;
  margin-right: 12px;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    font-size: 16px;
  }
`;

const Description = styled.p`
  margin: 8px 0 16px;
  color: ${({ theme }) => theme.colors.textLight};
  font-size: 14px;
  line-height: 1.5;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    font-size: 13px;
    margin: 6px 0 12px;
  }
`;

const MetaInfo = styled.div`
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
  flex-wrap: wrap;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    gap: 12px;
    margin-bottom: 12px;
  }
`;

const MetaItem = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  color: ${({ theme }) => theme.colors.textLight};
  font-size: 14px;
  
  svg {
    width: 16px;
    height: 16px;
    color: ${({ theme }) => theme.colors.primary};
  }
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    font-size: 12px;
    
    svg {
      width: 14px;
      height: 14px;
    }
  }
`;

const TagsRow = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  flex-wrap: wrap;
`;

const Tag = styled.span`
  padding: 4px 12px;
  background: rgba(152, 93, 215, 0.1);
  color: ${({ theme }) => theme.colors.primary};
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
`;

const ActionRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 8px;
`;

const ViewButton = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: linear-gradient(135deg, 
    ${({ theme }) => theme.colors.primary}, 
    ${({ theme }) => theme.colors.magenta}
  );
  color: white;
  border-radius: 8px;
  text-decoration: none;
  font-weight: 600;
  font-size: 14px;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateX(2px);
    box-shadow: 0 6px 20px rgba(152, 93, 215, 0.3);
  }
  
  svg {
    transition: transform 0.3s ease;
  }
  
  &:hover svg {
    transform: translateX(2px);
  }
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    padding: 6px 12px;
    font-size: 12px;
  }
`;

const DropdownMenu = styled.div`
  position: relative;
`;

const DropdownButton = styled.button`
  background: none;
  border: 1px solid rgba(152, 93, 215, 0.2);
  border-radius: 8px;
  padding: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(152, 93, 215, 0.05);
    border-color: rgba(152, 93, 215, 0.3);
  }
  
  svg {
    width: 18px;
    height: 18px;
    color: ${({ theme }) => theme.colors.textLight};
  }
`;

const DropdownContent = styled(motion.div)`
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 4px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
  border: 1px solid rgba(152, 93, 215, 0.1);
  z-index: 100;
  min-width: 180px;
  overflow: hidden;
`;

const DropdownItem = styled.button`
  width: 100%;
  padding: 12px 16px;
  background: none;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text};
  transition: all 0.2s ease;
  text-align: left;
  
  &:hover {
    background: rgba(152, 93, 215, 0.05);
    color: ${({ theme }) => theme.colors.primary};
  }
  
  svg {
    width: 16px;
    height: 16px;
  }
`;

export const CourseCard: React.FC<CourseCardProps> = ({ 
  course, 
  onEdit, 
  onDelete, 
  onDuplicate,
  viewMode = 'grid' 
}) => {
  const [showDropdown, setShowDropdown] = React.useState(false);
  
  const handleDropdownClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowDropdown(!showDropdown);
  };
  
  const handleAction = (action: () => void) => {
    action();
    setShowDropdown(false);
  };

  return (
    <CardContainer
      $viewMode={viewMode}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01 }}
      transition={{ duration: 0.2 }}
    >
      <ThumbnailSection $viewMode={viewMode}>
        <ThumbnailOverlay />
        <PlayButton>
          <FiPlayCircle />
        </PlayButton>
      </ThumbnailSection>
      
      <CardContent $viewMode={viewMode}>
        <HeaderRow>
          <Title>{course.title}</Title>
          <StatusBadge isActive={course.is_published}>
            {course.is_published ? (
              <>
                <FiEye /> Published
              </>
            ) : (
              <>
                <FiEyeOff /> Draft
              </>
            )}
          </StatusBadge>
        </HeaderRow>
        
        {course.description && (
          <Description>{course.description}</Description>
        )}
        
        <MetaInfo>
          <MetaItem>
            <FiBookOpen />
            {course.lesson_count || 0} lessons
          </MetaItem>
          <MetaItem>
            <FiUsers />
            {course.student_count || 0} students
          </MetaItem>
        </MetaInfo>
        
        {(course.subject || course.year_group) && (
          <TagsRow>
            {course.subject && <Tag>{course.subject}</Tag>}
            {course.year_group && <Tag>Year {course.year_group}</Tag>}
          </TagsRow>
        )}
        
        <ActionRow>
          <ViewButton href={`/teacher-dashboard/courses/${course.course_id}`}>
            Manage Course
            <FiExternalLink />
          </ViewButton>
          
          <DropdownMenu>
            <DropdownButton onClick={handleDropdownClick}>
              <FiMoreVertical />
            </DropdownButton>
            
            {showDropdown && (
              <DropdownContent
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                {onEdit && (
                  <DropdownItem onClick={() => handleAction(() => onEdit(course))}>
                    <FiEdit />
                    Edit Details
                  </DropdownItem>
                )}
                {onDuplicate && (
                  <DropdownItem onClick={() => handleAction(() => onDuplicate(course))}>
                    <FiCopy />
                    Duplicate Course
                  </DropdownItem>
                )}
                {onDelete && (
                  <DropdownItem onClick={() => handleAction(() => onDelete(course))}>
                    <FiTrash2 />
                    Delete Course
                  </DropdownItem>
                )}
              </DropdownContent>
            )}
          </DropdownMenu>
        </ActionRow>
      </CardContent>
    </CardContainer>
  );
};