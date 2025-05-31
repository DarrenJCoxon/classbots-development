'use client';

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { FiPlayCircle, FiPlus, FiSearch, FiFilter, FiGrid, FiList, FiUsers, FiBookOpen } from 'react-icons/fi';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import type { CourseWithDetails } from '@/types/database.types';
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
  EmptyState,
  LoadingContainer
} from '@/components/ui';
import LoadingSpinner from '@/components/shared/LoadingSpinner';

const HeaderSection = styled.div`
  margin-bottom: 32px;
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

export default function CoursesPage() {
  const [courses, setCourses] = useState<CourseWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showCreateForm, setShowCreateForm] = useState(false);
  
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // For now, we'll fetch courses directly
      // In the next step, we'll create an API endpoint for this
      const { data: coursesData, error } = await supabase
        .from('courses')
        .select(`
          *,
          course_lessons (
            lesson_id,
            title,
            lesson_order
          )
        `)
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get enrollment counts
      const courseIds = coursesData?.map(c => c.course_id) || [];
      const { data: enrollments } = await supabase
        .from('course_enrollments')
        .select('course_id')
        .in('course_id', courseIds);

      // Calculate stats for each course
      const coursesWithStats = coursesData?.map(course => {
        const enrollmentCount = enrollments?.filter(e => e.course_id === course.course_id).length || 0;
        return {
          ...course,
          lesson_count: course.course_lessons?.length || 0,
          student_count: enrollmentCount
        };
      }) || [];

      setCourses(coursesWithStats);
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
    // For now, just show a placeholder
    // We'll implement the CourseForm component next
    setShowCreateForm(true);
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
                  <motion.div
                    key={course.course_id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    {/* We'll create the CourseCard component next */}
                    <div style={{ 
                      padding: '20px', 
                      background: 'white', 
                      borderRadius: '12px',
                      border: '1px solid rgba(152, 93, 215, 0.1)'
                    }}>
                      <h3>{course.title}</h3>
                      <p>{course.description || 'No description'}</p>
                      <p>{course.lesson_count} lessons • {course.student_count} students</p>
                      <ModernButton
                        variant="ghost"
                        size="small"
                        onClick={() => router.push(`/teacher-dashboard/courses/${course.course_id}`)}
                      >
                        View Course →
                      </ModernButton>
                    </div>
                  </motion.div>
                ))}
              </CoursesGrid>
            )}
          </Section>

          {showCreateForm && (
            <div style={{ 
              position: 'fixed', 
              top: '50%', 
              left: '50%', 
              transform: 'translate(-50%, -50%)',
              background: 'white',
              padding: '40px',
              borderRadius: '16px',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.2)',
              zIndex: 1000
            }}>
              <h2>Create New Course</h2>
              <p>Course form will be implemented next...</p>
              <ModernButton 
                variant="ghost" 
                onClick={() => setShowCreateForm(false)}
                style={{ marginTop: '20px' }}
              >
                Close
              </ModernButton>
            </div>
          )}
        </Container>
      </PageTransition>
    </PageWrapper>
  );
}