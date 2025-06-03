'use client';

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiPlus, 
  FiSearch, 
  FiFilter, 
  FiGrid, 
  FiList, 
  FiDollarSign, 
  FiUsers, 
  FiClock, 
  FiStar,
  FiTrendingUp,
  FiTrendingDown,
  FiMoreVertical,
  FiEdit,
  FiCopy,
  FiTrash2,
  FiEye,
  FiBarChart,
  FiActivity,
  FiTarget,
  FiPercent,
  FiCalendar,
  FiPlay
} from 'react-icons/fi';
import { useRouter } from 'next/navigation';
import { ModernButton } from '@/components/shared/ModernButton';
import { PageTransition } from '@/components/shared/PageTransition';
import { PremiumCourseForm } from '@/components/premium/PremiumCourseForm';
import type { PremiumCourseWithDetails, CreatePremiumCourseData } from '@/types/premium-course.types';
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
  Heading,
  Badge,
  StatusBadge
} from '@/components/ui';
import LoadingSpinner from '@/components/shared/LoadingSpinner';

// Kajabi-inspired Dashboard Styles
const DashboardLayout = styled.div`
  display: grid;
  grid-template-columns: 1fr 300px;
  gap: 32px;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    grid-template-columns: 1fr;
    gap: 24px;
  }
`;

const MainContent = styled.div``;

const Sidebar = styled.div`
  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    order: -1;
  }
`;

const HeaderSection = styled.div`
  margin-bottom: 32px;
  
  h1 {
    margin-bottom: 8px;
  }
`;

const QuickActions = styled.div`
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
  flex-wrap: wrap;
`;

const QuickActionButton = styled(ModernButton)`
  flex: 1;
  min-width: 120px;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    min-width: 100%;
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 32px;
`;

const EnhancedStatsCard = styled(motion.div)`
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(152, 93, 215, 0.1);
  border-radius: 16px;
  padding: 24px;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 40px rgba(152, 93, 215, 0.15);
  }
`;

const StatHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
`;

const StatIcon = styled.div<{ $color: string }>`
  width: 48px;
  height: 48px;
  background: ${({ $color }) => $color}20;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  
  svg {
    width: 24px;
    height: 24px;
    color: ${({ $color }) => $color};
  }
`;

const TrendIndicator = styled.div<{ $trend: 'up' | 'down' | 'neutral' }>`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 600;
  color: ${({ $trend, theme }) => 
    $trend === 'up' ? theme.colors.success : 
    $trend === 'down' ? theme.colors.red : 
    theme.colors.textLight
  };
  
  svg {
    width: 14px;
    height: 14px;
  }
`;

const StatValue = styled.div`
  font-size: 32px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: 4px;
`;

const StatLabel = styled.div`
  font-size: 14px;
  color: ${({ theme }) => theme.colors.textLight};
  margin-bottom: 8px;
`;

const FilterBar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  gap: 16px;
  flex-wrap: wrap;
`;

const FilterGroup = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
`;

const FilterButton = styled.button<{ $isActive?: boolean }>`
  padding: 8px 16px;
  background: ${({ $isActive, theme }) => 
    $isActive ? `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.magenta})` : 'rgba(255, 255, 255, 0.9)'
  };
  color: ${({ $isActive, theme }) => $isActive ? 'white' : theme.colors.textLight};
  border: 1px solid rgba(152, 93, 215, 0.2);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: 500;
  
  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    color: ${({ $isActive, theme }) => $isActive ? 'white' : theme.colors.primary};
  }
`;

const SearchAndActions = styled.div`
  display: flex;
  gap: 12px;
  flex: 1;
  max-width: 400px;
`;

const CoursesContainer = styled.div``;

const CourseGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
  gap: 24px;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 20px;
  }
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    grid-template-columns: 1fr;
    gap: 16px;
  }
`;

const KajabiCourseCard = styled(motion.div)`
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(152, 93, 215, 0.1);
  border-radius: 16px;
  overflow: hidden;
  transition: all 0.3s ease;
  position: relative;
  
  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 48px rgba(152, 93, 215, 0.2);
  }
`;

const CourseImageContainer = styled.div`
  position: relative;
  height: 180px;
  background: linear-gradient(135deg, 
    ${({ theme }) => theme.colors.primary}20, 
    ${({ theme }) => theme.colors.magenta}20
  );
  overflow: hidden;
`;

const CourseImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const CourseImagePlaceholder = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 64px;
  opacity: 0.6;
`;

const CourseImageOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.7) 100%);
  display: flex;
  align-items: flex-end;
  padding: 16px;
  opacity: 0;
  transition: opacity 0.3s ease;
  
  ${KajabiCourseCard}:hover & {
    opacity: 1;
  }
`;

const PlayButton = styled.button`
  background: rgba(255, 255, 255, 0.9);
  border: none;
  border-radius: 50%;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    background: white;
    transform: scale(1.1);
  }
  
  svg {
    width: 20px;
    height: 20px;
    color: ${({ theme }) => theme.colors.primary};
    margin-left: 2px;
  }
`;

const CourseStatus = styled.div<{ $status: string }>`
  position: absolute;
  top: 12px;
  right: 12px;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  background: ${({ $status, theme }) => 
    $status === 'published' ? theme.colors.success : 
    $status === 'draft' ? theme.colors.warning : 
    theme.colors.textLight
  };
  color: white;
  backdrop-filter: blur(10px);
`;

const CourseContent = styled.div`
  padding: 20px;
`;

const CourseHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
`;

const CourseTitle = styled.h3`
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text};
  flex: 1;
  margin-right: 12px;
  line-height: 1.3;
`;

const CourseDropdown = styled.div`
  position: relative;
`;

const DropdownButton = styled.button`
  background: none;
  border: 1px solid rgba(152, 93, 215, 0.2);
  border-radius: 8px;
  padding: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(152, 93, 215, 0.05);
    border-color: rgba(152, 93, 215, 0.3);
  }
  
  svg {
    width: 16px;
    height: 16px;
    color: ${({ theme }) => theme.colors.textLight};
  }
`;

const DropdownMenu = styled(motion.div)`
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

const CourseDescription = styled.p`
  margin: 0 0 16px 0;
  color: ${({ theme }) => theme.colors.textLight};
  font-size: 14px;
  line-height: 1.5;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
`;

const CourseMetrics = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 16px;
`;

const MetricItem = styled.div`
  text-align: center;
`;

const MetricValue = styled.div`
  font-size: 20px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: 4px;
`;

const MetricLabel = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.textLight};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const CourseProgress = styled.div`
  margin-bottom: 16px;
`;

const ProgressBar = styled.div`
  height: 6px;
  background: rgba(152, 93, 215, 0.1);
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 8px;
`;

const ProgressFill = styled.div<{ $percentage: number }>`
  height: 100%;
  width: ${({ $percentage }) => $percentage}%;
  background: linear-gradient(90deg, 
    ${({ theme }) => theme.colors.primary}, 
    ${({ theme }) => theme.colors.magenta}
  );
  transition: width 0.3s ease;
`;

const ProgressText = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.textLight};
`;

const CourseTags = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  flex-wrap: wrap;
`;

const CourseTag = styled.span`
  padding: 4px 8px;
  background: rgba(152, 93, 215, 0.1);
  color: ${({ theme }) => theme.colors.primary};
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
`;

const CourseFooter = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const CourseRevenue = styled.div`
  display: flex;
  flex-direction: column;
`;

const RevenueAmount = styled.div`
  font-size: 18px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.primary};
`;

const RevenueLabel = styled.div`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.textLight};
  text-transform: uppercase;
`;

const LastActivity = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.textLight};
  text-align: right;
`;

const SidebarCard = styled.div`
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(152, 93, 215, 0.1);
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 20px;
`;

const SidebarTitle = styled.h3`
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
`;

const ActivityItem = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid rgba(152, 93, 215, 0.1);
  
  &:last-child {
    border-bottom: none;
  }
`;

const ActivityIcon = styled.div<{ $color: string }>`
  width: 32px;
  height: 32px;
  background: ${({ $color }) => $color}20;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  
  svg {
    width: 16px;
    height: 16px;
    color: ${({ $color }) => $color};
  }
`;

const ActivityContent = styled.div`
  flex: 1;
`;

const ActivityText = styled.div`
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: 2px;
`;

const ActivityTime = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.textLight};
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 60px 20px;
  grid-column: 1 / -1;
  
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

export default function PremiumCoursesPage() {
  const [courses, setCourses] = useState<PremiumCourseWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'published' | 'draft'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [openDropdowns, setOpenDropdowns] = useState<Set<string>>(new Set());
  
  const router = useRouter();

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const response = await fetch('/api/premium/courses');
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

  // Enhanced filtering logic
  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.category?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'published' && course.is_published) ||
      (filterStatus === 'draft' && !course.is_published);
    
    const matchesCategory = filterCategory === 'all' || course.category === filterCategory;
    
    return matchesSearch && matchesStatus && matchesCategory;
  });

  // Enhanced stats with mock trend data
  const totalCourses = courses.length;
  const publishedCourses = courses.filter(c => c.is_published).length;
  const totalStudents = courses.reduce((sum, course) => sum + course.total_enrollments, 0);
  const totalRevenue = courses.reduce((sum, course) => 
    sum + (course.price_amount * course.total_enrollments), 0
  );
  
  // Mock data for enhanced analytics (in real app, this would come from API)
  const stats = [
    {
      icon: FiDollarSign,
      label: 'Total Revenue',
      value: `$${totalRevenue.toLocaleString()}`,
      trend: 'up' as const,
      trendValue: '+12.5%',
      color: '#10B981'
    },
    {
      icon: FiUsers,
      label: 'Total Students',
      value: totalStudents.toLocaleString(),
      trend: 'up' as const,
      trendValue: '+8.2%',
      color: '#3B82F6'
    },
    {
      icon: FiBarChart,
      label: 'Conversion Rate',
      value: '4.8%',
      trend: 'down' as const,
      trendValue: '-0.3%',
      color: '#F59E0B'
    },
    {
      icon: FiTarget,
      label: 'Avg. Completion',
      value: '76%',
      trend: 'up' as const,
      trendValue: '+5.1%',
      color: '#8B5CF6'
    }
  ];
  
  // Mock recent activity data
  const recentActivity = [
    {
      icon: FiUsers,
      text: '5 new students enrolled',
      time: '2 hours ago',
      color: '#3B82F6'
    },
    {
      icon: FiDollarSign,
      text: '$247 revenue generated',
      time: '4 hours ago',
      color: '#10B981'
    },
    {
      icon: FiStar,
      text: '2 new 5-star reviews',
      time: '6 hours ago',
      color: '#F59E0B'
    },
    {
      icon: FiActivity,
      text: 'Course completion rate up 3%',
      time: '1 day ago',
      color: '#8B5CF6'
    }
  ];
  
  // Get unique categories for filtering
  const categories = Array.from(new Set(courses.map(c => c.category).filter(Boolean)));

  // Enhanced course actions
  const handleCourseAction = async (action: string, course: PremiumCourseWithDetails) => {
    setOpenDropdowns(new Set());
    
    switch (action) {
      case 'edit':
        // For now, redirect to course detail page where they can edit modules/lessons
        // Later we can add a dedicated edit form
        router.push(`/teacher-dashboard/premium-courses/${course.course_id}`);
        break;
      case 'view':
        router.push(`/teacher-dashboard/premium-courses/${course.course_id}`);
        break;
      case 'duplicate':
        await handleDuplicateCourse(course);
        break;
      case 'publish':
        await handleTogglePublish(course);
        break;
      case 'analytics':
        // For now, show alert - can implement later
        alert('Analytics page coming soon! This will show detailed course performance metrics.');
        break;
      case 'students':
        // For now, show alert - can implement later
        alert('Students page coming soon! This will show enrolled students and their progress.');
        break;
      case 'delete':
        await handleDeleteCourse(course);
        break;
    }
  };

  const handleTogglePublish = async (course: PremiumCourseWithDetails) => {
    const action = course.is_published ? 'unpublish' : 'publish';
    const actionText = course.is_published ? 'unpublish' : 'publish';
    
    if (!confirm(`Are you sure you want to ${actionText} "${course.title}"?`)) {
      return;
    }
    
    try {
      const response = await fetch(`/api/premium/courses/${course.course_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          is_published: !course.is_published,
          published_at: !course.is_published ? new Date().toISOString() : null
        })
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || `Failed to ${actionText} course`);
      }
      
      // Refresh the courses list
      await fetchCourses();
      
      // Show success message
      alert(`Course ${actionText}ed successfully!`);
    } catch (error) {
      console.error(`Error ${actionText}ing course:`, error);
      alert(`Failed to ${actionText} course. Please try again.`);
    }
  };

  const handleDeleteCourse = async (course: PremiumCourseWithDetails) => {
    const confirmMessage = `Are you sure you want to delete "${course.title}"?\n\nThis action cannot be undone and will remove all modules, lessons, and student progress.`;
    
    if (!confirm(confirmMessage)) {
      return;
    }
    
    try {
      const response = await fetch(`/api/premium/courses?courseId=${course.course_id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete course');
      }
      
      // Refresh the courses list
      await fetchCourses();
      
      // Show success message
      alert('Course deleted successfully!');
    } catch (error) {
      console.error('Error deleting course:', error);
      alert('Failed to delete course. Please try again.');
    }
  };

  const handleDuplicateCourse = async (course: PremiumCourseWithDetails) => {
    try {
      const duplicateData = {
        title: `${course.title} (Copy)`,
        slug: `${course.slug}-copy-${Date.now()}`,
        description: course.description,
        short_description: course.short_description,
        thumbnail_url: course.thumbnail_url,
        trailer_video_url: course.trailer_video_url,
        difficulty_level: course.difficulty_level,
        estimated_duration_hours: course.estimated_duration_hours,
        language: course.language,
        category: course.category,
        tags: course.tags,
        price_type: course.price_type,
        price_amount: course.price_amount,
        currency: course.currency,
        requires_approval: course.requires_approval,
        max_students: course.max_students,
        meta_title: course.meta_title,
        meta_description: course.meta_description
      };
      
      const response = await fetch('/api/premium/courses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(duplicateData)
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to duplicate course');
      }
      
      const data = await response.json();
      
      // Refresh the courses list
      await fetchCourses();
      
      // Navigate to the new course
      router.push(`/teacher-dashboard/premium-courses/${data.course.course_id}`);
    } catch (error) {
      console.error('Error duplicating course:', error);
      alert('Failed to duplicate course. Please try again.');
    }
  };

  const toggleDropdown = (courseId: string) => {
    const newOpenDropdowns = new Set(openDropdowns);
    if (newOpenDropdowns.has(courseId)) {
      newOpenDropdowns.delete(courseId);
    } else {
      newOpenDropdowns.clear(); // Close others
      newOpenDropdowns.add(courseId);
    }
    setOpenDropdowns(newOpenDropdowns);
  };

  // Mock function to calculate course metrics
  const getCourseMetrics = (course: PremiumCourseWithDetails) => {
    const revenue = course.price_amount * course.total_enrollments;
    const completionRate = Math.floor(Math.random() * 40 + 60); // Mock: 60-100%
    const avgRating = (Math.random() * 1.5 + 3.5).toFixed(1); // Mock: 3.5-5.0
    
    return {
      revenue,
      completionRate,
      avgRating: parseFloat(avgRating),
      lastActivity: 'Yesterday' // Mock
    };
  };

  const formatRelativeTime = (date: string) => {
    const now = new Date();
    const courseDate = new Date(date);
    const diffMs = now.getTime() - courseDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return courseDate.toLocaleDateString();
  };

  const handleCreateCourse = () => {
    setShowCreateForm(true);
  };
  
  const handleSubmitCourse = async (courseData: CreatePremiumCourseData) => {
    setFormLoading(true);
    
    try {
      const response = await fetch('/api/premium/courses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(courseData)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create course');
      }
      
      // Refresh courses list
      await fetchCourses();
      
      // Close form
      setShowCreateForm(false);
      
      // Navigate to course detail page
      router.push(`/teacher-dashboard/premium-courses/${data.course.course_id}`);
    } catch (error) {
      console.error('Error creating course:', error);
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
            <p>Loading premium courses...</p>
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
            <PageTitle gradient>Premium Courses</PageTitle>
            <Text color="muted">
              Create and manage your premium video courses with advanced analytics
            </Text>
          </HeaderSection>

          <QuickActions>
            <QuickActionButton
              variant="primary"
              onClick={handleCreateCourse}
            >
              <FiPlus /> New Course
            </QuickActionButton>
            <QuickActionButton variant="secondary">
              <FiBarChart /> Analytics
            </QuickActionButton>
            <QuickActionButton variant="ghost">
              <FiTarget /> Marketing
            </QuickActionButton>
          </QuickActions>

          {/* Enhanced Stats Section */}
          <StatsGrid>
            {stats.map((stat, index) => (
              <EnhancedStatsCard
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <StatHeader>
                  <StatIcon $color={stat.color}>
                    <stat.icon />
                  </StatIcon>
                  <TrendIndicator $trend={stat.trend}>
                    {stat.trend === 'up' ? <FiTrendingUp /> : <FiTrendingDown />}
                    {stat.trendValue}
                  </TrendIndicator>
                </StatHeader>
                <StatValue>{stat.value}</StatValue>
                <StatLabel>{stat.label}</StatLabel>
              </EnhancedStatsCard>
            ))}
          </StatsGrid>

          <DashboardLayout>
            <MainContent>
              {/* Filter Bar */}
              <FilterBar>
                <FilterGroup>
                  <FilterButton
                    $isActive={filterStatus === 'all'}
                    onClick={() => setFilterStatus('all')}
                  >
                    All Courses
                  </FilterButton>
                  <FilterButton
                    $isActive={filterStatus === 'published'}
                    onClick={() => setFilterStatus('published')}
                  >
                    Published
                  </FilterButton>
                  <FilterButton
                    $isActive={filterStatus === 'draft'}
                    onClick={() => setFilterStatus('draft')}
                  >
                    Drafts
                  </FilterButton>
                  
                  {categories.length > 0 && (
                    <select
                      value={filterCategory}
                      onChange={(e) => setFilterCategory(e.target.value)}
                      style={{
                        padding: '8px 12px',
                        border: '1px solid rgba(152, 93, 215, 0.2)',
                        borderRadius: '8px',
                        background: 'white'
                      }}
                    >
                      <option value="all">All Categories</option>
                      {categories.map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  )}
                </FilterGroup>

                <SearchAndActions>
                  <SearchInput
                    placeholder="Search courses..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </SearchAndActions>
              </FilterBar>

              {/* Courses Grid */}
              <CoursesContainer>
                {filteredCourses.length === 0 ? (
                  <EmptyState>
                    <h3>{searchTerm ? 'No courses found' : 'No premium courses yet'}</h3>
                    <p>
                      {searchTerm 
                        ? 'Try adjusting your search terms'
                        : 'Create your first premium course to get started'
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
                  <CourseGrid>
                    {filteredCourses.map((course) => {
                      const metrics = getCourseMetrics(course);
                      const isDropdownOpen = openDropdowns.has(course.course_id);
                      
                      return (
                        <KajabiCourseCard
                          key={course.course_id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          <CourseImageContainer>
                            {course.thumbnail_url ? (
                              <CourseImage src={course.thumbnail_url} alt={course.title} />
                            ) : (
                              <CourseImagePlaceholder>🎓</CourseImagePlaceholder>
                            )}
                            
                            <CourseStatus $status={course.is_published ? 'published' : 'draft'}>
                              {course.is_published ? 'Published' : 'Draft'}
                            </CourseStatus>
                            
                            <CourseImageOverlay>
                              <PlayButton onClick={() => handleCourseAction('view', course)}>
                                <FiPlay />
                              </PlayButton>
                            </CourseImageOverlay>
                          </CourseImageContainer>

                          <CourseContent>
                            <CourseHeader>
                              <CourseTitle>{course.title}</CourseTitle>
                              <CourseDropdown>
                                <DropdownButton
                                  onClick={() => toggleDropdown(course.course_id)}
                                >
                                  <FiMoreVertical />
                                </DropdownButton>
                                
                                <AnimatePresence>
                                  {isDropdownOpen && (
                                    <DropdownMenu
                                      initial={{ opacity: 0, y: -10 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      exit={{ opacity: 0, y: -10 }}
                                    >
                                      <DropdownItem onClick={() => handleCourseAction('view', course)}>
                                        <FiEye /> View Course
                                      </DropdownItem>
                                      <DropdownItem onClick={() => handleCourseAction('edit', course)}>
                                        <FiEdit /> Edit Content
                                      </DropdownItem>
                                      <DropdownItem onClick={() => handleCourseAction('publish', course)}>
                                        {course.is_published ? '📝 Unpublish' : '🚀 Publish'}
                                      </DropdownItem>
                                      <DropdownItem onClick={() => handleCourseAction('analytics', course)}>
                                        <FiBarChart /> Analytics
                                      </DropdownItem>
                                      <DropdownItem onClick={() => handleCourseAction('students', course)}>
                                        <FiUsers /> Students
                                      </DropdownItem>
                                      <DropdownItem onClick={() => handleCourseAction('duplicate', course)}>
                                        <FiCopy /> Duplicate
                                      </DropdownItem>
                                      <DropdownItem onClick={() => handleCourseAction('delete', course)}>
                                        <FiTrash2 /> Delete
                                      </DropdownItem>
                                    </DropdownMenu>
                                  )}
                                </AnimatePresence>
                              </CourseDropdown>
                            </CourseHeader>

                            {course.short_description && (
                              <CourseDescription>{course.short_description}</CourseDescription>
                            )}

                            <CourseMetrics>
                              <MetricItem>
                                <MetricValue>{course.total_enrollments}</MetricValue>
                                <MetricLabel>Students</MetricLabel>
                              </MetricItem>
                              <MetricItem>
                                <MetricValue>{metrics.completionRate}%</MetricValue>
                                <MetricLabel>Completion</MetricLabel>
                              </MetricItem>
                            </CourseMetrics>

                            <CourseProgress>
                              <ProgressBar>
                                <ProgressFill $percentage={metrics.completionRate} />
                              </ProgressBar>
                              <ProgressText>
                                <span>{course.lesson_count} lessons</span>
                                <span>⭐ {metrics.avgRating}</span>
                              </ProgressText>
                            </CourseProgress>

                            {(course.category || course.tags?.length) && (
                              <CourseTags>
                                {course.category && <CourseTag>{course.category}</CourseTag>}
                                {course.tags?.slice(0, 2).map(tag => (
                                  <CourseTag key={tag}>{tag}</CourseTag>
                                ))}
                              </CourseTags>
                            )}

                            <CourseFooter>
                              <CourseRevenue>
                                <RevenueAmount>
                                  {course.price_type === 'free' ? 'Free' : `$${metrics.revenue.toLocaleString()}`}
                                </RevenueAmount>
                                <RevenueLabel>
                                  {course.price_type === 'free' ? 'Course' : 'Revenue'}
                                </RevenueLabel>
                              </CourseRevenue>
                              
                              <LastActivity>
                                Updated {formatRelativeTime(course.updated_at)}
                              </LastActivity>
                            </CourseFooter>
                          </CourseContent>
                        </KajabiCourseCard>
                      );
                    })}
                  </CourseGrid>
                )}
              </CoursesContainer>
            </MainContent>

            <Sidebar>
              {/* Recent Activity */}
              <SidebarCard>
                <SidebarTitle>Recent Activity</SidebarTitle>
                {recentActivity.map((activity, index) => (
                  <ActivityItem key={index}>
                    <ActivityIcon $color={activity.color}>
                      <activity.icon />
                    </ActivityIcon>
                    <ActivityContent>
                      <ActivityText>{activity.text}</ActivityText>
                      <ActivityTime>{activity.time}</ActivityTime>
                    </ActivityContent>
                  </ActivityItem>
                ))}
              </SidebarCard>

              {/* Quick Stats */}
              <SidebarCard>
                <SidebarTitle>Quick Stats</SidebarTitle>
                <div style={{ display: 'grid', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '14px', color: '#666' }}>This Month</span>
                    <span style={{ fontWeight: '600' }}>$1,247</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '14px', color: '#666' }}>New Students</span>
                    <span style={{ fontWeight: '600' }}>23</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '14px', color: '#666' }}>Avg. Rating</span>
                    <span style={{ fontWeight: '600' }}>4.8 ⭐</span>
                  </div>
                </div>
              </SidebarCard>

              {/* Marketing Tips */}
              <SidebarCard>
                <SidebarTitle>Marketing Tips</SidebarTitle>
                <div style={{ fontSize: '14px', lineHeight: '1.5', color: '#666' }}>
                  <p style={{ margin: '0 0 8px 0' }}>💡 <strong>Tip:</strong> Courses with video previews get 40% more enrollments.</p>
                  <p style={{ margin: '0' }}>📊 Add completion certificates to increase student satisfaction.</p>
                </div>
              </SidebarCard>
            </Sidebar>
          </DashboardLayout>

          <AnimatePresence>
            {showCreateForm && (
              <PremiumCourseForm
                onSubmit={handleSubmitCourse}
                onCancel={() => setShowCreateForm(false)}
                isLoading={formLoading}
              />
            )}
          </AnimatePresence>
        </Container>
      </PageTransition>
    </PageWrapper>
  );
}