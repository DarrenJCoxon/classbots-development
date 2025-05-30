// src/components/teacher/FastProcessingToggle.tsx
import React from 'react';
import styled from 'styled-components';

const ToggleContainer = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.md};
  padding: ${({ theme }) => theme.spacing.md};
  background: rgba(152, 93, 215, 0.05);
  border-radius: 12px;
  border: 1px solid rgba(152, 93, 215, 0.1);
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const ToggleLabel = styled.label`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  cursor: pointer;
  font-family: ${({ theme }) => theme.fonts.body};
  color: ${({ theme }) => theme.colors.text};
  font-size: 0.95rem;
`;

const ToggleSwitch = styled.input`
  width: 48px;
  height: 24px;
  position: relative;
  appearance: none;
  background: ${({ theme }) => theme.colors.backgroundCard};
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 1px solid rgba(0, 0, 0, 0.1);

  &:checked {
    background: linear-gradient(135deg, 
      ${({ theme }) => theme.colors.primary}, 
      ${({ theme }) => theme.colors.magenta}
    );
  }

  &::before {
    content: '';
    position: absolute;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: white;
    top: 1px;
    left: 2px;
    transition: transform 0.3s ease;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  &:checked::before {
    transform: translateX(24px);
  }
`;

const InfoText = styled.span`
  font-size: 0.85rem;
  color: ${({ theme }) => theme.colors.textMuted};
  margin-left: auto;
  font-style: italic;
`;

interface FastProcessingToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export const FastProcessingToggle: React.FC<FastProcessingToggleProps> = ({ checked, onChange }) => {
  return (
    <ToggleContainer>
      <ToggleLabel>
        <ToggleSwitch
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span>⚡ Fast Processing Mode</span>
      </ToggleLabel>
      <InfoText>
        {checked 
          ? 'Uses larger chunks and parallel processing for 5-10x faster embedding'
          : 'Standard processing with optimal accuracy'
        }
      </InfoText>
    </ToggleContainer>
  );
};

export default FastProcessingToggle;