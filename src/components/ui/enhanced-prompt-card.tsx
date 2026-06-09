import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Copy, CheckCircle, Lock, ChevronDown, ChevronUp, Crown, Brain } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface EnhancedPromptCardProps {
  title: string;
  whatItsFor: string;
  whenToUse: string;
  howToUse: string;
  prompts: string[];
  isLocked?: boolean;
}

export const EnhancedPromptCard = React.memo<EnhancedPromptCardProps>(({
  title,
  whatItsFor,
  whenToUse,
  howToUse,
  prompts,
  isLocked = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const { toast } = useToast();

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    toast({
      title: 'Copied!',
      description: 'Prompt copied to clipboard',
    });
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <Card className="border-2 border-primary/20 hover:border-primary/40 hover:shadow-lg transition-all relative bg-gradient-to-br from-primary/5 to-background">
      {isLocked && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm rounded-lg z-10 flex items-center justify-center">
          <div className="text-center space-y-2">
            <Lock className="h-8 w-8 mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground font-medium">
              Unlock Full Library
            </p>
          </div>
        </div>
      )}

      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader>
          <CollapsibleTrigger asChild>
            <div className="cursor-pointer space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">YOUR MASTER AI COMMAND PROMPT</CardTitle>
                </div>
                {isOpen ? (
                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <CardDescription className="text-xs">
                <span className="font-semibold">{title}</span> · Copy once. Use everywhere. Personalized for you.
              </CardDescription>
            </div>
          </CollapsibleTrigger>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex items-start gap-2 p-3 bg-primary/10 rounded-lg border border-primary/20">
            <Brain className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
            <p className="text-xs leading-relaxed">{whatItsFor}</p>
          </div>

          <CollapsibleContent>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Badge variant="outline" className="mb-2">When to use this</Badge>
                <p className="text-sm text-muted-foreground">{whenToUse}</p>
              </div>

              <div className="space-y-2">
                <Badge variant="outline" className="mb-2">How to use this</Badge>
                <p className="text-sm text-muted-foreground">{howToUse}</p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Badge className="bg-primary/10 text-primary hover:bg-primary/20">
                    Your Command Prompts (Copy-Paste Ready)
                  </Badge>
                </div>
                <div className="space-y-3">
                  {prompts.map((prompt, index) => (
                    <div key={index} className="relative group">
                      <div className="p-4 bg-muted rounded-lg border-2 border-border hover:border-primary/30 transition-colors">
                        <p className="text-sm font-mono leading-relaxed pr-8">
                          {prompt}
                        </p>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="absolute top-2 right-2 h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleCopy(prompt, index)}
                        >
                          {copiedIndex === index ? (
                            <CheckCircle className="h-4 w-4 text-primary" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg text-xs text-muted-foreground">
                  <div className="space-y-1">
                    <p>✓ Works with ChatGPT, Claude, Gemini, or any AI assistant</p>
                    <p>✓ No modifications needed - use as-is</p>
                    <p>✓ Update quarterly as your priorities change</p>
                  </div>
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </CardContent>
      </Collapsible>
    </Card>
  );
});

EnhancedPromptCard.displayName = 'EnhancedPromptCard';
