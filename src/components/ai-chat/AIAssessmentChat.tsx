import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Send, MessageCircle, Brain, TrendingUp, User } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AIAssessmentChatProps {
  onComplete?: (sessionData: any) => void;
}

const AIAssessmentChat: React.FC<AIAssessmentChatProps> = ({ onComplete }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [insights, setInsights] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Initialize session and user
  useEffect(() => {
    initializeSession();
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const initializeSession = async () => {
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        toast({
          title: "Authentication Required",
          description: "Please sign in to continue with the assessment.",
          variant: "destructive",
        });
        return;
      }

      setUserId(user.id);

      // Create new conversation session
      const { data: session, error: sessionError } = await supabase
        .from('conversation_sessions')
        .insert({
          user_id: user.id,
          session_title: 'AI Assessment Chat',
          status: 'active',
          business_context: {}
        })
        .select()
        .single();

      if (sessionError) {
        console.error('Error creating session:', sessionError);
        toast({
          title: "Setup Error",
          description: "Failed to initialize chat session. Please try again.",
          variant: "destructive",
        });
        return;
      }

      setSessionId(session.id);

      // Send welcome message from AI
      const welcomeMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: "Hello! I'm your AI Literacy Advisor. I'm here to help you assess your organization's AI readiness and identify opportunities for strategic AI implementation.\n\nTo get started, could you tell me a bit about your role and your organization? What brings you here today?",
        timestamp: new Date()
      };

      setMessages([welcomeMessage]);

    } catch (error) {
      console.error('Error initializing session:', error);
      toast({
        title: "Initialization Error",
        description: "Failed to set up the assessment. Please refresh and try again.",
        variant: "destructive",
      });
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || !sessionId || !userId || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('ai-assessment-chat', {
        body: {
          message: userMessage.content,
          sessionId: sessionId,
          userId: userId
        }
      });

      if (error) {
        throw error;
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);

      // Extract insights from AI response
      extractInsights(data.response);

    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Communication Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });

      // Add error message
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I apologize, but I'm having trouble processing your message right now. Please try again in a moment.",
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const extractInsights = (aiResponse: string) => {
    // Simple insight extraction - look for key phrases
    const insightKeywords = [
      'recommendation',
      'opportunity',
      'risk',
      'strategy',
      'implement',
      'consider',
      'focus on',
      'priority'
    ];

    const sentences = aiResponse.split(/[.!?]+/);
    const newInsights = sentences.filter(sentence => 
      insightKeywords.some(keyword => 
        sentence.toLowerCase().includes(keyword.toLowerCase())
      )
    ).map(insight => insight.trim()).filter(insight => insight.length > 20);

    if (newInsights.length > 0) {
      setInsights(prev => [...prev, ...newInsights.slice(0, 2)]);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const startNewAssessment = () => {
    setMessages([]);
    setInsights([]);
    setSessionId(null);
    initializeSession();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      <div className="container mx-auto py-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-4">
              AI Assessment Chat
            </h1>
            <p className="text-xl text-muted-foreground">
              Your personal AI literacy advisor for strategic business guidance
            </p>
          </div>

          <Tabs defaultValue="chat" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="chat" className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4" />
                Chat
              </TabsTrigger>
              <TabsTrigger value="insights" className="flex items-center gap-2">
                <Brain className="h-4 w-4" />
                Insights
              </TabsTrigger>
              <TabsTrigger value="progress" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Progress
              </TabsTrigger>
            </TabsList>

            <TabsContent value="chat" className="mt-6">
              <Card className="h-[600px] flex flex-col">
                <CardHeader className="flex-shrink-0">
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      AI Assessment Conversation
                    </span>
                    <Button variant="outline" size="sm" onClick={startNewAssessment}>
                      New Assessment
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <ScrollArea className="flex-1 pr-4">
                    <div className="space-y-4">
                      {messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${
                            message.role === 'user' ? 'justify-end' : 'justify-start'
                          }`}
                        >
                          <div
                            className={`max-w-[80%] p-4 rounded-lg ${
                              message.role === 'user'
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            <p className="whitespace-pre-wrap">{message.content}</p>
                            <p className="text-xs opacity-70 mt-2">
                              {message.timestamp.toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                      ))}
                      {isLoading && (
                        <div className="flex justify-start">
                          <div className="bg-muted text-muted-foreground p-4 rounded-lg">
                            <div className="flex items-center gap-2">
                              <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full"></div>
                              Thinking...
                            </div>
                          </div>
                        </div>
                      )}
                      <div ref={messagesEndRef} />
                    </div>
                  </ScrollArea>
                  
                  <div className="flex gap-2 mt-4">
                    <Input
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Type your message..."
                      disabled={isLoading || !sessionId}
                      className="flex-1"
                    />
                    <Button
                      onClick={sendMessage}
                      disabled={isLoading || !inputMessage.trim() || !sessionId}
                      className="px-4"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="insights" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5" />
                    Key Insights & Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {insights.length > 0 ? (
                    <div className="space-y-3">
                      {insights.map((insight, index) => (
                        <div key={index} className="p-3 bg-muted rounded-lg">
                          <p className="text-sm">{insight}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">
                      Start chatting to generate personalized insights and recommendations.
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="progress" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Assessment Progress
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span>Messages Exchanged</span>
                      <Badge variant="secondary">{messages.length}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Insights Generated</span>
                      <Badge variant="secondary">{insights.length}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Session Status</span>
                      <Badge variant={sessionId ? "default" : "destructive"}>
                        {sessionId ? "Active" : "Not Connected"}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default AIAssessmentChat;