// Unified Layout Component System
import React from 'react';
import styled, { css } from 'styled-components';
import { motion, HTMLMotionProps } from 'framer-motion';

// Layout types
export type ContainerSize = 'small' | 'medium' | 'large' | 'full';
export type GridCols = 1 | 2 | 3 | 4 | 'auto';
export type Spacing = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

// Spacing scale
const spacingScale = {
  xs: '8px',
  sm: '12px',
  md: '16px',
  lg: '24px',
  xl: '32px'
};

// Page Wrapper - Main container for pages
interface PageWrapperProps extends HTMLMotionProps<"div"> {
  gradient?: boolean;
  children: React.ReactNode;
}

const StyledPageWrapper = styled(motion.div)<{ $gradient?: boolean }>`
  min-height: 100vh;
  background: ${({ theme }) => theme.colors.background};
  position: relative;
  
  ${({ $gradient }) => $gradient && css`
    &::before {
      content: '';
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: 
        radial-gradient(circle at 20% 30%, ${({ theme }) => theme.colors.primary}08 0%, transparent 40%),
        radial-gradient(circle at 80% 60%, ${({ theme }) => theme.colors.magenta}06 0%, transparent 40%),
        radial-gradient(circle at 40% 80%, ${({ theme }) => theme.colors.blue}05 0%, transparent 40%);
      pointer-events: none;
    }
  `}
`;

export const PageWrapper: React.FC<PageWrapperProps> = ({ 
  gradient = true, 
  children,
  ...motionProps 
}) => {
  return (
    <StyledPageWrapper
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      {...motionProps}
    >
      {children}
    </StyledPageWrapper>
  );
};

// Content Container - Constrains content width
interface ContainerProps {
  size?: ContainerSize;
  spacing?: Spacing;
  className?: string;
  children: React.ReactNode;
}

const containerSizes = {
  small: '800px',
  medium: '1200px',
  large: '1400px',
  full: '100%'
};

const StyledContainer = styled.div<{
  $size: ContainerSize;
  $spacing: Spacing;
}>`
  max-width: ${({ $size }) => containerSizes[$size]};
  margin: 0 auto;
  padding: ${({ $spacing }) => spacingScale[$spacing]};
  position: relative;
  z-index: 1;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    padding: ${({ $spacing }) => {
      const tabletSpacing = {
        xs: '8px',
        sm: '12px',
        md: '12px',
        lg: '16px',
        xl: '20px'
      };
      return tabletSpacing[$spacing];
    }};
  }
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    padding: ${({ $spacing }) => {
      const mobileSpacing = {
        xs: '8px',
        sm: '12px',
        md: '12px',
        lg: '12px',
        xl: '16px'
      };
      return mobileSpacing[$spacing];
    }};
  }
`;

export const Container: React.FC<ContainerProps> = ({
  size = 'medium',
  spacing = 'lg',
  className,
  children
}) => {
  return (
    <StyledContainer $size={size} $spacing={spacing} className={className}>
      {children}
    </StyledContainer>
  );
};

// Section - Glassmorphic content sections
interface SectionProps extends HTMLMotionProps<"section"> {
  glass?: boolean;
  spacing?: Spacing;
  noShadow?: boolean;
  className?: string;
  children: React.ReactNode;
}

const StyledSection = styled(motion.section)<{
  $glass: boolean;
  $spacing: Spacing;
  $noShadow: boolean;
}>`
  position: relative;
  border-radius: 16px;
  padding: ${({ $spacing }) => spacingScale[$spacing]};
  overflow: hidden;
  
  ${({ $glass }) => $glass && css`
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(152, 93, 215, 0.1);
  `}
  
  ${({ $noShadow }) => !$noShadow && css`
    box-shadow: 0 10px 40px rgba(152, 93, 215, 0.05);
  `}
  
  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    padding: ${({ $spacing }) => {
      const tabletSpacing = {
        xs: '8px',
        sm: '12px',
        md: '12px',
        lg: '16px',
        xl: '20px'
      };
      return tabletSpacing[$spacing];
    }};
  }
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    padding: ${({ $spacing }) => {
      const mobileSpacing = {
        xs: '8px',
        sm: '12px',
        md: '12px',
        lg: '12px',
        xl: '16px'
      };
      return mobileSpacing[$spacing];
    }};
  }
`;

export const Section: React.FC<SectionProps> = ({
  glass = true,
  spacing = 'md',
  noShadow = false,
  className,
  children,
  ...motionProps
}) => {
  return (
    <StyledSection
      $glass={glass}
      $spacing={spacing}
      $noShadow={noShadow}
      className={className}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      {...motionProps}
    >
      {children}
    </StyledSection>
  );
};

// Grid Layout
interface GridProps {
  cols?: GridCols;
  gap?: Spacing;
  responsive?: boolean;
  minItemWidth?: string;
  className?: string;
  children: React.ReactNode;
}

const StyledGrid = styled.div<{
  $cols: GridCols;
  $gap: Spacing;
  $responsive: boolean;
  $minItemWidth: string;
}>`
  display: grid;
  gap: ${({ $gap }) => spacingScale[$gap]};
  
  ${({ $cols, $responsive, $minItemWidth }) => {
    if ($cols === 'auto') {
      return css`
        grid-template-columns: repeat(auto-fit, minmax(${$minItemWidth}, 1fr));
      `;
    }
    
    if ($responsive) {
      return css`
        grid-template-columns: repeat(${$cols}, 1fr);
        
        @media (max-width: ${({ theme }) => theme.breakpoints.desktop}) {
          grid-template-columns: repeat(${Math.max(1, $cols - 1)}, 1fr);
        }
        
        @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
          grid-template-columns: repeat(${Math.max(1, Math.min(2, $cols))}, 1fr);
        }
        
        @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
          grid-template-columns: 1fr;
        }
      `;
    }
    
    return css`
      grid-template-columns: repeat(${$cols}, 1fr);
    `;
  }}
`;

export const Grid: React.FC<GridProps> = ({
  cols = 3,
  gap = 'md',
  responsive = true,
  minItemWidth = '250px',
  className,
  children
}) => {
  return (
    <StyledGrid
      $cols={cols}
      $gap={gap}
      $responsive={responsive}
      $minItemWidth={minItemWidth}
      className={className}
    >
      {children}
    </StyledGrid>
  );
};

// Flex Layout
interface FlexProps {
  direction?: 'row' | 'column';
  align?: 'start' | 'center' | 'end' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
  gap?: Spacing;
  wrap?: boolean;
  mobileDirection?: 'row' | 'column';
  mobileWrap?: boolean;
  className?: string;
  children: React.ReactNode;
}

const StyledFlex = styled.div<{
  $direction: 'row' | 'column';
  $align: 'start' | 'center' | 'end' | 'stretch';
  $justify: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
  $gap: Spacing;
  $wrap: boolean;
  $mobileDirection?: 'row' | 'column';
  $mobileWrap?: boolean;
}>`
  display: flex;
  flex-direction: ${({ $direction }) => $direction};
  align-items: ${({ $align }) => {
    const alignMap = {
      start: 'flex-start',
      center: 'center',
      end: 'flex-end',
      stretch: 'stretch'
    };
    return alignMap[$align];
  }};
  justify-content: ${({ $justify }) => {
    const justifyMap = {
      start: 'flex-start',
      center: 'center',
      end: 'flex-end',
      between: 'space-between',
      around: 'space-around',
      evenly: 'space-evenly'
    };
    return justifyMap[$justify];
  }};
  gap: ${({ $gap }) => spacingScale[$gap]};
  ${({ $wrap }) => $wrap && css`flex-wrap: wrap;`}
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    ${({ $mobileDirection }) => $mobileDirection && css`
      flex-direction: ${$mobileDirection};
    `}
    ${({ $mobileWrap }) => $mobileWrap && css`
      flex-wrap: wrap;
    `}
    gap: ${({ $gap }) => {
      const mobileGaps = {
        xs: '6px',
        sm: '8px',
        md: '10px',
        lg: '12px',
        xl: '16px'
      };
      return mobileGaps[$gap];
    }};
  }
`;

export const Flex: React.FC<FlexProps> = ({
  direction = 'row',
  align = 'center',
  justify = 'start',
  gap = 'md',
  wrap = false,
  mobileDirection,
  mobileWrap,
  className,
  children
}) => {
  return (
    <StyledFlex
      $direction={direction}
      $align={align}
      $justify={justify}
      $gap={gap}
      $wrap={wrap}
      $mobileDirection={mobileDirection}
      $mobileWrap={mobileWrap}
      className={className}
    >
      {children}
    </StyledFlex>
  );
};

// Stack - Vertical spacing utility
interface StackProps {
  spacing?: Spacing;
  align?: 'start' | 'center' | 'end' | 'stretch';
  className?: string;
  children: React.ReactNode;
}

const StyledStack = styled.div<{ $spacing: Spacing; $align?: string }>`
  display: flex;
  flex-direction: column;
  gap: ${({ $spacing }) => spacingScale[$spacing]};
  ${({ $align }) => $align && css`
    align-items: ${$align === 'start' ? 'flex-start' : 
                   $align === 'end' ? 'flex-end' : 
                   $align === 'center' ? 'center' : 
                   'stretch'};
  `}
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    gap: ${({ $spacing }) => {
      const mobileGaps = {
        xs: '6px',
        sm: '8px',
        md: '10px',
        lg: '12px',
        xl: '16px'
      };
      return mobileGaps[$spacing];
    }};
  }
`;

export const Stack: React.FC<StackProps> = ({
  spacing = 'md',
  align,
  className,
  children
}) => {
  return (
    <StyledStack $spacing={spacing} $align={align} className={className}>
      {children}
    </StyledStack>
  );
};

// Divider
interface DividerProps {
  spacing?: Spacing;
  color?: string;
  className?: string;
}

const StyledDivider = styled.hr<{ $spacing: Spacing; $color?: string }>`
  border: none;
  height: 1px;
  background: ${({ $color, theme }) => $color || `rgba(152, 93, 215, 0.1)`};
  margin: ${({ $spacing }) => spacingScale[$spacing]} 0;
`;

export const Divider: React.FC<DividerProps> = ({
  spacing = 'md',
  color,
  className
}) => {
  return <StyledDivider $spacing={spacing} $color={color} className={className} />;
};

export default {
  PageWrapper,
  Container,
  Section,
  Grid,
  Flex,
  Stack,
  Divider
};