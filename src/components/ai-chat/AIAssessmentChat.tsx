import React from 'react';
import ExecutiveConsultantChat from './ExecutiveConsultantChat';

interface AIAssessmentChatProps {
  onComplete?: (sessionData: any) => void;
}

const AIAssessmentChat: React.FC<AIAssessmentChatProps> = ({ onComplete }) => {
  // Redirect to the new Executive Consultant Chat
  return <ExecutiveConsultantChat onComplete={onComplete} />;
};

export default AIAssessmentChat;