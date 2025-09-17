import { UnifiedAssessment } from '@/components/UnifiedAssessment';
import { HeroSection } from '@/components/HeroSection';
import { useState } from 'react';

const Index = () => {
  const [showAssessment, setShowAssessment] = useState(false);

  if (showAssessment) {
    return (
      <UnifiedAssessment 
        onBack={() => setShowAssessment(false)}
      />
    );
  }

  return (
    <div className="min-h-screen">
      <HeroSection onStartAssessment={() => setShowAssessment(true)} />
    </div>
  );
};

export default Index;
