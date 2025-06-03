'use client';

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiArrowLeft, 
  FiEdit, 
  FiPlus, 
  FiTrash2, 
  FiEye, 
  FiEyeOff,
  FiGlobe,
  FiClock,
  FiMoreVertical,
  FiPlayCircle,
  FiUsers,
  FiBookOpen,
  FiGrid,
  FiBarChart
} from 'react-icons/fi';
import { useRouter, useParams } from 'next/navigation';
import { ModernButton } from '@/components/shared/ModernButton';
import { PageTransition } from '@/components/shared/PageTransition';
import { CourseForm } from '@/components/teacher/CourseForm';
import type { Course, CourseWithDetails, CourseLesson } from '@/types/database.types';
import { 
  PageWrapper, 
  Container, 
  Section,
  Grid,
  Flex,
  Stack,
  StatsCard,
  Card,
  CardBody,
  Text,
  Badge,
  StatusBadge
} from '@/components/ui';
import LoadingSpinner from '@/components/shared/LoadingSpinner';

const HeaderSection = styled.div`
  margin-bottom: 32px;
`;

const BackButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(152, 93, 215, 0.2);
  border-radius: 10px;
  color: ${({ theme }) => theme.colors.textLight};
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-bottom: 24px;
  
  &:hover {
    color: ${({ theme }) => theme.colors.primary};
    border-color: rgba(152, 93, 215, 0.3);
    transform: translateX(-2px);
  }
  
  svg {
    transition: transform 0.2s ease;
  }
  
  &:hover svg {
    transform: translateX(-2px);
  }
`;

const TitleSection = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 24px;
  flex-wrap: wrap;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    flex-direction: column;
    gap: 16px;
  }
`;

const TitleGroup = styled.div`
  flex: 1;
`;

const PageTitle = styled.h1`
  margin: 0 0 8px 0;
  font-size: 36px;
  font-weight: 700;
  background: linear-gradient(135deg, 
    ${({ theme }) => theme.colors.primary}, 
    ${({ theme }) => theme.colors.magenta}
  );
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    font-size: 28px;
  }
`;

const CourseDescription = styled.p`
  margin: 0 0 16px 0;
  color: ${({ theme }) => theme.colors.textLight};
  font-size: 16px;
  line-height: 1.5;
`;

const MetaTags = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

const MetaTag = styled.span`
  padding: 6px 12px;
  background: rgba(152, 93, 215, 0.1);
  color: ${({ theme }) => theme.colors.primary};
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 12px;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    width: 100%;
    flex-direction: column;
  }
`;

const LessonsSection = styled(Section)`
  margin-top: 40px;
`;

const SectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
`;

const SectionTitle = styled.h2`
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text};
`;

const LessonsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const LessonCard = styled(Card)`
  padding: 0;
  overflow: hidden;
  border: 1px solid rgba(152, 93, 215, 0.1);
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 40px rgba(152, 93, 215, 0.15);
  }
`;

const LessonCardContent = styled.div`
  display: flex;
  align-items: center;
  padding: 20px 24px;
  gap: 16px;
`;

const LessonOrder = styled.div`
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, 
    ${({ theme }) => theme.colors.primary}20, 
    ${({ theme }) => theme.colors.magenta}20
  );
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 16px;
  color: ${({ theme }) => theme.colors.primary};
  flex-shrink: 0;
`;

const LessonInfo = styled.div`
  flex: 1;
`;

const LessonTitle = styled.h3`
  margin: 0 0 4px 0;
  font-size: 18px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
  cursor: pointer;
  transition: color 0.2s ease;
  
  &:hover {
    color: ${({ theme }) => theme.colors.primary};
  }
`;

const LessonMeta = styled.div`
  display: flex;
  gap: 16px;
  align-items: center;
  color: ${({ theme }) => theme.colors.textLight};
  font-size: 14px;
  
  svg {
    width: 16px;
    height: 16px;
  }
`;

const LessonActions = styled.div`
  display: flex;
  gap: 8px;
`;

const IconButton = styled.button`
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

const EmptyState = styled.div`
  text-align: center;
  padding: 60px 20px;
  background: rgba(152, 93, 215, 0.05);
  border-radius: 16px;
  
  h3 {
    font-size: 20px;
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

export default function CourseDetailPage() {
  const [course, setCourse] = useState<CourseWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCourseForm, setShowCourseForm] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  
  const router = useRouter();
  const params = useParams();
  const courseId = params.courseId as string;

  useEffect(() => {
    fetchCourseDetails();
  }, [courseId]);

  const fetchCourseDetails = async () => {
    try {
      const response = await fetch(`/api/teacher/courses/${courseId}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch course');
      }
      
      setCourse(data.course);
    } catch (error) {
      console.error('Error fetching course:', error);
      router.push('/teacher-dashboard/courses');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCourse = async (courseData: Partial<Course>) => {
    setFormLoading(true);
    
    try {
      const response = await fetch('/api/teacher/courses', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...courseData,
          course_id: courseId
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update course');
      }
      
      // Refresh course details
      await fetchCourseDetails();
      setShowCourseForm(false);
    } catch (error) {
      console.error('Error updating course:', error);
      throw error;
    } finally {
      setFormLoading(false);
    }
  };

  const handleTogglePublish = async () => {
    if (!course) return;
    
    try {
      const response = await fetch('/api/teacher/courses', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          course_id: courseId,
          is_published: !course.is_published
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update course');
      }
      
      // Refresh course details
      await fetchCourseDetails();
    } catch (error) {
      console.error('Error toggling publish status:', error);
      alert('Failed to update course status. Please try again.');
    }
  };

  const handleDeleteLesson = async (lessonId: string) => {
    if (!confirm('Are you sure you want to delete this lesson?')) {
      return;
    }
    
    try {
      const response = await fetch(
        `/api/teacher/courses/${courseId}/lessons?lessonId=${lessonId}`,
        { method: 'DELETE' }
      );
      
      if (!response.ok) {
        throw new Error('Failed to delete lesson');
      }
      
      // Refresh course details
      await fetchCourseDetails();
    } catch (error) {
      console.error('Error deleting lesson:', error);
      alert('Failed to delete lesson. Please try again.');
    }
  };

  const formatDuration = (seconds: number | null | undefined) => {
    if (!seconds) return 'Duration unknown';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getPlatformIcon = (platform: string | null | undefined) => {
    switch (platform) {
      case 'youtube':
        return '🎬';
      case 'vimeo':
        return '📹';
      case 'loom':
        return '📺';
      default:
        return '🎥';
    }
  };

  if (loading) {
    return (
      <PageWrapper gradient>
        <Container>
          <LoadingContainer>
            <LoadingSpinner size="large" />
            <p>Loading course details...</p>
          </LoadingContainer>
        </Container>
      </PageWrapper>
    );
  }

  if (!course) {
    return null;
  }

  return (
    <PageWrapper gradient>
      <PageTransition>
        <Container size="large">
          <HeaderSection>
            <BackButton onClick={() => router.push('/teacher-dashboard/courses')}>
              <FiArrowLeft /> Back to Courses
            </BackButton>
            
            <TitleSection>
              <TitleGroup>
                <PageTitle>{course.title}</PageTitle>
                {course.description && (
                  <CourseDescription>{course.description}</CourseDescription>
                )}
                <MetaTags>
                  {course.subject && <MetaTag>{course.subject}</MetaTag>}
                  {course.year_group && <MetaTag>Year {course.year_group}</MetaTag>}
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
                </MetaTags>
              </TitleGroup>
              
              <ActionButtons>
                <ModernButton
                  variant="secondary"
                  onClick={() => setShowCourseForm(true)}
                >
                  <FiEdit /> Edit Details
                </ModernButton>
                <ModernButton
                  variant={course.is_published ? 'ghost' : 'primary'}
                  onClick={handleTogglePublish}
                >
                  {course.is_published ? (
                    <>
                      <FiEyeOff /> Unpublish
                    </>
                  ) : (
                    <>
                      <FiEye /> Publish
                    </>
                  )}
                </ModernButton>
              </ActionButtons>
            </TitleSection>
          </HeaderSection>

          <Section>
            <Grid cols={4} gap="md">
              <StatsCard
                icon={<FiBookOpen />}
                title="Total Lessons"
                value={course.lesson_count || 0}
                accentColor="primary"
              />
              <StatsCard
                icon={<FiUsers />}
                title="Enrolled Students"
                value={course.student_count || 0}
                accentColor="secondary"
              />
              <StatsCard
                icon={<FiGrid />}
                title="Completion Rate"
                value={`${0}%`}
                accentColor="success"
              />
              <StatsCard
                icon={<FiBarChart />}
                title="Average Progress"
                value={`${0}%`}
                accentColor="warning"
              />
            </Grid>
          </Section>

          <LessonsSection>
            <SectionHeader>
              <SectionTitle>Course Lessons</SectionTitle>
              <ModernButton
                variant="primary"
                onClick={() => router.push(`/teacher-dashboard/courses/${courseId}/lessons/new`)}
              >
                <FiPlus /> Add Lesson
              </ModernButton>
            </SectionHeader>

            {course.course_lessons && course.course_lessons.length > 0 ? (
              <LessonsList>
                {course.course_lessons.map((lesson) => (
                  <LessonCard key={lesson.lesson_id}>
                    <LessonCardContent>
                      <LessonOrder>{lesson.lesson_order}</LessonOrder>
                      
                      <LessonInfo>
                        <LessonTitle 
                          onClick={() => window.open(`/student/courses/${courseId}/lessons/${lesson.lesson_id}`, '_blank')}
                          title="Click to preview lesson"
                        >
                          {lesson.title}
                        </LessonTitle>
                        <LessonMeta>
                          <span>
                            {getPlatformIcon(lesson.video_platform)} {lesson.video_platform}
                          </span>
                          <span>
                            <FiClock /> {formatDuration(lesson.video_duration)}
                          </span>
                          {(lesson as any).completion_count !== undefined && (
                            <span>
                              <FiUsers /> {(lesson as any).completion_count} completed
                            </span>
                          )}
                        </LessonMeta>
                      </LessonInfo>
                      
                      <LessonActions>
                        <IconButton
                          onClick={() => router.push(`/teacher-dashboard/courses/${courseId}/lessons/${lesson.lesson_id}`)}
                          title="Edit lesson"
                        >
                          <FiEdit />
                        </IconButton>
                        <IconButton
                          onClick={() => handleDeleteLesson(lesson.lesson_id)}
                          title="Delete lesson"
                        >
                          <FiTrash2 />
                        </IconButton>
                      </LessonActions>
                    </LessonCardContent>
                  </LessonCard>
                ))}
              </LessonsList>
            ) : (
              <EmptyState>
                <h3>No lessons yet</h3>
                <p>Add your first video lesson to get started</p>
                <ModernButton
                  variant="primary"
                  onClick={() => router.push(`/teacher-dashboard/courses/${courseId}/lessons/new`)}
                >
                  <FiPlus /> Create First Lesson
                </ModernButton>
              </EmptyState>
            )}
          </LessonsSection>

          <AnimatePresence>
            {showCourseForm && (
              <CourseForm
                course={course}
                onSubmit={handleUpdateCourse}
                onCancel={() => setShowCourseForm(false)}
                isLoading={formLoading}
              />
            )}
          </AnimatePresence>
        </Container>
      </PageTransition>
    </PageWrapper>
  );
}