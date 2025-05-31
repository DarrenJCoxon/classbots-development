// Modern dashboard widgets with advanced animations
import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { 
  FiUsers, 
  FiMessageSquare, 
  FiBookOpen, 
  FiTrendingUp,
  FiActivity,
  FiAward,
  FiClock,
  FiArrowUp,
  FiArrowDown
} from 'react-icons/fi';

type WidgetVariant = 'primary' | 'success' | 'warning' | 'danger' | 'info';

interface WidgetProps {
  variant?: WidgetVariant;
}

const WidgetContainer = styled(motion.div)<WidgetProps>`
  position: relative;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(20px);
  border-radius: 16px;
  padding: 20px;
  border: 1px solid rgba(152, 93, 215, 0.1);
  box-shadow: 0 10px 40px rgba(152, 93, 215, 0.05);
  overflow: hidden;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    padding: 12px;
  }
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    padding: 12px;
  }
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: ${({ variant, theme }) => {
      const colors = {
        primary: `linear-gradient(90deg, ${theme.colors.primary}, ${theme.colors.magenta})`,
        success: `linear-gradient(90deg, ${theme.colors.blue}, ${theme.colors.primary})`,
        warning: `linear-gradient(90deg, ${theme.colors.magenta}, ${theme.colors.pink})`,
        danger: `linear-gradient(90deg, ${theme.colors.pink}, ${theme.colors.magenta})`,
        info: `linear-gradient(90deg, ${theme.colors.blue}, ${theme.colors.primary})`,
      };
      return colors[variant || 'primary'];
    }};
  }
  
  &::after {
    content: '';
    position: absolute;
    top: -50%;
    right: -50%;
    width: 200%;
    height: 200%;
    background: radial-gradient(
      circle,
      ${({ variant, theme }) => {
        const colors = {
          primary: theme.colors.primary,
          success: theme.colors.blue,
          warning: theme.colors.magenta,
          danger: theme.colors.pink,
          info: theme.colors.blue,
        };
        return colors[variant || 'primary'];
      }}10 0%,
      transparent 70%
    );
    pointer-events: none;
  }
`;

const WidgetHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
  position: relative;
  z-index: 1;
`;

const WidgetTitle = styled.h3`
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text};
  font-family: ${({ theme }) => theme.fonts.heading};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    font-size: 14px;
  }
`;

const IconWrapper = styled.div<{ variant?: WidgetVariant }>`
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ variant = 'primary', theme }) => {
    const colors: Record<WidgetVariant, string> = {
      primary: `linear-gradient(135deg, ${theme.colors.primary}20, ${theme.colors.blue}20)`,
      success: `linear-gradient(135deg, ${theme.colors.blue}20, ${theme.colors.blue}20)`,
      warning: `linear-gradient(135deg, ${theme.colors.magenta}20, ${theme.colors.pink}20)`,
      danger: `linear-gradient(135deg, ${theme.colors.pink}20, ${theme.colors.pink}20)`,
      info: `linear-gradient(135deg, ${theme.colors.blue}20, ${theme.colors.primary}20)`,
    };
    return colors[variant];
  }};
  
  svg {
    width: 24px;
    height: 24px;
    color: ${({ variant = 'primary', theme }) => {
      const colors: Record<WidgetVariant, string> = {
        primary: theme.colors.primary,
        success: theme.colors.blue,
        warning: theme.colors.magenta,
        danger: theme.colors.pink,
        info: theme.colors.blue,
      };
      return colors[variant];
    }};
  }
`;

const MetricValue = styled.div`
  position: relative;
  z-index: 1;
`;

const MainValue = styled.h2`
  margin: 0;
  font-size: 36px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text};
  font-family: ${({ theme }) => theme.fonts.heading};
  text-transform: uppercase;
  line-height: 1;
`;

const SubValue = styled.p`
  margin: 4px 0 0 0;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.textLight};
`;

const TrendIndicator = styled.div<{ trend: 'up' | 'down' }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  background: ${({ trend, theme }) => 
    trend === 'up' ? `${theme.colors.blue}20` : `${theme.colors.pink}20`
  };
  color: ${({ trend, theme }) => 
    trend === 'up' ? theme.colors.blue : theme.colors.pink
  };
  
  svg {
    width: 14px;
    height: 14px;
  }
`;

const ChartContainer = styled.div`
  margin-top: 20px;
  height: 60px;
  position: relative;
  z-index: 1;
`;

// Mini sparkline chart component
const SparklineChart = styled.svg`
  width: 100%;
  height: 100%;
`;

const ProgressBar = styled.div`
  position: relative;
  height: 8px;
  background: ${({ theme }) => theme.colors.backgroundCard};
  border-radius: 4px;
  overflow: hidden;
  margin-top: 20px;
`;

const ProgressFill = styled(motion.div)<{ variant?: WidgetVariant }>`
  height: 100%;
  background: ${({ variant = 'primary', theme }) => {
    const colors: Record<WidgetVariant, string> = {
      primary: `linear-gradient(90deg, ${theme.colors.primary}, ${theme.colors.blue})`,
      success: `linear-gradient(90deg, ${theme.colors.blue}, ${theme.colors.blue})`,
      warning: `linear-gradient(90deg, ${theme.colors.magenta}, ${theme.colors.pink})`,
      danger: `linear-gradient(90deg, ${theme.colors.pink}, ${theme.colors.pink})`,
      info: `linear-gradient(90deg, ${theme.colors.blue}, ${theme.colors.primary})`,
    };
    return colors[variant];
  }};
  border-radius: 4px;
  position: relative;
  
  &::after {
    content: '';
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    width: 100px;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4));
    animation: shimmer 2s infinite;
  }
  
  @keyframes shimmer {
    0% { transform: translateX(-100px); }
    100% { transform: translateX(100px); }
  }
`;

// Activity feed item
const ActivityItem = styled(motion.div)<{ $clickable?: boolean }>`
  display: flex;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  cursor: ${({ $clickable }) => $clickable ? 'pointer' : 'default'};
  transition: background-color 0.2s ease;
  margin: 0 -12px;
  padding-left: 12px;
  padding-right: 12px;
  
  &:hover {
    background-color: ${({ $clickable, theme }) => 
      $clickable ? 'rgba(152, 93, 215, 0.05)' : 'transparent'};
  }
  
  &:last-child {
    border-bottom: none;
  }
`;

const ActivityIcon = styled.div<{ variant?: WidgetVariant }>`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ variant = 'primary', theme }) => {
    const colors: Record<WidgetVariant, string> = {
      primary: `${theme.colors.primary}20`,
      success: `${theme.colors.blue}20`,
      warning: `${theme.colors.magenta}20`,
      danger: `${theme.colors.pink}20`,
      info: `${theme.colors.blue}20`,
    };
    return colors[variant];
  }};
  flex-shrink: 0;
  
  svg {
    width: 16px;
    height: 16px;
    color: ${({ variant = 'primary', theme }) => {
      const colors: Record<WidgetVariant, string> = {
        primary: theme.colors.primary,
        success: theme.colors.blue,
        warning: theme.colors.magenta,
        danger: theme.colors.pink,
        info: theme.colors.blue,
      };
      return colors[variant];
    }};
  }
`;

const ActivityContent = styled.div`
  flex: 1;
  
  p {
    margin: 0;
    font-size: 14px;
    color: ${({ theme }) => theme.colors.text};
  }
  
  span {
    font-size: 12px;
    color: ${({ theme }) => theme.colors.textLight};
  }
`;

// Export individual widgets
export const StatWidget: React.FC<{
  title: string;
  value: number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: { value: number; direction: 'up' | 'down' };
  variant?: WidgetProps['variant'];
}> = ({ title, value, subtitle, icon, trend, variant = 'primary' }) => {
  return (
    <WidgetContainer
      variant={variant}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      whileHover={{ y: -4, boxShadow: '0 20px 60px rgba(152, 93, 215, 0.15)' }}
    >
      <WidgetHeader>
        <div>
          <WidgetTitle>{title}</WidgetTitle>
          <MetricValue>
            <MainValue>{value.toLocaleString()}</MainValue>
            {subtitle && <SubValue>{subtitle}</SubValue>}
          </MetricValue>
        </div>
        <IconWrapper variant={variant}>
          {icon}
        </IconWrapper>
      </WidgetHeader>
      
      {trend && (
        <TrendIndicator trend={trend.direction}>
          {trend.direction === 'up' ? <FiArrowUp /> : <FiArrowDown />}
          {Math.abs(trend.value)}%
        </TrendIndicator>
      )}
    </WidgetContainer>
  );
};

export const ProgressWidget: React.FC<{
  title: string;
  value: number;
  total: number;
  icon: React.ReactNode;
  variant?: WidgetProps['variant'];
}> = ({ title, value, total, icon, variant = 'primary' }) => {
  const percentage = (value / total) * 100;
  
  return (
    <WidgetContainer
      variant={variant}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <WidgetHeader>
        <div>
          <WidgetTitle>{title}</WidgetTitle>
          <MetricValue>
            <MainValue>{value}</MainValue>
            <SubValue>of {total} total</SubValue>
          </MetricValue>
        </div>
        <IconWrapper variant={variant}>
          {icon}
        </IconWrapper>
      </WidgetHeader>
      
      <ProgressBar>
        <ProgressFill
          variant={variant}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </ProgressBar>
    </WidgetContainer>
  );
};

const EmptyActivityState = styled.div`
  text-align: center;
  padding: 40px 20px;
  color: ${({ theme }) => theme.colors.textLight};
  
  svg {
    width: 48px;
    height: 48px;
    margin-bottom: 16px;
    opacity: 0.3;
  }
  
  p {
    margin: 0;
    font-size: 14px;
  }
`;

export const ActivityWidget: React.FC<{
  title: string;
  activities: Array<{
    id: string;
    icon: React.ReactNode;
    content: string;
    time: string;
    variant?: WidgetProps['variant'];
    navigationPath?: string;
  }>;
}> = ({ title, activities }) => {
  const router = useRouter();
  
  const handleActivityClick = (navigationPath?: string) => {
    if (navigationPath) {
      router.push(navigationPath);
    }
  };
  
  return (
    <WidgetContainer
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      style={{ padding: '20px 20px 12px' }}
    >
      <WidgetTitle style={{ marginBottom: '16px' }}>{title}</WidgetTitle>
      
      {activities.length === 0 ? (
        <EmptyActivityState>
          <FiActivity />
          <p>No recent activity</p>
          <p style={{ fontSize: '12px', marginTop: '8px' }}>
            Activity from your rooms will appear here
          </p>
        </EmptyActivityState>
      ) : (
        activities.map((activity, index) => (
          <ActivityItem
            key={activity.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            $clickable={!!activity.navigationPath}
            onClick={() => handleActivityClick(activity.navigationPath)}
          >
            <ActivityIcon variant={activity.variant}>
              {activity.icon}
            </ActivityIcon>
            <ActivityContent>
              <p>{activity.content}</p>
              <span>{activity.time}</span>
            </ActivityContent>
          </ActivityItem>
        ))
      )}
    </WidgetContainer>
  );
};