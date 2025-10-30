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

      {/* AI Projects Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Rocket className="h-6 w-6 text-primary flex-shrink-0" />
          <h2 className="text-2xl font-bold text-foreground">Your AI Projects</h2>
        </div>
        
        <Accordion type="single" collapsible className="space-y-4">
          {library.recommendedProjects.map((project, idx) => (
            <AccordionItem key={idx} value={`project-${idx}`} className="border rounded-xl overflow-hidden">
              <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/50">
                <div className="flex items-center justify-between w-full pr-4">
                  <div className="text-left">
                    <h3 className="text-lg font-semibold text-foreground">{project.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{project.purpose}</p>
                  </div>
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 ml-4 flex-shrink-0">
                    Project {idx + 1}
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6">
                <div className="space-y-4 pt-2">
                  {/* When to Use */}
                  <div>
                    <h4 className="font-semibold text-sm text-foreground mb-2">When to Use This</h4>
                    <p className="text-sm text-muted-foreground">{project.whenToUse}</p>
                  </div>

                  {/* Master Instructions */}
                  <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-sm text-foreground">Master Instructions</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopy(project.masterInstructions, `${project.name} Instructions`)}
                        className="h-8 px-3"
                      >
                        {copiedItem === `${project.name} Instructions` ? (
                          <>
                            <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                            <span className="text-xs font-medium">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4 mr-2 flex-shrink-0" />
                            <span className="text-xs font-medium">Copy</span>
                          </>
                        )}
                      </Button>
                    </div>
                    <div className="max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                      <p className="text-xs sm:text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                        {project.masterInstructions}
                      </p>
                    </div>
                  </div>

                  {/* Example Prompts */}
                  <div>
                    <h4 className="font-semibold text-sm text-foreground mb-3">Example Starter Prompts</h4>
                    <div className="space-y-2">
                      {project.examplePrompts.map((prompt, pIdx) => (
                        <div key={pIdx} className="flex items-start gap-2 p-3 bg-background border rounded-lg group hover:border-primary/50 transition-colors">
                          <ArrowRight className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                          <p className="text-xs sm:text-sm text-foreground flex-1 leading-relaxed">{prompt}</p>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopy(prompt, `Example Prompt ${pIdx + 1}`)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0 flex-shrink-0"
                          >
                            {copiedItem === `Example Prompt ${pIdx + 1}` ? (
                              <CheckCircle className="h-3 w-3 text-green-500" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Success Metrics */}
                  <div>
                    <h4 className="font-semibold text-sm text-foreground mb-2">Success Metrics</h4>
                    <div className="flex flex-wrap gap-2">
                      {project.successMetrics.map((metric, mIdx) => (
                        <Badge key={mIdx} variant="outline" className="bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800">
                          ✓ {metric}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
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

      {/* Implementation Roadmap Section - Collapsible */}
      <Card className="shadow-sm border rounded-xl">
        <Accordion type="single" collapsible defaultValue="roadmap">
          <AccordionItem value="roadmap" className="border-0">
            <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/50">
              <CardTitle className="flex items-center gap-2">
                <Rocket className="h-5 w-5 text-primary" />
                Your Implementation Roadmap
              </CardTitle>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              <div className="space-y-6 pt-2">
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
            <p>Copy the "Master Instructions" from your chosen project above</p>
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
