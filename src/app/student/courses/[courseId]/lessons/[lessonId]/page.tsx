'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import styled from 'styled-components';
import { FiArrowLeft, FiArrowRight, FiClock, FiDownload, FiFile } from 'react-icons/fi';
import { PageWrapper, Container } from '@/components/ui';
import { PageTransition } from '@/components/shared/PageTransition';
import { VideoPlayerWithTracking } from '@/components/shared/VideoPlayerWithTracking';
import { parseVideoUrl } from '@/lib/utils/video-utils';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import type { CourseLesson, Course } from '@/types/database.types';

const NavigationBar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  gap: 16px;
`;

const NavButton = styled.button<{ $variant?: 'back' | 'next' }>`
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
  
  &:hover {
    color: ${({ theme }) => theme.colors.primary};
    border-color: rgba(152, 93, 215, 0.3);
    transform: ${({ $variant }) => 
      $variant === 'back' ? 'translateX(-2px)' : 
      $variant === 'next' ? 'translateX(2px)' : 
      'translateY(-1px)'
    };
  }
  
  svg {
    transition: transform 0.2s ease;
  }
  
  &:hover svg {
    transform: ${({ $variant }) => 
      $variant === 'back' ? 'translateX(-2px)' : 
      $variant === 'next' ? 'translateX(2px)' : 
      'none'
    };
  }
`;

const LessonHeader = styled.div`
  margin-bottom: 32px;
`;

const LessonTitle = styled.h1`
  margin: 0 0 8px 0;
  font-size: 32px;
  font-weight: 700;
  background: linear-gradient(135deg, 
    ${({ theme }) => theme.colors.primary}, 
    ${({ theme }) => theme.colors.magenta}
  );
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    font-size: 24px;
  }
`;

const LessonMeta = styled.div`
  display: flex;
  gap: 16px;
  align-items: center;
  color: ${({ theme }) => theme.colors.textLight};
  font-size: 14px;
  margin-bottom: 16px;
  
  svg {
    width: 16px;
    height: 16px;
    color: ${({ theme }) => theme.colors.primary};
  }
`;

const CourseInfo = styled.div`
  padding: 16px;
  background: rgba(152, 93, 215, 0.05);
  border: 1px solid rgba(152, 93, 215, 0.1);
  border-radius: 12px;
  margin-bottom: 24px;
  
  h3 {
    margin: 0 0 4px 0;
    font-size: 16px;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text};
  }
  
  p {
    margin: 0;
    font-size: 14px;
    color: ${({ theme }) => theme.colors.textLight};
  }
`;

const VideoSection = styled.div`
  margin-bottom: 32px;
`;

const ContentSection = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 32px;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    grid-template-columns: 1fr;
    gap: 24px;
  }
`;

const MainContent = styled.div``;

const Sidebar = styled.div``;

const DescriptionCard = styled.div`
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(152, 93, 215, 0.1);
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 24px;
  
  h3 {
    margin: 0 0 16px 0;
    font-size: 20px;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text};
  }
  
  .content {
    line-height: 1.6;
    color: ${({ theme }) => theme.colors.text};
    
    ul {
      margin: 8px 0;
      padding-left: 24px;
    }
    
    ol {
      margin: 8px 0;
      padding-left: 24px;
    }
    
    strong {
      font-weight: 600;
    }
    
    em {
      font-style: italic;
    }
  }
`;

const DocumentsCard = styled.div`
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(152, 93, 215, 0.1);
  border-radius: 16px;
  padding: 24px;
  
  h3 {
    margin: 0 0 16px 0;
    font-size: 20px;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text};
  }
`;

const DocumentItem = styled.a`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: rgba(152, 93, 215, 0.05);
  border: 1px solid rgba(152, 93, 215, 0.1);
  border-radius: 10px;
  text-decoration: none;
  color: ${({ theme }) => theme.colors.text};
  transition: all 0.2s ease;
  margin-bottom: 8px;
  
  &:hover {
    background: rgba(152, 93, 215, 0.1);
    transform: translateY(-1px);
  }
  
  svg {
    width: 20px;
    height: 20px;
    color: ${({ theme }) => theme.colors.primary};
    flex-shrink: 0;
  }
  
  span {
    flex: 1;
    font-size: 14px;
    font-weight: 500;
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

const ErrorMessage = styled.div`
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
  }
`;

export default function StudentLessonPage() {
  const [lesson, setLesson] = useState<CourseLesson | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [allLessons, setAllLessons] = useState<CourseLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [videoReady, setVideoReady] = useState(false);
  
  const router = useRouter();
  const params = useParams();
  const courseId = params.courseId as string;
  const lessonId = params.lessonId as string;

  useEffect(() => {
    fetchLessonData();
  }, [courseId, lessonId]);

  const fetchLessonData = async () => {
    try {
      // Fetch course details with all lessons
      const courseResponse = await fetch(`/api/teacher/courses/${courseId}`);
      const courseData = await courseResponse.json();
      
      if (!courseResponse.ok) {
        throw new Error(courseData.error || 'Failed to fetch course');
      }
      
      setCourse(courseData.course);
      
      // Sort lessons by order and store them
      const sortedLessons = (courseData.course.course_lessons || []).sort(
        (a: CourseLesson, b: CourseLesson) => a.lesson_order - b.lesson_order
      );
      setAllLessons(sortedLessons);
      
      // Find current lesson
      const currentLesson = sortedLessons.find((l: CourseLesson) => l.lesson_id === lessonId);
      if (!currentLesson) {
        throw new Error('Lesson not found');
      }
      
      setLesson(currentLesson);
    } catch (error) {
      console.error('Error fetching lesson data:', error);
      setError('Failed to load lesson. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Set video ready state after lesson loads
  useEffect(() => {
    if (lesson && !loading) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        setVideoReady(true);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [lesson, loading]);

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

  // Navigation logic
  const getCurrentLessonIndex = () => {
    return allLessons.findIndex(l => l.lesson_id === lessonId);
  };

  const getPreviousLesson = () => {
    const currentIndex = getCurrentLessonIndex();
    return currentIndex > 0 ? allLessons[currentIndex - 1] : null;
  };

  const getNextLesson = () => {
    const currentIndex = getCurrentLessonIndex();
    return currentIndex >= 0 && currentIndex < allLessons.length - 1 
      ? allLessons[currentIndex + 1] 
      : null;
  };

  const handleBackNavigation = () => {
    const previousLesson = getPreviousLesson();
    if (previousLesson) {
      // Go to previous lesson
      router.push(`/student/courses/${courseId}/lessons/${previousLesson.lesson_id}`);
    } else {
      // Go back to course overview (teacher view for testing)
      router.push(`/teacher-dashboard/courses/${courseId}`);
    }
  };

  const handleNextNavigation = () => {
    const nextLesson = getNextLesson();
    if (nextLesson) {
      router.push(`/student/courses/${courseId}/lessons/${nextLesson.lesson_id}`);
    }
  };

  if (loading) {
    return (
      <PageWrapper gradient>
        <Container>
          <LoadingContainer>
            <LoadingSpinner size="large" />
            <p>Loading lesson...</p>
          </LoadingContainer>
        </Container>
      </PageWrapper>
    );
  }

  if (error || !lesson || !course) {
    return (
      <PageWrapper gradient>
        <Container>
          <ErrorMessage>
            <h3>Lesson Not Found</h3>
            <p>{error || 'The lesson you are looking for could not be found.'}</p>
          </ErrorMessage>
        </Container>
      </PageWrapper>
    );
  }

  const previousLesson = getPreviousLesson();
  const nextLesson = getNextLesson();

  return (
    <PageWrapper gradient>
      <PageTransition>
        <Container size="large">
          <NavigationBar>
            <NavButton 
              $variant="back" 
              onClick={handleBackNavigation}
              title={previousLesson ? `Previous: ${previousLesson.title}` : 'Back to Course'}
            >
              <FiArrowLeft /> 
              {previousLesson ? 'Previous Lesson' : 'Course Overview'}
            </NavButton>
            
            {nextLesson && (
              <NavButton 
                $variant="next" 
                onClick={handleNextNavigation}
                title={`Next: ${nextLesson.title}`}
              >
                Next Lesson
                <FiArrowRight />
              </NavButton>
            )}
          </NavigationBar>
          
          <LessonHeader>
            <CourseInfo>
              <h3>{course.title}</h3>
              <p>Lesson {lesson.lesson_order} of {(course as any).lesson_count || 'Unknown'}</p>
            </CourseInfo>
            
            <LessonTitle>{lesson.title}</LessonTitle>
            <LessonMeta>
              <span>
                {getPlatformIcon(lesson.video_platform)} {lesson.video_platform}
              </span>
              <span>
                <FiClock /> {formatDuration(lesson.video_duration)}
              </span>
            </LessonMeta>
          </LessonHeader>

          <VideoSection>
            {!videoReady ? (
              <div style={{ 
                width: '100%', 
                aspectRatio: '16/9',
                background: '#f5f5f5',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#666'
              }}>
                <LoadingSpinner size="medium" />
              </div>
            ) : (() => {
              const videoUrl = lesson.video_url || '';
              const videoInfo = parseVideoUrl(videoUrl);
              
              console.log('Video detection:', { videoUrl, platform: videoInfo.platform, embedUrl: videoInfo.embedUrl });
              
              // For external videos (YouTube/Vimeo), use iframe embed
              if (videoInfo.platform !== 'unknown' && videoInfo.embedUrl) {
                return (
                  <div style={{ 
                    width: '100%', 
                    aspectRatio: '16/9',
                    background: '#000',
                    borderRadius: '8px',
                    overflow: 'hidden'
                  }}>
                    <iframe
                      src={videoInfo.embedUrl}
                      style={{
                        width: '100%',
                        height: '100%',
                        border: 'none'
                      }}
                      allowFullScreen
                      title={lesson.title}
                    />
                  </div>
                );
              } else {
                // For self-hosted videos, use VideoPlayerWithTracking
                return (
                  <VideoPlayerWithTracking
                    videoId={videoUrl}
                    courseId={courseId}
                    lessonId={lessonId}
                    trackProgress={true}
                  />
                );
              }
            })()}
          </VideoSection>

          <ContentSection>
            <MainContent>
              {lesson.description && (
                <DescriptionCard>
                  <h3>Lesson Information</h3>
                  <div className="content">
                    {lesson.description.split('\n').map((line, index) => (
                      <p key={index} style={{ margin: '0 0 8px 0' }}>
                        {line || '\u00A0'}
                      </p>
                    ))}
                  </div>
                </DescriptionCard>
              )}
            </MainContent>
            
            <Sidebar>
              <DocumentsCard>
                <h3>Resources</h3>
                <p style={{ color: '#999', fontSize: '14px', margin: '0 0 16px 0' }}>
                  Additional materials for this lesson
                </p>
                
                {/* Placeholder for lesson documents */}
                <DocumentItem href="#" onClick={(e) => e.preventDefault()}>
                  <FiFile />
                  <span>Lesson Worksheet.pdf</span>
                  <FiDownload />
                </DocumentItem>
                
                <DocumentItem href="#" onClick={(e) => e.preventDefault()}>
                  <FiFile />
                  <span>Additional Reading.pdf</span>
                  <FiDownload />
                </DocumentItem>
                
                <p style={{ 
                  color: '#999', 
                  fontSize: '12px', 
                  margin: '16px 0 0 0', 
                  fontStyle: 'italic' 
                }}>
                  Note: Document upload functionality will be implemented in the next phase
                </p>
              </DocumentsCard>
            </Sidebar>
          </ContentSection>
        </Container>
      </PageTransition>
    </PageWrapper>
  );
}