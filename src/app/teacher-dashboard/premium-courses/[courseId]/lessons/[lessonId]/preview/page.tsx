'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { 
  FiArrowLeft, 
  FiClock,
  FiDownload,
  FiFileText,
  FiVideo,
  FiEye
} from 'react-icons/fi';
import { ModernButton } from '@/components/shared/ModernButton';
import { PageTransition } from '@/components/shared/PageTransition';
import { VideoPlayerWithTracking } from '@/components/shared/VideoPlayerWithTracking';
import { 
  PageWrapper, 
  Container, 
  Text
} from '@/components/ui';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import { LessonNotes } from '@/components/premium/LessonNotes';
import { LessonProgress } from '@/components/premium/LessonProgress';
import { ResourcesList as ResourcesListComponent } from '@/components/premium/ResourcesList';

const PreviewBanner = styled.div`
  background: linear-gradient(135deg, #8B5CF6, #EC4899);
  color: white;
  padding: 16px;
  text-align: center;
  margin-bottom: 32px;
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
  
  h3 {
    margin: 0 0 8px 0;
    font-size: 18px;
    font-weight: 600;
  }
  
  p {
    margin: 0;
    font-size: 14px;
    opacity: 0.9;
  }
`;

const StudentLayout = styled.div`
  display: grid;
  grid-template-columns: 1fr 300px;
  gap: 40px;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.desktop}) {
    grid-template-columns: 1fr;
    gap: 32px;
  }
`;

const MainContent = styled.div`
  min-height: 100vh;
`;

const Sidebar = styled.div`
  @media (max-width: ${({ theme }) => theme.breakpoints.desktop}) {
    order: -1;
  }
`;

const BackButton = styled(ModernButton)`
  margin-bottom: 24px;
`;

const LessonHeader = styled.div`
  background: white;
  border-radius: 16px;
  padding: 32px;
  margin-bottom: 32px;
  border: 1px solid rgba(152, 93, 215, 0.1);
  box-shadow: 0 2px 8px rgba(152, 93, 215, 0.05);
`;

const LessonTitle = styled.h1`
  font-size: 28px;
  font-weight: 700;
  margin: 0 0 16px 0;
  color: ${({ theme }) => theme.colors.text};
  line-height: 1.2;
`;

const LessonMeta = styled.div`
  display: flex;
  gap: 16px;
  align-items: center;
  margin-bottom: 16px;
  flex-wrap: wrap;
`;

const MetaItem = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.textLight};
  
  svg {
    width: 16px;
    height: 16px;
  }
`;

const LessonDescription = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.textLight};
  font-size: 16px;
  line-height: 1.5;
`;

const VideoContainer = styled.div`
  background: white;
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid rgba(152, 93, 215, 0.1);
  box-shadow: 0 2px 8px rgba(152, 93, 215, 0.05);
  margin-bottom: 32px;
`;

const VideoPlayer = styled.div`
  position: relative;
  width: 100%;
  height: 400px;
  background: #000;
  
  video {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
`;

const VideoPlaceholder = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #8B5CF6, #EC4899);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: white;
  
  svg {
    width: 64px;
    height: 64px;
    margin-bottom: 16px;
    opacity: 0.8;
  }
  
  h3 {
    margin: 0 0 8px 0;
    font-size: 20px;
    font-weight: 600;
  }
  
  p {
    margin: 0;
    font-size: 14px;
    opacity: 0.8;
  }
`;

const LessonContent = styled.div`
  background: white;
  border-radius: 16px;
  padding: 32px;
  border: 1px solid rgba(152, 93, 215, 0.1);
  box-shadow: 0 2px 8px rgba(152, 93, 215, 0.05);
`;

const ContentSection = styled.div`
  margin-bottom: 32px;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const SectionTitle = styled.h3`
  margin: 0 0 16px 0;
  font-size: 18px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
`;

const ResourcesList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const ResourceItem = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: rgba(250, 248, 254, 0.5);
  border-radius: 8px;
  border: 1px solid rgba(152, 93, 215, 0.1);
  
  svg {
    color: ${({ theme }) => theme.colors.primary};
  }
  
  .resource-info {
    flex: 1;
    
    .resource-name {
      font-size: 14px;
      font-weight: 500;
      color: ${({ theme }) => theme.colors.text};
      margin-bottom: 2px;
    }
    
    .resource-size {
      font-size: 12px;
      color: ${({ theme }) => theme.colors.textLight};
    }
  }
`;

const SidebarCard = styled.div`
  background: white;
  border-radius: 16px;
  padding: 24px;
  border: 1px solid rgba(152, 93, 215, 0.1);
  box-shadow: 0 2px 8px rgba(152, 93, 215, 0.05);
  margin-bottom: 24px;
  
  h3 {
    margin: 0 0 16px 0;
    font-size: 16px;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text};
  }
`;

const getLessonIcon = (type: string) => {
  switch (type) {
    case 'video': return FiVideo;
    case 'text': return FiFileText;
    default: return FiFileText;
  }
};

const formatDuration = (minutes: number) => {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export default function LessonStudentPreviewPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.courseId as string;
  const lessonId = params.lessonId as string;
  
  const [lesson, setLesson] = useState<any>(null);
  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (courseId && lessonId) {
      fetchLessonDetails();
    }
  }, [courseId, lessonId]);

  const fetchLessonDetails = async () => {
    try {
      // Fetch lesson details
      const lessonResponse = await fetch(`/api/premium/courses/${courseId}/lessons/${lessonId}`);
      const lessonData = await lessonResponse.json();
      
      if (!lessonResponse.ok) {
        throw new Error(lessonData.error || 'Failed to fetch lesson details');
      }
      
      // Fetch course details for context
      const courseResponse = await fetch(`/api/premium/courses/${courseId}`);
      const courseData = await courseResponse.json();
      
      if (!courseResponse.ok) {
        throw new Error(courseData.error || 'Failed to fetch course details');
      }
      
      setLesson(lessonData.lesson);
      setCourse(courseData.course);
    } catch (error) {
      console.error('Error fetching lesson details:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <PageWrapper gradient>
        <Container>
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column',
            justifyContent: 'center', 
            alignItems: 'center', 
            minHeight: '400px',
            gap: '16px'
          }}>
            <LoadingSpinner size="large" />
            <Text>Loading lesson preview...</Text>
          </div>
        </Container>
      </PageWrapper>
    );
  }

  if (!lesson || !course) {
    return (
      <PageWrapper gradient>
        <Container>
          <BackButton
            variant="ghost"
            onClick={() => window.close()}
          >
            <FiArrowLeft /> Close Preview
          </BackButton>
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <h2>Lesson not found</h2>
            <p>The lesson preview could not be loaded.</p>
          </div>
        </Container>
      </PageWrapper>
    );
  }

  const IconComponent = getLessonIcon(lesson.lesson_type);

  return (
    <PageWrapper gradient>
      <PageTransition>
        <Container size="large">
          <BackButton
            variant="ghost"
            onClick={() => window.close()}
          >
            <FiArrowLeft /> Close Preview
          </BackButton>

          <PreviewBanner>
            <h3><FiEye style={{ marginRight: '8px' }} />Student Preview Mode</h3>
            <p>This is how students will see this lesson. Close this tab to return to the teacher view.</p>
          </PreviewBanner>

          <StudentLayout>
            <MainContent>
              {/* Lesson Header */}
              <LessonHeader>
                <LessonMeta>
                  <MetaItem>
                    <IconComponent />
                    <span style={{ textTransform: 'capitalize' }}>{lesson.lesson_type} Lesson</span>
                  </MetaItem>
                  {lesson.estimated_duration_minutes && (
                    <MetaItem>
                      <FiClock />
                      <span>{formatDuration(lesson.estimated_duration_minutes)}</span>
                    </MetaItem>
                  )}
                </LessonMeta>
                
                <LessonTitle>{lesson.title}</LessonTitle>
                
                {lesson.description && (
                  <LessonDescription>{lesson.description}</LessonDescription>
                )}
              </LessonHeader>

              {/* Video Player (for video lessons) */}
              {lesson.lesson_type === 'video' && (
                <VideoContainer>
                  <VideoPlayer>
                    {lesson.video_url ? (
                      <VideoPlayerWithTracking
                        videoId={lesson.video_url}
                        videoServerUrl={process.env.NEXT_PUBLIC_VIDEO_SERVER_URL}
                        courseId={courseId}
                        lessonId={lessonId}
                        trackProgress={true}
                        onProgress={(progress) => {
                          console.log('Video progress:', progress);
                        }}
                      />
                    ) : (
                      <VideoPlaceholder>
                        <FiVideo />
                        <h3>No Video Available</h3>
                        <p>This lesson doesn't have a video yet</p>
                      </VideoPlaceholder>
                    )}
                  </VideoPlayer>
                </VideoContainer>
              )}

              {/* Notes Section - Now under video */}
              <div style={{ marginBottom: '32px' }}>
                <LessonNotes
                  courseId={courseId}
                  lessonId={lessonId}
                  currentVideoTime={0}
                  isTeacher={false}
                />
              </div>

              {/* Lesson Content */}
              <LessonContent>
                {lesson.content_data?.content && (
                  <ContentSection>
                    <SectionTitle>Lesson Content</SectionTitle>
                    <div dangerouslySetInnerHTML={{ __html: lesson.content_data.content }} />
                  </ContentSection>
                )}
              </LessonContent>
            </MainContent>

            <Sidebar>
              {/* Course Context */}
              <SidebarCard>
                <h3>Course Information</h3>
                <div style={{ fontSize: '14px', color: '#666' }}>
                  <div style={{ marginBottom: '8px' }}>
                    <strong>Course:</strong> {course.title}
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    <strong>Lesson Type:</strong> {lesson.lesson_type}
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    <strong>Duration:</strong> {lesson.estimated_duration_minutes ? `${lesson.estimated_duration_minutes} min` : 'Not set'}
                  </div>
                  <div>
                    <strong>Access:</strong> {lesson.is_preview ? 'Free Preview' : 'Premium Only'}
                  </div>
                </div>
              </SidebarCard>

              {/* Progress Tracking */}
              <LessonProgress
                courseId={courseId}
                lessonId={lessonId}
                isTeacher={false}
              />

              {/* Downloadable Resources - At bottom of sidebar */}
              {lesson.downloadable_resources?.length > 0 && (
                <div style={{ marginTop: '24px' }}>
                  <ResourcesListComponent
                    resources={lesson.downloadable_resources}
                    title="Lesson Resources"
                    compact={true}
                  />
                </div>
              )}
            </Sidebar>
          </StudentLayout>
        </Container>
      </PageTransition>
    </PageWrapper>
  );
}