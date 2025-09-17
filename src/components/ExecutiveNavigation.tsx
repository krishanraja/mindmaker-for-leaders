import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Brain, ArrowLeft } from "lucide-react";

interface ExecutiveNavigationProps {
  onBack?: () => void;
  showBack?: boolean;
  title?: string;
}

export function ExecutiveNavigation({ onBack, showBack = false, title }: ExecutiveNavigationProps) {
  return (
    <nav className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container-width">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            {showBack && onBack && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onBack}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            )}
            
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 bg-primary rounded-lg">
                <Brain className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="font-display text-lg font-bold">MindMaker</h1>
                {title && (
                  <p className="text-sm text-muted-foreground -mt-1">{title}</p>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
          </div>
        </div>
      </div>
    </nav>
  );
}