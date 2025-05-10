// src/styles/StyledComponents.ts
import styled from 'styled-components'; // Removed 'css' import as it's not used here

export const Container = styled.div`
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 ${({ theme }) => theme.spacing.lg};

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    padding: 0 ${({ theme }) => theme.spacing.md};
  }
`;

export const Card = styled.div`
  background: ${({ theme }) => theme.colors.backgroundCard};
  border-radius: ${({ theme }) => theme.borderRadius.xl};
  padding: ${({ theme }) => theme.spacing.xl};
  box-shadow: ${({ theme }) => theme.shadows.sm};
  border: 1px solid ${({ theme }) => theme.colors.border};

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    padding: ${({ theme }) => theme.spacing.lg};
  }
`;

export const Button = styled.button<{
    variant?: 'primary' | 'secondary' | 'outline' | 'danger'; // Added 'danger'
    size?: 'small' | 'medium' | 'large';
  }>`
    background: ${({ theme, variant = 'primary' }) => {
      // Determine background color based on variant
      if (variant === 'primary') return theme.colors.primary;
      if (variant === 'secondary') return theme.colors.secondary;
      if (variant === 'danger') return theme.colors.red; // Danger background
      // For 'outline' or any other unspecified variant, background is transparent
      return 'transparent'; 
    }};
    color: ${({ theme, variant = 'primary' }) => {
      // Determine text color based on variant
      if (variant === 'outline') return theme.colors.primary;
      // For primary, secondary, danger, text is white (or could be adjusted)
      return 'white'; 
    }};
    border: ${({ theme, variant }) => {
      // Determine border based on variant
      if (variant === 'outline') return `2px solid ${theme.colors.primary}`;
      // Danger variant could also have a border matching its background or a darker shade
      if (variant === 'danger') return `2px solid ${theme.colors.red}`; 
      // Primary and secondary have no border by default in this setup
      return 'none'; 
    }};
    padding: ${({ theme, size = 'medium' }) =>
      size === 'small' ? `${theme.spacing.xs} ${theme.spacing.md}` :
      size === 'large' ? `${theme.spacing.md} ${theme.spacing.xl}` :
      `${theme.spacing.sm} ${theme.spacing.lg}`
    };
    border-radius: ${({ theme }) => theme.borderRadius.large};
    font-weight: 500;
    transition: all ${({ theme }) => theme.transitions.fast};
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    line-height: 1.2;
    text-decoration: none; // For 'as={Link}' usage

    &:hover:not(:disabled) {
      background: ${({ theme, variant = 'primary' }) => {
        if (variant === 'primary') return theme.colors.primaryDark;
        if (variant === 'secondary') return theme.colors.secondaryDark;
        if (variant === 'danger') return theme.colors.red; // Could define theme.colors.redDark
        if (variant === 'outline') return theme.colors.primary; 
        return undefined; // Fallback or inherit
      }};
      border-color: ${({ theme, variant = 'primary' }) => {
        // Ensure border color might change on hover too if desired
        if (variant === 'danger') return theme.colors.red; // Or theme.colors.redDark
        if (variant === 'outline') return theme.colors.primary; // Border remains primary for outline on hover
        return undefined; // Fallback
      }};
      color: ${({ variant }) => {
        if (variant === 'outline') return 'white'; // Outline text becomes white on hover
        // For other variants like danger, text color typically remains white
        return 'white'; 
      }};
      transform: translateY(-1px);
      box-shadow: ${({ theme }) => theme.shadows.md};
    }

    &:active:not(:disabled) {
      transform: translateY(0);
      box-shadow: none;
    }

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  `;

// Inherit from Button for consistency
export const SecondaryButton = styled(Button).attrs({ variant: 'secondary' })``;
export const OutlineButton = styled(Button).attrs({ variant: 'outline' })``;
export const DangerButton = styled(Button).attrs({ variant: 'danger' })``; // Optional: specific export for danger

export const FormGroup = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

export const Label = styled.label`
  display: block;
  margin-bottom: ${({ theme }) => theme.spacing.sm};
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text};
  font-size: 0.9rem;
`;

export const Input = styled.input`
  width: 100%;
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  border: 2px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.text};
  font-size: 1rem;
  line-height: 1.5;
  transition: border-color ${({ theme }) => theme.transitions.fast};
  min-height: 44px;

  &:focus {
    border-color: ${({ theme }) => theme.colors.focus};
    outline: none;
    box-shadow: 0 0 0 2px ${({ theme }) => theme.colors.primary + '40'};
  }

  &::placeholder {
    color: ${({ theme }) => theme.colors.textMuted};
  }

  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
    background-color: ${({ theme }) => theme.colors.backgroundDark};
  }
`;

export const TextArea = styled.textarea`
  width: 100%;
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  border: 2px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.text};
  font-size: 1rem;
  line-height: 1.6;
  transition: border-color ${({ theme }) => theme.transitions.fast};
  min-height: 100px;
  resize: vertical;

  &:focus {
    border-color: ${({ theme }) => theme.colors.focus};
    outline: none;
    box-shadow: 0 0 0 2px ${({ theme }) => theme.colors.primary + '40'};
  }

  &::placeholder {
    color: ${({ theme }) => theme.colors.textMuted};
  }

   &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
    background-color: ${({ theme }) => theme.colors.backgroundDark};
  }
`;

export const Select = styled.select`
  width: 100%;
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  border: 2px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  background-color: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.text};
  font-size: 1rem;
  line-height: 1.5;
  transition: border-color ${({ theme }) => theme.transitions.fast};
  min-height: 44px;
  cursor: pointer;
  appearance: none;
  background-image: url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23${({ theme }) => theme.colors.textMuted.replace('#', '')}%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E');
  background-repeat: no-repeat;
  background-position: right ${({ theme }) => theme.spacing.md} center;
  background-size: 0.65em auto;
  padding-right: ${({ theme }) => `calc(${theme.spacing.md} * 2.5 + 1em)`};

  &:focus {
    border-color: ${({ theme }) => theme.colors.focus};
    outline: none;
    box-shadow: 0 0 0 2px ${({ theme }) => theme.colors.primary + '40'};
  }

  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
    background-color: ${({ theme }) => theme.colors.backgroundDark};
    background-image: none;
  }

  option {
    color: ${({ theme }) => theme.colors.text};
    background: ${({ theme }) => theme.colors.background};
  }
`;

export const Alert = styled.div<{ variant?: 'info' | 'success' | 'warning' | 'error' }>`
  padding: ${({ theme }) => theme.spacing.md};
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  margin-bottom: ${({ theme }) => theme.spacing.md};
  border-left: 4px solid;
  font-size: 0.9rem;

  ${({ variant, theme }) => {
    switch (variant) {
      case 'success':
        return `
          background: ${theme.colors.green + '15'};
          border-color: ${theme.colors.green};
          color: ${theme.colors.text};
        `;
      case 'warning':
        return `
          background: ${theme.colors.secondary + '15'};
          border-color: ${theme.colors.secondary};
          color: ${theme.colors.text};
        `;
      case 'error':
        return `
          background: ${theme.colors.red + '15'};
          border-color: ${theme.colors.red};
          color: ${theme.colors.text};
        `;
      default: // info
        return `
          background: ${theme.colors.blue + '15'};
          border-color: ${theme.colors.blue};
          color: ${theme.colors.text};
        `;
    }
  }}
`;

export const Badge = styled.span<{ variant?: 'default' | 'success' | 'warning' | 'error' }>`
  display: inline-flex;
  align-items: center;
  padding: ${({ theme }) => theme.spacing.xs} ${({ theme }) => theme.spacing.sm};
  border-radius: ${({ theme }) => theme.borderRadius.round};
  font-size: 0.75rem;
  font-weight: 600;
  line-height: 1;
  text-transform: uppercase;
  letter-spacing: 0.05em;

  ${({ variant, theme }) => {
    switch (variant) {
      case 'success':
        return `
          background: ${theme.colors.green + '20'};
          color: ${theme.colors.green};
        `;
      case 'warning':
        return `
          background: ${theme.colors.secondary + '20'};
          color: ${theme.colors.secondaryDark};
        `;
      case 'error':
        return `
          background: ${theme.colors.red + '20'};
          color: ${theme.colors.red};
        `;
      default: 
        return `
          background: ${theme.colors.primary + '20'};
          color: ${theme.colors.primary};
        `;
    }
  }}
`;