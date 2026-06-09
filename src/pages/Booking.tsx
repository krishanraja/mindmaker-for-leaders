import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Calendar,
  MessageSquare,
  Star,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';

const SOURCE_MESSAGES: Record<string, { title: string; subtitle: string }> = {
  'mission-help': {
    title: 'Get Unstuck',
    subtitle:
      "You've been working on your mission. Let's troubleshoot what's blocking you.",
  },
  'high-performer': {
    title: 'Accelerate Your Growth',
    subtitle:
      "Your scores show you're in the top tier. Let's discuss how to leverage that.",
  },
  'assessment-debrief': {
    title: 'Assessment Debrief',
    subtitle: 'Walk through your results with an AI leadership advisor.',
  },
  default: {
    title: 'Book a Strategy Call',
    subtitle: '15 minutes with an AI leadership advisor. No pitch, just value.',
  },
};

export default function Booking() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const source = searchParams.get('source') || 'default';
  const email = searchParams.get('email') || user?.email || '';

  const messaging = SOURCE_MESSAGES[source] || SOURCE_MESSAGES.default;

  // Calendly URL with prefilled fields
  const calendlyUrl = `https://calendly.com/mindmaker-ai/15min?email=${encodeURIComponent(email)}&a1=${encodeURIComponent(source)}`;

  return (
    <div className="h-screen-safe overflow-hidden flex flex-col bg-background">
      <header className="flex-shrink-0 flex items-center gap-4 px-4 py-4 border-b border-border">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="-ml-2">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-lg font-semibold text-foreground">{messaging.title}</h1>
          <p className="text-xs text-muted-foreground">{messaging.subtitle}</p>
        </div>
      </header>

      <main className="flex-1 min-h-0 overflow-y-auto scrollbar-hide p-4">
        <div className="max-w-2xl mx-auto">

      {/* What to expect */}
      <Card className="border rounded-xl mt-4">
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Star className="h-4 w-4 text-primary" />
            What to expect
          </h3>
          <div className="space-y-3">
            {[
              {
                icon: Clock,
                text: '15 minutes, no longer',
              },
              {
                icon: MessageSquare,
                text: 'Focused on YOUR specific AI leadership challenge',
              },
              {
                icon: CheckCircle2,
                text: 'Walk away with one concrete action',
              },
            ].map((item, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <item.icon className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <p className="text-sm text-foreground">{item.text}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Calendly embed area */}
      <Card className="border rounded-xl mt-4 overflow-hidden">
        <CardContent className="p-0">
          <div className="bg-gradient-to-br from-primary/5 to-transparent p-6 text-center">
            <Calendar className="h-10 w-10 text-primary mx-auto mb-3" />
            <h3 className="text-base font-semibold text-foreground mb-2">
              Pick a time that works
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Available times shown below
            </p>
            <a
              href={calendlyUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button className="w-full sm:w-auto">
                <Calendar className="h-4 w-4 mr-2" />
                Open Scheduling Page
              </Button>
            </a>
            <p className="text-xs text-muted-foreground mt-3">
              Opens Calendly in a new tab
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Source badge */}
      {source !== 'default' && (
        <div className="mt-4 flex justify-center">
          <Badge variant="outline" className="text-xs text-muted-foreground">
            Source: {source}
          </Badge>
        </div>
      )}
        </div>
      </main>
    </div>
  );
}
