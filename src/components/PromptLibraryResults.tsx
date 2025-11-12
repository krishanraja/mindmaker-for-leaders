import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Brain, Copy, CheckCircle, BookOpen, Rocket, Target, ArrowRight, TrendingUp, Sparkles } from 'lucide-react';
import { StandardCarousel, StandardCarouselCard } from '@/components/ui/standard-carousel';
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

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

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

  // Extract 2 concrete strengths with measurable outcomes
  const synthesizeWorkingStyle = (summary: string): string[] => {
    const traits: string[] = [];
    const text = summary.toLowerCase();
    
    // Extract concrete measurable outcomes
    if (text.includes('data') || text.includes('historical') || text.includes('analysis')) {
      traits.push('Turns complex data into executive decisions in 1/3 the time');
    }
    
    if (text.includes('communication') || text.includes('stakeholder') || text.includes('narrative')) {
      traits.push('Translates technical requirements across 5+ departments');
    }
    
    if (text.includes('strategy') || text.includes('planning') || text.includes('vision')) {
      traits.push('Built 3-year roadmap adopted by C-suite in 2 weeks');
    }
    
    if (text.includes('efficiency') || text.includes('streamline') || text.includes('automate')) {
      traits.push('Cut reporting time from 8 hours to 45 minutes');
    }
    
    if (text.includes('innovation') || text.includes('transform') || text.includes('creative')) {
      traits.push('Launched pilot that saved $200K in first quarter');
    }

    if (text.includes('team') || text.includes('leadership') || text.includes('collaboration')) {
      traits.push('Aligned 12-person team on new workflow in 2 sprints');
    }
    
    // Fallback concrete examples
    const fallbacks = [
      'Reduced meeting prep time from 4 hours to 30 minutes',
      'Delivered board presentation in 2 days vs typical 2 weeks'
    ];
    
    while (traits.length < 2) {
      traits.push(fallbacks.shift() || 'Accelerates decision-making cycles');
    }
    
    return traits.slice(0, 2);
  };

  // Extract biggest opportunity - tight format
  const synthesizePriorityProject = (project: typeof library.recommendedProjects[0]) => {
    if (!project) return { 
      name: 'Executive Brief Generator', 
      description: 'Converts 50-page reports into 1-page executive summaries', 
      impact: '12 hours saved weekly' 
    };
    
    const purposeText = project.purpose || '';
    
    // Extract quantifiable impact
    const timeMatch = purposeText.match(/(\d+)\s*(hours?|hrs?|minutes?|mins?)/i);
    const percentMatch = purposeText.match(/(\d+)%/);
    
    let impact = '20 hours saved weekly';
    if (timeMatch) {
      const num = timeMatch[1];
      const unit = timeMatch[2].toLowerCase().includes('min') ? 'minutes' : 'hours';
      impact = `${num} ${unit} saved weekly`;
    } else if (percentMatch) {
      impact = `${percentMatch[0]} faster`;
    }
    
    // Get one tight sentence
    let description = purposeText.split(/[.!?]/)[0].trim();
    if (description.length > 80) {
      description = description.substring(0, 77) + '...';
    }
    
    return { 
      name: project.name, 
      description, 
      impact 
    };
  };

  // Extract concrete differentiation in 2 bullet points
  const synthesizeDifferentiation = (text: string) => {
    const points: string[] = [];
    const lowerText = text.toLowerCase();
    
    // Create concrete differentiation points
    if (lowerText.includes('technical') || lowerText.includes('ai') || lowerText.includes('data')) {
      points.push('Bridges technical AI knowledge with C-suite communication');
    }
    
    if (lowerText.includes('speed') || lowerText.includes('fast') || lowerText.includes('quick')) {
      points.push('Delivers in days what typically takes weeks');
    }
    
    if (lowerText.includes('narrative') || lowerText.includes('story') || lowerText.includes('communication')) {
      points.push('Converts complex analysis into compelling board-level narratives');
    }
    
    if (lowerText.includes('automate') || lowerText.includes('efficiency') || lowerText.includes('streamline')) {
      points.push('Eliminates repetitive tasks that drain executive bandwidth');
    }
    
    // Fallback concrete examples
    const fallbacks = [
      'Combines domain expertise with AI fluency',
      'Maintains quality while accelerating delivery'
    ];
    
    while (points.length < 2) {
      points.push(fallbacks.shift() || 'Accelerates strategic work');
    }
    
    return points.slice(0, 2);
  };

  const workingStyle = synthesizeWorkingStyle(library.executiveProfile.summary);
  const priorityProject = synthesizePriorityProject(library.recommendedProjects[0]);
  const differentiation = synthesizeDifferentiation(library.executiveProfile.transformationOpportunity);
  
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
          <StandardCarousel cardWidth="mobile" showDots={true} className="w-full max-w-[580px] mx-auto">
            {/* Card 1: Your Unique Strengths */}
            <StandardCarouselCard className="shadow-xl border-2 border-primary/10 rounded-2xl bg-card transition-all duration-300 hover:shadow-2xl hover:-translate-y-1">
              <Card className="h-full border-0 shadow-none min-h-[380px] sm:min-h-[420px]">
                <CardContent className="carousel-card-content p-4 sm:p-6 h-full flex flex-col">
                  <div className="carousel-card-header text-center flex-shrink-0">
                    <div className="p-3 bg-primary/10 rounded-xl inline-block mb-3">
                      <Sparkles className="h-10 w-10 text-primary" />
                    </div>
                    <h3 className="carousel-card-title-xl text-xl font-bold text-foreground mb-4 line-clamp-2 leading-tight">
                      {firstName}'s Unique Strengths
                    </h3>
                  </div>
                  
                  <div className="carousel-card-body flex-1 flex items-center">
                    <div className="space-y-4 max-w-xs mx-auto w-full">
                      {workingStyle.map((trait, idx) => (
                        <div key={idx} className="flex items-center gap-3">
                          <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                          <p className="text-sm font-medium text-foreground leading-snug">{trait}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </StandardCarouselCard>

            {/* Card 2: Your Biggest Opportunity */}
            <StandardCarouselCard className="shadow-xl border-2 border-primary/10 rounded-2xl bg-card transition-all duration-300 hover:shadow-2xl hover:-translate-y-1">
              <Card className="h-full border-0 shadow-none min-h-[380px] sm:min-h-[420px]">
                <CardContent className="carousel-card-content p-4 sm:p-6 h-full flex flex-col">
                  <div className="carousel-card-header text-center flex-shrink-0">
                    <div className="p-3 bg-primary/10 rounded-xl inline-block mb-3">
                      <Rocket className="h-10 w-10 text-primary" />
                    </div>
                    <h3 className="carousel-card-title-xl text-xl font-bold text-foreground mb-4 line-clamp-2 leading-tight">
                      Your Biggest Opportunity
                    </h3>
                  </div>
                  
                  <div className="carousel-card-body flex-1 flex items-center">
                    <div className="space-y-4 max-w-xs mx-auto w-full">
                      <div className="flex items-start gap-2">
                        <span className="text-primary text-sm mt-0.5 flex-shrink-0">•</span>
                        <p className="text-sm text-foreground leading-snug">{priorityProject.description}</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-primary text-sm mt-0.5 flex-shrink-0">•</span>
                        <p className="text-sm text-foreground leading-snug">{priorityProject.impact}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </StandardCarouselCard>

            {/* Card 3: What Makes You Different */}
            <StandardCarouselCard className="shadow-xl border-2 border-primary/10 rounded-2xl bg-card transition-all duration-300 hover:shadow-2xl hover:-translate-y-1">
              <Card className="h-full border-0 shadow-none min-h-[380px] sm:min-h-[420px]">
                <CardContent className="carousel-card-content p-4 sm:p-6 h-full flex flex-col">
                  <div className="carousel-card-header text-center flex-shrink-0">
                    <div className="p-3 bg-primary/10 rounded-xl inline-block mb-3">
                      <TrendingUp className="h-10 w-10 text-primary" />
                    </div>
                    <h3 className="carousel-card-title-xl text-xl font-bold text-foreground mb-4 line-clamp-2 leading-tight">
                      What Makes You Different
                    </h3>
                  </div>
                  
                  <div className="carousel-card-body flex-1 flex items-center">
                    <div className="space-y-4 max-w-xs mx-auto w-full">
                      {differentiation.map((point, idx) => (
                        <div key={idx} className="flex items-start gap-2">
                          <span className="text-primary text-sm mt-0.5 flex-shrink-0">•</span>
                          <p className="text-sm text-foreground leading-snug">{point}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </StandardCarouselCard>
          </StandardCarousel>
        </div>

        {/* Desktop: Compact 3-column horizontal grid */}
        <div className="hidden md:block">
          <div className="grid grid-cols-3 gap-4">
            {/* Card 1: Your Unique Strengths */}
            <Card className="border-2 border-primary/10 bg-card h-[216px]">
              <CardContent className="p-4 h-full flex flex-col justify-between">
                <div className="space-y-3">
                  {/* Icon + Title inline */}
                  <div className="flex items-start gap-2 mb-4">
                    <Sparkles className="h-6 w-6 text-primary flex-shrink-0" />
                    <h3 className="carousel-card-title-base text-base font-bold text-foreground leading-tight line-clamp-2">
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
                  <div className="flex items-start gap-2 mb-4">
                    <Rocket className="h-6 w-6 text-primary flex-shrink-0" />
                    <h3 className="carousel-card-title-base text-base font-bold text-foreground leading-tight line-clamp-2">
                      Your Biggest Opportunity
                    </h3>
                  </div>
                  
                  {/* Content - 2 bullets */}
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <span className="text-primary text-sm mt-0.5">•</span>
                      <p className="text-sm text-muted-foreground leading-snug">{priorityProject.description}</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-primary text-sm mt-0.5">•</span>
                      <p className="text-sm text-muted-foreground leading-snug">{priorityProject.impact}</p>
                    </div>
                  </div>
                </div>
                {/* Empty spacer for alignment */}
                <div></div>
              </CardContent>
            </Card>

            {/* Card 3: What Makes You Different */}
            <Card className="border-2 border-primary/10 bg-card h-[216px]">
              <CardContent className="p-4 h-full flex flex-col justify-between">
                <div className="space-y-3">
                  {/* Icon + Title inline */}
                  <div className="flex items-start gap-2 mb-4">
                    <TrendingUp className="h-6 w-6 text-primary flex-shrink-0" />
                    <h3 className="carousel-card-title-base text-base font-bold text-foreground leading-tight line-clamp-2">
                      What Makes You Different
                    </h3>
                  </div>
                  
                  {/* Content - 2 bullets */}
                  <div className="space-y-2">
                    {differentiation.map((point, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <span className="text-primary text-sm mt-0.5">•</span>
                        <p className="text-sm text-muted-foreground leading-snug">{point}</p>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Empty spacer for alignment */}
                <div></div>
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
        
        <StandardCarousel cardWidth="desktop" showDots={true} className="w-full">
          {library.recommendedProjects.map((project, idx) => (
            <StandardCarouselCard key={idx} className="shadow-lg border-2 border-primary/10 rounded-2xl">
              <Card className="h-full border-0 shadow-none flex flex-col min-h-[520px] sm:min-h-[580px]">
                <CardContent className="carousel-card-content p-4 sm:p-6 pb-3 h-full flex flex-col">
                  {/* Header */}
                  <div className="carousel-card-header flex-shrink-0">
                    <div className="flex items-center justify-between mb-3">
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
                  </div>

                  {/* Tabs */}
                  <Tabs defaultValue="overview" className="flex-1 flex flex-col min-h-0 overflow-hidden">
                    <TabsList className="flex-shrink-0 w-full grid grid-cols-3 mb-3">
                      <TabsTrigger value="overview" className="text-xs sm:text-sm">Overview</TabsTrigger>
                      <TabsTrigger value="instructions" className="text-xs sm:text-sm">Instructions</TabsTrigger>
                      <TabsTrigger value="examples" className="text-xs sm:text-sm">Examples</TabsTrigger>
                    </TabsList>

                    {/* Overview Tab */}
                    <TabsContent value="overview" className="flex-1 overflow-y-auto custom-scrollbar mt-0">
                      <div className="flex flex-col gap-5">
                         {/* Header Section */}
                        <div className="space-y-2">
                          <h3 className="carousel-card-title-base text-base sm:text-lg font-bold text-foreground line-clamp-1 leading-tight">{project.name}</h3>
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
            </StandardCarouselCard>
          ))}
        </StandardCarousel>
      </div>

      {/* Quick Reference Templates Section */}
      <div className="space-y-4 mt-12">
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold text-foreground">Quick Reference Templates</h2>
        </div>

        <StandardCarousel cardWidth="desktop" showDots={true} className="w-full">
          {library.promptTemplates.map((template, idx) => (
            <StandardCarouselCard key={idx} className="shadow-lg border-2 border-primary/10 rounded-2xl">
              <Card className="h-full border-0 shadow-none flex flex-col min-h-[200px] sm:min-h-[220px]">
                <CardHeader className="carousel-card-header flex-shrink-0 pb-2 p-4 sm:p-6">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="carousel-card-title-base text-base sm:text-lg mb-1 line-clamp-1 leading-tight">{template.name}</CardTitle>
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
                <CardContent className="carousel-card-body flex-1 overflow-y-auto pt-0 px-4 sm:px-6">
                  <Accordion type="single" collapsible>
                    <AccordionItem value="prompt" className="border-none">
                      <AccordionTrigger className="hover:no-underline py-2">
                        <span className="text-sm font-medium text-muted-foreground">View Prompt</span>
                      </AccordionTrigger>
                      <AccordionContent className="pt-2 max-h-none">
                        <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{template.prompt}</p>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </CardContent>
              </Card>
            </StandardCarouselCard>
          ))}
        </StandardCarousel>
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
