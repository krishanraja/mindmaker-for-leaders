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
          <TabsList className="grid w-full max-w-2xl mx-auto grid-cols-2 mb-12 gap-3 bg-transparent h-auto p-0">
            <TabsTrigger 
              value="library"
              className="relative flex items-center justify-center gap-3 px-8 py-5 rounded-xl text-lg font-semibold transition-all border-2 data-[state=active]:bg-primary data-[state=active]:border-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=inactive]:bg-background data-[state=inactive]:border-border data-[state=inactive]:text-foreground data-[state=inactive]:hover:border-primary/50"
            >
              <Sparkles className="h-6 w-6" />
              <span>Prompt Toolkit</span>
            </TabsTrigger>
            <TabsTrigger 
              value="benchmark"
              className="relative flex items-center justify-center gap-3 px-8 py-5 rounded-xl text-lg font-semibold transition-all border-2 data-[state=active]:bg-primary data-[state=active]:border-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=inactive]:bg-background data-[state=inactive]:border-border data-[state=inactive]:text-foreground data-[state=inactive]:hover:border-primary/50"
            >
              <Award className="h-6 w-6" />
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
