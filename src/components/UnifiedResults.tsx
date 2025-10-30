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
          <TabsList className="grid w-full max-w-2xl mx-auto grid-cols-2 mb-12 gap-2 h-auto p-1.5 bg-white/80 dark:bg-white/5 backdrop-blur-xl rounded-2xl shadow-xl shadow-primary/5 border border-primary/10">
            <TabsTrigger 
              value="library"
              className="relative flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-base font-medium tracking-tight transition-all duration-300 data-[state=active]:bg-gradient-to-br data-[state=active]:from-primary data-[state=active]:to-primary/90 data-[state=active]:text-white data-[state=active]:font-semibold data-[state=active]:shadow-lg data-[state=active]:shadow-primary/20 data-[state=inactive]:bg-white/60 data-[state=inactive]:dark:bg-white/5 data-[state=inactive]:backdrop-blur-sm data-[state=inactive]:text-muted-foreground data-[state=inactive]:border data-[state=inactive]:border-primary/10 data-[state=inactive]:hover:bg-white/80 data-[state=inactive]:dark:hover:bg-white/10 data-[state=inactive]:hover:border-primary/20 data-[state=inactive]:hover:scale-[1.02] data-[state=inactive]:active:scale-[0.98]"
            >
              <Sparkles className="h-5 w-5" />
              <span>Prompt Toolkit</span>
            </TabsTrigger>
            <TabsTrigger 
              value="benchmark"
              className="relative flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-base font-medium tracking-tight transition-all duration-300 data-[state=active]:bg-gradient-to-br data-[state=active]:from-primary data-[state=active]:to-primary/90 data-[state=active]:text-white data-[state=active]:font-semibold data-[state=active]:shadow-lg data-[state=active]:shadow-primary/20 data-[state=inactive]:bg-white/60 data-[state=inactive]:dark:bg-white/5 data-[state=inactive]:backdrop-blur-sm data-[state=inactive]:text-muted-foreground data-[state=inactive]:border data-[state=inactive]:border-primary/10 data-[state=inactive]:hover:bg-white/80 data-[state=inactive]:dark:hover:bg-white/10 data-[state=inactive]:hover:border-primary/20 data-[state=inactive]:hover:scale-[1.02] data-[state=inactive]:active:scale-[0.98]"
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
