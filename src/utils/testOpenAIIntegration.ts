import { supabase } from "@/integrations/supabase/client";

// Test data for comprehensive testing
const mockAssessmentData = {
  timeAllocation: {
    strategic: 25,
    operational: 35,
    meetings: 30,
    learning: 10
  },
  currentChallenges: [
    "Managing team productivity",
    "Staying current with AI developments",
    "Balancing innovation with operations"
  ],
  aiUseCases: [
    "Document automation",
    "Meeting summarization",
    "Data analysis"
  ],
  skillGaps: [
    "AI strategy development",
    "Change management for AI adoption"
  ],
  visionGoals: "Transform our organization into an AI-first company within 2 years"
};

const mockUserResponses = [
  {
    role: "user",
    content: "I'm a CEO of a 200-person tech company. We're struggling with AI adoption across teams."
  },
  {
    role: "assistant", 
    content: "I understand you're leading AI transformation. What's your biggest challenge with team adoption?"
  },
  {
    role: "user",
    content: "People are resistant to change and don't see the immediate value. Some are worried about job security."
  }
];

const mockConversationData = {
  sessionId: "test-session-123",
  messages: mockUserResponses,
  assessmentResponses: mockAssessmentData,
  businessContext: {
    role: "CEO",
    company_size: "200",
    industry: "Technology",
    experience_level: "executive"
  }
};

// Phase 1: Basic API Connection Test
export const testBasicOpenAIConnection = async () => {
  try {
    console.log('🔍 Phase 1: Testing basic OpenAI API connection...');
    
    const { data, error } = await supabase.functions.invoke('ai-assessment-chat', {
      body: {
        message: "Hello, this is a test message to verify the OpenAI API connection.",
        sessionId: "test-connection-session",
        conversationHistory: []
      }
    });

    if (error) {
      console.error('❌ Basic API connection failed:', error);
      return { success: false, error: error.message, phase: 'basic_connection' };
    }

    if (data?.response) {
      console.log('✅ Basic API connection successful!');
      console.log('📝 AI Response preview:', data.response.substring(0, 200) + '...');
      return { success: true, data, phase: 'basic_connection' };
    } else {
      console.warn('⚠️ API responded but no response data found:', data);
      return { success: false, error: 'No response data', data, phase: 'basic_connection' };
    }
    
  } catch (error) {
    console.error('❌ Exception during basic API test:', error);
    return { success: false, error: error.message, phase: 'basic_connection' };
  }
};

// Phase 2: AI Assessment Chat Test
export const testAIAssessmentChat = async () => {
  try {
    console.log('🔍 Phase 2: Testing AI Assessment Chat with context...');
    
    const { data, error } = await supabase.functions.invoke('ai-assessment-chat', {
      body: {
        message: "I'm a CEO struggling with AI adoption. My team of 200 people is resistant to change. What should I focus on first?",
        sessionId: "test-assessment-session",
        conversationHistory: mockUserResponses,
        businessContext: mockConversationData.businessContext
      }
    });

    if (error) {
      console.error('❌ AI Assessment Chat failed:', error);
      return { success: false, error: error.message, phase: 'assessment_chat' };
    }

    if (data?.response) {
      console.log('✅ AI Assessment Chat successful!');
      console.log('📝 Contextual AI Response:', data.response);
      
      // Check if response seems personalized
      const isPersonalized = data.response.toLowerCase().includes('ceo') || 
                           data.response.toLowerCase().includes('200') ||
                           data.response.toLowerCase().includes('team') ||
                           data.response.toLowerCase().includes('adoption');
      
      console.log('🎯 Response appears personalized:', isPersonalized);
      return { success: true, data, personalized: isPersonalized, phase: 'assessment_chat' };
    } else {
      console.warn('⚠️ Assessment chat responded but no response data found:', data);
      return { success: false, error: 'No response data', data, phase: 'assessment_chat' };
    }
    
  } catch (error) {
    console.error('❌ Exception during assessment chat test:', error);
    return { success: false, error: error.message, phase: 'assessment_chat' };
  }
};

// Phase 3: Executive Insights Generation Test
export const testExecutiveInsightsGeneration = async () => {
  try {
    console.log('🔍 Phase 3: Testing Executive Insights Generation...');
    
    const { data, error } = await supabase.functions.invoke('generate-executive-insights', {
      body: {
        diagnosticData: mockAssessmentData,
        userResponses: mockUserResponses
      }
    });

    if (error) {
      console.error('❌ Executive Insights Generation failed:', error);
      return { success: false, error: error.message, phase: 'insights_generation' };
    }

    if (data?.insights) {
      console.log('✅ Executive Insights Generation successful!');
      console.log('📊 Generated insights count:', data.insights.length);
      console.log('🎯 Overall score:', data.overallScore);
      console.log('📝 Executive summary preview:', data.executiveSummary?.substring(0, 200) + '...');
      
      // Check insight quality
      const hasDetailedInsights = data.insights.some(insight => 
        insight.implementation_steps && insight.implementation_steps.length > 0
      );
      
      console.log('🔍 Insights have implementation details:', hasDetailedInsights);
      console.log('📋 Sample insight:', data.insights[0]);
      
      return { 
        success: true, 
        data, 
        insightQuality: hasDetailedInsights,
        phase: 'insights_generation' 
      };
    } else {
      console.warn('⚠️ Insights generation responded but no insights found:', data);
      return { success: false, error: 'No insights data', data, phase: 'insights_generation' };
    }
    
  } catch (error) {
    console.error('❌ Exception during insights generation test:', error);
    return { success: false, error: error.message, phase: 'insights_generation' };
  }
};

// Phase 4: End-to-End Comprehensive Test
export const testCompleteOpenAIIntegration = async () => {
  try {
    console.log('🚀 Phase 4: Running comprehensive end-to-end OpenAI integration test...');
    
    const results = {
      basicConnection: null,
      assessmentChat: null,
      insightsGeneration: null,
      overall: {
        success: false,
        aiWorking: false,
        personalizationWorking: false,
        timestamp: new Date().toISOString()
      }
    };

    // Run all tests
    results.basicConnection = await testBasicOpenAIConnection();
    await new Promise(resolve => setTimeout(resolve, 1000)); // Brief pause between tests

    results.assessmentChat = await testAIAssessmentChat();
    await new Promise(resolve => setTimeout(resolve, 1000));

    results.insightsGeneration = await testExecutiveInsightsGeneration();

    // Analyze overall results
    const allPhasesSuccessful = results.basicConnection?.success && 
                               results.assessmentChat?.success && 
                               results.insightsGeneration?.success;

    const personalizationWorking = results.assessmentChat?.personalized &&
                                  results.insightsGeneration?.insightQuality;

    results.overall = {
      success: allPhasesSuccessful,
      aiWorking: allPhasesSuccessful,
      personalizationWorking: personalizationWorking,
      timestamp: new Date().toISOString()
    };

    // Final report
    console.log('\n📊 COMPREHENSIVE TEST RESULTS:');
    console.log('='.repeat(50));
    console.log('✅ Basic API Connection:', results.basicConnection?.success ? 'PASS' : 'FAIL');
    console.log('✅ AI Assessment Chat:', results.assessmentChat?.success ? 'PASS' : 'FAIL');
    console.log('✅ Insights Generation:', results.insightsGeneration?.success ? 'PASS' : 'FAIL');
    console.log('🎯 AI Personalization:', personalizationWorking ? 'WORKING' : 'NEEDS ATTENTION');
    console.log('🚀 Overall Integration:', allPhasesSuccessful ? 'FULLY FUNCTIONAL' : 'NEEDS FIXES');
    console.log('='.repeat(50));

    if (!allPhasesSuccessful) {
      console.log('\n🔧 TROUBLESHOOTING RECOMMENDATIONS:');
      if (!results.basicConnection?.success) {
        console.log('- Check OpenAI API key configuration');
        console.log('- Verify edge function deployment');
      }
      if (!results.assessmentChat?.success) {
        console.log('- Check ai-assessment-chat edge function');
        console.log('- Verify conversation context processing');
      }
      if (!results.insightsGeneration?.success) {
        console.log('- Check generate-executive-insights edge function');
        console.log('- Verify assessment data structure');
      }
      if (!personalizationWorking) {
        console.log('- AI may be using fallback responses instead of OpenAI');
        console.log('- Check if conversation data is reaching AI properly');
      }
    }

    return results;
    
  } catch (error) {
    console.error('❌ Exception during comprehensive test:', error);
    return { 
      success: false, 
      error: error.message, 
      phase: 'comprehensive_test',
      timestamp: new Date().toISOString()
    };
  }
};

// Quick diagnostic helper
export const diagnoseOpenAIIssues = async () => {
  console.log('🔧 Running OpenAI Integration Diagnostics...');
  
  try {
    // Test if edge functions are accessible
    const functions = ['ai-assessment-chat', 'generate-executive-insights'];
    const functionTests = [];

    for (const funcName of functions) {
      try {
        const { error } = await supabase.functions.invoke(funcName, {
          body: { test: true }
        });
        functionTests.push({
          function: funcName,
          accessible: !error,
          error: error?.message
        });
      } catch (e) {
        functionTests.push({
          function: funcName,
          accessible: false,
          error: e.message
        });
      }
    }

    console.log('📋 Function Accessibility Report:', functionTests);
    return functionTests;
    
  } catch (error) {
    console.error('❌ Diagnostic error:', error);
    return { error: error.message };
  }
};

// Auto-expose to global scope for testing
if (typeof window !== 'undefined') {
  (window as any).testBasicOpenAIConnection = testBasicOpenAIConnection;
  (window as any).testAIAssessmentChat = testAIAssessmentChat;
  (window as any).testExecutiveInsightsGeneration = testExecutiveInsightsGeneration;
  (window as any).testCompleteOpenAIIntegration = testCompleteOpenAIIntegration;
  (window as any).diagnoseOpenAIIssues = diagnoseOpenAIIssues;
}