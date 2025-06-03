'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import styled from 'styled-components';
import { FiArrowLeft } from 'react-icons/fi';
import { RegularLessonForm } from '@/components/teacher/RegularLessonForm';
import { PageWrapper, Container } from '@/components/ui';
import { PageTransition } from '@/components/shared/PageTransition';
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

export default function NewLessonPage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params.courseId as string;

  const handleSuccess = () => {
    // Navigate back to course detail page
    router.push(`/teacher-dashboard/courses/${courseId}`);
  };

  const handleCancel = () => {
    router.push(`/teacher-dashboard/courses/${courseId}`);
  };

  return (
    <PageWrapper gradient>
      <PageTransition>
        <Container size="large">
          <BackButton onClick={handleCancel}>
            <FiArrowLeft /> Back to Course
          </BackButton>
          
          <RegularLessonForm
            courseId={courseId}
            onSuccess={handleSuccess}
            onCancel={handleCancel}
          />
        </Container>
      </PageTransition>
    </PageWrapper>
  );
}