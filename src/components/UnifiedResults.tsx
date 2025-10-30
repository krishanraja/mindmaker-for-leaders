import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Award, Sparkles } from 'lucide-react';
import AILeadershipBenchmark from './AILeadershipBenchmark';
import { PromptLibraryResults } from './PromptLibraryResults';
import { ContactData } from './ContactCollectionForm';

interface UnifiedResultsProps {
  assessmentData: any;
  promptLibrary: any;
  contactData: ContactData;
  sessionId: string | null;
  onBack?: () => void;
}

export const UnifiedResults: React.FC<UnifiedResultsProps> = ({
  assessmentData,
  promptLibrary,
  contactData,
  sessionId,
  onBack
}) => {
  const [activeTab, setActiveTab] = useState<string>("benchmark");

  return (
    <div className="bg-background min-h-screen py-8">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-2xl mx-auto grid-cols-2 mb-12 p-2 h-auto bg-muted/50 rounded-2xl shadow-lg">
            <TabsTrigger 
              value="library"
              className="relative flex items-center justify-center gap-2 px-6 py-4 rounded-xl text-base font-semibold transition-all data-[state=active]:bg-background data-[state=active]:shadow-md data-[state=active]:text-foreground data-[state=inactive]:text-muted-foreground"
            >
              <Sparkles className="h-5 w-5" />
              <span>AI Toolkit</span>
              <span className="absolute -top-1 -right-1 h-3 w-3 bg-primary rounded-full animate-pulse shadow-lg"></span>
            </TabsTrigger>
            <TabsTrigger 
              value="benchmark"
              className="relative flex items-center justify-center gap-2 px-6 py-4 rounded-xl text-base font-semibold transition-all data-[state=active]:bg-background data-[state=active]:shadow-md data-[state=active]:text-foreground data-[state=inactive]:text-muted-foreground"
            >
              <Award className="h-5 w-5" />
              <span>Leadership Score</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="library" className="mt-0">
            <PromptLibraryResults
              library={promptLibrary}
              contactData={contactData}
            />
          </TabsContent>

          <TabsContent value="benchmark" className="mt-0">
            <AILeadershipBenchmark
              assessmentData={assessmentData}
              sessionId={sessionId}
              contactData={contactData}
              onBack={onBack}
              onViewToolkit={() => setActiveTab("library")}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
