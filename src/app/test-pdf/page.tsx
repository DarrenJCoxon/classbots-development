'use client';

import styled from 'styled-components';
import ReliablePDFViewer from '@/components/shared/ReliablePDFViewer';

const Container = styled.div`
  height: 100vh;
  padding: 2rem;
  background: #f5f5f5;
`;

const Title = styled.h1`
  margin-bottom: 2rem;
`;

export default function TestPDFPage() {
  return (
    <Container>
      <Title>PDF Viewer Test</Title>
      <div style={{ height: 'calc(100vh - 8rem)' }}>
        <ReliablePDFViewer
          documentUrl="/test.pdf"
          documentName="Test PDF Document"
        />
      </div>
    </Container>
  );
}