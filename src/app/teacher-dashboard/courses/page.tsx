'use client';

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { FiPlayCircle, FiPlus, FiSearch, FiFilter, FiGrid, FiList, FiUsers, FiBookOpen } from 'react-icons/fi';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import type { Course, CourseWithDetails } from '@/types/database.types';
import { ModernButton } from '@/components/shared/ModernButton';
import { PageTransition } from '@/components/shared/PageTransition';
import { 
  PageWrapper, 
  Container, 
  PageTitle, 
  Section,
  Grid,
  Flex,
  Stack,
  StatsCard,
  SearchInput,
  Card,
  CardBody,
  Text,
  Heading
} from '@/components/ui';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import { CourseCard } from '@/components/teacher/CourseCard';
import { CourseForm } from '@/components/teacher/CourseForm';

const HeaderSection = styled.div`
  margin-bottom: 32px;
  /* Forced cache clear */
`;

const ActionBar = styled(Flex)`
  margin-bottom: 24px;
  flex-wrap: wrap;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    gap: 12px;
  }
`;

const SearchWrapper = styled.div`
  flex: 1;
  max-width: 400px;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    max-width: 100%;
    width: 100%;
    order: 2;
  }
`;

const ViewToggle = styled.div`
  display: flex;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(152, 93, 215, 0.2);
  border-radius: 10px;
  overflow: hidden;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    display: none;
  }
`;

const ToggleButton = styled.button<{ $isActive: boolean }>`
  padding: 8px 16px;
  background: ${({ $isActive, theme }) => 
    $isActive 
      ? `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.magenta})`
      : 'transparent'
  };
  color: ${({ $isActive, theme }) => 
    $isActive ? 'white' : theme.colors.textLight
  };
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: all 0.3s ease;
  
  &:hover {
    color: ${({ $isActive, theme }) => 
      $isActive ? 'white' : theme.colors.primary
    };
  }
  
  svg {
    width: 18px;
    height: 18px;
  }
`;

const CreateButton = styled(ModernButton)`
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    order: 1;
    width: 100%;
    justify-content: center;
  }
`;

const CoursesGrid = styled.div<{ $isGrid: boolean }>`
  display: grid;
  grid-template-columns: ${({ $isGrid }) => 
    $isGrid ? 'repeat(auto-fill, minmax(350px, 1fr))' : '1fr'
  };
  gap: 24px;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    grid-template-columns: ${({ $isGrid }) => 
      $isGrid ? 'repeat(auto-fill, minmax(300px, 1fr))' : '1fr'
    };
    gap: 16px;
  }
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    grid-template-columns: 1fr;
  }
`;

const EmptyIcon = styled.div`
  width: 80px;
  height: 80px;
  margin: 0 auto 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, 
    ${({ theme }) => theme.colors.primary}20, 
    ${({ theme }) => theme.colors.magenta}20
  );
  border-radius: 50%;
  
  svg {
    width: 40px;
    height: 40px;
    color: ${({ theme }) => theme.colors.primary};
  }
`;

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 400px;
  gap: 16px;
  
  p {
    color: ${({ theme }) => theme.colors.textLight};
    font-size: 16px;
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 60px 20px;
  
  h3 {
    font-size: 24px;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text};
    margin-bottom: 8px;
  }
  
  p {
    color: ${({ theme }) => theme.colors.textLight};
    font-size: 16px;
    margin-bottom: 24px;
  }
`;

export default function CoursesPage() {
  const [courses, setCourses] = useState<CourseWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingCourse, setEditingCourse] = useState<CourseWithDetails | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const response = await fetch('/api/teacher/courses');
      const data = await response.json();
      
      if (!response.ok) {
        console.error('Failed to fetch courses:', data);
        throw new Error(data.error || 'Failed to fetch courses');
      }
      
      setCourses(data.courses);
    } catch (error) {
      console.error('Error fetching courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCourses = courses.filter(course =>
    course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    course.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    course.subject?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate overall stats
  const totalCourses = courses.length;
  const publishedCourses = courses.filter(c => c.is_published).length;
  const totalLessons = courses.reduce((sum, course) => sum + (course.lesson_count || 0), 0);
  const totalStudents = courses.reduce((sum, course) => sum + (course.student_count || 0), 0);

  const handleCreateCourse = () => {
    setEditingCourse(null);
    setShowCreateForm(true);
  };
  
  const handleEditCourse = (course: CourseWithDetails) => {
    setEditingCourse(course);
    setShowCreateForm(true);
  };
  
  const handleDeleteCourse = async (course: CourseWithDetails) => {
    if (!confirm(`Are you sure you want to delete "${course.title}"? This action cannot be undone.`)) {
      return;
    }
    
    try {
      const response = await fetch(`/api/teacher/courses?courseId=${course.course_id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete course');
      }
      
      // Refresh courses list
      await fetchCourses();
    } catch (error) {
      console.error('Error deleting course:', error);
      alert('Failed to delete course. Please try again.');
    }
  };
  
  const handleSubmitCourse = async (courseData: Partial<Course>) => {
    setFormLoading(true);
    
    try {
      const isEditing = !!courseData.course_id;
      const response = await fetch('/api/teacher/courses', {
        method: isEditing ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(courseData)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        console.error('Failed to save course:', data);
        const errorMessage = data.details ? `${data.error}: ${data.details}` : data.error || 'Failed to save course';
        throw new Error(errorMessage);
      }
      
      // Refresh courses list
      await fetchCourses();
      
      // Close form
      setShowCreateForm(false);
      setEditingCourse(null);
      
      // Navigate to course detail page if creating new course
      if (!isEditing) {
        router.push(`/teacher-dashboard/courses/${data.course.course_id}`);
      }
    } catch (error) {
      console.error('Error saving course:', error);
      throw error;
    } finally {
      setFormLoading(false);
    }
  };

  if (loading) {
    return (
      <PageWrapper gradient>
        <Container>
          <LoadingContainer>
            <LoadingSpinner size="large" />
            <p>Loading courses...</p>
          </LoadingContainer>
        </Container>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper gradient>
      <PageTransition>
        <Container size="large">
          <HeaderSection>
            <PageTitle gradient>My Courses</PageTitle>
          </HeaderSection>

          <Section>
            <Grid cols={4} gap="md">
              <StatsCard
                icon={<FiPlayCircle />}
                title="Total Courses"
                value={totalCourses}
                accentColor="primary"
              />
              <StatsCard
                icon={<FiPlayCircle />}
                title="Published"
                value={publishedCourses}
                accentColor="success"
              />
              <StatsCard
                icon={<FiBookOpen />}
                title="Total Lessons"
                value={totalLessons}
                accentColor="secondary"
              />
              <StatsCard
                icon={<FiUsers />}
                title="Enrolled Students"
                value={totalStudents}
                accentColor="warning"
              />
            </Grid>
          </Section>

          <Section>
            <ActionBar justify="between" align="center" gap="md">
              <SearchWrapper>
                <SearchInput
                  placeholder="Search courses..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </SearchWrapper>
              
              <Flex gap="md" align="center">
                <ViewToggle>
                  <ToggleButton
                    $isActive={viewMode === 'grid'}
                    onClick={() => setViewMode('grid')}
                  >
                    <FiGrid />
                  </ToggleButton>
                  <ToggleButton
                    $isActive={viewMode === 'list'}
                    onClick={() => setViewMode('list')}
                  >
                    <FiList />
                  </ToggleButton>
                </ViewToggle>
                
                <CreateButton
                  variant="primary"
                  size="medium"
                  onClick={handleCreateCourse}
                >
                  <FiPlus /> Create Course
                </CreateButton>
              </Flex>
            </ActionBar>

            {filteredCourses.length === 0 ? (
              <EmptyState>
                <EmptyIcon>
                  <FiPlayCircle />
                </EmptyIcon>
                <h3>{searchTerm ? 'No courses found' : 'No courses yet'}</h3>
                <p>
                  {searchTerm 
                    ? 'Try adjusting your search terms'
                    : 'Create your first video course to get started'
                  }
                </p>
                {!searchTerm && (
                  <ModernButton
                    variant="primary"
                    onClick={handleCreateCourse}
                    style={{ marginTop: '16px' }}
                  >
                    <FiPlus /> Create Your First Course
                  </ModernButton>
                )}
              </EmptyState>
            ) : (
              <CoursesGrid $isGrid={viewMode === 'grid'}>
                {filteredCourses.map((course) => (
                  <CourseCard
                    key={course.course_id}
                    course={course}
                    viewMode={viewMode}
                    onEdit={handleEditCourse}
                    onDelete={handleDeleteCourse}
                    onDuplicate={(course) => {
                      // TODO: Implement duplicate functionality
                      console.log('Duplicate course:', course);
                    }}
                  />
                ))}
              </CoursesGrid>
            )}
          </Section>

          <AnimatePresence>
            {showCreateForm && (
              <CourseForm
                course={editingCourse}
                onSubmit={handleSubmitCourse}
                onCancel={() => {
                  setShowCreateForm(false);
                  setEditingCourse(null);
                }}
                isLoading={formLoading}
              />
            )}
          </AnimatePresence>
        </Container>
      </PageTransition>
    </PageWrapper>
  );
}