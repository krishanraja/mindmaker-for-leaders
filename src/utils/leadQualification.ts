import { ContactData } from '@/components/ContactCollectionForm';

export interface LeadPriority {
  tier: 'A' | 'B' | 'C';
  label: string;
  emoji: string;
  color: string;
  description: string;
  recommendedAction: string;
}

export const calculateLeadPriority = (
  contactData: ContactData,
  assessmentScore: number
): LeadPriority => {
  let score = 0;

  // Role/Title scoring (0-30 points)
  const roleTitle = contactData.roleTitle.toLowerCase();
  if (roleTitle.includes('ceo') || roleTitle.includes('founder') || roleTitle.includes('chief')) {
    score += 30;
  } else if (roleTitle.includes('vp') || roleTitle.includes('director') || roleTitle.includes('head of')) {
    score += 20;
  } else if (roleTitle.includes('manager') || roleTitle.includes('lead')) {
    score += 10;
  }

  // Company Size scoring (0-25 points)
  const companySize = contactData.companySize;
  if (companySize === '501-1000' || companySize === '1000+') {
    score += 25;
  } else if (companySize === '201-500') {
    score += 20;
  } else if (companySize === '51-200') {
    score += 15;
  } else if (companySize === '11-50') {
    score += 10;
  } else {
    score += 5;
  }

  // Timeline urgency scoring (0-25 points)
  const timeline = contactData.timeline;
  if (timeline.includes('Immediate')) {
    score += 25;
  } else if (timeline.includes('Short-term')) {
    score += 20;
  } else if (timeline.includes('Medium-term')) {
    score += 15;
  } else if (timeline.includes('Long-term')) {
    score += 10;
  } else {
    score += 5;
  }

  // Primary Focus scoring (0-20 points)
  const focus = contactData.primaryFocus;
  if (focus === 'Strategy & Vision' || focus === 'Competitive Advantage') {
    score += 20;
  } else if (focus === 'Product Innovation' || focus === 'Process Automation') {
    score += 15;
  } else {
    score += 10;
  }

  // Assessment Score bonus (high performers get extra points)
  if (assessmentScore >= 25) {
    score += 10;
  } else if (assessmentScore >= 20) {
    score += 5;
  }

  // Determine tier based on total score (0-110 possible)
  if (score >= 75) {
    return {
      tier: 'A',
      label: 'HIGH-PRIORITY EXECUTIVE',
      emoji: '🔥',
      color: '#dc2626',
      description: 'C-level executive at scale-stage company with immediate timeline',
      recommendedAction: 'Schedule executive briefing within 24 hours. High-value strategic advisory opportunity.'
    };
  } else if (score >= 50) {
    return {
      tier: 'B',
      label: 'QUALIFIED LEAD',
      emoji: '⭐',
      color: '#f59e0b',
      description: 'Decision-maker or influencer with clear AI focus and reasonable timeline',
      recommendedAction: 'Follow up within 48-72 hours. Strong potential for advisory engagement.'
    };
  } else {
    return {
      tier: 'C',
      label: 'NURTURE PROSPECT',
      emoji: '📊',
      color: '#6b7280',
      description: 'Early-stage interest or longer timeline. Educational nurture recommended.',
      recommendedAction: 'Add to nurture sequence. Provide educational content and check back in 30-60 days.'
    };
  }
};

export const formatQualificationContext = (
  contactData: ContactData,
  priority: LeadPriority,
  assessmentScore: number
): string => {
  return `
    <div style="background: white; padding: 25px; border-radius: 10px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); border-left: 6px solid ${priority.color};">
      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 20px;">
        <span style="font-size: 32px;">${priority.emoji}</span>
        <div>
          <h2 style="color: ${priority.color}; margin: 0; font-size: 24px; font-weight: bold;">${priority.label}</h2>
          <p style="margin: 5px 0 0; color: #6b7280; font-size: 14px;">Lead Priority: ${priority.tier}-Tier</p>
        </div>
      </div>
      
      <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
        <p style="margin: 0; color: #374151; font-weight: 600;">Profile Summary:</p>
        <p style="margin: 5px 0 0; color: #6b7280;">${priority.description}</p>
      </div>

      <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
        <p style="margin: 0; color: #92400e; font-weight: 600;">Recommended Action:</p>
        <p style="margin: 5px 0 0; color: #92400e;">${priority.recommendedAction}</p>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 20px;">
        <div style="background: #f8fafc; padding: 12px; border-radius: 6px;">
          <p style="margin: 0; color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase;">Seniority</p>
          <p style="margin: 5px 0 0; color: #374151; font-weight: bold;">${contactData.roleTitle}</p>
        </div>
        <div style="background: #f8fafc; padding: 12px; border-radius: 6px;">
          <p style="margin: 0; color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase;">Company Scale</p>
          <p style="margin: 5px 0 0; color: #374151; font-weight: bold;">${contactData.companySize} employees</p>
        </div>
        <div style="background: #f8fafc; padding: 12px; border-radius: 6px;">
          <p style="margin: 0; color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase;">Strategic Focus</p>
          <p style="margin: 5px 0 0; color: #374151; font-weight: bold;">${contactData.primaryFocus}</p>
        </div>
        <div style="background: #f8fafc; padding: 12px; border-radius: 6px;">
          <p style="margin: 0; color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase;">Timeline</p>
          <p style="margin: 5px 0 0; color: #374151; font-weight: bold;">${contactData.timeline}</p>
        </div>
      </div>

      <div style="margin-top: 15px; padding-top: 15px; border-top: 2px solid #e5e7eb;">
        <p style="margin: 0; color: #6b7280; font-size: 12px;">
          <strong>AI Leadership Score:</strong> ${assessmentScore}/30 | 
          <strong>Lead Consent:</strong> ✅ Opted in to receive personalized insights
        </p>
      </div>
    </div>
  `;
};
