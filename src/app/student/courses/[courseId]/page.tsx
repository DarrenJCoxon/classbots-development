'use client';

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useRouter, useParams } from 'next/navigation';
import { FiArrowLeft, FiClock, FiPlayCircle, FiBookOpen } from 'react-icons/fi';
import { ModernButton } from '@/components/shared/ModernButton';
import { ModernStudentNav } from '@/components/student/ModernStudentNav';
import type { CourseWithDetails } from '@/types/database.types';
import LoadingSpinner from '@/components/shared/LoadingSpinner';

const PageWrapper = styled.div`
  display: flex;
  min-height: 100vh;
  width: 100%;
  position: relative;
  background: ${({ theme }) => theme.colors.background};
  
  /* Background gradients */
  background-image: 
    radial-gradient(circle at 20% 50%, rgba(76, 190, 243, 0.03) 0%, transparent 50%),
    radial-gradient(circle at 80% 80%, rgba(152, 93, 215, 0.03) 0%, transparent 50%),
    radial-gradient(circle at 40% 20%, rgba(200, 72, 175, 0.03) 0%, transparent 50%);
`;

const MainContent = styled.div`
  flex: 1;
  width: 100%;
  padding: 40px 0;
  margin-left: 80px;
  transition: margin-left 0.3s ease;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    margin-left: 0;
    padding-bottom: 80px;
  }
`;

const Container = styled.div`
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    padding: 0 16px;
  }
`;

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

const LessonsSection = styled.div`
  margin-top: 40px;
`;

const SectionTitle = styled.h2`
  margin: 0 0 24px 0;
  font-size: 24px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text};
`;

const LessonsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const LessonCard = styled.div`
  padding: 0;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(20px);
  border-radius: 16px;
  border: 1px solid rgba(152, 93, 215, 0.1);
  box-shadow: 0 8px 32px rgba(152, 93, 215, 0.05);
  transition: all 0.3s ease;
  cursor: pointer;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 40px rgba(152, 93, 215, 0.15);
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

const PlayIcon = styled.div`
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, 
    ${({ theme }) => theme.colors.primary}, 
    ${({ theme }) => theme.colors.magenta}
  );
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  flex-shrink: 0;
  
  svg {
    width: 20px;
    height: 20px;
    margin-left: 2px;
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

export default function StudentCourseDetailPage() {
  const [course, setCourse] = useState<CourseWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const router = useRouter();
  const params = useParams();
  const courseId = params.courseId as string;

  useEffect(() => {
    fetchCourseDetails();
  }, [courseId]);

  const fetchCourseDetails = async () => {
    try {
      setLoading(true);
      // Use the teacher API endpoint since it's the same data structure we need
      const response = await fetch(`/api/teacher/courses/${courseId}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch course');
      }
      
      // Only show published courses to students
      if (!data.course.is_published) {
        throw new Error('Course not available');
      }
      
      setCourse(data.course);
    } catch (error) {
      console.error('Error fetching course:', error);
      setError(error instanceof Error ? error.message : 'Failed to load course');
    } finally {
      setLoading(false);
    }
  };

  const handleLessonClick = (lessonId: string) => {
    router.push(`/student/courses/${courseId}/lessons/${lessonId}`);
  };

  const handleBack = () => {
    router.back();
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
      <PageWrapper>
        <ModernStudentNav />
        <MainContent>
          <Container>
            <LoadingContainer>
              <LoadingSpinner size="large" />
              <p>Loading course...</p>
            </LoadingContainer>
          </Container>
        </MainContent>
      </PageWrapper>
    );
  }

  if (error || !course) {
    return (
      <PageWrapper>
        <ModernStudentNav />
        <MainContent>
          <Container>
            <HeaderSection>
              <BackButton onClick={handleBack}>
                <FiArrowLeft /> Back
              </BackButton>
            </HeaderSection>
            <EmptyState>
              <h3>Course not available</h3>
              <p>{error || 'This course could not be found or is not published.'}</p>
              <ModernButton variant="primary" onClick={handleBack}>
                Go Back
              </ModernButton>
            </EmptyState>
          </Container>
        </MainContent>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <ModernStudentNav />
      <MainContent>
        <Container>
          <HeaderSection>
            <BackButton onClick={handleBack}>
              <FiArrowLeft /> Back
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
                  <MetaTag>
                    <FiBookOpen /> {course.lesson_count || 0} Lessons
                  </MetaTag>
                </MetaTags>
              </TitleGroup>
            </TitleSection>
          </HeaderSection>

          <LessonsSection>
            <SectionTitle>Course Lessons</SectionTitle>

            {course.course_lessons && course.course_lessons.length > 0 ? (
              <LessonsList>
                {course.course_lessons.map((lesson) => (
                  <LessonCard 
                    key={lesson.lesson_id}
                    onClick={() => handleLessonClick(lesson.lesson_id)}
                  >
                    <LessonCardContent>
                      <LessonOrder>{lesson.lesson_order}</LessonOrder>
                      
                      <LessonInfo>
                        <LessonTitle>{lesson.title}</LessonTitle>
                        <LessonMeta>
                          <span>
                            {getPlatformIcon(lesson.video_platform)} {lesson.video_platform}
                          </span>
                          <span>
                            <FiClock /> {formatDuration(lesson.video_duration)}
                          </span>
                        </LessonMeta>
                      </LessonInfo>
                      
                      <PlayIcon>
                        <FiPlayCircle />
                      </PlayIcon>
                    </LessonCardContent>
                  </LessonCard>
                ))}
              </LessonsList>
            ) : (
              <EmptyState>
                <h3>No lessons available</h3>
                <p>This course doesn't have any lessons yet.</p>
              </EmptyState>
            )}
          </LessonsSection>
        </Container>
      </MainContent>
    </PageWrapper>
  );
}