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

  // Synthesize working style - 2-3 complete, powerful statements
  const synthesizeWorkingStyle = (summary: string): string[] => {
    const traits: string[] = [];
    const text = summary.toLowerCase();
    
    // Extract key behavioral patterns and rewrite as complete insights
    if (text.includes('data') || text.includes('historical') || text.includes('analysis')) {
      traits.push('You prioritize data-driven insights over intuition when making decisions');
    }
    
    if (text.includes('communication') || text.includes('stakeholder') || text.includes('narrative')) {
      traits.push('You excel at translating complex analysis into compelling narratives');
    }
    
    if (text.includes('strategy') || text.includes('planning') || text.includes('vision')) {
      traits.push('You focus on strategic alignment and long-term impact');
    }
    
    if (text.includes('efficiency') || text.includes('streamline') || text.includes('automate')) {
      traits.push('You actively seek opportunities to optimize workflows');
    }
    
    // Fallback to parsing first 2-3 sentences if no patterns matched
    if (traits.length === 0) {
      const sentences = summary.split(/[.!?]+/).filter(s => s.trim().length > 20);
      sentences.slice(0, 2).forEach(sentence => {
        const clean = sentence.trim();
        // Rewrite in active voice if needed
        if (clean.length > 10 && clean.length < 80) {
          traits.push(clean);
        }
      });
    }
    
    return traits.slice(0, 3); // Max 3 insights
  };

  // Synthesize priority project - clear name, complete value prop, impact
  const synthesizePriorityProject = (project: typeof library.recommendedProjects[0]) => {
    if (!project) return { 
      name: 'Custom AI Project', 
      valueProp: 'Streamline workflows and accelerate decision-making', 
      impact: 'High-impact' 
    };
    
    const purposeText = project.purpose || '';
    
    // Extract quantifiable impact
    const timeMatch = purposeText.match(/(\d+)\s*(hours?|hrs?|minutes?|mins?)/i);
    const percentMatch = purposeText.match(/(\d+)%/);
    
    let impact = 'High-impact automation';
    if (timeMatch) {
      const num = timeMatch[1];
      const unit = timeMatch[2].toLowerCase().includes('min') ? 'min' : 'hr';
      impact = `${num}${unit}/week saved`;
    } else if (percentMatch) {
      impact = `${percentMatch[0]} faster delivery`;
    }
    
    // Create complete value proposition - rewrite if too long
    let valueProp = purposeText.split(/[.!?]/)[0].trim();
    
    // If too long, extract core value
    if (valueProp.split(' ').length > 18) {
      // Look for key phrases
      if (valueProp.includes('transform') && valueProp.includes('into')) {
        const match = valueProp.match(/transform\s+([^.]+?)\s+into\s+([^.]+)/i);
        if (match) {
          valueProp = `Transform ${match[1]} into ${match[2]}`;
        }
      } else if (valueProp.includes('automat')) {
        valueProp = 'Automate ' + valueProp.split('automat')[1].split(/[,.]/)[ 0].trim();
      } else {
        // Take first complete clause
        valueProp = valueProp.split(',')[0].trim();
      }
    }
    
    return { name: project.name, valueProp, impact };
  };

  // Synthesize transformation opportunity - complete problem→solution statement
  const synthesizeOpportunity = (text: string) => {
    // Extract metric first
    const timeMatch = text.match(/(\d+)\s*(hours?|hrs?|minutes?|mins?)/i);
    const percentMatch = text.match(/(\d+)%/);
    const multiplierMatch = text.match(/(\d+)x/i);
    
    let outcome = 'Measurable efficiency gain';
    if (timeMatch) {
      outcome = `${timeMatch[1]}+ hours saved per week`;
    } else if (percentMatch) {
      outcome = `${percentMatch[0]} productivity increase`;
    } else if (multiplierMatch) {
      outcome = `${multiplierMatch[0]} faster execution`;
    }
    
    // Create complete opportunity statement
    let statement = text;
    
    // If starts with "automat", structure as action→benefit
    if (text.toLowerCase().includes('automat')) {
      const parts = text.split(/\s+to\s+/i);
      if (parts.length > 1) {
        statement = `${parts[0].trim()} to ${parts[1].split(/[.,]/)[0].trim()}`;
      }
    } 
    // If has "from...to", extract transformation
    else if (text.includes('from') && text.includes('to')) {
      const match = text.match(/from\s+([^.]+?)\s+to\s+([^.]+)/i);
      if (match) {
        statement = `Shift from ${match[1]} to ${match[2]}`;
      }
    }
    // Otherwise take first complete sentence
    else {
      statement = text.split(/[.!?]/)[0].trim();
    }
    
    // Ensure it's complete and under 25 words
    const words = statement.split(' ');
    if (words.length > 25) {
      statement = words.slice(0, 25).join(' ');
    }
    
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
            {/* Card 1: Your Working Style */}
            <CarouselItem className="pl-4">
              <Card className="shadow-xl border-2 border-primary/10 rounded-2xl bg-card min-h-[420px] flex flex-col transition-all duration-300 hover:shadow-2xl hover:-translate-y-1">
                <CardContent className="p-8 flex flex-col h-full">
                  <div className="space-y-6 flex-1 flex flex-col">
                    <div className="flex items-center justify-center">
                      <div className="p-3 bg-primary/10 rounded-xl">
                        <Brain className="h-12 w-12 text-primary" />
                      </div>
                    </div>
                    <h3 className="text-2xl font-bold text-center text-foreground">Your Working Style</h3>
                    <div className="space-y-4 flex-1">
                      {workingStyle.map((trait, idx) => (
                        <div key={idx} className="flex items-start gap-3 bg-muted/30 rounded-lg p-4">
                          <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-2" />
                          <p className="text-base text-foreground leading-relaxed">{trait}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </CarouselItem>

            {/* Card 2: Priority Focus */}
            <CarouselItem className="pl-4">
              <Card className="shadow-xl border-2 border-primary/10 rounded-2xl bg-card min-h-[420px] flex flex-col transition-all duration-300 hover:shadow-2xl hover:-translate-y-1">
                <CardContent className="p-8 flex flex-col h-full">
                  <div className="space-y-6 flex-1 flex flex-col">
                    <div className="flex items-center justify-center">
                      <div className="p-3 bg-primary/10 rounded-xl">
                        <Target className="h-12 w-12 text-primary" />
                      </div>
                    </div>
                    <h3 className="text-2xl font-bold text-center text-foreground">Priority Focus</h3>
                    <div className="space-y-6 flex-1 flex flex-col justify-center">
                      <div className="space-y-3 bg-muted/30 rounded-lg p-6">
                        <h4 className="text-xl font-bold text-foreground text-center">{priorityProject.name}</h4>
                        <p className="text-base text-muted-foreground leading-relaxed text-center">{priorityProject.valueProp}</p>
                      </div>
                      <div className="flex items-center justify-center gap-2 pt-2">
                        <Sparkles className="h-6 w-6 text-primary flex-shrink-0" />
                        <Badge variant="secondary" className="text-base font-semibold px-4 py-2">
                          {priorityProject.impact}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </CarouselItem>

            {/* Card 3: Transformation Opportunity */}
            <CarouselItem className="pl-4">
              <Card className="shadow-xl border-2 border-primary/10 rounded-2xl bg-card min-h-[420px] flex flex-col transition-all duration-300 hover:shadow-2xl hover:-translate-y-1">
                <CardContent className="p-8 flex flex-col h-full">
                  <div className="space-y-6 flex-1 flex flex-col">
                    <div className="flex items-center justify-center">
                      <div className="p-3 bg-primary/10 rounded-xl">
                        <TrendingUp className="h-12 w-12 text-primary" />
                      </div>
                    </div>
                    <h3 className="text-2xl font-bold text-center text-foreground">Transformation Opportunity</h3>
                    <div className="space-y-6 flex-1 flex flex-col justify-center">
                      <div className="space-y-4 bg-muted/30 rounded-lg p-6">
                        <p className="text-base text-foreground leading-relaxed text-center">{opportunity.statement}</p>
                        <div className="flex justify-center">
                          <Badge className="bg-primary text-primary-foreground text-base px-4 py-2">
                            {opportunity.outcome}
                          </Badge>
                        </div>
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
