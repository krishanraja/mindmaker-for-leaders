import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Brain, Copy, CheckCircle, BookOpen, Rocket, Target, ArrowRight, TrendingUp, Sparkles } from 'lucide-react';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { useToast } from '@/components/ui/use-toast';

interface PromptLibraryResultsProps {
  library: {
    executiveProfile: {
      summary: string;
      transformationOpportunity: string;
    };
    recommendedProjects: Array<{
      name: string;
      purpose: string;
      whenToUse: string;
      masterInstructions: string;
      examplePrompts: string[];
      successMetrics: string[];
    }>;
    promptTemplates: Array<{
      name: string;
      category: string;
      prompt: string;
    }>;
    implementationRoadmap: {
      week1: string;
      week2to4: string;
      month2plus: string;
    };
  };
  contactData: {
    fullName: string;
    roleTitle: string;
    companyName: string;
  };
}

export const PromptLibraryResults: React.FC<PromptLibraryResultsProps> = ({ library, contactData }) => {
  const { toast } = useToast();
  const [copiedItem, setCopiedItem] = useState<string | null>(null);

  const handleCopy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedItem(label);
      toast({
        title: "Copied!",
        description: `${label} copied to clipboard`,
      });
      setTimeout(() => setCopiedItem(null), 2000);
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Top Takeaways - Swipeable Cards */}
      <div className="mb-12">
        <Carousel
          opts={{
            align: "center",
            loop: true,
          }}
          className="w-full"
        >
          <CarouselContent className="-ml-4">
            {/* Card 1: How You Work Best */}
            <CarouselItem className="pl-4 basis-full md:basis-1/2 lg:basis-1/3">
              <Card className="h-[320px] shadow-lg border-2 border-primary/20 rounded-2xl overflow-hidden">
                <CardContent className="p-8 h-full flex flex-col items-center justify-center text-center bg-gradient-to-br from-primary/10 via-background to-background">
                  <div className="p-4 bg-primary/20 rounded-2xl mb-4">
                    <Brain className="h-10 w-10 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-3">
                    How You Work Best
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed line-clamp-6 px-2">
                    {library.executiveProfile.summary}
                  </p>
                </CardContent>
              </Card>
            </CarouselItem>
            
            {/* Card 2: Your Top AI Project */}
            <CarouselItem className="pl-4 basis-full md:basis-1/2 lg:basis-1/3">
              <Card className="h-[320px] shadow-lg border-2 border-primary/20 rounded-2xl overflow-hidden">
                <CardContent className="p-8 h-full flex flex-col items-center justify-center text-center bg-gradient-to-br from-primary/10 via-background to-background">
                  <div className="p-4 bg-primary/20 rounded-2xl mb-4">
                    <Target className="h-10 w-10 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-3">
                    {library.recommendedProjects[0]?.name || 'Your Priority Project'}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed line-clamp-6 px-2">
                    {library.recommendedProjects[0]?.purpose || 'Custom AI projects designed for your specific needs'}
                  </p>
                </CardContent>
              </Card>
            </CarouselItem>
            
            {/* Card 3: Transformation Opportunity */}
            <CarouselItem className="pl-4 basis-full md:basis-1/2 lg:basis-1/3">
              <Card className="h-[320px] shadow-lg border-2 border-primary/20 rounded-2xl overflow-hidden">
                <CardContent className="p-8 h-full flex flex-col items-center justify-center text-center bg-gradient-to-br from-primary/10 via-background to-background">
                  <div className="p-4 bg-primary/20 rounded-2xl mb-4">
                    <TrendingUp className="h-10 w-10 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-3">
                    Your Biggest Opportunity
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed line-clamp-6 px-2">
                    {library.executiveProfile.transformationOpportunity}
                  </p>
                </CardContent>
              </Card>
            </CarouselItem>
          </CarouselContent>
          
          <div className="flex justify-center gap-2 mt-6">
            <CarouselPrevious className="relative static translate-y-0" />
            <CarouselNext className="relative static translate-y-0" />
          </div>
        </Carousel>
      </div>

      {/* Master Prompts Section - Horizontal Carousel */}
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Rocket className="h-6 w-6 text-primary flex-shrink-0" />
          <h2 className="text-2xl font-bold text-foreground">Master Prompts</h2>
        </div>
        
        <Carousel
          opts={{
            align: "start",
            loop: false,
          }}
          className="w-full"
        >
          <CarouselContent className="-ml-4">
            {library.recommendedProjects.map((project, idx) => (
              <CarouselItem key={idx} className="pl-4 basis-full md:basis-1/2 lg:basis-1/3">
                <Card className="h-[420px] flex flex-col shadow-sm border rounded-2xl overflow-hidden">
                  <CardContent className="p-6 flex flex-col h-full">
                    {/* Header - Always Visible */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                          Project {idx + 1}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopy(project.masterInstructions, `${project.name} Instructions`)}
                          className="h-8 px-3"
                        >
                          {copiedItem === `${project.name} Instructions` ? (
                            <>
                              <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                              <span className="text-xs">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-4 w-4 mr-1" />
                              <span className="text-xs">Copy All</span>
                            </>
                          )}
                        </Button>
                      </div>
                      <h3 className="text-lg font-bold text-foreground mb-2 line-clamp-2">{project.name}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">{project.purpose}</p>
                    </div>

                    {/* Expandable Content */}
                    <div className="flex-1 overflow-hidden">
                      <Accordion type="single" collapsible className="space-y-3">
                        {/* When to Use */}
                        <AccordionItem value="when" className="border rounded-lg">
                          <AccordionTrigger className="px-3 py-2 text-sm font-semibold hover:no-underline">
                            When to Use
                          </AccordionTrigger>
                          <AccordionContent className="px-3 pb-3">
                            <p className="text-xs text-muted-foreground">{project.whenToUse}</p>
                          </AccordionContent>
                        </AccordionItem>

                        {/* Master Instructions */}
                        <AccordionItem value="instructions" className="border rounded-lg">
                          <AccordionTrigger className="px-3 py-2 text-sm font-semibold hover:no-underline">
                            Master Instructions
                          </AccordionTrigger>
                          <AccordionContent className="px-3 pb-3">
                            <div className="max-h-32 overflow-y-auto text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                              {project.masterInstructions}
                            </div>
                          </AccordionContent>
                        </AccordionItem>

                        {/* Example Prompts */}
                        <AccordionItem value="examples" className="border rounded-lg">
                          <AccordionTrigger className="px-3 py-2 text-sm font-semibold hover:no-underline">
                            Example Prompts ({project.examplePrompts.length})
                          </AccordionTrigger>
                          <AccordionContent className="px-3 pb-3">
                            <div className="space-y-2 max-h-32 overflow-y-auto">
                              {project.examplePrompts.slice(0, 3).map((prompt, pIdx) => (
                                <div key={pIdx} className="flex items-start gap-2 text-xs">
                                  <ArrowRight className="h-3 w-3 text-primary flex-shrink-0 mt-0.5" />
                                  <p className="text-muted-foreground leading-relaxed">{prompt}</p>
                                </div>
                              ))}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    </div>

                    {/* Success Metrics - Always Visible at Bottom */}
                    <div className="mt-4 pt-3 border-t">
                      <div className="flex flex-wrap gap-1">
                        {project.successMetrics.slice(0, 2).map((metric, mIdx) => (
                          <Badge key={mIdx} variant="outline" className="bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800 text-xs px-2 py-0.5">
                            ✓ {metric}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </CarouselItem>
            ))}
          </CarouselContent>
          
          <div className="flex justify-center gap-2 mt-6">
            <CarouselPrevious className="relative static translate-y-0" />
            <CarouselNext className="relative static translate-y-0" />
          </div>
        </Carousel>
      </div>

      {/* Quick Reference Templates Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold text-foreground">Quick Reference Templates</h2>
        </div>

        {Object.entries(
          library.promptTemplates.reduce((acc, template) => {
            if (!acc[template.category]) acc[template.category] = [];
            acc[template.category].push(template);
            return acc;
          }, {} as Record<string, typeof library.promptTemplates>)
        ).map(([category, templates]) => (
          <Card key={category} className="shadow-sm border rounded-xl">
            <CardHeader>
              <CardTitle className="text-lg">{category}</CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="space-y-2">
                {templates.map((template, idx) => (
                  <AccordionItem key={idx} value={`template-${category}-${idx}`} className="border rounded-lg">
                    <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/50">
                      <div className="flex items-center justify-between w-full pr-4">
                        <span className="font-semibold text-foreground text-left">{template.name}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopy(template.prompt, template.name);
                          }}
                          className="ml-2"
                        >
                          {copiedItem === template.name ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-3">
                      <p className="text-sm text-muted-foreground leading-relaxed">{template.prompt}</p>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Implementation Roadmap Section - Collapsible with Preview */}
      <Card className="shadow-sm border rounded-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Rocket className="h-5 w-5 text-primary" />
            Your Implementation Roadmap
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Week 1 Preview - Always Visible */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Badge className="bg-primary text-primary-foreground">Week 1</Badge>
              <h3 className="font-semibold text-foreground">Quick Start</h3>
            </div>
            <p className="text-muted-foreground leading-relaxed pl-20 line-clamp-2">
              {library.implementationRoadmap.week1}
            </p>
          </div>

          {/* Expandable Full Content */}
          <Accordion type="single" collapsible className="border-0">
            <AccordionItem value="roadmap" className="border-0">
              <AccordionTrigger className="py-3 hover:no-underline text-sm text-primary hover:text-primary/80">
                View Full Roadmap
              </AccordionTrigger>
              <AccordionContent className="pt-4">
                <div className="space-y-6">
                  {/* Full Week 1 Content */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Badge className="bg-primary text-primary-foreground">Week 1</Badge>
                      <h3 className="font-semibold text-foreground">Quick Start</h3>
                    </div>
                    <p className="text-muted-foreground leading-relaxed pl-20">
                      {library.implementationRoadmap.week1}
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">Week 2-4</Badge>
                      <h3 className="font-semibold text-foreground">Expand Usage</h3>
                    </div>
                    <p className="text-muted-foreground leading-relaxed pl-20">
                      {library.implementationRoadmap.week2to4}
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="bg-muted text-foreground">Month 2+</Badge>
                      <h3 className="font-semibold text-foreground">Advanced Techniques</h3>
                    </div>
                    <p className="text-muted-foreground leading-relaxed pl-20">
                      {library.implementationRoadmap.month2plus}
                    </p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      {/* Setup Instructions */}
      <Card className="shadow-sm border rounded-xl bg-primary/5">
        <CardHeader>
          <CardTitle className="text-lg">How to Set Up Your AI Projects</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-foreground">
          <div className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">1</span>
            <p>Open ChatGPT or Claude and create a new "Project"</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">2</span>
            <p>Copy the "Master Instructions" from your chosen master prompt above</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">3</span>
            <p>Paste into the project's custom instructions field</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">4</span>
            <p>Start with the example prompts to test it out</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
