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

  // Extract executive traits - concise bullets under 12 words each
  const extractExecutiveTraits = (summary: string): string[] => {
    const sentences = summary.split(/[.!?]+/).filter(s => s.trim().length > 15);
    
    // Process into concise executive insights
    return sentences.slice(0, 4).map(sentence => {
      const words = sentence.trim().split(' ');
      // Keep under 12 words for scannability
      if (words.length > 12) {
        return words.slice(0, 12).join(' ') + '...';
      }
      return sentence.trim();
    });
  };

  // Format priority project with one-line value prop and impact
  const formatPriorityProject = (project: typeof library.recommendedProjects[0]) => {
    if (!project) return { name: 'Custom AI Project', valueProp: 'Streamline workflows', impact: 'High-impact' };
    
    const purposeText = project.purpose || '';
    
    // Extract quantifiable impact
    const timeMatch = purposeText.match(/(\d+)\s*(hours?|hrs?|minutes?|mins?)/i);
    const percentMatch = purposeText.match(/(\d+)%/);
    
    let impact = 'High-impact automation';
    if (timeMatch) {
      impact = `${timeMatch[1]}${timeMatch[2].slice(0, 2)}/week saved`;
    } else if (percentMatch) {
      impact = `${percentMatch[0]} faster`;
    }
    
    // Create one-line value proposition (max 15 words)
    const firstSentence = purposeText.split(/[.!?]/)[0].trim();
    const words = firstSentence.split(' ');
    const valueProp = words.length > 15 
      ? words.slice(0, 15).join(' ') + '...'
      : firstSentence;
    
    return { name: project.name, valueProp, impact };
  };

  // Synthesize transformation opportunity - clear before/after with outcome
  const synthesizeOpportunity = (text: string) => {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim());
    
    // Extract metric
    const timeMatch = text.match(/(\d+)\s*(hours?|hrs?|minutes?|mins?)/i);
    const percentMatch = text.match(/(\d+)%/);
    const multiplierMatch = text.match(/(\d+)x/i);
    
    let outcome = 'Strategic efficiency gain';
    if (timeMatch) {
      outcome = `${timeMatch[1]}+ hours saved weekly`;
    } else if (percentMatch) {
      outcome = `${percentMatch[0]} productivity boost`;
    } else if (multiplierMatch) {
      outcome = `${multiplierMatch[0]} faster delivery`;
    }
    
    // Create clear opportunity statement (max 20 words)
    const mainStatement = sentences[0]?.trim() || text;
    const words = mainStatement.split(' ');
    const statement = words.length > 20
      ? words.slice(0, 20).join(' ') + '...'
      : mainStatement;
    
    return { statement, outcome };
  };

  const executiveTraits = extractExecutiveTraits(library.executiveProfile.summary);
  const priorityProject = formatPriorityProject(library.recommendedProjects[0]);
  const opportunity = synthesizeOpportunity(library.executiveProfile.transformationOpportunity);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* About You - Executive Profile Summary */}
      <section className="space-y-4">
        <div className="space-y-2">
          <h2 className="text-3xl font-bold text-foreground">About You</h2>
          <p className="text-base text-muted-foreground">Based on your responses, here's your executive profile</p>
        </div>
        
        <Card className="shadow-lg border rounded-2xl bg-card">
          <CardContent className="p-10">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              
              {/* Column 1: Your Working Style */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Brain className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground">Your Working Style</h3>
                </div>
                <div className="space-y-3">
                  {executiveTraits.map((trait, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 mt-2" />
                      <p className="text-base text-muted-foreground leading-relaxed">{trait}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Column 2: Priority Focus */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Target className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground">Priority Focus</h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-lg font-bold text-foreground mb-2">{priorityProject.name}</h4>
                    <p className="text-base text-muted-foreground leading-relaxed">{priorityProject.valueProp}</p>
                  </div>
                  <div className="flex items-center gap-2 pt-2">
                    <Sparkles className="h-5 w-5 text-primary flex-shrink-0" />
                    <Badge variant="secondary" className="text-sm font-semibold">
                      {priorityProject.impact}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Column 3: Transformation Opportunity */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <TrendingUp className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground">Transformation Opportunity</h3>
                </div>
                <div className="space-y-4">
                  <p className="text-base text-muted-foreground leading-relaxed">{opportunity.statement}</p>
                  <div className="space-y-3">
                    <Badge className="bg-primary text-primary-foreground text-sm px-3 py-1.5">
                      {opportunity.outcome}
                    </Badge>
                    <Button 
                      variant="outline" 
                      className="w-full flex items-center justify-center gap-2 mt-2"
                      onClick={() => {
                        const masterPromptsSection = document.getElementById('master-prompts');
                        masterPromptsSection?.scrollIntoView({ behavior: 'smooth' });
                      }}
                    >
                      <span>See your toolkit</span>
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

            </div>
          </CardContent>
        </Card>
      </section>

      {/* Master Prompts Section - Horizontal Carousel */}
      <div id="master-prompts" className="space-y-6 scroll-mt-8">
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
              <CarouselItem key={idx} className="pl-4 basis-full md:basis-[480px] lg:basis-[500px]">
                <Card className="shadow-lg border-2 border-primary/10 rounded-2xl">
                  <CardContent className="p-8 space-y-6">
                    {/* Header */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-sm px-3 py-1">
                          Project {idx + 1}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopy(project.masterInstructions, `${project.name} Instructions`)}
                          className="h-9 px-4"
                        >
                          {copiedItem === `${project.name} Instructions` ? (
                            <>
                              <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                              <span className="text-sm">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-4 w-4 mr-2" />
                              <span className="text-sm">Copy All</span>
                            </>
                          )}
                        </Button>
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-foreground mb-2">{project.name}</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">{project.purpose}</p>
                      </div>
                    </div>

                    {/* Key Info - Always Visible */}
                    <div className="bg-muted/50 rounded-xl p-4 space-y-2">
                      <h4 className="text-sm font-semibold text-foreground">When to Use</h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">{project.whenToUse}</p>
                    </div>

                    {/* Expandable Details */}
                    <Accordion type="single" collapsible className="space-y-4">
                      {/* Master Instructions */}
                      <AccordionItem value="instructions" className="border-2 border-primary/10 rounded-xl overflow-hidden">
                        <AccordionTrigger className="px-5 py-4 text-base font-semibold hover:no-underline hover:bg-muted/30">
                          Master Instructions
                        </AccordionTrigger>
                        <AccordionContent className="px-5 py-4 border-t">
                          <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                            {project.masterInstructions}
                          </div>
                        </AccordionContent>
                      </AccordionItem>

                      {/* Example Prompts */}
                      <AccordionItem value="examples" className="border-2 border-primary/10 rounded-xl overflow-hidden">
                        <AccordionTrigger className="px-5 py-4 text-base font-semibold hover:no-underline hover:bg-muted/30">
                          Example Prompts ({project.examplePrompts.length})
                        </AccordionTrigger>
                        <AccordionContent className="px-5 py-4 border-t">
                          <div className="space-y-4">
                            {project.examplePrompts.map((prompt, pIdx) => (
                              <div key={pIdx} className="flex items-start gap-3">
                                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                  <span className="text-xs font-bold text-primary">{pIdx + 1}</span>
                                </div>
                                <p className="text-sm text-foreground leading-relaxed flex-1">{prompt}</p>
                              </div>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>

                    {/* Success Metrics */}
                    <div className="pt-4 border-t space-y-3">
                      <h4 className="text-sm font-semibold text-foreground">Success Metrics</h4>
                      <div className="flex flex-wrap gap-2">
                        {project.successMetrics.map((metric, mIdx) => (
                          <Badge key={mIdx} variant="outline" className="bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800 text-sm px-3 py-1.5">
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
