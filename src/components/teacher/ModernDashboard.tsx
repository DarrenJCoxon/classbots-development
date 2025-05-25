// Modern dashboard with advanced UI
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
  FiZap
} from 'react-icons/fi';
import { StatWidget, ProgressWidget, ActivityWidget } from './ModernDashboardWidgets';
import { DashboardCard } from '@/components/shared/DashboardCard';

const DashboardContainer = styled.div`
  min-height: 100vh;
  background: ${({ theme }) => theme.colors.background};
  position: relative;
  
  /* Subtle mesh gradient background */
  &::before {
    content: '';
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: 
      radial-gradient(circle at 20% 50%, rgba(152, 93, 215, 0.03) 0%, transparent 50%),
      radial-gradient(circle at 80% 80%, rgba(76, 190, 243, 0.03) 0%, transparent 50%),
      radial-gradient(circle at 40% 20%, rgba(200, 72, 175, 0.03) 0%, transparent 50%);
    pointer-events: none;
    z-index: 0;
  }
`;

const ContentWrapper = styled.div`
  position: relative;
  z-index: 1;
  padding: 40px 0; /* Remove horizontal padding - will come from layout Container */
`;

const Header = styled.header`
  margin-bottom: 40px;
`;

const WelcomeSection = styled.div`
  margin-bottom: 16px;
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
  
  span {
    background: linear-gradient(135deg, 
      ${({ theme }) => theme.colors.primary}, 
      ${({ theme }) => theme.colors.magenta}
    );
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
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
`;

const DateText = styled.p`
  margin: 8px 0 0 0;
  font-size: 16px;
  color: ${({ theme }) => theme.colors.textLight};
`;

const QuickActions = styled.div`
  display: flex;
  gap: 20px;
  margin-top: 32px;
  padding: 24px;
  background: rgba(255, 255, 255, 0.5);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-radius: 16px;
  border: 1px solid rgba(152, 93, 215, 0.08);
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.04);
  
  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    flex-wrap: wrap;
    gap: 16px;
  }
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    flex-direction: column;
    padding: 20px;
    
    > * {
      width: 100%;
    }
  }
`;

const ActionButton = styled(motion.button)`
  padding: 14px 28px;
  border: none;
  border-radius: 12px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  color: white;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  
  /* Default gradient */
  background: linear-gradient(135deg, 
    ${({ theme }) => theme.colors.primary} 0%, 
    ${({ theme }) => theme.colors.magenta} 100%
  );
  
  /* Shimmer effect on hover */
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, 
      transparent, 
      rgba(255, 255, 255, 0.3), 
      transparent
    );
    transition: left 0.5s;
  }
  
  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.15);
    
    &::before {
      left: 100%;
    }
  }
  
  &.gradient-purple-blue {
    background: linear-gradient(135deg, 
      ${({ theme }) => theme.colors.primary} 0%, 
      ${({ theme }) => theme.colors.blue} 100%
    );
    box-shadow: 0 4px 20px rgba(152, 93, 215, 0.25);
    
    &:hover {
      box-shadow: 0 12px 32px rgba(152, 93, 215, 0.35);
    }
  }
  
  &.gradient-blue-magenta {
    background: linear-gradient(135deg, 
      ${({ theme }) => theme.colors.blue} 0%, 
      ${({ theme }) => theme.colors.magenta} 100%
    );
    box-shadow: 0 4px 20px rgba(76, 190, 243, 0.25);
    
    &:hover {
      box-shadow: 0 12px 32px rgba(76, 190, 243, 0.35);
    }
  }
  
  &.gradient-magenta-pink {
    background: linear-gradient(135deg, 
      ${({ theme }) => theme.colors.magenta} 0%, 
      ${({ theme }) => theme.colors.pink} 100%
    );
    box-shadow: 0 4px 20px rgba(200, 72, 175, 0.25);
    
    &:hover {
      box-shadow: 0 12px 32px rgba(200, 72, 175, 0.35);
    }
  }
`;

const Grid = styled.div`
  display: grid;
  gap: 24px;
  margin-bottom: 32px;
  
  &.stats {
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  }
  
  &.main {
    grid-template-columns: 2fr 1fr;
    
    @media (max-width: ${({ theme }) => theme.breakpoints.desktop}) {
      grid-template-columns: 1fr;
    }
  }
`;

const Section = styled(motion.section)`
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  padding: 24px;
  border: 1px solid rgba(152, 93, 215, 0.1);
  box-shadow: 0 10px 40px rgba(152, 93, 215, 0.05);
`;

const SectionTitle = styled.h2`
  margin: 0 0 20px 0;
  font-size: 18px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
  font-family: ${({ theme }) => theme.fonts.heading};
  text-transform: uppercase;
  display: flex;
  align-items: center;
  gap: 8px;
  
  svg {
    width: 20px;
    height: 20px;
    color: ${({ theme }) => theme.colors.primary};
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

interface ModernDashboardProps {
  stats: {
    totalStudents: number;
    activeRooms: number;
    totalRooms: number;
    totalChatbots: number;
    assessmentsCompleted: number;
    activeConcerns: number;
  };
  recentActivity: Array<{
    id: string;
    type: 'student' | 'room' | 'assessment' | 'concern';
    content: string;
    time: string;
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
    <DashboardContainer>
      <ContentWrapper>
        <Header>
          <WelcomeSection>
            <WelcomeText>
              Welcome back, <span>{teacherName || 'Teacher'}</span> <WelcomeIcon />
            </WelcomeText>
            <DateText>{today}</DateText>
          </WelcomeSection>
          
          <QuickActions>
            <ActionButton
              className="gradient-purple-blue"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => router.push('/teacher-dashboard/rooms')}
            >
              Create New Room
            </ActionButton>
            <ActionButton
              className="gradient-blue-magenta"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => router.push('/teacher-dashboard/chatbots')}
            >
              Create Skolrbot
            </ActionButton>
            <ActionButton
              className="gradient-magenta-pink"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => router.push('/teacher-dashboard/assessments')}
            >
              View Assessments
            </ActionButton>
          </QuickActions>
        </Header>
        
        <Grid className="stats">
          <DashboardCard
            title="Skolrbots"
            value={stats.totalChatbots}
            subtitle="AI assistants"
            icon={<FiMessageSquare />}
            variant="primary"
            onClick={() => router.push('/teacher-dashboard/chatbots')}
          />
          
          <DashboardCard
            title="Rooms"
            value={stats.totalRooms}
            subtitle="Learning spaces"
            icon={<FiUsers />}
            variant="info"
            onClick={() => router.push('/teacher-dashboard/rooms')}
          />
          
          <DashboardCard
            title="Concerns"
            value={stats.activeConcerns}
            subtitle={stats.activeConcerns > 0 ? "Require attention" : "All clear"}
            icon={<FiAlertTriangle />}
            variant={stats.activeConcerns > 0 ? "warning" : "success"}
            onClick={() => router.push('/teacher-dashboard/concerns')}
          />
        </Grid>
        
        <Grid className="main">
          <Section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <SectionTitle>
              <FiTrendingUp />
              Performance Overview
            </SectionTitle>
            <ChartPlaceholder>
              Interactive Chart Component
            </ChartPlaceholder>
          </Section>
          
          <Section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <ActivityWidget
              title="Recent Activity"
              activities={activities}
            />
          </Section>
        </Grid>
        
        <Grid className="stats">
          <Section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <SectionTitle>
              <FiClock />
              Upcoming Sessions
            </SectionTitle>
            <ChartPlaceholder style={{ height: '200px' }}>
              Session Calendar
            </ChartPlaceholder>
          </Section>
          
          <Section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <SectionTitle>
              <FiCheckCircle />
              Quick Stats
            </SectionTitle>
            <ChartPlaceholder style={{ height: '200px' }}>
              Completion Rates
            </ChartPlaceholder>
          </Section>
        </Grid>
      </ContentWrapper>
    </DashboardContainer>
  );
};