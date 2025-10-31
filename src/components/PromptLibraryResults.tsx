import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Brain, Copy, CheckCircle, BookOpen, Rocket, Target, ArrowRight, TrendingUp, Sparkles } from 'lucide-react';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, type CarouselApi } from '@/components/ui/carousel';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

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
  
  // Expansion state for progressive disclosure
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  
  // Carousel states for dot indicators
  const [aboutYouApi, setAboutYouApi] = useState<CarouselApi>();
  const [aboutYouCurrent, setAboutYouCurrent] = useState(0);
  const [masterPromptsApi, setMasterPromptsApi] = useState<CarouselApi>();
  const [masterPromptsCurrent, setMasterPromptsCurrent] = useState(0);
  const [templatesApi, setTemplatesApi] = useState<CarouselApi>();
  const [templatesCurrent, setTemplatesCurrent] = useState(0);

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };
  
  // Update current slide when carousel changes
  React.useEffect(() => {
    if (!aboutYouApi) return;
    
    const onSelect = () => {
      setAboutYouCurrent(aboutYouApi.selectedScrollSnap());
    };
    
    aboutYouApi.on("select", onSelect);
    onSelect();
    
    return () => {
      aboutYouApi.off("select", onSelect);
    };
  }, [aboutYouApi]);
  
  React.useEffect(() => {
    if (!masterPromptsApi) return;
    
    const onSelect = () => {
      setMasterPromptsCurrent(masterPromptsApi.selectedScrollSnap());
    };
    
    masterPromptsApi.on("select", onSelect);
    onSelect();
    
    return () => {
      masterPromptsApi.off("select", onSelect);
    };
  }, [masterPromptsApi]);
  
  React.useEffect(() => {
    if (!templatesApi) return;
    
    const onSelect = () => {
      setTemplatesCurrent(templatesApi.selectedScrollSnap());
    };
    
    templatesApi.on("select", onSelect);
    onSelect();
    
    return () => {
      templatesApi.off("select", onSelect);
    };
  }, [templatesApi]);

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
      traits.push('Data-driven strategic decision maker');
    }
    
    if (text.includes('communication') || text.includes('stakeholder') || text.includes('narrative')) {
      traits.push('Expert cross-functional communicator');
    }
    
    if (text.includes('strategy') || text.includes('planning') || text.includes('vision')) {
      traits.push('Visionary strategic planning thinker');
    }
    
    if (text.includes('efficiency') || text.includes('streamline') || text.includes('automate')) {
      traits.push('Efficiency-focused process optimizer');
    }
    
    if (text.includes('innovation') || text.includes('transform') || text.includes('creative')) {
      traits.push('Innovative transformation change catalyst');
    }

    if (text.includes('team') || text.includes('leadership') || text.includes('collaboration')) {
      traits.push('Collaborative team alignment builder');
    }
    
    // Fallback traits
    const fallbacks = [
      'Clear and concise communicator',
      'Results-driven execution-focused leader',
      'Strategic initiative executor'
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
  
  // Extract first name for personalization
  const firstName = contactData.fullName.split(' ')[0];

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* About You - Executive Profile Cards */}
      <section className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-3xl font-bold text-foreground">About You</h2>
          <p className="text-base text-muted-foreground">Based on your responses, here's your executive profile</p>
        </div>
        
        {/* Mobile: Carousel */}
        <div className="md:hidden">
          <Carousel
            opts={{
              align: "center",
              loop: true,
            }}
            setApi={setAboutYouApi}
            className="w-full max-w-[580px] mx-auto"
          >
            <CarouselContent className="-ml-4">
              {/* Card 1: Your Unique Strengths */}
              <CarouselItem className="pl-4 basis-full">
                <Card className="shadow-xl border-2 border-primary/10 rounded-2xl bg-card h-[576px] flex flex-col transition-all duration-300 hover:shadow-2xl hover:-translate-y-1">
                  <CardContent className="p-8 flex flex-col h-full justify-center">
                    <div className="space-y-8 flex flex-col items-center">
                      {/* Icon */}
                      <div className="p-3 bg-primary/10 rounded-xl">
                        <Sparkles className="h-12 w-12 text-primary" />
                      </div>
                      
                      {/* Title */}
                      <h3 className="text-2xl font-bold text-center text-foreground mb-6">
                        {firstName}'s Unique Strengths
                      </h3>
                      
                      {/* Content - 3 strengths with breathing room */}
                      <div className="space-y-6 w-full max-w-xs">
                        {workingStyle.map((trait, idx) => (
                          <div key={idx} className="flex items-center gap-4">
                            <CheckCircle className="h-6 w-6 text-primary flex-shrink-0" />
                            <p className="text-sm font-medium text-foreground">{trait}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </CarouselItem>

              {/* Card 2: Your Biggest Opportunity */}
              <CarouselItem className="pl-4 basis-full">
                <Card className="shadow-xl border-2 border-primary/10 rounded-2xl bg-card h-[576px] flex flex-col transition-all duration-300 hover:shadow-2xl hover:-translate-y-1">
                  <CardContent className="p-8 flex flex-col h-full justify-center">
                    <div className="space-y-8 flex flex-col items-center">
                      {/* Icon */}
                      <div className="p-3 bg-primary/10 rounded-xl">
                        <Rocket className="h-12 w-12 text-primary" />
                      </div>
                      
                      {/* Title */}
                      <h3 className="text-2xl font-bold text-center text-foreground mb-6">
                        Your Biggest Opportunity
                      </h3>
                      
                      {/* Content - Project name bold, value prop, impact */}
                      <div className="space-y-6 text-center">
                        <h4 className="text-lg font-bold text-foreground leading-snug px-2">
                          {priorityProject.name}
                        </h4>
                        <p className="text-sm text-muted-foreground leading-relaxed px-4">
                          {priorityProject.valueProp}
                        </p>
                        <div className="pt-2">
                          <Badge variant="secondary" className="text-sm font-semibold px-4 py-2">
                            {priorityProject.impact}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </CarouselItem>

              {/* Card 3: What Makes You Different */}
              <CarouselItem className="pl-4 basis-full">
                <Card className="shadow-xl border-2 border-primary/10 rounded-2xl bg-card h-[576px] flex flex-col transition-all duration-300 hover:shadow-2xl hover:-translate-y-1">
                  <CardContent className="p-8 flex flex-col h-full justify-center">
                    <div className="space-y-8 flex flex-col items-center">
                      {/* Icon */}
                      <div className="p-3 bg-primary/10 rounded-xl">
                        <TrendingUp className="h-12 w-12 text-primary" />
                      </div>
                      
                      {/* Title */}
                      <h3 className="text-2xl font-bold text-center text-foreground mb-6">
                        What Makes You Different
                      </h3>
                      
                      {/* Content - Quote-style insight */}
                      <div className="space-y-6 w-full">
                        <div className="border-l-4 border-primary pl-4 pr-2 py-2">
                          <p className="text-sm text-foreground leading-relaxed italic">
                            "{opportunity.statement}"
                          </p>
                        </div>
                        
                        <div className="text-center pt-2">
                          <Badge variant="secondary" className="text-sm font-semibold px-4 py-2">
                            {opportunity.outcome}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </CarouselItem>
            </CarouselContent>
            
            {/* Dot Indicators */}
            <div className="flex justify-center gap-2 mt-6">
              {[0, 1, 2].map((index) => (
                <button
                  key={index}
                  onClick={() => aboutYouApi?.scrollTo(index)}
                  className={cn(
                    "h-2 rounded-full transition-all duration-300",
                    aboutYouCurrent === index 
                      ? "bg-primary w-8" 
                      : "bg-primary/20 hover:bg-primary/40 w-2"
                  )}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
          </Carousel>
        </div>

        {/* Desktop: Compact 3-column horizontal grid */}
        <div className="hidden md:block">
          <div className="grid grid-cols-3 gap-4">
            {/* Card 1: Your Unique Strengths */}
            <Card className="border-2 border-primary/10 bg-card h-[216px]">
              <CardContent className="p-4 h-full flex flex-col justify-between">
                <div className="space-y-3">
                  {/* Icon + Title inline */}
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="h-6 w-6 text-primary flex-shrink-0" />
                    <h3 className="text-base font-bold text-foreground leading-tight">
                      {firstName}'s Unique Strengths
                    </h3>
                  </div>
                  
                  {/* Content - 3 strengths compact */}
                  <div className="space-y-2">
                    {workingStyle.map((trait, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <span className="text-primary text-sm mt-0.5">•</span>
                        <p className="text-sm text-muted-foreground leading-snug">{trait}</p>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Empty spacer for alignment */}
                <div></div>
              </CardContent>
            </Card>

            {/* Card 2: Your Biggest Opportunity */}
            <Card className="border-2 border-primary/10 bg-card h-[216px]">
              <CardContent className="p-4 h-full flex flex-col justify-between">
                <div className="space-y-3">
                  {/* Icon + Title inline */}
                  <div className="flex items-center gap-2 mb-4">
                    <Rocket className="h-6 w-6 text-primary flex-shrink-0" />
                    <h3 className="text-base font-bold text-foreground leading-tight">
                      Your Biggest Opportunity
                    </h3>
                  </div>
                  
                  {/* Content - Project compact */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-bold text-foreground leading-tight">
                      {priorityProject.name}
                    </h4>
                    <p className="text-xs text-muted-foreground leading-tight">
                      {priorityProject.valueProp}
                    </p>
                  </div>
                </div>
                
                {/* Badge at bottom */}
                <div className="pt-2">
                  <Badge variant="secondary" className="text-xs px-2 py-0.5">
                    {priorityProject.impact}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Card 3: What Makes You Different */}
            <Card className="border-2 border-primary/10 bg-card h-[216px]">
              <CardContent className="p-4 h-full flex flex-col justify-between">
                <div className="space-y-3">
                  {/* Icon + Title inline */}
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="h-6 w-6 text-primary flex-shrink-0" />
                    <h3 className="text-base font-bold text-foreground leading-tight">
                      What Makes You Different
                    </h3>
                  </div>
                  
                  {/* Content - Quote compact */}
                  <div className="space-y-2">
                    <div className="border-l-2 border-primary pl-3">
                      <p className="text-xs text-muted-foreground leading-tight italic">
                        "{opportunity.statement}"
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Badge at bottom */}
                <div className="pt-2">
                  <Badge variant="secondary" className="text-xs px-2 py-0.5">
                    {opportunity.outcome}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
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
          setApi={setMasterPromptsApi}
          className="w-full"
        >
          <CarouselContent className="-ml-4">
            {library.recommendedProjects.map((project, idx) => (
              <CarouselItem key={idx} className="pl-4 basis-full md:basis-[480px] lg:basis-[500px]">
                <Card className="shadow-lg border-2 border-primary/10 rounded-2xl min-h-[580px] max-h-[720px] flex flex-col">
                  <CardContent className="p-6 pb-4 md:pb-3 flex flex-col h-full">
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
                      <TabsContent value="overview" className="flex-1 overflow-y-auto custom-scrollbar mt-0">
                        <div className="flex flex-col gap-5">
                          {/* Header Section */}
                          <div className="space-y-2">
                            <h3 className="text-xl font-bold text-foreground line-clamp-2">{project.name}</h3>
                            <div className="relative">
                              <p className={cn(
                                "text-sm text-muted-foreground leading-relaxed",
                                !expandedSections[`purpose-${idx}`] && "line-clamp-3"
                              )}>
                                {project.purpose}
                              </p>
                              {project.purpose.length > 150 && (
                                <button
                                  onClick={() => toggleSection(`purpose-${idx}`)}
                                  className="text-xs text-primary hover:underline mt-1 font-medium"
                                >
                                  {expandedSections[`purpose-${idx}`] ? "Show less" : "Read more"}
                                </button>
                              )}
                            </div>
                          </div>

                          {/* When to Use Section */}
                          <div className="bg-muted/50 rounded-xl p-4 space-y-2">
                            <h4 className="text-sm font-semibold text-foreground">When to Use</h4>
                            <div className="relative">
                              <p className={cn(
                                "text-sm text-muted-foreground leading-relaxed",
                                !expandedSections[`whenToUse-${idx}`] && "line-clamp-4"
                              )}>
                                {project.whenToUse}
                              </p>
                              {project.whenToUse.length > 200 && (
                                <button
                                  onClick={() => toggleSection(`whenToUse-${idx}`)}
                                  className="text-xs text-primary hover:underline mt-1 font-medium"
                                >
                                  {expandedSections[`whenToUse-${idx}`] ? "Show less" : "Read more"}
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Success Metrics Section */}
                          <div className="space-y-2">
                            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                              Success Metrics
                            </h4>
                            <div className="space-y-2">
                              {project.successMetrics
                                .slice(0, expandedSections[`metrics-${idx}`] ? undefined : 3)
                                .map((metric, mIdx) => (
                                  <div key={mIdx} className="flex items-start gap-2 text-sm">
                                    <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                                    <span className="text-foreground leading-snug">{metric}</span>
                                  </div>
                                ))}
                              
                              {project.successMetrics.length > 3 && (
                                <button
                                  onClick={() => toggleSection(`metrics-${idx}`)}
                                  className="text-xs text-primary hover:underline ml-6 font-medium"
                                >
                                  {expandedSections[`metrics-${idx}`] 
                                    ? "Show less" 
                                    : `Show ${project.successMetrics.length - 3} more`}
                                </button>
                              )}
                            </div>
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
          
          {/* Dot Indicators */}
          <div className="flex justify-center gap-2 mt-6">
            {library.recommendedProjects.map((_, index) => (
              <button
                key={index}
                onClick={() => masterPromptsApi?.scrollTo(index)}
                className={cn(
                  "h-2 rounded-full transition-all duration-300",
                  masterPromptsCurrent === index 
                    ? "bg-primary w-8" 
                    : "bg-primary/20 hover:bg-primary/40 w-2"
                )}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </Carousel>
      </div>

      {/* Quick Reference Templates Section */}
      <div className="space-y-4 mt-12">
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold text-foreground">Quick Reference Templates</h2>
        </div>

        <Carousel
          opts={{
            align: "start",
            loop: false,
          }}
          setApi={setTemplatesApi}
          className="w-full"
        >
          <CarouselContent className="-ml-4">
            {library.promptTemplates.map((template, idx) => (
              <CarouselItem key={idx} className="pl-4 basis-full md:basis-[480px] lg:basis-[500px]">
                <Card className="shadow-lg border-2 border-primary/10 rounded-2xl h-[220px] flex flex-col">
                  <CardHeader className="flex-shrink-0 pb-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1">
                        <CardTitle className="text-lg mb-1">{template.name}</CardTitle>
                        <Badge variant="secondary" className="text-xs">{template.category}</Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopy(template.prompt, template.name);
                        }}
                        className="flex-shrink-0"
                      >
                        {copiedItem === template.name ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 overflow-y-auto pt-0">
                    <Accordion type="single" collapsible>
                      <AccordionItem value="prompt" className="border-none">
                        <AccordionTrigger className="hover:no-underline py-2">
                          <span className="text-sm font-medium text-muted-foreground">View Prompt</span>
                        </AccordionTrigger>
                        <AccordionContent className="pt-2">
                          <p className="text-sm text-muted-foreground leading-relaxed">{template.prompt}</p>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </CardContent>
                </Card>
              </CarouselItem>
            ))}
          </CarouselContent>
          
          {/* Dot Indicators */}
          <div className="flex justify-center gap-2 mt-6">
            {library.promptTemplates.map((_, index) => (
              <button
                key={index}
                onClick={() => templatesApi?.scrollTo(index)}
                className={cn(
                  "h-2 rounded-full transition-all duration-300",
                  templatesCurrent === index 
                    ? "bg-primary w-8" 
                    : "bg-primary/20 hover:bg-primary/40 w-2"
                )}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </Carousel>
      </div>

      {/* Visual Break */}
      <div className="py-6">
        <div className="w-full h-px bg-gradient-to-r from-transparent via-border/40 to-transparent"></div>
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
