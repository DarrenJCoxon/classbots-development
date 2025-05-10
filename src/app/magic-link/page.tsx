// src/app/magic-link/page.tsx
'use client';

import MagicLink from '@/components/auth/MagicLink';
import { Container } from '@/styles/StyledComponents';

export default function MagicLinkPage() {
  return (
    <Container>
      <MagicLink />
    </Container>
  );
}