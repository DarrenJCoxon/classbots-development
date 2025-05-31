// Modern dashboard with unified UI components
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
  FiAlertTriangle,
  FiCheckCircle,
  FiXCircle,
  FiZap,
  FiPlus,
  FiFileText,
  FiAlertCircle,
  FiChevronRight,
  FiClipboard
} from 'react-icons/fi';
import { ActivityWidget } from './ModernDashboardWidgets';
import { ModernButton, ButtonGroup } from '@/components/shared/ModernButton';
import { PageWrapper, Container, Grid, Section, StatsCard, SectionTitle, Flex, Heading, Text, Stack } from '@/components/ui';;
import { RoomEngagementChart } from './RoomEngagementChart';

// Custom styled components for dashboard-specific elements
const DashboardSectionTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
  
  svg {
    width: 20px;
    height: 20px;
    color: ${({ theme }) => theme.colors.primary};
  }
  
  h2 {
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
  }
`;

const ActivityList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const ActivityItem = styled(motion.div)<{ $clickable?: boolean }>`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  cursor: ${({ $clickable }) => $clickable ? 'pointer' : 'default'};
  transition: all 0.2s ease;
  
  &:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }
  
  ${({ $clickable }) => $clickable && `
    &:hover {
      background-color: ${({ theme }: any) => theme.colors.backgroundLight};
      margin-left: -12px;
      margin-right: -12px;
      padding-left: 12px;
      padding-right: 12px;
      border-radius: 8px;
    }
  `}
`;

const ActivityIcon = styled.div<{ variant?: string }>`
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ variant = 'primary', theme }) => {
    const colors: Record<string, string> = {
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
      const colors: Record<string, string> = {
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

const EmptyActivityState = styled.div`
  text-align: center;
  padding: 48px 24px;
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
const Header = styled.header`
  margin-bottom: 40px;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    margin-bottom: 32px;
  }
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    margin-bottom: 24px;
  }
`;

const WelcomeSection = styled.div`
  margin-bottom: 24px;
`;

const WelcomeText = styled.h1`
  margin: 0;
  font-size: 36px;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.text};
  font-family: ${({ theme }) => theme.fonts.heading};
  text-transform: uppercase;
  letter-spacing: 1px;
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    font-size: 32px;
  }
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    font-size: 24px;
    letter-spacing: 0.5px;
    gap: 8px;
    flex-direction: column;
    align-items: flex-start;
  }
  
  span {
    background: linear-gradient(135deg, 
      ${({ theme }) => theme.colors.primary}, 
      ${({ theme }) => theme.colors.magenta}
    );
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  
  .welcome-line {
    @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
      display: block;
      width: 100%;
    }
  }
  
  .name-line {
    @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
      display: flex;
      align-items: center;
      gap: 8px;
    }
  }
`;

const WelcomeIcon = styled(FiZap)`
  font-size: 32px;
  background: linear-gradient(135deg, 
    ${({ theme }) => theme.colors.primary}, 
    ${({ theme }) => theme.colors.magenta}
  );
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    font-size: 24px;
  }
`;

const ChartPlaceholder = styled.div`
  height: 300px;
  background: linear-gradient(135deg, 
    ${({ theme }) => theme.colors.backgroundCard}, 
    ${({ theme }) => theme.colors.backgroundDark}
  );
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.colors.textLight};
  font-size: 14px;
`;

const WorkflowArrow = styled(FiChevronRight)`
  font-size: 24px;
  color: ${({ theme }) => theme.colors.textLight};
  
  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    display: none;
  }
`;

interface RoomEngagement {
  room_id: string;
  room_name: string;
  totalStudents: number;
  activeStudents: number;
  engagementRate: number;
}

interface ModernDashboardProps {
  stats: {
    totalStudents: number;
    activeRooms: number;
    totalRooms: number;
    totalChatbots: number;
    assessmentsCompleted: number;
    activeConcerns: number;
    roomEngagement?: RoomEngagement[];
  };
  recentActivity: Array<{
    id: string;
    type: 'student' | 'room' | 'assessment' | 'concern';
    content: string;
    time: string;
    navigationPath?: string;
  }>;
  teacherName: string | null;
}

export const ModernDashboard: React.FC<ModernDashboardProps> = ({ stats, recentActivity, teacherName }) => {
  const router = useRouter();
  const today = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  // Map activity types to icons and variants
  const getActivityDetails = (type: string) => {
    switch (type) {
      case 'student':
        return { icon: <FiUsers />, variant: 'primary' as const };
      case 'room':
        return { icon: <FiMessageSquare />, variant: 'info' as const };
      case 'assessment':
        return { icon: <FiBookOpen />, variant: 'success' as const };
      case 'concern':
        return { icon: <FiAlertTriangle />, variant: 'warning' as const };
      default:
        return { icon: <FiActivity />, variant: 'primary' as const };
    }
  };
  
  const activities = recentActivity.map(activity => ({
    ...activity,
    ...getActivityDetails(activity.type)
  }));

  return (
    <PageWrapper gradient>
      <Container size="large" spacing="xl">
        <Stack spacing="lg">
          <Header>
            <WelcomeSection>
              <WelcomeText>
                <div className="welcome-line">Welcome back,</div>
                <div className="name-line">
                  <span>{teacherName || 'Teacher'}</span>
                  <WelcomeIcon />
                </div>
              </WelcomeText>
              <Text color="light" noMargin>{today}</Text>
            </WelcomeSection>
            
            <Section spacing="md">
              <ButtonGroup>
                <ModernButton
                  variant="primary"
                  size="medium"
                  onClick={() => router.push('/teacher-dashboard/chatbots')}
                >
                  <FiMessageSquare />
                  Create Skolr
                </ModernButton>
                <WorkflowArrow />
                <ModernButton
                  variant="secondary"
                  size="medium"
                  onClick={() => router.push('/teacher-dashboard/rooms')}
                >
                  <FiPlus />
                  Create Room
                </ModernButton>
                <WorkflowArrow />
                <ModernButton
                  variant="primary"
                  size="medium"
                  onClick={() => router.push('/teacher-dashboard/assessments')}
                >
                  <FiClipboard />
                  Assess Progress
                </ModernButton>
              </ButtonGroup>
            </Section>
          </Header>
          
          <Grid cols={3} gap="md">
            <StatsCard
              title="Skolrs"
              value={stats.totalChatbots}
              subtitle="AI assistants"
              icon={<FiMessageSquare />}
              accentColor="primary"
              onClick={() => router.push('/teacher-dashboard/chatbots')}
            />
            
            <StatsCard
              title="Rooms"
              value={stats.totalRooms}
              subtitle="Learning spaces"
              icon={<FiUsers />}
              accentColor="success"
              onClick={() => router.push('/teacher-dashboard/rooms')}
            />
            
            <StatsCard
              title="Concerns"
              value={stats.activeConcerns}
              subtitle={stats.activeConcerns > 0 ? "Require attention" : "All clear"}
              icon={<FiAlertTriangle />}
              accentColor={stats.activeConcerns > 0 ? "danger" : "success"}
              onClick={() => router.push('/teacher-dashboard/concerns')}
            />
          </Grid>
          
          <Grid cols={2} gap="lg">
            <Section transition={{ delay: 0.2 }}>
              <DashboardSectionTitle>
                <FiTrendingUp />
                <h2>Performance Overview</h2>
              </DashboardSectionTitle>
              <RoomEngagementChart 
                data={stats.roomEngagement} 
                loading={false}
              />
            </Section>
            
            <Section transition={{ delay: 0.3 }}>
              <DashboardSectionTitle>
                <FiActivity />
                <h2>Recent Activity</h2>
              </DashboardSectionTitle>
              
              {activities.length === 0 ? (
                <EmptyActivityState>
                  <FiActivity />
                  <p>No recent activity</p>
                  <p style={{ fontSize: '12px', marginTop: '8px' }}>
                    Activity from your rooms will appear here
                  </p>
                </EmptyActivityState>
              ) : (
                <ActivityList>
                  {activities.map((activity, index) => (
                    <ActivityItem
                      key={activity.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      $clickable={!!activity.navigationPath}
                      onClick={() => {
                        if (activity.navigationPath) {
                          router.push(activity.navigationPath);
                        }
                      }}
                    >
                      <ActivityIcon variant={activity.variant}>
                        {activity.icon}
                      </ActivityIcon>
                      <ActivityContent>
                        <p>{activity.content}</p>
                        <span>{activity.time}</span>
                      </ActivityContent>
                    </ActivityItem>
                  ))}
                </ActivityList>
              )}
            </Section>
          </Grid>
        </Stack>
      </Container>
    </PageWrapper>
  );
};