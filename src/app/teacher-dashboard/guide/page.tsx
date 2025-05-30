'use client';

import React from 'react';
import styled from 'styled-components';
import { ModernNav } from '@/components/teacher/ModernNav';
import { FiBook, FiMessageCircle, FiCheckCircle, FiArrowRight, FiInfo, FiVideo, FiUsers } from 'react-icons/fi';
import { ModernButton } from '@/components/shared/ModernButton';

// Styled Components
const GuideWrapper = styled.div`
  min-height: 100vh;
  background: ${({ theme }) => theme.colors.background};
  position: relative;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: 
      radial-gradient(circle at 20% 50%, rgba(76, 190, 243, 0.08) 0%, transparent 50%),
      radial-gradient(circle at 80% 80%, rgba(152, 93, 215, 0.08) 0%, transparent 50%),
      radial-gradient(circle at 40% 20%, rgba(200, 72, 175, 0.08) 0%, transparent 50%);
    pointer-events: none;
  }
`;

const ContentWrapper = styled.div`
  position: relative;
  z-index: 1;
  padding: 40px 40px 80px;
  max-width: 1200px;
  margin: 0 auto;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    padding: 20px 20px 60px;
  }
`;

const HeroSection = styled.div`
  text-align: center;
  margin-bottom: 60px;
  animation: fadeInUp 0.6s ease-out;
  
  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

const PageTitle = styled.h1`
  font-size: 48px;
  font-weight: 800;
  font-family: ${({ theme }) => theme.fonts.heading};
  text-transform: uppercase;
  letter-spacing: 2px;
  margin-bottom: 16px;
  background: linear-gradient(135deg, 
    ${({ theme }) => theme.colors.primary}, 
    ${({ theme }) => theme.colors.blue}
  );
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    font-size: 36px;
  }
`;

const PageSubtitle = styled.p`
  font-size: 20px;
  color: ${({ theme }) => theme.colors.textLight};
  margin-bottom: 8px;
  font-weight: 500;
`;

const IntroText = styled.p`
  font-size: 18px;
  color: ${({ theme }) => theme.colors.text};
  line-height: 1.8;
  max-width: 800px;
  margin: 0 auto 40px;
`;

const BotTypesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 32px;
  margin-bottom: 60px;
`;

const BotTypeCard = styled.div<{ $borderColor?: string; $shadowColor?: string; $delay?: string }>`
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  padding: 32px;
  border: 1px solid ${props => props.$borderColor || 'rgba(152, 93, 215, 0.2)'};
  box-shadow: 0 8px 32px ${props => props.$shadowColor || 'rgba(152, 93, 215, 0.1)'};
  transition: all 0.3s ease;
  animation: fadeInUp 0.6s ease-out;
  animation-delay: ${props => props.$delay || '0s'};
  animation-fill-mode: backwards;
  
  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 48px ${props => props.$shadowColor || 'rgba(152, 93, 215, 0.15)'};
  }
`;

const BotIcon = styled.div<{ $background: string }>`
  width: 64px;
  height: 64px;
  border-radius: 16px;
  background: ${props => props.$background};
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
  
  svg {
    width: 32px;
    height: 32px;
    color: white;
  }
`;

const BotTitle = styled.h2<{ $color: string }>`
  font-size: 28px;
  font-weight: 700;
  font-family: ${({ theme }) => theme.fonts.heading};
  text-transform: uppercase;
  color: ${props => props.$color};
  margin-bottom: 16px;
  letter-spacing: 1px;
`;

const BotDescription = styled.p`
  font-size: 16px;
  color: ${({ theme }) => theme.colors.text};
  line-height: 1.6;
  margin-bottom: 24px;
`;

const FeatureList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0 0 24px 0;
`;

const FeatureItem = styled.li<{ $color: string }>`
  display: flex;
  align-items: flex-start;
  margin-bottom: 12px;
  font-size: 15px;
  color: ${({ theme }) => theme.colors.textLight};
  
  &::before {
    content: '✓';
    color: ${props => props.$color};
    font-weight: bold;
    margin-right: 10px;
    flex-shrink: 0;
  }
`;

const StepsSection = styled.div`
  margin-top: 60px;
`;

const SectionTitle = styled.h2`
  font-size: 36px;
  font-weight: 700;
  font-family: ${({ theme }) => theme.fonts.heading};
  text-transform: uppercase;
  text-align: center;
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: 48px;
  letter-spacing: 1px;
`;

const StepsContainer = styled.div`
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 24px;
  padding: 48px;
  border: 1px solid rgba(76, 190, 243, 0.2);
  box-shadow: 0 8px 32px rgba(76, 190, 243, 0.1);
  
  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    padding: 32px 24px;
  }
`;

const StepItem = styled.div`
  display: flex;
  align-items: flex-start;
  margin-bottom: 32px;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const StepNumber = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, 
    ${({ theme }) => theme.colors.primary}, 
    ${({ theme }) => theme.colors.blue}
  );
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 20px;
  margin-right: 24px;
  flex-shrink: 0;
`;

const StepContent = styled.div`
  flex: 1;
`;

const StepTitle = styled.h3`
  font-size: 20px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: 8px;
`;

const StepDescription = styled.p`
  font-size: 16px;
  color: ${({ theme }) => theme.colors.textLight};
  line-height: 1.6;
`;

const TipsSection = styled.div`
  margin-top: 60px;
  background: linear-gradient(135deg, 
    rgba(76, 190, 243, 0.05), 
    rgba(152, 93, 215, 0.05)
  );
  border-radius: 24px;
  padding: 48px;
  border: 1px solid rgba(152, 93, 215, 0.2);
  
  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    padding: 32px 24px;
  }
`;

const TipsList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 24px;
`;

const TipItem = styled.li`
  display: flex;
  align-items: flex-start;
  
  svg {
    color: ${({ theme }) => theme.colors.primary};
    margin-right: 12px;
    flex-shrink: 0;
    margin-top: 2px;
  }
`;

const CTASection = styled.div`
  text-align: center;
  margin-top: 60px;
  padding: 48px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 24px;
  border: 1px solid rgba(200, 72, 175, 0.2);
  box-shadow: 0 8px 32px rgba(200, 72, 175, 0.1);
`;

const CTATitle = styled.h3`
  font-size: 28px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: 16px;
`;

const CTAText = styled.p`
  font-size: 18px;
  color: ${({ theme }) => theme.colors.textLight};
  margin-bottom: 32px;
`;

export default function GuidePage() {
  return (
    <>
      <ModernNav />
      <GuideWrapper>
        <ContentWrapper>
          <HeroSection>
            <PageTitle>Skolr Guide</PageTitle>
            <PageSubtitle>Create Powerful AI Assistants for Your Classroom</PageSubtitle>
            <IntroText>
              Skolr offers four types of AI chatbots to enhance your teaching. Each type serves a unique purpose 
              in supporting student learning. Here's everything you need to know to get started.
            </IntroText>
          </HeroSection>

          <BotTypesGrid>
            <BotTypeCard 
              $borderColor="rgba(76, 190, 243, 0.2)"
              $shadowColor="rgba(76, 190, 243, 0.1)"
              $delay="0.1s"
            >
              <BotIcon $background="linear-gradient(135deg, #4CBEF3, #3AA0D1)">
                <FiMessageCircle />
              </BotIcon>
              <BotTitle $color="#4CBEF3">Learning Chatbot</BotTitle>
              <BotDescription>
                Interactive AI tutors that engage students in dynamic conversations about any topic. 
                Perfect for exploration, revision, and deep learning.
              </BotDescription>
              <FeatureList>
                <FeatureItem $color="#4CBEF3">Unlimited student questions</FeatureItem>
                <FeatureItem $color="#4CBEF3">Adaptive responses based on student level</FeatureItem>
                <FeatureItem $color="#4CBEF3">Tracks engagement and understanding</FeatureItem>
                <FeatureItem $color="#4CBEF3">Works with any subject or topic</FeatureItem>
              </FeatureList>
              <ModernButton variant="secondary" style={{ width: '100%' }}>
                Best for: General tutoring & revision
              </ModernButton>
            </BotTypeCard>

            <BotTypeCard 
              $borderColor="rgba(152, 93, 215, 0.2)"
              $shadowColor="rgba(152, 93, 215, 0.1)"
              $delay="0.2s"
            >
              <BotIcon $background="linear-gradient(135deg, #985DD7, #7A4BB5)">
                <FiBook />
              </BotIcon>
              <BotTitle $color="#985DD7">Reading Chatbot</BotTitle>
              <BotDescription>
                Specialised bots that help students engage with specific texts. Upload any document 
                and create an AI expert on that content.
              </BotDescription>
              <FeatureList>
                <FeatureItem $color="#985DD7">Upload PDFs, documents, or web pages</FeatureItem>
                <FeatureItem $color="#985DD7">AI becomes an expert on your content</FeatureItem>
                <FeatureItem $color="#985DD7">Helps with comprehension & analysis</FeatureItem>
                <FeatureItem $color="#985DD7">Perfect for literature & research</FeatureItem>
              </FeatureList>
              <ModernButton variant="secondary" style={{ width: '100%' }}>
                Best for: Text analysis & comprehension
              </ModernButton>
            </BotTypeCard>

            <BotTypeCard 
              $borderColor="rgba(251, 191, 36, 0.2)"
              $shadowColor="rgba(251, 191, 36, 0.1)"
              $delay="0.3s"
            >
              <BotIcon $background="linear-gradient(135deg, #FBB024, #F59E0B)">
                <FiVideo />
              </BotIcon>
              <BotTitle $color="#F59E0B">Viewing Room</BotTitle>
              <BotDescription>
                Watch educational videos alongside an AI tutor. Students can ask questions about 
                the video content in real-time and complete linked assessments.
              </BotDescription>
              <FeatureList>
                <FeatureItem $color="#F59E0B">YouTube & Vimeo video support</FeatureItem>
                <FeatureItem $color="#F59E0B">Real-time Q&A about video content</FeatureItem>
                <FeatureItem $color="#F59E0B">Link to assessment bots</FeatureItem>
                <FeatureItem $color="#F59E0B">Track viewing engagement</FeatureItem>
              </FeatureList>
              <ModernButton variant="secondary" style={{ width: '100%' }}>
                Best for: Video-based learning
              </ModernButton>
            </BotTypeCard>

            <BotTypeCard 
              $borderColor="rgba(200, 72, 175, 0.2)"
              $shadowColor="rgba(200, 72, 175, 0.1)"
              $delay="0.4s"
            >
              <BotIcon $background="linear-gradient(135deg, #C848AF, #A43691)">
                <FiCheckCircle />
              </BotIcon>
              <BotTitle $color="#C848AF">Assessment Chatbot</BotTitle>
              <BotDescription>
                Conduct one-on-one assessments through natural conversation. Get detailed insights 
                into student understanding without traditional testing.
              </BotDescription>
              <FeatureList>
                <FeatureItem $color="#C848AF">Conversational assessment format</FeatureItem>
                <FeatureItem $color="#C848AF">Automatic grading & feedback</FeatureItem>
                <FeatureItem $color="#C848AF">Detailed performance analytics</FeatureItem>
                <FeatureItem $color="#C848AF">Reduces assessment anxiety</FeatureItem>
              </FeatureList>
              <ModernButton variant="secondary" style={{ width: '100%' }}>
                Best for: Formative & summative assessment
              </ModernButton>
            </BotTypeCard>
          </BotTypesGrid>

          <StepsSection>
            <SectionTitle>How to Create Your First Chatbot</SectionTitle>
            <StepsContainer>
              <StepItem>
                <StepNumber>1</StepNumber>
                <StepContent>
                  <StepTitle>Navigate to Chatbots</StepTitle>
                  <StepDescription>
                    From your teacher dashboard, click on "Chatbots" in the navigation menu. 
                    You'll see all your existing chatbots and a button to create new ones.
                  </StepDescription>
                </StepContent>
              </StepItem>

              <StepItem>
                <StepNumber>2</StepNumber>
                <StepContent>
                  <StepTitle>Choose Your Chatbot Type</StepTitle>
                  <StepDescription>
                    Click "Create New Chatbot" and select the type that best fits your needs. 
                    Each type has different configuration options tailored to its purpose.
                  </StepDescription>
                </StepContent>
              </StepItem>

              <StepItem>
                <StepNumber>3</StepNumber>
                <StepContent>
                  <StepTitle>Configure Basic Settings</StepTitle>
                  <StepDescription>
                    Give your chatbot a name, select the subject area, and write clear instructions. 
                    The instructions tell the AI how to interact with students and what to focus on.
                  </StepDescription>
                </StepContent>
              </StepItem>

              <StepItem>
                <StepNumber>4</StepNumber>
                <StepContent>
                  <StepTitle>Add to Your Classrooms</StepTitle>
                  <StepDescription>
                    Once created, assign your chatbot to one or more classrooms. Students in those 
                    rooms will immediately have access to interact with the bot.
                  </StepDescription>
                </StepContent>
              </StepItem>

              <StepItem>
                <StepNumber>5</StepNumber>
                <StepContent>
                  <StepTitle>Monitor & Refine</StepTitle>
                  <StepDescription>
                    Track student interactions, view chat histories, and refine your chatbot's 
                    instructions based on how students are using it. You can edit settings at any time.
                  </StepDescription>
                </StepContent>
              </StepItem>
            </StepsContainer>
          </StepsSection>

          <StepsSection>
            <SectionTitle>How to Enroll Students</SectionTitle>
            <StepsContainer>
              <StepItem>
                <StepNumber>1</StepNumber>
                <StepContent>
                  <StepTitle>Create a Classroom</StepTitle>
                  <StepDescription>
                    Go to "Classrooms" and click "Create New Room". Give it a name like "Year 9 English" 
                    or "Period 3 Science". Each room gets a unique 6-character code.
                  </StepDescription>
                </StepContent>
              </StepItem>

              <StepItem>
                <StepNumber>2</StepNumber>
                <StepContent>
                  <StepTitle>Share the Room Code</StepTitle>
                  <StepDescription>
                    Give students the 6-character room code (e.g., "ABC123"). They can join by:
                    • Going to skolr.app and clicking "Join Room"
                    • Entering the room code
                    • Creating their student account (name, email, password)
                  </StepDescription>
                </StepContent>
              </StepItem>

              <StepItem>
                <StepNumber>3</StepNumber>
                <StepContent>
                  <StepTitle>Or Use Magic Links</StepTitle>
                  <StepDescription>
                    For younger students or quick access:
                    • Go to your classroom and click "Students"
                    • Click "Generate Magic Link" for individual students
                    • Share the link - students click to join instantly
                    • No passwords required!
                  </StepDescription>
                </StepContent>
              </StepItem>

              <StepItem>
                <StepNumber>4</StepNumber>
                <StepContent>
                  <StepTitle>Bulk Import (CSV)</StepTitle>
                  <StepDescription>
                    For whole classes:
                    • Prepare a CSV file with columns: name, email, username
                    • Go to your classroom → Students → Import CSV
                    • Students are automatically enrolled
                    • They can log in with username or email
                  </StepDescription>
                </StepContent>
              </StepItem>

              <StepItem>
                <StepNumber>5</StepNumber>
                <StepContent>
                  <StepTitle>Manage Student Access</StepTitle>
                  <StepDescription>
                    • View all enrolled students in the classroom dashboard
                    • See who's active and their last login
                    • Remove students or reset their passwords if needed
                    • Archive inactive students to keep lists clean
                  </StepDescription>
                </StepContent>
              </StepItem>
            </StepsContainer>
          </StepsSection>

          <StepsSection>
            <SectionTitle>Using Viewing Rooms</SectionTitle>
            <StepsContainer>
              <StepItem>
                <StepNumber>1</StepNumber>
                <StepContent>
                  <StepTitle>Create a Viewing Room Bot</StepTitle>
                  <StepDescription>
                    Select "Viewing Room" when creating a new chatbot. Give it a descriptive name 
                    like "Photosynthesis Video Lesson" or "Shakespeare Documentary".
                  </StepDescription>
                </StepContent>
              </StepItem>

              <StepItem>
                <StepNumber>2</StepNumber>
                <StepContent>
                  <StepTitle>Add Your Video</StepTitle>
                  <StepDescription>
                    Paste a YouTube or Vimeo URL in the video field. The AI will be able to answer 
                    questions about the video content as students watch.
                  </StepDescription>
                </StepContent>
              </StepItem>

              <StepItem>
                <StepNumber>3</StepNumber>
                <StepContent>
                  <StepTitle>Link an Assessment (Optional)</StepTitle>
                  <StepDescription>
                    Create an assessment bot for the video topic, then link it to your viewing room. 
                    Students will see a "Start Assessment" button after watching.
                  </StepDescription>
                </StepContent>
              </StepItem>

              <StepItem>
                <StepNumber>4</StepNumber>
                <StepContent>
                  <StepTitle>Student Experience</StepTitle>
                  <StepDescription>
                    Students see the video on the left and chat on the right (desktop) or video on top 
                    (mobile). They can pause and ask questions at any time, making learning interactive.
                  </StepDescription>
                </StepContent>
              </StepItem>

              <StepItem>
                <StepNumber>5</StepNumber>
                <StepContent>
                  <StepTitle>Review Engagement</StepTitle>
                  <StepDescription>
                    Check chat histories to see what questions students asked during the video. 
                    This reveals which concepts they found challenging or interesting.
                  </StepDescription>
                </StepContent>
              </StepItem>
            </StepsContainer>
          </StepsSection>

          <TipsSection>
            <SectionTitle>Pro Tips for Success</SectionTitle>
            <TipsList>
              <TipItem>
                <FiInfo />
                <span>
                  <strong>Clear Instructions:</strong> Write detailed instructions for your chatbot. 
                  Include the student year group, key topics to cover, and the tone you want.
                </span>
              </TipItem>
              <TipItem>
                <FiInfo />
                <span>
                  <strong>Start Simple:</strong> Begin with one chatbot per subject and expand as 
                  you see how students engage with the technology.
                </span>
              </TipItem>
              <TipItem>
                <FiInfo />
                <span>
                  <strong>Regular Updates:</strong> Update your chatbot instructions based on common 
                  student questions or misconceptions you observe.
                </span>
              </TipItem>
              <TipItem>
                <FiInfo />
                <span>
                  <strong>Combine Types:</strong> Use different chatbot types together - a viewing room 
                  for video content linked to an assessment bot to check understanding.
                </span>
              </TipItem>
              <TipItem>
                <FiInfo />
                <span>
                  <strong>Student Feedback:</strong> Ask students which chatbots they find most helpful 
                  and adjust your approach accordingly.
                </span>
              </TipItem>
              <TipItem>
                <FiInfo />
                <span>
                  <strong>Safety First:</strong> Our AI monitors all conversations for safety. Review 
                  flagged chats promptly to support students who may need help.
                </span>
              </TipItem>
              <TipItem>
                <FiInfo />
                <span>
                  <strong>Room Codes:</strong> Keep room codes secure. Share them only with your students 
                  and consider changing them periodically for security.
                </span>
              </TipItem>
              <TipItem>
                <FiInfo />
                <span>
                  <strong>Video Selection:</strong> For viewing rooms, choose educational videos that are 
                  age-appropriate and align with your curriculum objectives.
                </span>
              </TipItem>
            </TipsList>
          </TipsSection>

          <CTASection>
            <CTATitle>Ready to Transform Your Teaching?</CTATitle>
            <CTAText>
              Create your first AI assistant in minutes and see how Skolr can enhance 
              student engagement and learning outcomes.
            </CTAText>
            <ModernButton 
              variant="primary" 
              size="large"
              onClick={() => window.location.href = '/teacher-dashboard/chatbots'}
            >
              Create Your First Chatbot
              <FiArrowRight />
            </ModernButton>
          </CTASection>
        </ContentWrapper>
      </GuideWrapper>
    </>
  );
}