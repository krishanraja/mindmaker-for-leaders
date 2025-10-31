import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

// Co-locate SCALE UPS mapping for email generation
interface ScaleUpsDimension {
  dimension: string;
  level: 'Manual-Bound' | 'Experimenter' | 'Accelerator' | 'Category Breaker';
  reasoning: string;
}

function deriveLeadershipComparisonForEmail(data: any): ScaleUpsDimension[] {
  const extractScore = (response: string): number => {
    const match = response?.match(/^(\d+)/);
    return match ? parseInt(match[1]) : 0;
  };

  const scores = {
    industry_impact: extractScore(data.industry_impact),
    business_acceleration: extractScore(data.business_acceleration),
    team_alignment: extractScore(data.team_alignment),
    external_positioning: extractScore(data.external_positioning),
    kpi_connection: extractScore(data.kpi_connection),
    coaching_champions: extractScore(data.coaching_champions)
  };

  const deepProfile = data.deepProfile;
  const timeWaste = deepProfile?.timeWaste || 50;
  const stakeholderCount = deepProfile?.stakeholders?.length || 0;
  
  return [
    {
      dimension: 'AI Fluency',
      level: scores.industry_impact === 5 ? 'Category Breaker' :
             scores.industry_impact >= 4 ? 'Accelerator' :
             scores.industry_impact === 3 ? 'Experimenter' : 'Manual-Bound',
      reasoning: scores.industry_impact >= 4 ? 
        'You articulate AI\'s impact with clarity and can educate others' :
        'You\'re building your AI vocabulary and understanding'
    },
    {
      dimension: 'Delegation Mastery',
      level: scores.business_acceleration === 5 && timeWaste < 20 ? 'Category Breaker' :
             scores.business_acceleration >= 4 ? 'Accelerator' :
             scores.business_acceleration === 3 ? 'Experimenter' : 'Manual-Bound',
      reasoning: timeWaste < 30 ? 
        'You\'re actively delegating to AI and reclaiming valuable time' :
        `You have opportunity to free up ${timeWaste}% of your time through delegation`
    },
    {
      dimension: 'Strategic Vision',
      level: (scores.kpi_connection + scores.external_positioning) / 2 >= 4.5 ? 'Category Breaker' :
             (scores.kpi_connection + scores.external_positioning) / 2 >= 4 ? 'Accelerator' :
             (scores.kpi_connection + scores.external_positioning) / 2 >= 3 ? 'Experimenter' : 'Manual-Bound',
      reasoning: scores.kpi_connection >= 4 ? 
        'You connect AI initiatives to measurable business outcomes effectively' :
        'You\'re learning to bridge AI capabilities with business impact'
    },
    {
      dimension: 'Decision Agility',
      level: scores.industry_impact === 5 ? 'Category Breaker' :
             scores.industry_impact >= 4 ? 'Accelerator' :
             scores.industry_impact === 3 ? 'Experimenter' : 'Manual-Bound',
      reasoning: scores.industry_impact >= 4 ? 
        'You make informed decisions rapidly using AI-powered intelligence' :
        'You\'re building your decision-making speed through better data access'
    },
    {
      dimension: 'Impact Orientation',
      level: scores.kpi_connection === 5 ? 'Category Breaker' :
             scores.kpi_connection >= 4 ? 'Accelerator' :
             scores.kpi_connection === 3 ? 'Experimenter' : 'Manual-Bound',
      reasoning: scores.kpi_connection >= 4 ? 
        'You rigorously track outcomes and focus on high-impact strategic work' :
        'You\'re developing your measurement discipline and impact focus'
    },
    {
      dimension: 'Change Leadership',
      level: (scores.external_positioning + scores.coaching_champions + scores.team_alignment) / 3 >= 4.5 ? 'Category Breaker' :
             (scores.external_positioning + scores.coaching_champions + scores.team_alignment) / 3 >= 4 ? 'Accelerator' :
             (scores.external_positioning + scores.coaching_champions + scores.team_alignment) / 3 >= 3 ? 'Experimenter' : 'Manual-Bound',
      reasoning: (scores.external_positioning + scores.coaching_champions + scores.team_alignment) / 3 >= 4 ? 
        'You\'re recognized as an AI champion and inspire others effectively' :
        'You\'re growing your influence as an AI transformation leader'
    }
  ];
}

function getBadgeColor(level: string): string {
  switch (level) {
    case 'Category Breaker': return '#6366f1';
    case 'Accelerator': return '#10b981';
    case 'Experimenter': return '#f59e0b';
    case 'Manual-Bound': return '#ef4444';
    default: return '#64748b';
  }
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DiagnosticEmailRequest {
  data: {
    // AI Leadership Growth Benchmark data structure
    industry_impact?: string;
    business_acceleration?: string;
    team_alignment?: string;
    external_positioning?: string;
    kpi_connection?: string;
    coaching_champions?: string;
    // Contact information
    firstName?: string;
    lastName?: string;
    email?: string;
    company?: string;
    title?: string;
    roleTitle?: string;
    companySize?: string;
    primaryFocus?: string;
    timeline?: string;
    linkedinUrl?: string;
    consentToInsights?: boolean;
    hasDeepProfile?: boolean;
    // Deep profile data
    deepProfile?: {
      thinkingProcess?: string;
      communicationStyle?: string[];
      workBreakdown?: {
        writing?: number;
        presentations?: number;
        planning?: number;
        decisions?: number;
        coaching?: number;
      };
      informationNeeds?: string[];
      transformationGoal?: string;
      timeWaste?: number;
      timeWasteExamples?: string;
      delegateTasks?: string[];
      biggestChallenge?: string;
      stakeholders?: string[];
    };
  };
  scores?: {
    total?: number;
  };
  contactType?: string;
  sessionId?: string;
}

const LEADERSHIP_QUESTIONS = {
  'industry_impact': {
    full: 'I can clearly explain AI\'s impact on our industry in growth terms (market expansion, margin enhancement, speed to value).',
    short: 'Industry Impact Understanding'
  },
  'business_acceleration': {
    full: 'I know which specific areas of our business can be accelerated by AI-first workflows and processes.',
    short: 'Business Acceleration Clarity'
  },
  'team_alignment': {
    full: 'My leadership team shares a common, aligned AI growth narrative and strategic vision.',
    short: 'Leadership Team Alignment'
  },
  'external_positioning': {
    full: 'AI capabilities and vision are integrated into our external positioning with investors, customers, and the market.',
    short: 'External AI Positioning'
  },
  'kpi_connection': {
    full: 'I actively connect AI adoption initiatives directly to measurable business KPIs (profit margin, time-to-market, risk-adjusted growth).',
    short: 'KPI-Driven AI Strategy'
  },
  'coaching_champions': {
    full: 'I actively identify, coach, and empower emerging AI champions and innovators within my organization.',
    short: 'AI Champion Development'
  }
};

const formatLeadershipAssessment = (data: any): string => {
  const sections: string[] = [];
  
  Object.entries(LEADERSHIP_QUESTIONS).forEach(([category, questionData]) => {
    const answer = data[category];
    if (answer) {
      sections.push(`
        <div style="margin-bottom: 20px; padding: 18px; background: #ffffff; border-left: 4px solid #6366f1; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <p style="margin: 0 0 12px; font-weight: bold; color: #1e293b; font-size: 15px; line-height: 1.5;">${questionData.full}</p>
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="display: inline-block; padding: 6px 12px; background: #6366f1; color: white; border-radius: 6px; font-weight: 600; font-size: 14px;">${answer}</span>
            <span style="color: #64748b; font-size: 13px; font-style: italic;">${questionData.short}</span>
          </div>
        </div>
      `);
    }
  });
  
  return sections.length > 0 ? sections.join('') : '<p style="color: #64748b; font-style: italic;">No assessment responses captured</p>';
};

const formatDeepProfile = (deepProfile: any): string => {
  if (!deepProfile) return '<p style="color: #64748b; font-style: italic;">Deep profile questionnaire was not completed.</p>';
  
  const sections: string[] = [];
  
  // Thinking Process
  if (deepProfile.thinkingProcess) {
    sections.push(`
      <div style="margin-bottom: 18px; padding: 15px; background: #f8fafc; border-radius: 6px;">
        <p style="margin: 0 0 8px; font-weight: bold; color: #1e293b;">🧠 Problem-Solving Approach</p>
        <p style="margin: 0; color: #475569; line-height: 1.6;">${deepProfile.thinkingProcess}</p>
      </div>
    `);
  }
  
  // Communication Style
  if (deepProfile.communicationStyle && deepProfile.communicationStyle.length > 0) {
    sections.push(`
      <div style="margin-bottom: 18px; padding: 15px; background: #f8fafc; border-radius: 6px;">
        <p style="margin: 0 0 8px; font-weight: bold; color: #1e293b;">💬 Communication Style</p>
        <p style="margin: 0; color: #475569;">${deepProfile.communicationStyle.join(', ')}</p>
      </div>
    `);
  }
  
  // Work Time Breakdown
  if (deepProfile.workBreakdown) {
    const breakdown = deepProfile.workBreakdown;
    sections.push(`
      <div style="margin-bottom: 18px; padding: 15px; background: #f8fafc; border-radius: 6px;">
        <p style="margin: 0 0 12px; font-weight: bold; color: #1e293b;">⏱️ Work Time Allocation</p>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; color: #475569;">
          ${breakdown.writing ? `<div>• Writing/Documentation: <strong>${breakdown.writing}%</strong></div>` : ''}
          ${breakdown.presentations ? `<div>• Presentations/Meetings: <strong>${breakdown.presentations}%</strong></div>` : ''}
          ${breakdown.planning ? `<div>• Strategic Planning: <strong>${breakdown.planning}%</strong></div>` : ''}
          ${breakdown.decisions ? `<div>• Decision Making: <strong>${breakdown.decisions}%</strong></div>` : ''}
          ${breakdown.coaching ? `<div>• Coaching/Mentoring: <strong>${breakdown.coaching}%</strong></div>` : ''}
        </div>
      </div>
    `);
  }
  
  // Information Needs
  if (deepProfile.informationNeeds && deepProfile.informationNeeds.length > 0) {
    sections.push(`
      <div style="margin-bottom: 18px; padding: 15px; background: #f8fafc; border-radius: 6px;">
        <p style="margin: 0 0 8px; font-weight: bold; color: #1e293b;">📊 Decision-Making Information Needs</p>
        <p style="margin: 0; color: #475569;">${deepProfile.informationNeeds.join(', ')}</p>
      </div>
    `);
  }
  
  // Transformation Goal
  if (deepProfile.transformationGoal) {
    sections.push(`
      <div style="margin-bottom: 18px; padding: 15px; background: #fef3c7; border-radius: 6px; border-left: 4px solid #f59e0b;">
        <p style="margin: 0 0 8px; font-weight: bold; color: #1e293b;">🎯 Primary AI Transformation Goal</p>
        <p style="margin: 0; color: #475569; font-weight: 600;">${deepProfile.transformationGoal}</p>
      </div>
    `);
  }
  
  // Time Waste
  if (deepProfile.timeWaste !== undefined) {
    sections.push(`
      <div style="margin-bottom: 18px; padding: 15px; background: #fee2e2; border-radius: 6px; border-left: 4px solid #dc2626;">
        <p style="margin: 0 0 8px; font-weight: bold; color: #1e293b;">⚠️ Non-Critical Work Time</p>
        <p style="margin: 0; color: #475569;"><strong>${deepProfile.timeWaste}%</strong> of time spent on work that could be automated or delegated</p>
        ${deepProfile.timeWasteExamples ? `<p style="margin: 10px 0 0; color: #475569; font-style: italic;">Examples: ${deepProfile.timeWasteExamples}</p>` : ''}
      </div>
    `);
  }
  
  // Delegation Priorities
  if (deepProfile.delegateTasks && deepProfile.delegateTasks.length > 0) {
    sections.push(`
      <div style="margin-bottom: 18px; padding: 15px; background: #dbeafe; border-radius: 6px; border-left: 4px solid #2563eb;">
        <p style="margin: 0 0 8px; font-weight: bold; color: #1e293b;">🤖 Top AI Delegation Priorities</p>
        <ol style="margin: 5px 0 0; padding-left: 20px; color: #475569;">
          ${deepProfile.delegateTasks.map((task: string) => `<li style="margin: 4px 0;">${task}</li>`).join('')}
        </ol>
      </div>
    `);
  }
  
  // Biggest Challenge
  if (deepProfile.biggestChallenge) {
    sections.push(`
      <div style="margin-bottom: 18px; padding: 15px; background: #f8fafc; border-radius: 6px;">
        <p style="margin: 0 0 8px; font-weight: bold; color: #1e293b;">🎤 Primary Communication Challenge</p>
        <p style="margin: 0; color: #475569;">${deepProfile.biggestChallenge}</p>
      </div>
    `);
  }
  
  // Stakeholders
  if (deepProfile.stakeholders && deepProfile.stakeholders.length > 0) {
    sections.push(`
      <div style="margin-bottom: 18px; padding: 15px; background: #f8fafc; border-radius: 6px;">
        <p style="margin: 0 0 8px; font-weight: bold; color: #1e293b;">👥 Key Stakeholder Groups</p>
        <p style="margin: 0; color: #475569;">${deepProfile.stakeholders.join(', ')}</p>
      </div>
    `);
  }
  
  return sections.length > 0 ? sections.join('') : '<p style="color: #64748b; font-style: italic;">Deep profile data incomplete.</p>';
};

const generateAIContextSummary = (data: any, scores: any, tier: any): string => {
  const total = scores?.total || 0;
  
  return `
    <div style="background: linear-gradient(135deg, #1e293b 0%, #334155 100%); color: white; padding: 25px; border-radius: 10px; margin: 20px 0;">
      <h3 style="margin: 0 0 15px; color: white; font-size: 18px;">🤖 AI-Optimized Context Summary for Scope of Work Generation</h3>
      
      <div style="background: rgba(255,255,255,0.1); padding: 15px; border-radius: 6px; margin-bottom: 15px;">
        <p style="margin: 0 0 10px; font-weight: bold; color: #fbbf24;">Executive Profile:</p>
        <ul style="margin: 0; padding-left: 20px; line-height: 1.8;">
          <li><strong>Role:</strong> ${data.title || data.roleTitle || 'Not specified'} at ${data.company || 'Company'}</li>
          <li><strong>Company Size:</strong> ${data.companySize || 'Not specified'}</li>
          <li><strong>Primary AI Focus:</strong> ${data.primaryFocus || 'Not specified'}</li>
          <li><strong>Implementation Timeline:</strong> ${data.timeline || 'Not specified'}</li>
        </ul>
      </div>
      
      <div style="background: rgba(255,255,255,0.1); padding: 15px; border-radius: 6px; margin-bottom: 15px;">
        <p style="margin: 0 0 10px; font-weight: bold; color: #fbbf24;">AI Leadership Maturity:</p>
        <ul style="margin: 0; padding-left: 20px; line-height: 1.8;">
          <li><strong>Overall Score:</strong> ${total}/30 - ${tier.name} Level</li>
          <li><strong>Classification:</strong> ${tier.description}</li>
          <li><strong>Industry Impact Understanding:</strong> ${data.industry_impact || 'Not assessed'}</li>
          <li><strong>Business Acceleration Clarity:</strong> ${data.business_acceleration || 'Not assessed'}</li>
          <li><strong>Leadership Team Alignment:</strong> ${data.team_alignment || 'Not assessed'}</li>
        </ul>
      </div>
      
      ${data.deepProfile ? `
      <div style="background: rgba(255,255,255,0.1); padding: 15px; border-radius: 6px; margin-bottom: 15px;">
        <p style="margin: 0 0 10px; font-weight: bold; color: #fbbf24;">Deep Profile Insights:</p>
        <ul style="margin: 0; padding-left: 20px; line-height: 1.8;">
          ${data.deepProfile.transformationGoal ? `<li><strong>Transformation Goal:</strong> ${data.deepProfile.transformationGoal}</li>` : ''}
          ${data.deepProfile.timeWaste ? `<li><strong>Efficiency Gap:</strong> ${data.deepProfile.timeWaste}% of time on low-value work</li>` : ''}
          ${data.deepProfile.delegateTasks && data.deepProfile.delegateTasks.length > 0 ? `<li><strong>Delegation Priorities:</strong> ${data.deepProfile.delegateTasks.join(', ')}</li>` : ''}
          ${data.deepProfile.biggestChallenge ? `<li><strong>Communication Challenge:</strong> ${data.deepProfile.biggestChallenge}</li>` : ''}
        </ul>
      </div>
      ` : ''}
      
      <div style="background: rgba(255,255,255,0.1); padding: 15px; border-radius: 6px;">
        <p style="margin: 0 0 10px; font-weight: bold; color: #fbbf24;">Recommended Strategic Focus:</p>
        <ul style="margin: 0; padding-left: 20px; line-height: 1.8;">
          ${tier.focus.map((focus: string) => `<li>${focus}</li>`).join('')}
        </ul>
      </div>
      
      <div style="margin-top: 15px; padding: 12px; background: rgba(251,191,36,0.2); border-radius: 6px; border-left: 3px solid #fbbf24;">
        <p style="margin: 0; font-size: 13px; line-height: 1.6;">
          <strong>SOW Generation Guidance:</strong> This executive ${total >= 25 ? 'is highly sophisticated and ready for advanced AI transformation initiatives' : total >= 20 ? 'has strong AI awareness and needs structured implementation support' : total >= 15 ? 'understands AI value but requires clear execution roadmap and leadership alignment' : 'needs foundational AI education and quick wins to build confidence'}. Tailor engagement scope accordingly.
        </p>
      </div>
    </div>
  `;
};

const generatePersonalizedRecommendations = (data: any, tier: any): string => {
  const recommendations: string[] = [];
  
  // Tier-specific recommendations
  if (tier.name === 'AI-Orchestrator') {
    recommendations.push(
      '<li><strong>Advanced Implementation:</strong> Deploy proprietary AI capabilities and build competitive moats</li>',
      '<li><strong>Innovation Lab:</strong> Establish AI innovation centers and R&D initiatives</li>',
      '<li><strong>Thought Leadership:</strong> External speaking, case studies, and market positioning</li>'
    );
  } else if (tier.name === 'AI-Confident') {
    recommendations.push(
      '<li><strong>Scale Adoption:</strong> Expand successful pilots across business units</li>',
      '<li><strong>Measurement Framework:</strong> Implement KPI tracking for AI initiatives</li>',
      '<li><strong>Culture Development:</strong> Build internal AI champions and expertise</li>'
    );
  } else if (tier.name === 'AI-Aware') {
    recommendations.push(
      '<li><strong>Strategic Roadmap:</strong> Develop 90-day AI implementation plan</li>',
      '<li><strong>Team Alignment:</strong> Conduct executive AI strategy workshop</li>',
      '<li><strong>Use Case Discovery:</strong> Identify high-impact AI opportunities</li>'
    );
  } else {
    recommendations.push(
      '<li><strong>Foundation Building:</strong> Executive AI literacy training program</li>',
      '<li><strong>Quick Wins:</strong> Start with high-visibility, low-risk AI pilots</li>',
      '<li><strong>Vision Development:</strong> Clarify AI\'s role in business strategy</li>'
    );
  }
  
  // Deep profile-based recommendations
  if (data.deepProfile) {
    if (data.deepProfile.timeWaste && data.deepProfile.timeWaste > 30) {
      recommendations.push('<li><strong>Efficiency Sprint:</strong> Priority focus on automating high-time-waste activities</li>');
    }
    if (data.deepProfile.transformationGoal) {
      recommendations.push(`<li><strong>Goal-Aligned Engagement:</strong> Customize program for ${data.deepProfile.transformationGoal}</li>`);
    }
  }
  
  return recommendations.join('');
};

const getTierClassification = (score: number) => {
  if (score >= 25) {
    return {
      name: 'AI-Orchestrator',
      description: 'Leading organizational AI transformation with strategic sophistication',
      color: '#059669',
      focus: [
        'Scale AI adoption across all business units with measurable ROI',
        'Build sustainable competitive moats through proprietary AI capabilities',
        'Develop internal AI expertise, IP, and innovation culture'
      ]
    };
  } else if (score >= 20) {
    return {
      name: 'AI-Confident',
      description: 'Strong foundational understanding with strategic implementation gaps',
      color: '#2563eb',
      focus: [
        'Accelerate team-wide AI implementation with structured rollout',
        'Connect AI initiatives directly to business KPIs and financial outcomes',
        'Build internal AI expertise, training programs, and change management'
      ]
    };
  } else if (score >= 15) {
    return {
      name: 'AI-Aware',
      description: 'Understands AI value potential but lacks execution clarity and alignment',
      color: '#f59e0b',
      focus: [
        'Develop concrete, actionable AI adoption roadmap with quick wins',
        'Align leadership team on unified AI strategy and vision',
        'Identify and prioritize highest-impact AI use cases for organization'
      ]
    };
  } else {
    return {
      name: 'AI-Confused',
      description: 'Significant opportunity for strategic AI leadership development',
      color: '#dc2626',
      focus: [
        'Build foundational AI literacy across executive leadership team',
        'Clarify AI\'s specific role in business strategy and growth plans',
        'Start with tangible quick wins to build confidence and momentum'
      ]
    };
  }
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { data, scores, contactType, sessionId }: DiagnosticEmailRequest = await req.json();

    console.log("Generating comprehensive AI Leadership Growth Benchmark email for:", data.email);

    const total = scores?.total || 0;
    const tier = getTierClassification(total);

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY not configured');
    }

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: "AI Leadership Growth Benchmark <no-reply@fractionl.ai>",
        to: ["krish@fractionl.ai"],
        subject: `🎯 ${tier.name} Executive Lead: ${data.firstName || ''} ${data.lastName || ''} (${data.company || 'Company'}) - ${total}/30 Score ${data.hasDeepProfile ? '+ Deep Profile ✅' : ''}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>AI Leadership Growth Benchmark - Executive Report</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: #f1f5f9;">
          
          <div style="max-width: 800px; margin: 0 auto; padding: 20px;">
            
            <!-- Header -->
            <div style="text-align: center; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 40px 30px; border-radius: 12px; margin-bottom: 30px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              <h1 style="margin: 0 0 10px; font-size: 32px; font-weight: bold; letter-spacing: -0.5px;">🎯 AI Leadership Growth Benchmark</h1>
              <p style="margin: 0 0 5px; font-size: 18px; opacity: 0.95;">Executive Assessment Report</p>
              <p style="margin: 0; font-size: 14px; opacity: 0.85;">${new Date().toLocaleString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
              <div style="margin-top: 15px; padding: 10px 20px; background: rgba(255,255,255,0.2); border-radius: 8px; display: inline-block;">
                <span style="font-size: 16px; font-weight: 600;">${contactType === 'book_call' ? '📞 Executive Advisory Request' : '📧 Learn More Request'}</span>
              </div>
            </div>

            <!-- Executive Summary Card -->
            <div style="background: white; padding: 30px; border-radius: 12px; margin-bottom: 25px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              <div style="text-align: center; margin-bottom: 25px;">
                <div style="display: inline-block; background: ${tier.color}; color: white; padding: 25px 40px; border-radius: 12px; box-shadow: 0 4px 12px ${tier.color}40;">
                  <div style="font-size: 48px; font-weight: bold; margin-bottom: 10px;">${total}/30</div>
                  <div style="font-size: 22px; font-weight: 600; margin-bottom: 5px;">${tier.name}</div>
                  <div style="font-size: 14px; opacity: 0.9;">${tier.description}</div>
                </div>
              </div>
              
              <div style="background: #f8fafc; padding: 20px; border-radius: 8px; border-left: 4px solid ${tier.color};">
                <h3 style="margin: 0 0 15px; color: #1e293b; font-size: 16px;">🎯 Strategic Focus Areas for Engagement:</h3>
                <ul style="margin: 0; padding-left: 20px; color: #475569; line-height: 1.9;">
                  ${tier.focus.map((focus: string) => `<li style="margin: 6px 0;">${focus}</li>`).join('')}
                </ul>
              </div>
            </div>

            <!-- Contact Information -->
            <div style="background: white; padding: 30px; border-radius: 12px; margin-bottom: 25px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              <h2 style="color: #1e293b; margin: 0 0 20px; border-bottom: 3px solid #6366f1; padding-bottom: 12px; font-size: 22px;">👤 Executive Contact Information</h2>
              
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                <div>
                  <p style="margin: 0 0 12px; color: #1e293b;"><strong style="color: #64748b;">Name:</strong> ${data.firstName || ''} ${data.lastName || ''}</p>
                  <p style="margin: 0 0 12px; color: #1e293b;"><strong style="color: #64748b;">Email:</strong> <a href="mailto:${data.email}" style="color: #6366f1; text-decoration: none;">${data.email || 'Not provided'}</a></p>
                  <p style="margin: 0 0 12px; color: #1e293b;"><strong style="color: #64748b;">Company:</strong> ${data.company || 'Not provided'}</p>
                  <p style="margin: 0 0 12px; color: #1e293b;"><strong style="color: #64748b;">Title:</strong> ${data.title || data.roleTitle || 'Not provided'}</p>
                </div>
                <div>
                  <p style="margin: 0 0 12px; color: #1e293b;"><strong style="color: #64748b;">Company Size:</strong> ${data.companySize || 'Not provided'}</p>
                  <p style="margin: 0 0 12px; color: #1e293b;"><strong style="color: #64748b;">Primary AI Focus:</strong> ${data.primaryFocus || 'Not provided'}</p>
                  <p style="margin: 0 0 12px; color: #1e293b;"><strong style="color: #64748b;">Timeline:</strong> ${data.timeline || 'Not provided'}</p>
                  <p style="margin: 0 0 12px; color: #1e293b;"><strong style="color: #64748b;">Consent to Insights:</strong> ${data.consentToInsights ? '✅ Opted in' : '❌ No consent'}</p>
                </div>
              </div>
              
              ${data.linkedinUrl ? `
              <p style="margin: 0 0 12px; color: #1e293b;"><strong style="color: #64748b;">LinkedIn:</strong> <a href="${data.linkedinUrl}" target="_blank" style="color: #6366f1; text-decoration: none;">${data.linkedinUrl}</a></p>
              ` : ''}
              
              <div style="background: #fef3c7; padding: 18px; border-radius: 8px; margin-top: 20px; border-left: 4px solid #f59e0b;">
                <p style="margin: 0 0 10px; color: #1e293b;"><strong>🎯 Service Requested:</strong> AI Leadership Executive Primer Session</p>
                <p style="margin: 0 0 10px; color: #1e293b;"><strong>📋 Session ID:</strong> ${sessionId || 'Not provided'}</p>
                <p style="margin: 0; color: #1e293b;"><strong>📊 Deep Profile Status:</strong> ${data.hasDeepProfile ? '✅ Completed (10 additional insights collected)' : '❌ Skipped'}</p>
              </div>
            </div>

            <!-- Complete Assessment Responses -->
            <div style="background: white; padding: 30px; border-radius: 12px; margin-bottom: 25px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              <h2 style="color: #1e293b; margin: 0 0 20px; border-bottom: 3px solid #6366f1; padding-bottom: 12px; font-size: 22px;">📋 Complete AI Leadership Assessment</h2>
              <p style="color: #64748b; margin: 0 0 25px; font-style: italic; line-height: 1.6;">
                This executive completed our 6-dimension AI Growth Benchmark, measuring strategic leadership capabilities across key transformation areas. Each question uses a 1-5 scale from "Strongly Disagree" to "Strongly Agree".
              </p>
              ${formatLeadershipAssessment(data)}
            </div>

            ${data.hasDeepProfile && data.deepProfile ? `
            <!-- Deep Profile Analysis -->
            <div style="background: white; padding: 30px; border-radius: 12px; margin-bottom: 25px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              <h2 style="color: #1e293b; margin: 0 0 20px; border-bottom: 3px solid #8b5cf6; padding-bottom: 12px; font-size: 22px;">🔍 Deep Profile Analysis</h2>
              <p style="color: #64748b; margin: 0 0 25px; font-style: italic; line-height: 1.6;">
                Extended questionnaire providing granular insights into work patterns, communication style, strategic priorities, and transformation goals. This data significantly enhances scope of work precision.
              </p>
              ${formatDeepProfile(data.deepProfile)}
            </div>
            ` : ''}

            <!-- AI Context Summary for SOW Generation -->
            ${generateAIContextSummary(data, scores, tier)}

            <!-- Leadership Profile Comparison Block -->
            <div style="background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); border-radius: 16px; padding: 32px; margin: 48px 0 25px 0;">
              <h2 style="color: #1e293b; font-size: 24px; font-weight: 700; margin: 0 0 16px 0; display: flex; align-items: center; gap: 12px;">
                <span style="font-size: 28px;">👥</span>
                How You Compare to Other Leaders
              </h2>
              
              <p style="color: #64748b; font-size: 14px; margin: 0 0 24px 0; line-height: 1.6;">
                Based on ${data.firstName || 'the executive'}'s responses, here's how their AI leadership capabilities compare across 6 dimensions:
              </p>
              
              <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px;">
                ${deriveLeadershipComparisonForEmail(data).map(dim => `
                  <div style="background: white; border: 2px solid #e2e8f0; border-radius: 12px; padding: 16px;">
                    <div style="color: #64748b; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">
                      ${dim.dimension}
                    </div>
                    <div style="display: inline-block; background: ${getBadgeColor(dim.level)}; color: white; font-size: 12px; font-weight: 600; padding: 4px 12px; border-radius: 6px; margin-bottom: 8px;">
                      ${dim.level}
                    </div>
                    <p style="color: #64748b; font-size: 13px; line-height: 1.5; margin: 0;">
                      ${dim.reasoning}
                    </p>
                  </div>
                `).join('')}
              </div>
              
              <div style="margin-top: 24px; padding: 16px; background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 8px;">
                <p style="color: #92400e; font-size: 13px; line-height: 1.6; margin: 0;">
                  <strong>Strategic Implication:</strong> These dimensions provide a competitive positioning snapshot for tailoring the Executive Primer scope and identifying high-leverage intervention points.
                </p>
              </div>
            </div>

            <!-- Personalized Recommendations -->
            <div style="background: white; padding: 30px; border-radius: 12px; margin-bottom: 25px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              <h2 style="color: #1e293b; margin: 0 0 20px; border-bottom: 3px solid #059669; padding-bottom: 12px; font-size: 22px;">💡 Personalized Engagement Recommendations</h2>
              <ul style="margin: 0; padding-left: 20px; color: #475569; line-height: 2;">
                ${generatePersonalizedRecommendations(data, tier)}
              </ul>
            </div>

            <!-- Next Steps -->
            <div style="background: white; padding: 30px; border-radius: 12px; margin-bottom: 25px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              <h2 style="color: #1e293b; margin: 0 0 20px; border-bottom: 3px solid #6366f1; padding-bottom: 12px; font-size: 22px;">🚀 Executive Advisory Next Steps</h2>
              <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; border-left: 4px solid #059669; margin-bottom: 15px;">
                <p style="margin: 0 0 10px; color: #1e293b; font-weight: 600;">✅ Assessment Complete</p>
                <p style="margin: 0; color: #475569;">Executive ${data.firstName || 'contact'} completed the 6-question AI Leadership Growth Benchmark${data.hasDeepProfile ? ' and 10-question deep profile questionnaire' : ''}.</p>
              </div>
              
              <ul style="margin: 0; padding-left: 20px; color: #475569; line-height: 2;">
                <li><strong>Immediate Action:</strong> Review this comprehensive report and prepare customized executive primer</li>
                <li><strong>Contact Executive:</strong> Reach out to ${data.firstName || 'the executive'} at <a href="mailto:${data.email}" style="color: #6366f1; text-decoration: none;">${data.email}</a></li>
                <li><strong>Customize Engagement:</strong> Tailor Executive Primer based on ${tier.name} classification and focus areas</li>
                <li><strong>Strategic Discussion:</strong> Address specific leadership gaps, transformation goals, and ROI expectations</li>
                <li><strong>Schedule Meeting:</strong> <a href="https://calendly.com/krish-raja/mindmaker-leaders" target="_blank" style="color: #6366f1; text-decoration: none; font-weight: 600;">Book Executive Advisory Session</a></li>
              </ul>
            </div>

            <!-- Footer -->
            <div style="text-align: center; padding: 25px; background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              <p style="margin: 0 0 10px; color: #1e293b; font-weight: 600;">AI Leadership Growth Benchmark Platform</p>
              <p style="margin: 0; color: #64748b; font-size: 14px; line-height: 1.6;">
                This executive assessment report contains confidential business intelligence.<br>
                All contact data and assessment results are securely stored in the CRM system.<br>
                <strong>Contact:</strong> <a href="mailto:krish@fractionl.ai" style="color: #6366f1; text-decoration: none;">krish@fractionl.ai</a>
              </p>
            </div>

          </div>
          
        </body>
        </html>
      `
      })
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.text();
      console.error('Resend API error:', errorData);
      throw new Error(`Email sending failed: ${emailResponse.status}`);
    }

    const emailResult = await emailResponse.json();
    console.log("Comprehensive executive report email sent successfully:", emailResult.id);

    return new Response(JSON.stringify({ success: true, emailId: emailResult.id }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: unknown) {
    console.error("Error in send-diagnostic-email function:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
