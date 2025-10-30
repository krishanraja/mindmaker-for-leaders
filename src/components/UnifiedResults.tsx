import React from 'react';
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
  return (
    <div className="bg-background min-h-screen py-8">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <Tabs defaultValue="library" className="w-full">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-8">
            <TabsTrigger value="library" className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              AI Toolkit
            </TabsTrigger>
            <TabsTrigger value="benchmark" className="flex items-center gap-2">
              <Award className="h-4 w-4" />
              Leadership Score
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
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
