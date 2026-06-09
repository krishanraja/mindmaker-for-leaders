import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { enrichCompanyContext } from '@/utils/enrichCompanyContext';
import { Zap, Upload, Link2, Calendar, Loader2, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ConnectContextUpgradeProps {
  assessmentId: string;
  leaderId: string;
  companyName: string;
  onEnrichmentComplete?: (contextId: string) => void;
}

export const ConnectContextUpgrade: React.FC<ConnectContextUpgradeProps> = ({
  assessmentId,
  leaderId,
  companyName,
  onEnrichmentComplete,
}) => {
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [boardDecks, setBoardDecks] = useState<File[]>([]);
  const [isEnriching, setIsEnriching] = useState(false);
  const [enrichmentStatus, setEnrichmentStatus] = useState<'idle' | 'enriching' | 'complete'>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setBoardDecks(prev => [...prev, ...files]);
  };

  const handleRemoveFile = (index: number) => {
    setBoardDecks(prev => prev.filter((_, i) => i !== index));
  };

  const handleUploadDecks = async () => {
    if (boardDecks.length === 0) return [];

    const uploadedUrls: string[] = [];
    
    for (const file of boardDecks) {
      try {
        // Upload to Supabase storage (assuming a bucket exists)
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `board-decks/${leaderId}/${fileName}`;

        const { data, error } = await supabase.storage
          .from('documents')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (error) {
          console.error('Error uploading file:', error);
          toast({
            title: 'Upload Error',
            description: `Failed to upload ${file.name}`,
            variant: 'destructive',
          });
          continue;
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('documents')
          .getPublicUrl(filePath);

        if (urlData?.publicUrl) {
          uploadedUrls.push(urlData.publicUrl);
        }
      } catch (error) {
        console.error('Error uploading file:', error);
      }
    }

    return uploadedUrls;
  };

  const handleEnrich = async () => {
    setIsEnriching(true);
    setEnrichmentStatus('enriching');

    try {
      // Upload board decks if any
      let deckUrls: string[] = [];
      if (boardDecks.length > 0) {
        deckUrls = await handleUploadDecks();
      }

      // Call enrichment function
      const result = await enrichCompanyContext({
        company_name: companyName,
        leader_id: leaderId,
        assessment_id: assessmentId,
        website_url: websiteUrl || undefined,
        board_deck_urls: deckUrls.length > 0 ? deckUrls : undefined,
      });

      if (result.success && result.context_id) {
        setEnrichmentStatus('complete');
        toast({
          title: 'Context Enriched!',
          description: 'Your company context has been successfully enriched.',
        });
        
        if (onEnrichmentComplete) {
          onEnrichmentComplete(result.context_id);
        }
      } else {
        throw new Error(result.error || 'Failed to enrich context');
      }
    } catch (error: any) {
      console.error('Error enriching context:', error);
      toast({
        title: 'Enrichment Failed',
        description: error.message || 'Failed to enrich company context. Please try again.',
        variant: 'destructive',
      });
      setEnrichmentStatus('idle');
    } finally {
      setIsEnriching(false);
    }
  };

  if (enrichmentStatus === 'complete') {
    return (
      <Card className="border-primary/50 bg-primary/5">
        <CardContent className="p-6 text-center">
          <CheckCircle2 className="h-12 w-12 text-primary mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Context Enriched!</h3>
          <p className="text-sm text-muted-foreground">
            Your company context has been successfully enriched and will enhance your meeting prep materials.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/50 bg-gradient-to-br from-primary/10 to-background">
      <CardHeader>
        <div className="flex items-center gap-2 mb-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <Zap className="h-5 w-5 text-primary" />
          </div>
          <CardTitle className="text-xl">Connect Your Context</CardTitle>
        </div>
        <CardDescription>
          Enrich your diagnostic with company-specific intelligence for personalized insights and meeting prep
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Website URL Input */}
        <div className="space-y-2">
          <Label htmlFor="website-url" className="flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            Company Website (Optional)
          </Label>
          <Input
            id="website-url"
            type="url"
            placeholder="https://yourcompany.com"
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
            disabled={isEnriching}
          />
          <p className="text-xs text-muted-foreground">
            We'll extract key information from your website automatically
          </p>
        </div>

        {/* Board Deck Upload */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Board Decks (Optional)
          </Label>
          <div className="space-y-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isEnriching}
              className="w-full"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload PDFs
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            
            {boardDecks.length > 0 && (
              <div className="space-y-1">
                {boardDecks.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-muted rounded text-sm"
                  >
                    <span className="truncate flex-1">{file.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveFile(index)}
                      disabled={isEnriching}
                      className="h-6 w-6 p-0"
                    >
                      ×
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Upload recent board decks to extract strategic context
          </p>
        </div>

        {/* Calendar Connect (Future) */}
        <div className="space-y-2 opacity-50">
          <Label className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Calendar Integration (Coming Soon)
          </Label>
          <Button
            type="button"
            variant="outline"
            disabled
            className="w-full"
          >
            Connect Calendar
          </Button>
          <p className="text-xs text-muted-foreground">
            Automatically pull meeting agendas and context
          </p>
        </div>

        {/* Enrich Button */}
        <Button
          onClick={handleEnrich}
          disabled={isEnriching || (!websiteUrl && boardDecks.length === 0)}
          className="w-full gap-2"
          size="lg"
        >
          {isEnriching ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Enriching Context...
            </>
          ) : (
            <>
              <Zap className="h-4 w-4" />
              Enrich My Context
            </>
          )}
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          This will enhance your meeting prep materials with company-specific insights
        </p>
      </CardContent>
    </Card>
  );
};
