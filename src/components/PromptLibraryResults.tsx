import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  const [roadmapOpen, setRoadmapOpen] = useState<string | undefined>(undefined);

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

  // Extract 3 impactful strengths - NO TRUNCATION
  const synthesizeWorkingStyle = (summary: string): string[] => {
    const traits: string[] = [];
    const text = summary.toLowerCase();
    
    // Extract key behavioral patterns
    if (text.includes('data') || text.includes('historical') || text.includes('analysis')) {
      traits.push('Data-driven decision maker');
    }
    
    if (text.includes('communication') || text.includes('stakeholder') || text.includes('narrative')) {
      traits.push('Expert communicator');
    }
    
    if (text.includes('strategy') || text.includes('planning') || text.includes('vision')) {
      traits.push('Strategic thinker');
    }
    
    if (text.includes('efficiency') || text.includes('streamline') || text.includes('automate')) {
      traits.push('Process optimizer');
    }
    
    if (text.includes('innovation') || text.includes('transform') || text.includes('creative')) {
      traits.push('Change catalyst');
    }

    if (text.includes('team') || text.includes('leadership') || text.includes('collaboration')) {
      traits.push('Team builder');
    }
    
    // Fallback traits
    const fallbacks = [
      'Clear communicator',
      'Results-focused leader',
      'Strategic executor'
    ];
    
    while (traits.length < 3) {
      traits.push(fallbacks.shift() || 'Strategic leader');
    }
    
    return traits.slice(0, 3);
  };

  // Extract biggest opportunity - ONE powerful insight, NO TRUNCATION
  const synthesizePriorityProject = (project: typeof library.recommendedProjects[0]) => {
    if (!project) return { 
      name: 'AI-Powered Workflow', 
      valueProp: 'Streamline operations with intelligent automation', 
      impact: '10+ hours saved weekly' 
    };
    
    const purposeText = project.purpose || '';
    
    // Extract quantifiable impact
    const timeMatch = purposeText.match(/(\d+)\s*(hours?|hrs?|minutes?|mins?)/i);
    const percentMatch = purposeText.match(/(\d+)%/);
    
    let impact = '20+ hours saved weekly';
    if (timeMatch) {
      const num = timeMatch[1];
      const unit = timeMatch[2].toLowerCase().includes('min') ? 'minutes' : 'hours';
      impact = `${num}+ ${unit} saved weekly`;
    } else if (percentMatch) {
      impact = `${percentMatch[0]} faster results`;
    }
    
    // Get one sentence value prop
    let valueProp = purposeText.split(/[.!?]/)[0].trim();
    
    return { 
      name: project.name, 
      valueProp, 
      impact 
    };
  };

  // Extract transformation insight - ONE powerful differentiator, NO TRUNCATION
  const synthesizeOpportunity = (text: string) => {
    // Extract metric
    const timeMatch = text.match(/(\d+)\s*(hours?|hrs?|minutes?|mins?)/i);
    const percentMatch = text.match(/(\d+)%/);
    const multiplierMatch = text.match(/(\d+)x/i);
    
    let outcome = 'Significant competitive advantage';
    if (timeMatch) {
      outcome = `${timeMatch[1]}+ hours saved weekly`;
    } else if (percentMatch) {
      outcome = `${percentMatch[0]} productivity boost`;
    } else if (multiplierMatch) {
      outcome = `${multiplierMatch[0]} faster execution`;
    }
    
    // Get first impactful sentence
    const statement = text.split(/[.!?]/)[0].trim();
    
    return { statement, outcome };
  };

  const workingStyle = synthesizeWorkingStyle(library.executiveProfile.summary);
  const priorityProject = synthesizePriorityProject(library.recommendedProjects[0]);
  const opportunity = synthesizeOpportunity(library.executiveProfile.transformationOpportunity);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* About You - Executive Profile Cards */}
      <section className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-3xl font-bold text-foreground">About You</h2>
          <p className="text-base text-muted-foreground">Based on your responses, here's your executive profile</p>
        </div>
        
        <Carousel
          opts={{
            align: "center",
            loop: false,
          }}
          className="w-full max-w-[580px] mx-auto"
        >
          <CarouselContent className="-ml-4">
            {/* Card 1: Your Unique Strengths */}
            <CarouselItem className="pl-4">
              <Card className="shadow-xl border-2 border-primary/10 rounded-2xl bg-card h-[480px] flex flex-col transition-all duration-300 hover:shadow-2xl hover:-translate-y-1">
                <CardContent className="p-10 flex flex-col h-full justify-center">
                  <div className="space-y-8 flex flex-col items-center">
                    {/* Icon */}
                    <div className="p-3 bg-primary/10 rounded-xl">
                      <Sparkles className="h-12 w-12 text-primary" />
                    </div>
                    
                    {/* Title */}
                    <h3 className="text-2xl font-bold text-center text-foreground">
                      Your Unique Strengths
                    </h3>
                    
                    {/* Content - 3 strengths with breathing room */}
                    <div className="space-y-6 w-full">
                      {workingStyle.map((trait, idx) => (
                        <div key={idx} className="flex items-center gap-4 justify-center">
                          <CheckCircle className="h-6 w-6 text-primary flex-shrink-0" />
                          <p className="text-base font-medium text-foreground">{trait}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </CarouselItem>

            {/* Card 2: Your Biggest Opportunity */}
            <CarouselItem className="pl-4">
              <Card className="shadow-xl border-2 border-primary/10 rounded-2xl bg-card h-[480px] flex flex-col transition-all duration-300 hover:shadow-2xl hover:-translate-y-1">
                <CardContent className="p-10 flex flex-col h-full justify-center">
                  <div className="space-y-8 flex flex-col items-center">
                    {/* Icon */}
                    <div className="p-3 bg-primary/10 rounded-xl">
                      <Rocket className="h-12 w-12 text-primary" />
                    </div>
                    
                    {/* Title */}
                    <h3 className="text-2xl font-bold text-center text-foreground">
                      Your Biggest Opportunity
                    </h3>
                    
                    {/* Content - Project name bold, value prop, impact */}
                    <div className="space-y-6 text-center">
                      <h4 className="text-xl font-bold text-foreground leading-snug px-4">
                        {priorityProject.name}
                      </h4>
                      <p className="text-base text-muted-foreground leading-relaxed px-6">
                        {priorityProject.valueProp}
                      </p>
                      <div className="pt-2">
                        <Badge variant="secondary" className="text-base font-semibold px-4 py-2">
                          {priorityProject.impact}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </CarouselItem>

            {/* Card 3: What Makes You Different */}
            <CarouselItem className="pl-4">
              <Card className="shadow-xl border-2 border-primary/10 rounded-2xl bg-card h-[480px] flex flex-col transition-all duration-300 hover:shadow-2xl hover:-translate-y-1">
                <CardContent className="p-10 flex flex-col h-full justify-center">
                  <div className="space-y-8 flex flex-col items-center">
                    {/* Icon */}
                    <div className="p-3 bg-primary/10 rounded-xl">
                      <TrendingUp className="h-12 w-12 text-primary" />
                    </div>
                    
                    {/* Title */}
                    <h3 className="text-2xl font-bold text-center text-foreground">
                      What Makes You Different
                    </h3>
                    
                    {/* Content - Quote-style insight */}
                    <div className="space-y-6 w-full">
                      <div className="border-l-4 border-primary pl-6 pr-4 py-2">
                        <p className="text-base text-foreground leading-relaxed italic">
                          "{opportunity.statement}"
                        </p>
                      </div>
                      
                      <div className="text-center pt-2">
                        <Badge variant="secondary" className="text-base font-semibold px-4 py-2">
                          {opportunity.outcome}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </CarouselItem>
          </CarouselContent>
          
          <div className="flex justify-center gap-2 mt-6">
            <CarouselPrevious className="relative static translate-y-0" />
            <CarouselNext className="relative static translate-y-0" />
          </div>
        </Carousel>
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
                <Card className="shadow-lg border-2 border-primary/10 rounded-2xl h-[840px] flex flex-col">
                  <CardContent className="p-6 flex flex-col h-full">
                    {/* Header */}
                    <div className="flex-shrink-0 flex items-center justify-between mb-4">
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

                    {/* Tabs */}
                    <Tabs defaultValue="overview" className="flex-1 flex flex-col min-h-0">
                      <TabsList className="flex-shrink-0 w-full grid grid-cols-3 mb-4">
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="instructions">Instructions</TabsTrigger>
                        <TabsTrigger value="examples">Examples</TabsTrigger>
                      </TabsList>

                      {/* Overview Tab */}
                      <TabsContent value="overview" className="flex-1 overflow-y-auto custom-scrollbar space-y-4 mt-0">
                        <div>
                          <h3 className="text-xl font-bold text-foreground mb-2">{project.name}</h3>
                          <p className="text-sm text-muted-foreground leading-relaxed">{project.purpose}</p>
                        </div>

                        <div className="bg-muted/50 rounded-xl p-4 space-y-2">
                          <h4 className="text-sm font-semibold text-foreground">When to Use</h4>
                          <p className="text-sm text-muted-foreground leading-relaxed">{project.whenToUse}</p>
                        </div>

                        <div className="space-y-2">
                          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            Success Metrics
                          </h4>
                          <div className="space-y-1.5">
                            {project.successMetrics.map((metric, mIdx) => (
                              <div key={mIdx} className="flex items-start gap-2 text-sm">
                                <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                                <span className="text-foreground leading-snug">{metric}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </TabsContent>

                      {/* Instructions Tab */}
                      <TabsContent value="instructions" className="flex-1 overflow-y-auto custom-scrollbar mt-0">
                        <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap pr-2">
                          {project.masterInstructions}
                        </div>
                      </TabsContent>

                      {/* Examples Tab */}
                      <TabsContent value="examples" className="flex-1 overflow-y-auto custom-scrollbar space-y-4 mt-0">
                        {project.examplePrompts.map((prompt, pIdx) => (
                          <div key={pIdx} className="flex items-start gap-3">
                            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <span className="text-xs font-bold text-primary">{pIdx + 1}</span>
                            </div>
                            <p className="text-sm text-foreground leading-relaxed flex-1">{prompt}</p>
                          </div>
                        ))}
                      </TabsContent>
                    </Tabs>
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

        <Carousel
          opts={{
            align: "start",
            loop: false,
          }}
          className="w-full"
        >
          <CarouselContent className="-ml-4">
            {Object.entries(
              library.promptTemplates.reduce((acc, template) => {
                if (!acc[template.category]) acc[template.category] = [];
                acc[template.category].push(template);
                return acc;
              }, {} as Record<string, typeof library.promptTemplates>)
            ).map(([category, templates]) => (
              <CarouselItem key={category} className="pl-4 basis-full md:basis-[480px] lg:basis-[500px]">
                <Card className="shadow-lg border-2 border-primary/10 rounded-2xl min-h-[200px] flex flex-col">
                  <CardHeader className="flex-shrink-0">
                    <CardTitle className="text-lg">{category}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1">
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
              </CarouselItem>
            ))}
          </CarouselContent>
          
          <div className="flex justify-center gap-2 mt-6">
            <CarouselPrevious className="relative static translate-y-0" />
            <CarouselNext className="relative static translate-y-0" />
          </div>
        </Carousel>
      </div>

      {/* Visual Break */}
      <div className="py-12">
        <div className="w-full h-px bg-gradient-to-r from-transparent via-border to-transparent"></div>
      </div>

      {/* Implementation Roadmap Section - Collapsible with Preview */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Rocket className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold text-foreground">Your Implementation Roadmap</h2>
        </div>

        <Card className="shadow-sm border rounded-xl">
          <CardContent className="p-6 space-y-4">
          {/* Expandable Full Content */}
          <Accordion type="single" collapsible className="border-0" value={roadmapOpen} onValueChange={setRoadmapOpen}>
            <AccordionItem value="roadmap" className="border-0">
              {/* Week 1 Preview - Visible when collapsed */}
              {!roadmapOpen && (
                <div className="space-y-3 mb-3">
                  <div className="flex items-center gap-3">
                    <Badge className="bg-primary text-primary-foreground">Week 1</Badge>
                    <h3 className="font-semibold text-foreground">Quick Start</h3>
                  </div>
                  <p className="text-muted-foreground leading-relaxed pl-20 line-clamp-2">
                    {library.implementationRoadmap.week1}
                  </p>
                </div>
              )}

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
      </div>

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
