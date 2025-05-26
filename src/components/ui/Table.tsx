// Unified Table Components
import styled from 'styled-components';

export const Table = styled.table`
  width: 100%;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(152, 93, 215, 0.1);
  border-radius: 16px;
  overflow: hidden;
  border-collapse: collapse;
`;

export const TableHeader = styled.thead`
  background: linear-gradient(135deg, 
    rgba(152, 93, 215, 0.05), 
    rgba(200, 72, 175, 0.05)
  );
`;

export const TableBody = styled.tbody``;

export const TableRow = styled.tr`
  border-bottom: 1px solid rgba(152, 93, 215, 0.1);
  transition: all 0.2s ease;
  
  &:last-child {
    border-bottom: none;
  }
  
  &:hover {
    background: rgba(152, 93, 215, 0.02);
  }
`;

export const TableHeaderCell = styled.th`
  padding: 16px 20px;
  text-align: left;
  font-weight: 600;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: ${({ theme }) => theme.colors.textLight};
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    padding: 12px 16px;
    font-size: 12px;
  }
`;

export const TableCell = styled.td`
  padding: 20px;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text};
  vertical-align: middle;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    padding: 16px;
    font-size: 13px;
  }
`;