import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ParticipantData {
  readiness_score: number;
  dimension_scores: Record<string, number>;
  industry?: string;
  company_size?: string;
  role?: string;
  tier?: string;
  consent_flags: {
    index_publication: boolean;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { quarter, dryRun = false } = await req.json();

    if (!quarter) {
      throw new Error('Quarter is required (format: Q1-2024)');
    }

    console.log(`📊 Generating index for ${quarter}${dryRun ? ' (dry run)' : ''}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch consented participant data
    const { data: participants, error: fetchError } = await supabase
      .from('index_participant_data')
      .select('*')
      .eq('consent_flags->index_publication', true);

    if (fetchError) throw fetchError;

    if (!participants || participants.length < 30) {
      throw new Error(`Insufficient sample size: ${participants?.length || 0} (minimum 30 required)`);
    }

    console.log(`✅ Found ${participants.length} consented participants`);

    // Calculate aggregate statistics
    const scores = participants.map((p: ParticipantData) => p.readiness_score);
    const avgScore = scores.reduce((a: number, b: number) => a + b, 0) / scores.length;
    const sortedScores = [...scores].sort((a: number, b: number) => a - b);
    const medianScore = sortedScores[Math.floor(sortedScores.length / 2)];

    // Bootstrap confidence intervals
    const bootstrapIterations = 1000;
    const bootstrapMeans: number[] = [];
    
    for (let i = 0; i < bootstrapIterations; i++) {
      const sample = Array.from({ length: scores.length }, () => 
        scores[Math.floor(Math.random() * scores.length)]
      );
      const mean = sample.reduce((a, b) => a + b, 0) / sample.length;
      bootstrapMeans.push(mean);
    }

    bootstrapMeans.sort((a, b) => a - b);
    const ciLower = bootstrapMeans[Math.floor(bootstrapMeans.length * 0.025)];
    const ciUpper = bootstrapMeans[Math.floor(bootstrapMeans.length * 0.975)];

    // Calculate tier distribution
    const tierCounts = participants.reduce((acc: Record<string, number>, p: ParticipantData) => {
      const tier = p.tier || 'emerging';
      acc[tier] = (acc[tier] || 0) + 1;
      return acc;
    }, {});

    const totalCount = participants.length;
    const tierPercentages = {
      tier_emerging_pct: ((tierCounts['emerging'] || 0) / totalCount) * 100,
      tier_establishing_pct: ((tierCounts['establishing'] || 0) / totalCount) * 100,
      tier_advancing_pct: ((tierCounts['advancing'] || 0) / totalCount) * 100,
      tier_leading_pct: ((tierCounts['leading'] || 0) / totalCount) * 100,
    };

    // Calculate segment benchmarks
    const calculateSegmentBenchmarks = (field: keyof ParticipantData) => {
      const segments: Record<string, number[]> = {};
      
      participants.forEach((p: ParticipantData) => {
        const segment = p[field] as string;
        if (segment) {
          if (!segments[segment]) segments[segment] = [];
          segments[segment].push(p.readiness_score);
        }
      });

      return Object.fromEntries(
        Object.entries(segments)
          .filter(([_, scores]) => scores.length >= 10)
          .map(([segment, scores]) => [
            segment,
            {
              avg_score: scores.reduce((a, b) => a + b, 0) / scores.length,
              count: scores.length,
            },
          ])
      );
    };

    const industryBenchmarks = calculateSegmentBenchmarks('industry');
    const companySizeBenchmarks = calculateSegmentBenchmarks('company_size');
    const roleBenchmarks = calculateSegmentBenchmarks('role');

    // Calculate dimension benchmarks
    const dimensionBenchmarks: Record<string, number> = {};
    const allDimensions = new Set<string>();
    
    participants.forEach((p: ParticipantData) => {
      Object.keys(p.dimension_scores || {}).forEach(dim => allDimensions.add(dim));
    });

    allDimensions.forEach(dimension => {
      const dimScores = participants
        .map((p: ParticipantData) => p.dimension_scores?.[dimension])
        .filter((s): s is number => typeof s === 'number');
      
      if (dimScores.length > 0) {
        dimensionBenchmarks[dimension] = dimScores.reduce((a, b) => a + b, 0) / dimScores.length;
      }
    });

    const consentRate = (participants.length / totalCount) * 100;

    const snapshot = {
      quarter,
      total_assessments: totalCount,
      effective_sample_size: totalCount,
      consent_rate: consentRate,
      avg_readiness_score: avgScore,
      avg_readiness_score_ci_lower: ciLower,
      avg_readiness_score_ci_upper: ciUpper,
      median_readiness_score: medianScore,
      ...tierPercentages,
      industry_benchmarks: industryBenchmarks,
      company_size_benchmarks: companySizeBenchmarks,
      role_benchmarks: roleBenchmarks,
      dimension_benchmarks: dimensionBenchmarks,
      methodology_version: '1.0',
      metadata: {
        generated_at: new Date().toISOString(),
        bootstrap_iterations: bootstrapIterations,
        min_segment_size: 10,
      },
    };

    console.log('📈 Index snapshot calculated:', {
      quarter,
      participants: totalCount,
      avgScore: avgScore.toFixed(2),
      ci: `[${ciLower.toFixed(2)}, ${ciUpper.toFixed(2)}]`,
    });

    if (dryRun) {
      return new Response(
        JSON.stringify({ success: true, snapshot, dryRun: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Save to database
    const { data: savedSnapshot, error: saveError } = await supabase
      .from('ai_leadership_index_snapshots')
      .insert(snapshot)
      .select()
      .single();

    if (saveError) throw saveError;

    console.log('✅ Index snapshot published successfully');

    return new Response(
      JSON.stringify({ success: true, snapshot: savedSnapshot }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error generating index:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
