'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiArrowLeft, 
  FiEdit, 
  FiPlus, 
  FiVideo,
  FiFileText,
  FiHelpCircle,
  FiClipboard,
  FiRadio,
  FiSettings,
  FiEye,
  FiUsers,
  FiBarChart,
  FiMoreVertical,
  FiTrash2,
  FiMove,
  FiPlay,
  FiClock,
  FiBookOpen,
  FiChevronDown,
  FiChevronRight
} from 'react-icons/fi';
import { ModernButton } from '@/components/shared/ModernButton';
import { PageTransition } from '@/components/shared/PageTransition';
import { ModuleForm } from '@/components/premium/ModuleForm';
import { LessonForm } from '@/components/teacher/LessonForm';
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
import type { PremiumCourseWithDetails } from '@/types/premium-course.types';

// Kajabi-style Clean Layout
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

// Clean Header Section
const CourseHeader = styled.div`
  background: white;
  border-radius: 16px;
  padding: 32px;
  margin-bottom: 32px;
  border: 1px solid rgba(152, 93, 215, 0.1);
  box-shadow: 0 2px 8px rgba(152, 93, 215, 0.05);
`;

const HeaderTop = styled.div`
  display: flex;
  justify-content: between;
  align-items: flex-start;
  gap: 24px;
  margin-bottom: 24px;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    flex-direction: column;
    gap: 16px;
  }
`;

const CourseInfo = styled.div`
  flex: 1;
`;

const StatusBadge = styled.div<{ $published: boolean }>`
  display: inline-flex;
  align-items: center;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 12px;
  background: ${({ $published, theme }) => 
    $published ? theme.colors.success + '20' : theme.colors.warning + '20'
  };
  color: ${({ $published, theme }) => 
    $published ? theme.colors.success : theme.colors.warning
  };
`;

const CourseTitle = styled.h1`
  font-size: 28px;
  font-weight: 700;
  margin: 0 0 8px 0;
  color: ${({ theme }) => theme.colors.text};
  line-height: 1.2;
`;

const CourseDescription = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.textLight};
  font-size: 16px;
  line-height: 1.5;
`;

const QuickStats = styled.div`
  display: flex;
  gap: 24px;
  margin-top: 20px;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    flex-wrap: wrap;
    gap: 16px;
  }
`;

const StatItem = styled.div`
  text-align: center;
  
  .stat-value {
    font-size: 20px;
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text};
    margin-bottom: 4px;
  }
  
  .stat-label {
    font-size: 12px;
    color: ${({ theme }) => theme.colors.textLight};
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
`;

const HeaderActions = styled.div`
  display: flex;
  gap: 12px;
  flex-shrink: 0;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    width: 100%;
    justify-content: flex-start;
  }
`;

// Content Builder Section - Kajabi Style
const ContentBuilder = styled.div`
  background: white;
  border-radius: 16px;
  border: 1px solid rgba(152, 93, 215, 0.1);
  overflow: hidden;
`;

const BuilderHeader = styled.div`
  padding: 24px 32px;
  border-bottom: 1px solid rgba(152, 93, 215, 0.1);
  background: rgba(250, 248, 254, 0.3);
  
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const BuilderTitle = styled.h2`
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
`;

const BuilderBody = styled.div`
  padding: 0;
`;

// Module Cards - Clean Kajabi Style
const ModuleContainer = styled.div`
  border-bottom: 1px solid rgba(152, 93, 215, 0.05);
  
  &:last-child {
    border-bottom: none;
  }
`;

const ModuleHeader = styled.div`
  padding: 24px 32px;
  display: flex;
  align-items: center;
  gap: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(250, 248, 254, 0.5);
  }
`;

const ModuleExpander = styled.div<{ $expanded: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 6px;
  background: rgba(152, 93, 215, 0.1);
  transition: all 0.2s ease;
  
  svg {
    width: 14px;
    height: 14px;
    color: ${({ theme }) => theme.colors.primary};
    transform: ${({ $expanded }) => $expanded ? 'rotate(90deg)' : 'rotate(0deg)'};
    transition: transform 0.2s ease;
  }
`;

const ModuleInfo = styled.div`
  flex: 1;
`;

const ModuleTitle = styled.h3`
  margin: 0 0 4px 0;
  font-size: 16px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
`;

const ModuleStats = styled.div`
  font-size: 14px;
  color: ${({ theme }) => theme.colors.textLight};
  display: flex;
  gap: 16px;
`;

const ModuleActions = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
  opacity: 0;
  transition: opacity 0.2s ease;
  
  ${ModuleContainer}:hover & {
    opacity: 1;
  }
`;

const ModuleLessons = styled(motion.div)`
  background: rgba(250, 248, 254, 0.3);
  border-top: 1px solid rgba(152, 93, 215, 0.1);
`;

// Lesson Items - Clean List Style
const LessonsList = styled.div`
  padding: 0;
`;

const LessonItem = styled.div`
  padding: 16px 32px 16px 72px;
  display: flex;
  align-items: center;
  gap: 16px;
  border-bottom: 1px solid rgba(152, 93, 215, 0.05);
  transition: all 0.2s ease;
  cursor: pointer;
  
  &:hover {
    background: rgba(255, 255, 255, 0.7);
  }
  
  &:last-child {
    border-bottom: none;
  }
`;

const LessonIcon = styled.div<{ $type: string }>`
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ $type, theme }) => {
    switch ($type) {
      case 'video': return theme.colors.primary + '15';
      case 'text': return theme.colors.success + '15';
      case 'quiz': return theme.colors.warning + '15';
      case 'assignment': return theme.colors.red + '15';
      case 'live': return theme.colors.magenta + '15';
      default: return theme.colors.textLight + '15';
    }
  }};
  
  svg {
    width: 16px;
    height: 16px;
    color: ${({ $type, theme }) => {
      switch ($type) {
        case 'video': return theme.colors.primary;
        case 'text': return theme.colors.success;
        case 'quiz': return theme.colors.warning;
        case 'assignment': return theme.colors.red;
        case 'live': return theme.colors.magenta;
        default: return theme.colors.textLight;
      }
    }};
  }
`;

const LessonContent = styled.div`
  flex: 1;
`;

const LessonTitle = styled.div`
  font-size: 15px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: 4px;
`;

const LessonMeta = styled.div`
  font-size: 13px;
  color: ${({ theme }) => theme.colors.textLight};
  display: flex;
  gap: 12px;
  align-items: center;
`;

const LessonActions = styled.div`
  display: flex;
  gap: 4px;
  align-items: center;
  opacity: 0;
  transition: opacity 0.2s ease;
  
  ${LessonItem}:hover & {
    opacity: 1;
  }
`;

const ActionButton = styled.button`
  background: none;
  border: none;
  padding: 8px;
  cursor: pointer;
  border-radius: 6px;
  color: ${({ theme }) => theme.colors.textLight};
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(152, 93, 215, 0.1);
    color: ${({ theme }) => theme.colors.primary};
  }
  
  svg {
    width: 16px;
    height: 16px;
  }
`;

const AddLessonButton = styled.button`
  width: 100%;
  padding: 16px 32px 16px 72px;
  background: none;
  border: none;
  cursor: pointer;
  text-align: left;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.primary};
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 8px;
  
  &:hover {
    background: rgba(152, 93, 215, 0.05);
  }
  
  svg {
    width: 16px;
    height: 16px;
  }
`;

// Empty State
const EmptyState = styled.div`
  text-align: center;
  padding: 80px 40px;
  color: ${({ theme }) => theme.colors.textLight};
  
  svg {
    width: 64px;
    height: 64px;
    margin-bottom: 24px;
    opacity: 0.4;
  }
  
  h3 {
    font-size: 20px;
    font-weight: 600;
    margin: 0 0 12px 0;
    color: ${({ theme }) => theme.colors.text};
  }
  
  p {
    font-size: 16px;
    margin: 0 0 32px 0;
    line-height: 1.5;
  }
`;


const getLessonIcon = (type: string) => {
  switch (type) {
    case 'video': return FiVideo;
    case 'text': return FiFileText;
    case 'quiz': return FiHelpCircle;
    case 'assignment': return FiClipboard;
    case 'live': return FiRadio;
    default: return FiFileText;
  }
};

const formatDuration = (minutes: number) => {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
};

export default function CourseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const courseId = params.courseId as string;
  
  const [course, setCourse] = useState<PremiumCourseWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [modules, setModules] = useState<any[]>([]);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [showModuleForm, setShowModuleForm] = useState(false);
  const [showLessonForm, setShowLessonForm] = useState(false);
  const [editingModule, setEditingModule] = useState<any>(null);
  const [editingLesson, setEditingLesson] = useState<any>(null);
  const [selectedModuleId, setSelectedModuleId] = useState<string>('');
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    if (courseId) {
      fetchCourseDetails();
    }
  }, [courseId]);

  // Handle edit lesson query parameter
  useEffect(() => {
    const editLessonId = searchParams.get('editLesson');
    if (editLessonId && modules.length > 0) {
      // Find the lesson in all modules
      for (const module of modules) {
        const lesson = module.lessons?.find((l: any) => l.lesson_id === editLessonId);
        if (lesson) {
          handleEditLesson(lesson);
          // Remove the query parameter after opening the form
          router.replace(`/teacher-dashboard/premium-courses/${courseId}`);
          break;
        }
      }
    }
  }, [searchParams, modules, courseId, router]);

  const fetchCourseDetails = async () => {
    try {
      const response = await fetch(`/api/premium/courses/${courseId}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch course details');
      }
      
      setCourse(data.course);
      setModules(data.modules || []);
      
      // Expand all modules by default for better UX
      if (data.modules?.length > 0) {
        setExpandedModules(new Set(data.modules.map((m: any) => m.module_id)));
      }
    } catch (error) {
      console.error('Error fetching course details:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleModule = (moduleId: string) => {
    const newExpanded = new Set(expandedModules);
    if (newExpanded.has(moduleId)) {
      newExpanded.delete(moduleId);
    } else {
      newExpanded.add(moduleId);
    }
    setExpandedModules(newExpanded);
  };

  const handleCreateModule = () => {
    setEditingModule(null);
    setShowModuleForm(true);
  };

  const handleEditModule = (module: any) => {
    setEditingModule(module);
    setShowModuleForm(true);
  };

  const handleCreateLesson = (moduleId: string) => {
    setSelectedModuleId(moduleId);
    setEditingLesson(null);
    setShowLessonForm(true);
  };

  const handleEditLesson = (lesson: any) => {
    setSelectedModuleId(lesson.module_id);
    setEditingLesson(lesson);
    setShowLessonForm(true);
  };

  const handleViewLesson = (lesson: any) => {
    // Navigate to lesson preview page
    router.push(`/teacher-dashboard/premium-courses/${courseId}/lessons/${lesson.lesson_id}`);
  };

  const handleSubmitModule = async (moduleData: any) => {
    setFormLoading(true);
    try {
      const url = editingModule 
        ? `/api/premium/courses/${courseId}/modules/${editingModule.module_id}`
        : `/api/premium/courses/${courseId}/modules`;
      
      const method = editingModule ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...moduleData,
          course_id: courseId,
          module_order: editingModule?.module_order || modules.length + 1
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save module');
      }
      
      await fetchCourseDetails();
      setShowModuleForm(false);
      setEditingModule(null);
      
      // Show success message
      alert(`Module ${editingModule ? 'updated' : 'created'} successfully! 🎉`);
    } catch (error) {
      console.error('Error saving module:', error);
      throw error;
    } finally {
      setFormLoading(false);
    }
  };

  const handleSubmitLesson = async (lessonData: any) => {
    setFormLoading(true);
    try {
      const url = editingLesson 
        ? `/api/premium/courses/${courseId}/lessons/${editingLesson.lesson_id}`
        : `/api/premium/courses/${courseId}/lessons`;
      
      const method = editingLesson ? 'PUT' : 'POST';
      
      const module = modules.find(m => m.module_id === selectedModuleId);
      const lessonOrder = editingLesson?.lesson_order || (module?.lessons?.length || 0) + 1;
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...lessonData,
          course_id: courseId,
          module_id: selectedModuleId,
          lesson_order: lessonOrder
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save lesson');
      }
      
      await fetchCourseDetails();
      setShowLessonForm(false);
      setEditingLesson(null);
      setSelectedModuleId('');
      
      // Show success message
      alert(`Lesson ${editingLesson ? 'updated' : 'created'} successfully! 🎬`);
    } catch (error) {
      console.error('Error saving lesson:', error);
      throw error;
    } finally {
      setFormLoading(false);
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
            <Text>Loading course details...</Text>
          </div>
        </Container>
      </PageWrapper>
    );
  }

  if (!course) {
    return (
      <PageWrapper gradient>
        <Container>
          <BackButton
            variant="ghost"
            onClick={() => router.push('/teacher-dashboard/premium-courses')}
          >
            <FiArrowLeft /> Back to Courses
          </BackButton>
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <h2>Course not found</h2>
            <p>The course you're looking for doesn't exist or you don't have permission to view it.</p>
          </div>
        </Container>
      </PageWrapper>
    );
  }

  const totalLessons = modules.reduce((sum, module) => sum + (module.lessons?.length || 0), 0);
  const totalDuration = modules.reduce((sum, module) => 
    sum + (module.lessons?.reduce((lessonSum: number, lesson: any) => 
      lessonSum + (lesson.estimated_duration_minutes || 0), 0) || 0), 0
  );

  return (
    <PageWrapper gradient>
      <PageTransition>
        <Container size="large">
          <BackButton
            variant="ghost"
            onClick={() => router.push('/teacher-dashboard/premium-courses')}
          >
            <FiArrowLeft /> Back to Courses
          </BackButton>

          <PageLayout>
            <MainContent>
              {/* Clean Course Header */}
              <CourseHeader>
                <HeaderTop>
                  <CourseInfo>
                    <StatusBadge $published={course.is_published}>
                      {course.is_published ? 'Published' : 'Draft'}
                    </StatusBadge>
                    <CourseTitle>{course.title}</CourseTitle>
                    {course.short_description && (
                      <CourseDescription>{course.short_description}</CourseDescription>
                    )}
                    
                    <QuickStats>
                      <StatItem>
                        <div className="stat-value">{modules.length}</div>
                        <div className="stat-label">Modules</div>
                      </StatItem>
                      <StatItem>
                        <div className="stat-value">{totalLessons}</div>
                        <div className="stat-label">Lessons</div>
                      </StatItem>
                      <StatItem>
                        <div className="stat-value">{formatDuration(totalDuration)}</div>
                        <div className="stat-label">Duration</div>
                      </StatItem>
                      <StatItem>
                        <div className="stat-value">{course.total_enrollments}</div>
                        <div className="stat-label">Students</div>
                      </StatItem>
                    </QuickStats>
                  </CourseInfo>
                  
                  <HeaderActions>
                    <ModernButton variant="ghost" size="small">
                      <FiEye /> Preview
                    </ModernButton>
                    <ModernButton variant="secondary" size="small">
                      <FiUsers /> Students
                    </ModernButton>
                    <ModernButton variant="secondary" size="small">
                      <FiBarChart /> Analytics
                    </ModernButton>
                  </HeaderActions>
                </HeaderTop>
              </CourseHeader>

              {/* Content Builder - Kajabi Style */}
              <ContentBuilder>
                <BuilderHeader>
                  <BuilderTitle>Course Content</BuilderTitle>
                  <ModernButton
                    variant="primary"
                    size="small"
                    onClick={handleCreateModule}
                  >
                    <FiPlus /> Add Module
                  </ModernButton>
                </BuilderHeader>

                <BuilderBody>
                  {modules.length === 0 ? (
                    <EmptyState>
                      <FiBookOpen />
                      <h3>No modules yet</h3>
                      <p>Create your first module to start building your course content. Modules help organize your lessons into logical sections.</p>
                      <ModernButton
                        variant="primary"
                        onClick={handleCreateModule}
                      >
                        <FiPlus /> Create First Module
                      </ModernButton>
                    </EmptyState>
                  ) : (
                    <>
                      {modules.map((module, moduleIndex) => {
                        const isExpanded = expandedModules.has(module.module_id);
                        const lessons = module.lessons || [];
                        const moduleDuration = lessons.reduce((sum: number, lesson: any) => 
                          sum + (lesson.estimated_duration_minutes || 0), 0
                        );
                        
                        return (
                          <ModuleContainer key={module.module_id}>
                            <ModuleHeader onClick={() => toggleModule(module.module_id)}>
                              <ModuleExpander $expanded={isExpanded}>
                                <FiChevronRight />
                              </ModuleExpander>
                              
                              <ModuleInfo>
                                <ModuleTitle>{module.title}</ModuleTitle>
                                <ModuleStats>
                                  <span>{lessons.length} lessons</span>
                                  {moduleDuration > 0 && (
                                    <span>{formatDuration(moduleDuration)}</span>
                                  )}
                                  {module.is_preview && (
                                    <span style={{ color: '#8B5CF6' }}>Preview</span>
                                  )}
                                </ModuleStats>
                              </ModuleInfo>
                              
                              <ModuleActions onClick={(e) => e.stopPropagation()}>
                                <ActionButton onClick={() => handleEditModule(module)}>
                                  <FiEdit />
                                </ActionButton>
                                <ActionButton onClick={() => handleCreateLesson(module.module_id)}>
                                  <FiPlus />
                                </ActionButton>
                                <ActionButton>
                                  <FiMove />
                                </ActionButton>
                              </ModuleActions>
                            </ModuleHeader>

                            <AnimatePresence>
                              {isExpanded && (
                                <ModuleLessons
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.3 }}
                                >
                                  <LessonsList>
                                    {lessons.map((lesson: any, lessonIndex: number) => {
                                      const IconComponent = getLessonIcon(lesson.lesson_type);
                                      
                                      return (
                                        <LessonItem 
                                          key={lesson.lesson_id}
                                          onClick={() => handleViewLesson(lesson)}
                                        >
                                          <LessonIcon $type={lesson.lesson_type}>
                                            <IconComponent />
                                          </LessonIcon>
                                          
                                          <LessonContent>
                                            <LessonTitle>{lesson.title}</LessonTitle>
                                            <LessonMeta>
                                              <span style={{ textTransform: 'capitalize' }}>
                                                {lesson.lesson_type}
                                              </span>
                                              {lesson.estimated_duration_minutes && (
                                                <span>
                                                  <FiClock size={12} style={{ marginRight: '4px' }} />
                                                  {formatDuration(lesson.estimated_duration_minutes)}
                                                </span>
                                              )}
                                              {lesson.is_preview && (
                                                <Badge $variant="info" style={{ fontSize: '11px' }}>
                                                  Preview
                                                </Badge>
                                              )}
                                            </LessonMeta>
                                          </LessonContent>
                                          
                                          <LessonActions onClick={(e) => e.stopPropagation()}>
                                            <ActionButton onClick={() => handleEditLesson(lesson)}>
                                              <FiEdit />
                                            </ActionButton>
                                            <ActionButton>
                                              <FiMove />
                                            </ActionButton>
                                          </LessonActions>
                                        </LessonItem>
                                      );
                                    })}
                                    
                                    <AddLessonButton onClick={() => handleCreateLesson(module.module_id)}>
                                      <FiPlus />
                                      Add lesson
                                    </AddLessonButton>
                                  </LessonsList>
                                </ModuleLessons>
                              )}
                            </AnimatePresence>
                          </ModuleContainer>
                        );
                      })}
                    </>
                  )}
                </BuilderBody>
              </ContentBuilder>
            </MainContent>

            <Sidebar>
              {/* Course Settings Panel */}
              <Card>
                <CardBody>
                  <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600' }}>
                    Course Settings
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <ModernButton variant="secondary" size="small">
                      <FiSettings /> General Settings
                    </ModernButton>
                    <ModernButton variant="secondary" size="small">
                      <FiUsers /> Enrollment Settings
                    </ModernButton>
                    <ModernButton variant="secondary" size="small">
                      <FiEye /> Preview Course
                    </ModernButton>
                  </div>
                </CardBody>
              </Card>

              {/* Quick Stats */}
              <Card>
                <CardBody>
                  <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600' }}>
                    Quick Stats
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '14px', color: '#666' }}>Completion Rate</span>
                      <span style={{ fontWeight: '600' }}>76%</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '14px', color: '#666' }}>Avg. Rating</span>
                      <span style={{ fontWeight: '600' }}>4.8 ⭐</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '14px', color: '#666' }}>Last Updated</span>
                      <span style={{ fontWeight: '600' }}>2 days ago</span>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </Sidebar>
          </PageLayout>

          {/* Modal Forms */}
          <AnimatePresence>
            {showModuleForm && (
              <ModuleForm
                courseId={courseId}
                module={editingModule}
                moduleOrder={modules.length + 1}
                onSubmit={handleSubmitModule}
                onCancel={() => {
                  setShowModuleForm(false);
                  setEditingModule(null);
                }}
                isLoading={formLoading}
              />
            )}
          </AnimatePresence>

          <AnimatePresence>
            {showLessonForm && (
              <LessonForm
                courseId={courseId}
                moduleId={selectedModuleId}
                lesson={editingLesson}
                lessonOrder={
                  modules.find(m => m.module_id === selectedModuleId)?.lessons?.length + 1 || 1
                }
                onSubmit={handleSubmitLesson}
                onCancel={() => {
                  setShowLessonForm(false);
                  setEditingLesson(null);
                  setSelectedModuleId('');
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