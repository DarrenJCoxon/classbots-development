'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import styled from 'styled-components';
import { FiArrowLeft } from 'react-icons/fi';
import { RegularLessonForm } from '@/components/teacher/RegularLessonForm';
import { PageWrapper, Container } from '@/components/ui';
import { PageTransition } from '@/components/shared/PageTransition';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import type { CourseLesson } from '@/types/database.types';

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

export default function EditLessonPage() {
  const [lesson, setLesson] = useState<CourseLesson | null>(null);
  const [loading, setLoading] = useState(true);
  
  const router = useRouter();
  const params = useParams();
  const courseId = params.courseId as string;
  const lessonId = params.lessonId as string;

  useEffect(() => {
    fetchLesson();
  }, [courseId, lessonId]);

  const fetchLesson = async () => {
    try {
      const response = await fetch(`/api/teacher/courses/${courseId}/lessons?lessonId=${lessonId}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch lesson');
      }
      
      // Find the specific lesson
      const lesson = data.lessons?.find((l: CourseLesson) => l.lesson_id === lessonId);
      if (!lesson) {
        throw new Error('Lesson not found');
      }
      
      setLesson(lesson);
    } catch (error) {
      console.error('Error fetching lesson:', error);
      router.push(`/teacher-dashboard/courses/${courseId}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSuccess = () => {
    // Navigate back to course detail page
    router.push(`/teacher-dashboard/courses/${courseId}`);
  };

  const handleCancel = () => {
    router.push(`/teacher-dashboard/courses/${courseId}`);
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

  if (!lesson) {
    return null;
  }

  return (
    <PageWrapper gradient>
      <PageTransition>
        <Container size="large">
          <BackButton onClick={handleCancel}>
            <FiArrowLeft /> Back to Course
          </BackButton>
          
          <RegularLessonForm
            courseId={courseId}
            lesson={lesson}
            onSuccess={handleSuccess}
            onCancel={handleCancel}
          />
        </Container>
      </PageTransition>
    </PageWrapper>
  );
}