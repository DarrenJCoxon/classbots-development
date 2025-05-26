// Unified Typography Component System
import React from 'react';
import styled, { css } from 'styled-components';
import { motion, HTMLMotionProps } from 'framer-motion';

// Typography variants
export type HeadingLevel = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
export type TextVariant = 'body' | 'caption' | 'overline' | 'subtitle';
export type TextWeight = 'normal' | 'medium' | 'semibold' | 'bold';

interface TypographyProps {
  color?: 'default' | 'light' | 'muted' | 'primary' | 'danger' | 'success';
  weight?: TextWeight;
  uppercase?: boolean;
  gradient?: boolean;
  noMargin?: boolean;
  align?: 'left' | 'center' | 'right';
  className?: string;
  children: React.ReactNode;
}

// Color mapping
const getColor = (color: 'default' | 'light' | 'muted' | 'primary' | 'danger' | 'success', theme: any) => {
  const colors = {
    default: theme.colors.text,
    light: theme.colors.textLight,
    muted: theme.colors.textMuted,
    primary: theme.colors.primary,
    danger: theme.colors.pink,
    success: theme.colors.blue
  };
  return colors[color] || theme.colors.text;
};

// Weight mapping
const getWeight = (weight: TextWeight) => {
  const weights = {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700
  };
  return weights[weight];
};

// Shared typography styles
const sharedTypographyStyles = css<{
  $color: 'default' | 'light' | 'muted' | 'primary' | 'danger' | 'success';
  $weight: TextWeight;
  $uppercase: boolean;
  $gradient: boolean;
  $noMargin: boolean;
  $align?: 'left' | 'center' | 'right';
}>`
  font-family: ${({ theme }) => theme.fonts.heading};
  font-weight: ${({ $weight }) => getWeight($weight)};
  color: ${({ $color, theme }) => getColor($color, theme)};
  text-align: ${({ $align }) => $align || 'left'};
  ${({ $uppercase }) => $uppercase && css`
    text-transform: uppercase;
    letter-spacing: 0.5px;
  `}
  ${({ $noMargin }) => $noMargin && css`
    margin: 0;
  `}
  ${({ $gradient, theme }) => $gradient && css`
    background: linear-gradient(135deg, 
      ${theme.colors.primary}, 
      ${theme.colors.magenta}
    );
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  `}
`;

// Page Title (h1)
const StyledH1 = styled(motion.h1)<{
  $color: 'default' | 'light' | 'muted' | 'primary' | 'danger' | 'success';
  $weight: TextWeight;
  $uppercase: boolean;
  $gradient: boolean;
  $noMargin: boolean;
  $align?: 'left' | 'center' | 'right';
}>`
  ${sharedTypographyStyles}
  font-size: 36px;
  line-height: 1.2;
  margin-bottom: ${({ $noMargin }) => $noMargin ? 0 : '24px'};
  
  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    font-size: 32px;
  }
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    font-size: 28px;
    margin-bottom: ${({ $noMargin }) => $noMargin ? 0 : '16px'};
  }
`;

// Section Title (h2)
const StyledH2 = styled(motion.h2)<{
  $color: 'default' | 'light' | 'muted' | 'primary' | 'danger' | 'success';
  $weight: TextWeight;
  $uppercase: boolean;
  $gradient: boolean;
  $noMargin: boolean;
  $align?: 'left' | 'center' | 'right';
}>`
  ${sharedTypographyStyles}
  font-size: 13px;
  line-height: 1.4;
  margin-bottom: ${({ $noMargin }) => $noMargin ? 0 : '16px'};
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    font-size: 12px;
    margin-bottom: ${({ $noMargin }) => $noMargin ? 0 : '12px'};
  }
`;

// Card Title (h3)
const StyledH3 = styled(motion.h3)<{
  $color: 'default' | 'light' | 'muted' | 'primary' | 'danger' | 'success';
  $weight: TextWeight;
  $uppercase: boolean;
  $gradient: boolean;
  $noMargin: boolean;
  $align?: 'left' | 'center' | 'right';
}>`
  ${sharedTypographyStyles}
  font-size: 18px;
  line-height: 1.4;
  margin-bottom: ${({ $noMargin }) => $noMargin ? 0 : '12px'};
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    font-size: 16px;
    margin-bottom: ${({ $noMargin }) => $noMargin ? 0 : '8px'};
  }
`;

// Sub-heading (h4)
const StyledH4 = styled(motion.h4)<{
  $color: 'default' | 'light' | 'muted' | 'primary' | 'danger' | 'success';
  $weight: TextWeight;
  $uppercase: boolean;
  $gradient: boolean;
  $noMargin: boolean;
  $align?: 'left' | 'center' | 'right';
}>`
  ${sharedTypographyStyles}
  font-size: 16px;
  line-height: 1.5;
  margin-bottom: ${({ $noMargin }) => $noMargin ? 0 : '8px'};
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    font-size: 14px;
  }
`;

// Small heading (h5, h6)
const StyledH5 = styled(motion.h5)<{
  $color: 'default' | 'light' | 'muted' | 'primary' | 'danger' | 'success';
  $weight: TextWeight;
  $uppercase: boolean;
  $gradient: boolean;
  $noMargin: boolean;
  $align?: 'left' | 'center' | 'right';
}>`
  ${sharedTypographyStyles}
  font-size: 14px;
  line-height: 1.5;
  margin-bottom: ${({ $noMargin }) => $noMargin ? 0 : '8px'};
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    font-size: 13px;
  }
`;

// Body Text
const StyledText = styled.p<{
  $variant: TextVariant;
  $color: 'default' | 'light' | 'muted' | 'primary' | 'danger' | 'success';
  $weight: TextWeight;
  $uppercase: boolean;
  $gradient: boolean;
  $noMargin: boolean;
  $align?: 'left' | 'center' | 'right';
}>`
  font-family: ${({ theme }) => theme.fonts.body};
  font-weight: ${({ $weight }) => getWeight($weight)};
  color: ${({ $color, theme }) => getColor($color, theme)};
  text-align: ${({ $align }) => $align || 'left'};
  margin: ${({ $noMargin }) => $noMargin ? 0 : '0 0 16px 0'};
  
  ${({ $uppercase }) => $uppercase && css`
    text-transform: uppercase;
    letter-spacing: 0.5px;
  `}
  
  ${({ $gradient, theme }) => $gradient && css`
    background: linear-gradient(135deg, 
      ${theme.colors.primary}, 
      ${theme.colors.magenta}
    );
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    display: inline-block;
  `}
  
  ${({ $variant }) => {
    switch ($variant) {
      case 'body':
        return css`
          font-size: 14px;
          line-height: 1.6;
        `;
      case 'caption':
        return css`
          font-size: 12px;
          line-height: 1.5;
        `;
      case 'overline':
        return css`
          font-size: 11px;
          line-height: 1.5;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        `;
      case 'subtitle':
        return css`
          font-size: 16px;
          line-height: 1.5;
        `;
    }
  }}
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    ${({ $variant }) => {
      if ($variant === 'subtitle') {
        return css`font-size: 14px;`;
      }
    }}
  }
`;

// Main Heading Component
interface HeadingProps extends TypographyProps {
  level?: HeadingLevel;
}

export const Heading: React.FC<HeadingProps> = ({
  level = 'h2',
  color = 'default',
  weight = 'bold',
  uppercase = false,
  gradient = false,
  noMargin = false,
  align,
  className,
  children
}) => {
  const components = {
    h1: StyledH1,
    h2: StyledH2,
    h3: StyledH3,
    h4: StyledH4,
    h5: StyledH5,
    h6: StyledH5
  };
  
  const Component = components[level];
  
  if (!Component) {
    console.error(`Invalid heading level: ${level}`);
    return null;
  }
  
  return (
    <Component
      $color={color}
      $weight={weight}
      $uppercase={uppercase}
      $gradient={gradient}
      $noMargin={noMargin}
      $align={align}
      className={className}
    >
      {children}
    </Component>
  );
};

// Text Component
interface TextProps extends TypographyProps {
  variant?: TextVariant;
}

export const Text: React.FC<TextProps> = ({
  variant = 'body',
  color = 'default',
  weight = 'normal',
  uppercase = false,
  gradient = false,
  noMargin = false,
  align,
  className,
  children
}) => {
  return (
    <StyledText
      $variant={variant}
      $color={color}
      $weight={weight}
      $uppercase={uppercase}
      $gradient={gradient}
      $noMargin={noMargin}
      $align={align}
      className={className}
    >
      {children}
    </StyledText>
  );
};

// Section Title Component (commonly used pattern)
interface SectionTitleProps extends Omit<HeadingProps, 'level'> {
  icon?: React.ReactNode;
}

const SectionTitleWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  
  svg {
    width: 16px;
    height: 16px;
    color: ${({ theme }) => theme.colors.primary};
  }
`;

export const SectionTitle: React.FC<SectionTitleProps> = ({
  icon,
  children,
  ...props
}) => {
  return (
    <SectionTitleWrapper>
      {icon}
      <Heading
        level="h2"
        color="light"
        weight="medium"
        uppercase
        noMargin
        {...props}
      >
        {children}
      </Heading>
    </SectionTitleWrapper>
  );
};

// Page Title Component
export const PageTitle: React.FC<Omit<HeadingProps, 'level'>> = ({
  children,
  ...props
}) => {
  return (
    <Heading
      level="h1"
      weight="bold"
      uppercase
      gradient
      {...props}
    >
      {children}
    </Heading>
  );
};

export default { Heading, Text, SectionTitle, PageTitle };