'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiArrowLeft, 
  FiPlay,
  FiPause,
  FiVolume2,
  FiMaximize,
  FiSettings,
  FiEdit,
  FiClock,
  FiEye,
  FiDownload,
  FiFileText,
  FiVideo,
  FiX
} from 'react-icons/fi';
import { ModernButton } from '@/components/shared/ModernButton';
import { PageTransition } from '@/components/shared/PageTransition';
import { VideoPlayerWithTracking } from '@/components/shared/VideoPlayerWithTracking';
import { 
  PageWrapper, 
  Container, 
  PageTitle, 
  Text,
  Card,
  CardBody,
  Badge
} from '@/components/ui';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import { LessonNotes } from '@/components/premium/LessonNotes';
import { LessonProgress } from '@/components/premium/LessonProgress';
import { ResourcesList as ResourcesListComponent } from '@/components/premium/ResourcesList';

const PageLayout = styled.div`
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
  height: 400px; /* Fixed height instead of problematic aspect ratio */
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

// Settings Modal Components
const SettingsOverlay = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
`;

const SettingsModal = styled(motion.div)`
  background: white;
  border-radius: 20px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
  max-width: 600px;
  width: 100%;
  max-height: 80vh;
  overflow-y: auto;
`;

const SettingsHeader = styled.div`
  padding: 32px 32px 24px;
  border-bottom: 1px solid rgba(152, 93, 215, 0.1);
  position: relative;

  h2 {
    margin: 0;
    font-size: 24px;
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text};
  }
`;

const CloseButton = styled.button`
  position: absolute;
  top: 24px;
  right: 24px;
  background: rgba(152, 93, 215, 0.1);
  border: none;
  border-radius: 12px;
  padding: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(152, 93, 215, 0.2);
    transform: scale(1.05);
  }
  
  svg {
    width: 20px;
    height: 20px;
    color: ${({ theme }) => theme.colors.primary};
  }
`;

const SettingsBody = styled.div`
  padding: 32px;
`;

const SettingSection = styled.div`
  margin-bottom: 32px;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const SettingLabel = styled.label`
  display: block;
  font-size: 16px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: 8px;
`;

const SettingDescription = styled.p`
  font-size: 14px;
  color: ${({ theme }) => theme.colors.textLight};
  margin: 0 0 16px 0;
  line-height: 1.5;
`;

const ToggleSwitch = styled.div<{ $enabled: boolean }>`
  position: relative;
  width: 52px;
  height: 28px;
  background: ${({ $enabled, theme }) => 
    $enabled ? theme.colors.primary : 'rgba(152, 93, 215, 0.2)'
  };
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &::after {
    content: '';
    position: absolute;
    top: 2px;
    left: ${({ $enabled }) => $enabled ? '26px' : '2px'};
    width: 24px;
    height: 24px;
    background: white;
    border-radius: 50%;
    transition: all 0.3s ease;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
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

export default function LessonPreviewPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.courseId as string;
  const lessonId = params.lessonId as string;
  
  const [lesson, setLesson] = useState<any>(null);
  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

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
            <Text>Loading lesson...</Text>
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
            onClick={() => router.push(`/teacher-dashboard/premium-courses/${courseId}`)}
          >
            <FiArrowLeft /> Back to Course
          </BackButton>
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <h2>Lesson not found</h2>
            <p>The lesson you're looking for doesn't exist or you don't have permission to view it.</p>
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
            onClick={() => router.push(`/teacher-dashboard/premium-courses/${courseId}`)}
          >
            <FiArrowLeft /> Back to {course.title}
          </BackButton>

          <PageLayout>
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
                  {lesson.is_preview && (
                    <Badge $variant="info">Preview</Badge>
                  )}
                  {lesson.is_mandatory && (
                    <Badge $variant="primary">Mandatory</Badge>
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
                        trackProgress={false}
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
                  isTeacher={true}
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
              {/* Lesson Settings */}
              <Card>
                <CardBody>
                  <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600' }}>
                    Lesson Actions
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <ModernButton 
                      variant="primary" 
                      size="small"
                      onClick={() => router.push(`/teacher-dashboard/premium-courses/${courseId}?editLesson=${lessonId}`)}
                    >
                      <FiEdit /> Edit Lesson
                    </ModernButton>
                    <ModernButton 
                      variant="primary" 
                      size="small"
                      onClick={() => {
                        // Open in new tab to show student perspective
                        window.open(`/teacher-dashboard/premium-courses/${courseId}/lessons/${lessonId}/preview`, '_blank');
                      }}
                    >
                      <FiEye /> Student View
                    </ModernButton>
                    <ModernButton 
                      variant="primary" 
                      size="small"
                      onClick={() => setShowSettings(true)}
                    >
                      <FiSettings /> Settings
                    </ModernButton>
                  </div>
                </CardBody>
              </Card>

              {/* Lesson Info */}
              <Card>
                <CardBody>
                  <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600' }}>
                    Lesson Info
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '14px', color: '#666' }}>Type</span>
                      <span style={{ fontWeight: '600', textTransform: 'capitalize' }}>
                        {lesson.lesson_type}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '14px', color: '#666' }}>Duration</span>
                      <span style={{ fontWeight: '600' }}>
                        {lesson.estimated_duration_minutes 
                          ? formatDuration(lesson.estimated_duration_minutes)
                          : 'Not set'
                        }
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '14px', color: '#666' }}>Status</span>
                      <span style={{ fontWeight: '600' }}>
                        {lesson.is_preview ? 'Preview' : 'Full Access'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '14px', color: '#666' }}>Required</span>
                      <span style={{ fontWeight: '600' }}>
                        {lesson.is_mandatory ? 'Yes' : 'No'}
                      </span>
                    </div>
                  </div>
                </CardBody>
              </Card>

              {/* Student Progress Overview */}
              <div style={{ marginTop: '24px' }}>
                <LessonProgress
                  courseId={courseId}
                  lessonId={lessonId}
                  isTeacher={true}
                />
              </div>

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
          </PageLayout>
        </Container>
      </PageTransition>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <SettingsOverlay
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowSettings(false)}
          >
            <SettingsModal
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', damping: 25 }}
              onClick={(e) => e.stopPropagation()}
            >
              <SettingsHeader>
                <h2>Lesson Settings</h2>
                <CloseButton onClick={() => setShowSettings(false)}>
                  <FiX />
                </CloseButton>
              </SettingsHeader>

              <SettingsBody>
                <SettingSection>
                  <SettingLabel>Lesson Access</SettingLabel>
                  <SettingDescription>
                    Control whether this lesson is available as a free preview or requires course enrollment.
                  </SettingDescription>
                  <ToggleSwitch 
                    $enabled={lesson?.is_preview || false}
                    onClick={() => {
                      // This would update the lesson preview status
                      console.log('Toggle preview status');
                    }}
                  />
                  <span style={{ marginLeft: '12px', fontSize: '14px', color: '#666' }}>
                    {lesson?.is_preview ? 'Free Preview' : 'Enrollment Required'}
                  </span>
                </SettingSection>

                <SettingSection>
                  <SettingLabel>Mandatory Lesson</SettingLabel>
                  <SettingDescription>
                    Mark this lesson as mandatory for course completion. Students must complete mandatory lessons to receive a certificate.
                  </SettingDescription>
                  <ToggleSwitch 
                    $enabled={lesson?.is_mandatory || false}
                    onClick={() => {
                      // This would update the lesson mandatory status
                      console.log('Toggle mandatory status');
                    }}
                  />
                  <span style={{ marginLeft: '12px', fontSize: '14px', color: '#666' }}>
                    {lesson?.is_mandatory ? 'Required' : 'Optional'}
                  </span>
                </SettingSection>

                <SettingSection>
                  <SettingLabel>Lesson Information</SettingLabel>
                  <SettingDescription>
                    Quick overview of lesson details and metadata.
                  </SettingDescription>
                  <div style={{ 
                    background: 'rgba(152, 93, 215, 0.05)', 
                    padding: '16px', 
                    borderRadius: '12px',
                    fontSize: '14px'
                  }}>
                    <div style={{ marginBottom: '8px' }}>
                      <strong>Order:</strong> {lesson?.lesson_order || 'Not set'}
                    </div>
                    <div style={{ marginBottom: '8px' }}>
                      <strong>Type:</strong> {lesson?.lesson_type || 'Video'}
                    </div>
                    <div style={{ marginBottom: '8px' }}>
                      <strong>Duration:</strong> {lesson?.estimated_duration_minutes ? `${lesson.estimated_duration_minutes} minutes` : 'Not set'}
                    </div>
                    <div>
                      <strong>Resources:</strong> {lesson?.downloadable_resources?.length || 0} files
                    </div>
                  </div>
                </SettingSection>
              </SettingsBody>
            </SettingsModal>
          </SettingsOverlay>
        )}
      </AnimatePresence>
    </PageWrapper>
  );
}