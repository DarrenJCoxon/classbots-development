'use client';

import { useState, Suspense } from 'react';
import styled from 'styled-components';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, Alert } from '@/styles/StyledComponents';
import { ModernButton } from '@/components/shared/ModernButton';
import LoadingSpinner from '@/components/shared/LoadingSpinner';

const PageWrapper = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 80vh;
  padding: ${({ theme }) => theme.spacing.md};
  background: ${({ theme }) => theme.colors.backgroundDark};
`;

const ConfirmCard = styled(Card)`
  width: 100%;
  max-width: 500px;
  text-align: center;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
`;

const Title = styled.h1`
  font-size: 2rem;
  margin-bottom: ${({ theme }) => theme.spacing.md};
  color: ${({ theme }) => theme.colors.primary};
`;

const Text = styled.p`
  margin-bottom: ${({ theme }) => theme.spacing.lg};
  color: ${({ theme }) => theme.colors.textLight};
  line-height: 1.5;
`;

const EmailHighlight = styled.div`
  font-weight: bold;
  font-size: 1.2rem;
  color: ${({ theme }) => theme.colors.primary};
  margin: ${({ theme }) => theme.spacing.md} 0;
  padding: ${({ theme }) => theme.spacing.md};
  background: ${({ theme }) => theme.colors.primary}10;
  border-radius: ${({ theme }) => theme.borderRadius.medium};
`;

const ButtonGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.md};
  margin-top: ${({ theme }) => theme.spacing.xl};
`;

const LoadingFallback = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 80vh;
`;

function ConfirmContent() {
  const [isResending, setIsResending] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  
  const email = searchParams?.get('email') || '';
  const roomCode = searchParams?.get('room') || '';

  const handleResendLink = async () => {
    if (!email) return;
    
    setIsResending(true);
    setMessage(null);
    
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/magic-link?room=${roomCode}`
        }
      });
      
      if (error) throw error;
      
      setMessage({
        type: 'success',
        text: 'Magic link sent! Please check your email inbox.'
      });
    } catch (err) {
      console.error('Error sending magic link:', err);
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to send magic link'
      });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <PageWrapper>
      <ConfirmCard>
        <Title>Check Your Email</Title>
        
        <Text>
          We&apos;ve sent a magic link to your email. Click the link in your email to sign in and join the classroom.
        </Text>
        
        {email && <EmailHighlight>{email}</EmailHighlight>}
        
        {message && (
          <Alert variant={message.type}>
            {message.text}
          </Alert>
        )}
        
        <ButtonGroup>
          <ModernButton 
            onClick={handleResendLink}
            disabled={isResending}
          >
            {isResending ? 'Sending...' : 'Resend Magic Link'}
          </ModernButton>
          
          <ModernButton 
            variant="ghost"
            onClick={() => router.push('/join-room')}
          >
            Back to Room Join
          </ModernButton>
        </ButtonGroup>
      </ConfirmCard>
    </PageWrapper>
  );
}

export default function ConfirmPage() {
  return (
    <Suspense fallback={<LoadingFallback><LoadingSpinner /></LoadingFallback>}>
      <ConfirmContent />
    </Suspense>
  );
}