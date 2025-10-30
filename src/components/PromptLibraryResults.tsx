import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Brain, Copy, CheckCircle, BookOpen, Rocket, Target, ArrowRight } from 'lucide-react';
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
    <div className="bg-background min-h-screen relative overflow-hidden py-8">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className="text-center mb-8 max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm mb-6">
            <Brain className="h-4 w-4" />
            Your Personal AI Command Center
          </div>
          
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4 leading-tight">
            Master Prompt Library
          </h1>
          
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
            Custom-built for {contactData.fullName}, {contactData.roleTitle} at {contactData.companyName}
          </p>
        </div>

        {/* Executive Profile Summary */}
        <Card className="mb-8 max-w-4xl mx-auto shadow-sm border rounded-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Your AI Leadership Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold text-foreground mb-2">How You Work</h3>
              <p className="text-muted-foreground leading-relaxed">{library.executiveProfile.summary}</p>
            </div>
            <div className="bg-primary/10 p-4 rounded-lg">
              <h3 className="font-semibold text-primary mb-2">Your AI Transformation Opportunity</h3>
              <p className="text-foreground leading-relaxed">{library.executiveProfile.transformationOpportunity}</p>
            </div>
          </CardContent>
        </Card>

        {/* Main Content Tabs */}
        <div className="max-w-6xl mx-auto">
          <Tabs defaultValue="projects" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-8">
              <TabsTrigger value="projects">AI Projects</TabsTrigger>
              <TabsTrigger value="templates">Prompt Templates</TabsTrigger>
              <TabsTrigger value="roadmap">Implementation</TabsTrigger>
            </TabsList>

            {/* AI Projects Tab */}
            <TabsContent value="projects" className="space-y-6">
              {library.recommendedProjects.map((project, idx) => (
                <Card key={idx} className="shadow-sm border rounded-xl">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-xl mb-2">{project.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">{project.purpose}</p>
                      </div>
                      <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                        Project {idx + 1}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* When to Use */}
                    <div>
                      <h4 className="font-semibold text-sm text-foreground mb-2">When to Use This</h4>
                      <p className="text-sm text-muted-foreground">{project.whenToUse}</p>
                    </div>

                    {/* Master Instructions */}
                    <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-sm text-foreground">Master Instructions</h4>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopy(project.masterInstructions, `${project.name} Instructions`)}
                          className="h-8"
                        >
                          {copiedItem === `${project.name} Instructions` ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                        {project.masterInstructions}
                      </p>
                    </div>

                    {/* Example Prompts */}
                    <div>
                      <h4 className="font-semibold text-sm text-foreground mb-3">Example Starter Prompts</h4>
                      <div className="space-y-2">
                        {project.examplePrompts.map((prompt, pIdx) => (
                          <div key={pIdx} className="flex items-start gap-2 p-3 bg-background border rounded-lg">
                            <ArrowRight className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-foreground flex-1">{prompt}</p>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCopy(prompt, `Example Prompt ${pIdx + 1}`)}
                              className="h-6 w-6 p-0"
                            >
                              <Copy className="h-3 w-3" />
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
                          <Badge key={mIdx} variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            ✓ {metric}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            {/* Prompt Templates Tab */}
            <TabsContent value="templates" className="space-y-4">
              {Object.entries(
                library.promptTemplates.reduce((acc, template) => {
                  if (!acc[template.category]) acc[template.category] = [];
                  acc[template.category].push(template);
                  return acc;
                }, {} as Record<string, typeof library.promptTemplates>)
              ).map(([category, templates]) => (
                <div key={category} className="space-y-3">
                  <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-primary" />
                    {category}
                  </h3>
                  <div className="grid gap-3">
                    {templates.map((template, idx) => (
                      <Card key={idx} className="shadow-sm border rounded-xl">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <h4 className="font-semibold text-foreground mb-2">{template.name}</h4>
                              <p className="text-sm text-muted-foreground leading-relaxed">{template.prompt}</p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCopy(template.prompt, template.name)}
                              className="flex-shrink-0"
                            >
                              {copiedItem === template.name ? (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </TabsContent>

            {/* Implementation Roadmap Tab */}
            <TabsContent value="roadmap" className="space-y-6">
              <Card className="shadow-sm border rounded-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Rocket className="h-5 w-5 text-primary" />
                    Your Implementation Roadmap
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
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
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};