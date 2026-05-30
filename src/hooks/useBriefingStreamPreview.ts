import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { FF } from '@/lib/flags';
import type { BriefingSegment } from '@/types/briefing';

export interface BriefingStreamPreview {
  segments: BriefingSegment[];
  ready: boolean; // true once script_text is set (curation finished)
}

/**
 * Flag-gated (FF.briefingStream, ?ff_stream=1). While a briefing is generating,
 * polls the user's in-progress briefing row and surfaces its preliminary
 * segments. The generate-briefing function early-inserts the candidate headlines
 * (script_text null) before curation runs, then updates with the polished
 * segments + script_text, so this lets the UI show the briefing assembling
 * instead of a blank wait. Pure read-only polling; no-op when the flag is off,
 * and it never touches the existing generate flow.
 */
export function useBriefingStreamPreview(active: boolean): BriefingStreamPreview | null {
  const { user } = useAuth();
  const [preview, setPreview] = useState<BriefingStreamPreview | null>(null);
  const startRef = useRef<string | null>(null);

  useEffect(() => {
    if (!active || !user?.id || !FF.briefingStream()) {
      setPreview(null);
      startRef.current = null;
      return;
    }
    // Only surface a briefing created during THIS generation (5s buffer),
    // so we never show a stale row from an earlier session.
    if (!startRef.current) startRef.current = new Date(Date.now() - 5000).toISOString();
    let stop = false;
    const poll = async () => {
      const { data, error } = await supabase
        .from('briefings')
        .select('id, script_text, segments, created_at')
        .eq('user_id', user.id)
        .gte('created_at', startRef.current as string)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (stop || error || !data) return;
      const segs = Array.isArray(data.segments) ? (data.segments as BriefingSegment[]) : [];
      if (segs.length) setPreview({ segments: segs, ready: Boolean(data.script_text) });
    };
    poll();
    const t = setInterval(poll, 2500);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, [active, user?.id]);

  return preview;
}
