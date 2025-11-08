export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      adoption_momentum: {
        Row: {
          company_identifier_hash: string
          company_size: string | null
          created_at: string | null
          days_between_first_last: number | null
          first_assessment_date: string | null
          id: string
          industry: string | null
          latest_assessment_date: string | null
          metadata: Json | null
          momentum_score: number | null
          momentum_tier: Database["public"]["Enums"]["momentum_tier"] | null
          recency_decay: number | null
          referral_quality_score: number | null
          referred_companies: number | null
          repeat_rate_capped: number | null
          team_growth_sqrt: number | null
          total_advisory_sprints: number | null
          total_assessments: number | null
          total_unique_users: number | null
          total_workshop_bookings: number | null
          updated_at: string | null
          verified_referrals: number | null
        }
        Insert: {
          company_identifier_hash: string
          company_size?: string | null
          created_at?: string | null
          days_between_first_last?: number | null
          first_assessment_date?: string | null
          id?: string
          industry?: string | null
          latest_assessment_date?: string | null
          metadata?: Json | null
          momentum_score?: number | null
          momentum_tier?: Database["public"]["Enums"]["momentum_tier"] | null
          recency_decay?: number | null
          referral_quality_score?: number | null
          referred_companies?: number | null
          repeat_rate_capped?: number | null
          team_growth_sqrt?: number | null
          total_advisory_sprints?: number | null
          total_assessments?: number | null
          total_unique_users?: number | null
          total_workshop_bookings?: number | null
          updated_at?: string | null
          verified_referrals?: number | null
        }
        Update: {
          company_identifier_hash?: string
          company_size?: string | null
          created_at?: string | null
          days_between_first_last?: number | null
          first_assessment_date?: string | null
          id?: string
          industry?: string | null
          latest_assessment_date?: string | null
          metadata?: Json | null
          momentum_score?: number | null
          momentum_tier?: Database["public"]["Enums"]["momentum_tier"] | null
          recency_decay?: number | null
          referral_quality_score?: number | null
          referred_companies?: number | null
          repeat_rate_capped?: number | null
          team_growth_sqrt?: number | null
          total_advisory_sprints?: number | null
          total_assessments?: number | null
          total_unique_users?: number | null
          total_workshop_bookings?: number | null
          updated_at?: string | null
          verified_referrals?: number | null
        }
        Relationships: []
      }
      ai_conversations: {
        Row: {
          business_context: Json | null
          created_at: string
          id: string
          insights_generated: string[] | null
          question: string
          response: string
          session_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          business_context?: Json | null
          created_at?: string
          id?: string
          insights_generated?: string[] | null
          question: string
          response: string
          session_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          business_context?: Json | null
          created_at?: string
          id?: string
          insights_generated?: string[] | null
          question?: string
          response?: string
          session_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      ai_insights_generated: {
        Row: {
          business_context: Json | null
          created_at: string
          id: string
          insight_content: string
          insight_type: string
          relevance_score: number | null
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          business_context?: Json | null
          created_at?: string
          id?: string
          insight_content: string
          insight_type: string
          relevance_score?: number | null
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          business_context?: Json | null
          created_at?: string
          id?: string
          insight_content?: string
          insight_type?: string
          relevance_score?: number | null
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_insights_generated_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "conversation_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_leadership_index_snapshots: {
        Row: {
          avg_readiness_score: number | null
          avg_readiness_score_ci_lower: number | null
          avg_readiness_score_ci_upper: number | null
          company_size_benchmarks: Json | null
          consent_rate: number | null
          created_at: string | null
          dimension_benchmarks: Json | null
          effective_sample_size: number | null
          id: string
          industry_benchmarks: Json | null
          median_readiness_score: number | null
          metadata: Json | null
          methodology_version: string | null
          published_at: string | null
          qoq_change: number | null
          qoq_change_significant: boolean | null
          quarter: string
          role_benchmarks: Json | null
          tier_advancing_pct: number | null
          tier_emerging_pct: number | null
          tier_establishing_pct: number | null
          tier_leading_pct: number | null
          total_assessments: number | null
        }
        Insert: {
          avg_readiness_score?: number | null
          avg_readiness_score_ci_lower?: number | null
          avg_readiness_score_ci_upper?: number | null
          company_size_benchmarks?: Json | null
          consent_rate?: number | null
          created_at?: string | null
          dimension_benchmarks?: Json | null
          effective_sample_size?: number | null
          id?: string
          industry_benchmarks?: Json | null
          median_readiness_score?: number | null
          metadata?: Json | null
          methodology_version?: string | null
          published_at?: string | null
          qoq_change?: number | null
          qoq_change_significant?: boolean | null
          quarter: string
          role_benchmarks?: Json | null
          tier_advancing_pct?: number | null
          tier_emerging_pct?: number | null
          tier_establishing_pct?: number | null
          tier_leading_pct?: number | null
          total_assessments?: number | null
        }
        Update: {
          avg_readiness_score?: number | null
          avg_readiness_score_ci_lower?: number | null
          avg_readiness_score_ci_upper?: number | null
          company_size_benchmarks?: Json | null
          consent_rate?: number | null
          created_at?: string | null
          dimension_benchmarks?: Json | null
          effective_sample_size?: number | null
          id?: string
          industry_benchmarks?: Json | null
          median_readiness_score?: number | null
          metadata?: Json | null
          methodology_version?: string | null
          published_at?: string | null
          qoq_change?: number | null
          qoq_change_significant?: boolean | null
          quarter?: string
          role_benchmarks?: Json | null
          tier_advancing_pct?: number | null
          tier_emerging_pct?: number | null
          tier_establishing_pct?: number | null
          tier_leading_pct?: number | null
          total_assessments?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_leadership_index_snapshots_methodology_version_fkey"
            columns: ["methodology_version"]
            isOneToOne: false
            referencedRelation: "index_publication_rules"
            referencedColumns: ["version"]
          },
        ]
      }
      ai_literacy_modules: {
        Row: {
          category: string
          challenges: string[]
          created_at: string | null
          credits: number
          description: string
          icon: string
          id: string
          learning_styles: string[]
          prerequisites: string[] | null
          target_audience: string[]
          team_sizes: string[]
          tier: string
          title: string
          updated_at: string | null
          urgency: string[]
        }
        Insert: {
          category: string
          challenges?: string[]
          created_at?: string | null
          credits: number
          description: string
          icon: string
          id: string
          learning_styles?: string[]
          prerequisites?: string[] | null
          target_audience?: string[]
          team_sizes?: string[]
          tier: string
          title: string
          updated_at?: string | null
          urgency?: string[]
        }
        Update: {
          category?: string
          challenges?: string[]
          created_at?: string | null
          credits?: number
          description?: string
          icon?: string
          id?: string
          learning_styles?: string[]
          prerequisites?: string[] | null
          target_audience?: string[]
          team_sizes?: string[]
          tier?: string
          title?: string
          updated_at?: string | null
          urgency?: string[]
        }
        Relationships: []
      }
      booking_requests: {
        Row: {
          company_name: string | null
          contact_email: string
          contact_name: string
          created_at: string
          id: string
          lead_score: number | null
          notes: string | null
          phone: string | null
          preferred_time: string | null
          priority: string | null
          role: string | null
          scheduled_date: string | null
          service_title: string
          service_type: string
          session_id: string | null
          specific_needs: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          company_name?: string | null
          contact_email: string
          contact_name: string
          created_at?: string
          id?: string
          lead_score?: number | null
          notes?: string | null
          phone?: string | null
          preferred_time?: string | null
          priority?: string | null
          role?: string | null
          scheduled_date?: string | null
          service_title: string
          service_type: string
          session_id?: string | null
          specific_needs?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          company_name?: string | null
          contact_email?: string
          contact_name?: string
          created_at?: string
          id?: string
          lead_score?: number | null
          notes?: string | null
          phone?: string | null
          preferred_time?: string | null
          priority?: string | null
          role?: string | null
          scheduled_date?: string | null
          service_title?: string
          service_type?: string
          session_id?: string | null
          specific_needs?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_requests_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "conversation_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      bootcamp_plans: {
        Row: {
          agenda_config: Json | null
          booked_at: string | null
          calendly_booking_url: string | null
          cognitive_baseline: Json | null
          created_at: string
          id: string
          intake_id: string | null
          required_prework: Json | null
          simulation_1_id: string
          simulation_1_snapshot: Json | null
          simulation_2_id: string
          simulation_2_snapshot: Json | null
          status: string
        }
        Insert: {
          agenda_config?: Json | null
          booked_at?: string | null
          calendly_booking_url?: string | null
          cognitive_baseline?: Json | null
          created_at?: string
          id?: string
          intake_id?: string | null
          required_prework?: Json | null
          simulation_1_id: string
          simulation_1_snapshot?: Json | null
          simulation_2_id: string
          simulation_2_snapshot?: Json | null
          status?: string
        }
        Update: {
          agenda_config?: Json | null
          booked_at?: string | null
          calendly_booking_url?: string | null
          cognitive_baseline?: Json | null
          created_at?: string
          id?: string
          intake_id?: string | null
          required_prework?: Json | null
          simulation_1_id?: string
          simulation_1_snapshot?: Json | null
          simulation_2_id?: string
          simulation_2_snapshot?: Json | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "bootcamp_plans_intake_id_fkey"
            columns: ["intake_id"]
            isOneToOne: false
            referencedRelation: "exec_intakes"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          insights: Json | null
          message_type: string
          metadata: Json | null
          role: string | null
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          insights?: Json | null
          message_type: string
          metadata?: Json | null
          role?: string | null
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          insights?: Json | null
          message_type?: string
          metadata?: Json | null
          role?: string | null
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "conversation_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      company_identifier_salt: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          rotated_at: string | null
          salt_value: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          rotated_at?: string | null
          salt_value: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          rotated_at?: string | null
          salt_value?: string
        }
        Relationships: []
      }
      consent_audit: {
        Row: {
          changed_at: string | null
          changed_by: string | null
          consent_purpose: Database["public"]["Enums"]["consent_purpose"]
          id: string
          ip_address: unknown
          new_value: boolean
          participant_id: string | null
          previous_value: boolean | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          changed_at?: string | null
          changed_by?: string | null
          consent_purpose: Database["public"]["Enums"]["consent_purpose"]
          id?: string
          ip_address?: unknown
          new_value: boolean
          participant_id?: string | null
          previous_value?: boolean | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          changed_at?: string | null
          changed_by?: string | null
          consent_purpose?: Database["public"]["Enums"]["consent_purpose"]
          id?: string
          ip_address?: unknown
          new_value?: boolean
          participant_id?: string | null
          previous_value?: boolean | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consent_audit_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "index_participant_data"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_sessions: {
        Row: {
          business_context: Json | null
          completed_at: string | null
          id: string
          last_activity: string
          lead_qualification_score: number | null
          session_summary: string | null
          session_title: string | null
          started_at: string
          status: string | null
          user_id: string | null
        }
        Insert: {
          business_context?: Json | null
          completed_at?: string | null
          id?: string
          last_activity?: string
          lead_qualification_score?: number | null
          session_summary?: string | null
          session_title?: string | null
          started_at?: string
          status?: string | null
          user_id?: string | null
        }
        Update: {
          business_context?: Json | null
          completed_at?: string | null
          id?: string
          last_activity?: string
          lead_qualification_score?: number | null
          session_summary?: string | null
          session_title?: string | null
          started_at?: string
          status?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      conversion_analytics: {
        Row: {
          conversion_metadata: Json | null
          conversion_type: string
          conversion_value: number | null
          created_at: string
          id: string
          insights_generated: number | null
          lead_score: number | null
          messages_exchanged: number | null
          service_type: string | null
          session_duration: number | null
          session_id: string | null
          source_channel: string | null
          topics_explored: number | null
          user_id: string | null
        }
        Insert: {
          conversion_metadata?: Json | null
          conversion_type: string
          conversion_value?: number | null
          created_at?: string
          id?: string
          insights_generated?: number | null
          lead_score?: number | null
          messages_exchanged?: number | null
          service_type?: string | null
          session_duration?: number | null
          session_id?: string | null
          source_channel?: string | null
          topics_explored?: number | null
          user_id?: string | null
        }
        Update: {
          conversion_metadata?: Json | null
          conversion_type?: string
          conversion_value?: number | null
          created_at?: string
          id?: string
          insights_generated?: number | null
          lead_score?: number | null
          messages_exchanged?: number | null
          service_type?: string | null
          session_duration?: number | null
          session_id?: string | null
          source_channel?: string | null
          topics_explored?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversion_analytics_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "conversation_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      engagement_analytics: {
        Row: {
          event_data: Json | null
          event_type: string
          id: string
          session_id: string | null
          timestamp: string | null
          user_id: string | null
        }
        Insert: {
          event_data?: Json | null
          event_type: string
          id?: string
          session_id?: string | null
          timestamp?: string | null
          user_id?: string | null
        }
        Update: {
          event_data?: Json | null
          event_type?: string
          id?: string
          session_id?: string | null
          timestamp?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "engagement_analytics_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "conversation_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engagement_analytics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      exec_intakes: {
        Row: {
          anticipated_bottlenecks: Json | null
          company_name: string
          created_at: string
          id: string
          industry: string | null
          organizer_email: string
          organizer_name: string
          participants: Json | null
          preferred_dates: Json | null
          scheduling_notes: string | null
          strategic_objectives_2026: string | null
          updated_at: string
        }
        Insert: {
          anticipated_bottlenecks?: Json | null
          company_name: string
          created_at?: string
          id?: string
          industry?: string | null
          organizer_email: string
          organizer_name: string
          participants?: Json | null
          preferred_dates?: Json | null
          scheduling_notes?: string | null
          strategic_objectives_2026?: string | null
          updated_at?: string
        }
        Update: {
          anticipated_bottlenecks?: Json | null
          company_name?: string
          created_at?: string
          id?: string
          industry?: string | null
          organizer_email?: string
          organizer_name?: string
          participants?: Json | null
          preferred_dates?: Json | null
          scheduling_notes?: string | null
          strategic_objectives_2026?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      exec_pulses: {
        Row: {
          application_score: number | null
          awareness_score: number | null
          completed_at: string | null
          created_at: string
          governance_score: number | null
          id: string
          intake_id: string | null
          participant_email: string
          participant_name: string
          participant_role: string
          pulse_responses: Json | null
          trust_score: number | null
        }
        Insert: {
          application_score?: number | null
          awareness_score?: number | null
          completed_at?: string | null
          created_at?: string
          governance_score?: number | null
          id?: string
          intake_id?: string | null
          participant_email: string
          participant_name: string
          participant_role: string
          pulse_responses?: Json | null
          trust_score?: number | null
        }
        Update: {
          application_score?: number | null
          awareness_score?: number | null
          completed_at?: string | null
          created_at?: string
          governance_score?: number | null
          id?: string
          intake_id?: string | null
          participant_email?: string
          participant_name?: string
          participant_role?: string
          pulse_responses?: Json | null
          trust_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "exec_pulses_intake_id_fkey"
            columns: ["intake_id"]
            isOneToOne: false
            referencedRelation: "exec_intakes"
            referencedColumns: ["id"]
          },
        ]
      }
      google_sheets_sync_log: {
        Row: {
          created_at: string
          data_count: number | null
          error_message: string | null
          id: string
          last_updated_at: string | null
          lead_id: string | null
          sheet_row_id: string | null
          status: string
          sync_data: Json | null
          sync_metadata: Json | null
          sync_type: string
          synced_at: string | null
        }
        Insert: {
          created_at?: string
          data_count?: number | null
          error_message?: string | null
          id?: string
          last_updated_at?: string | null
          lead_id?: string | null
          sheet_row_id?: string | null
          status?: string
          sync_data?: Json | null
          sync_metadata?: Json | null
          sync_type: string
          synced_at?: string | null
        }
        Update: {
          created_at?: string
          data_count?: number | null
          error_message?: string | null
          id?: string
          last_updated_at?: string | null
          lead_id?: string | null
          sheet_row_id?: string | null
          status?: string
          sync_data?: Json | null
          sync_metadata?: Json | null
          sync_type?: string
          synced_at?: string | null
        }
        Relationships: []
      }
      index_participant_data: {
        Row: {
          assessment_type: string | null
          company_identifier_hash: string | null
          company_size: string | null
          completed_at: string
          confidence_weight: number | null
          consent_flags: Json | null
          consent_updated_at: string | null
          created_at: string | null
          dimension_scores: Json | null
          effective_sample_contribution: number | null
          id: string
          industry: string | null
          readiness_score: number | null
          role_title: string | null
          session_id: string | null
          tier: string | null
          user_id: string | null
        }
        Insert: {
          assessment_type?: string | null
          company_identifier_hash?: string | null
          company_size?: string | null
          completed_at: string
          confidence_weight?: number | null
          consent_flags?: Json | null
          consent_updated_at?: string | null
          created_at?: string | null
          dimension_scores?: Json | null
          effective_sample_contribution?: number | null
          id?: string
          industry?: string | null
          readiness_score?: number | null
          role_title?: string | null
          session_id?: string | null
          tier?: string | null
          user_id?: string | null
        }
        Update: {
          assessment_type?: string | null
          company_identifier_hash?: string | null
          company_size?: string | null
          completed_at?: string
          confidence_weight?: number | null
          consent_flags?: Json | null
          consent_updated_at?: string | null
          created_at?: string | null
          dimension_scores?: Json | null
          effective_sample_contribution?: number | null
          id?: string
          industry?: string | null
          readiness_score?: number | null
          role_title?: string | null
          session_id?: string | null
          tier?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "index_participant_data_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "conversation_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      index_publication_rules: {
        Row: {
          bootstrap_iterations: number | null
          changelog: string | null
          confidence_level: number | null
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          methodology_url: string | null
          min_effective_sample_size: number | null
          min_segment_size: number | null
          outlier_method: string | null
          outlier_threshold: number | null
          percentile_rounding: number | null
          published_at: string | null
          version: string
        }
        Insert: {
          bootstrap_iterations?: number | null
          changelog?: string | null
          confidence_level?: number | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          methodology_url?: string | null
          min_effective_sample_size?: number | null
          min_segment_size?: number | null
          outlier_method?: string | null
          outlier_threshold?: number | null
          percentile_rounding?: number | null
          published_at?: string | null
          version: string
        }
        Update: {
          bootstrap_iterations?: number | null
          changelog?: string | null
          confidence_level?: number | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          methodology_url?: string | null
          min_effective_sample_size?: number | null
          min_segment_size?: number | null
          outlier_method?: string | null
          outlier_threshold?: number | null
          percentile_rounding?: number | null
          published_at?: string | null
          version?: string
        }
        Relationships: []
      }
      lead_qualification_scores: {
        Row: {
          business_readiness_score: number | null
          created_at: string
          engagement_score: number | null
          id: string
          implementation_readiness: number | null
          pain_point_severity: number | null
          qualification_notes: string | null
          session_id: string | null
          total_score: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          business_readiness_score?: number | null
          created_at?: string
          engagement_score?: number | null
          id?: string
          implementation_readiness?: number | null
          pain_point_severity?: number | null
          qualification_notes?: string | null
          session_id?: string | null
          total_score?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          business_readiness_score?: number | null
          created_at?: string
          engagement_score?: number | null
          id?: string
          implementation_readiness?: number | null
          pain_point_severity?: number | null
          qualification_notes?: string | null
          session_id?: string | null
          total_score?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_qualification_scores_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "conversation_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_qualifications: {
        Row: {
          created_at: string | null
          id: string
          indicators: Json | null
          qualification_type: string
          qualified_at: string | null
          score: number
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          indicators?: Json | null
          qualification_type: string
          qualified_at?: string | null
          score: number
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          indicators?: Json | null
          qualification_type?: string
          qualified_at?: string | null
          score?: number
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_qualifications_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "conversation_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_qualifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          updated_at: string
          username: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
          username: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      prompt_library_profiles: {
        Row: {
          bottleneck_analysis: Json
          communication_style: Json
          created_at: string | null
          executive_profile: Json
          generation_model: string | null
          generation_timestamp: string | null
          id: string
          implementation_roadmap: Json
          last_updated: string | null
          prompt_templates: Json
          recommended_projects: Json
          session_id: string | null
          stakeholder_map: Json
          trust_calibration: Json
          user_id: string | null
          workflow_preferences: Json
        }
        Insert: {
          bottleneck_analysis?: Json
          communication_style?: Json
          created_at?: string | null
          executive_profile?: Json
          generation_model?: string | null
          generation_timestamp?: string | null
          id?: string
          implementation_roadmap?: Json
          last_updated?: string | null
          prompt_templates?: Json
          recommended_projects?: Json
          session_id?: string | null
          stakeholder_map?: Json
          trust_calibration?: Json
          user_id?: string | null
          workflow_preferences?: Json
        }
        Update: {
          bottleneck_analysis?: Json
          communication_style?: Json
          created_at?: string | null
          executive_profile?: Json
          generation_model?: string | null
          generation_timestamp?: string | null
          id?: string
          implementation_roadmap?: Json
          last_updated?: string | null
          prompt_templates?: Json
          recommended_projects?: Json
          session_id?: string | null
          stakeholder_map?: Json
          trust_calibration?: Json
          user_id?: string | null
          workflow_preferences?: Json
        }
        Relationships: [
          {
            foreignKeyName: "prompt_library_profiles_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "conversation_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          created_at: string | null
          id: string
          metadata: Json | null
          referral_source: string | null
          referred_at: string | null
          referred_company_completed_assessment: boolean | null
          referred_company_first_assessment_date: string | null
          referred_company_hash: string
          referring_company_hash: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          referral_source?: string | null
          referred_at?: string | null
          referred_company_completed_assessment?: boolean | null
          referred_company_first_assessment_date?: string | null
          referred_company_hash: string
          referring_company_hash: string
        }
        Update: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          referral_source?: string | null
          referred_at?: string | null
          referred_company_completed_assessment?: boolean | null
          referred_company_first_assessment_date?: string | null
          referred_company_hash?: string
          referring_company_hash?: string
        }
        Relationships: []
      }
      roi_actuals: {
        Row: {
          actual_metric_description: string | null
          actual_monthly_value: number | null
          aggregate_weight: number | null
          allow_index_aggregation: boolean | null
          baseline_value_monthly: number | null
          confidence_level: string | null
          confidence_weight: number | null
          created_at: string | null
          currency_code: string | null
          exceeded_prediction: boolean | null
          fte_count: number | null
          id: string
          normalized_monthly_per_fte: number | null
          pilot_tracker_id: string | null
          predicted_conservative_monthly: number | null
          predicted_likely_monthly: number | null
          provenance: Database["public"]["Enums"]["roi_provenance"]
          provenance_weight: number | null
          reported_at: string | null
          reported_via: string | null
          roi_variance_pct: number | null
          session_id: string | null
          unit_type: Database["public"]["Enums"]["roi_unit_type"]
          unit_value_monthly: number | null
          user_id: string | null
          window_days: number | null
        }
        Insert: {
          actual_metric_description?: string | null
          actual_monthly_value?: number | null
          aggregate_weight?: number | null
          allow_index_aggregation?: boolean | null
          baseline_value_monthly?: number | null
          confidence_level?: string | null
          confidence_weight?: number | null
          created_at?: string | null
          currency_code?: string | null
          exceeded_prediction?: boolean | null
          fte_count?: number | null
          id?: string
          normalized_monthly_per_fte?: number | null
          pilot_tracker_id?: string | null
          predicted_conservative_monthly?: number | null
          predicted_likely_monthly?: number | null
          provenance: Database["public"]["Enums"]["roi_provenance"]
          provenance_weight?: number | null
          reported_at?: string | null
          reported_via?: string | null
          roi_variance_pct?: number | null
          session_id?: string | null
          unit_type: Database["public"]["Enums"]["roi_unit_type"]
          unit_value_monthly?: number | null
          user_id?: string | null
          window_days?: number | null
        }
        Update: {
          actual_metric_description?: string | null
          actual_monthly_value?: number | null
          aggregate_weight?: number | null
          allow_index_aggregation?: boolean | null
          baseline_value_monthly?: number | null
          confidence_level?: string | null
          confidence_weight?: number | null
          created_at?: string | null
          currency_code?: string | null
          exceeded_prediction?: boolean | null
          fte_count?: number | null
          id?: string
          normalized_monthly_per_fte?: number | null
          pilot_tracker_id?: string | null
          predicted_conservative_monthly?: number | null
          predicted_likely_monthly?: number | null
          provenance?: Database["public"]["Enums"]["roi_provenance"]
          provenance_weight?: number | null
          reported_at?: string | null
          reported_via?: string | null
          roi_variance_pct?: number | null
          session_id?: string | null
          unit_type?: Database["public"]["Enums"]["roi_unit_type"]
          unit_value_monthly?: number | null
          user_id?: string | null
          window_days?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "roi_actuals_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "conversation_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      security_audit_log: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          ip_address: unknown
          resource_id: string | null
          resource_type: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: unknown
          resource_id?: string | null
          resource_type: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: unknown
          resource_id?: string | null
          resource_type?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_business_context: {
        Row: {
          ai_readiness_score: number | null
          ai_trust_levels: Json | null
          bottleneck_details: Json | null
          business_description: string | null
          business_name: string | null
          communication_style: Json | null
          company_size: string | null
          context_data: Json | null
          created_at: string
          id: string
          industry: string | null
          primary_challenges: string[] | null
          stakeholder_audiences: Json | null
          thinking_process: Json | null
          updated_at: string
          user_id: string | null
          website_url: string | null
          workflow_pattern: Json | null
        }
        Insert: {
          ai_readiness_score?: number | null
          ai_trust_levels?: Json | null
          bottleneck_details?: Json | null
          business_description?: string | null
          business_name?: string | null
          communication_style?: Json | null
          company_size?: string | null
          context_data?: Json | null
          created_at?: string
          id?: string
          industry?: string | null
          primary_challenges?: string[] | null
          stakeholder_audiences?: Json | null
          thinking_process?: Json | null
          updated_at?: string
          user_id?: string | null
          website_url?: string | null
          workflow_pattern?: Json | null
        }
        Update: {
          ai_readiness_score?: number | null
          ai_trust_levels?: Json | null
          bottleneck_details?: Json | null
          business_description?: string | null
          business_name?: string | null
          communication_style?: Json | null
          company_size?: string | null
          context_data?: Json | null
          created_at?: string
          id?: string
          industry?: string | null
          primary_challenges?: string[] | null
          stakeholder_audiences?: Json | null
          thinking_process?: Json | null
          updated_at?: string
          user_id?: string | null
          website_url?: string | null
          workflow_pattern?: Json | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          auth_user_id: string | null
          company_name: string | null
          company_size: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          industry: string | null
          profile_id: string | null
          role_title: string | null
          updated_at: string | null
        }
        Insert: {
          auth_user_id?: string | null
          company_name?: string | null
          company_size?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          industry?: string | null
          profile_id?: string | null
          role_title?: string | null
          updated_at?: string | null
        }
        Update: {
          auth_user_id?: string | null
          company_name?: string | null
          company_size?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          industry?: string | null
          profile_id?: string | null
          role_title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      velocity_events: {
        Row: {
          action_signal_level: Database["public"]["Enums"]["action_signal_level"]
          assessment_completed_at: string
          contact_email: string
          created_at: string | null
          days_since_assessment: number | null
          event_date: string
          event_description: string | null
          event_metadata: Json | null
          event_type: string
          id: string
          initial_readiness_score: number | null
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          action_signal_level: Database["public"]["Enums"]["action_signal_level"]
          assessment_completed_at: string
          contact_email: string
          created_at?: string | null
          days_since_assessment?: number | null
          event_date: string
          event_description?: string | null
          event_metadata?: Json | null
          event_type: string
          id?: string
          initial_readiness_score?: number | null
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          action_signal_level?: Database["public"]["Enums"]["action_signal_level"]
          assessment_completed_at?: string
          contact_email?: string
          created_at?: string | null
          days_since_assessment?: number | null
          event_date?: string
          event_description?: string | null
          event_metadata?: Json | null
          event_type?: string
          id?: string
          initial_readiness_score?: number | null
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "velocity_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "conversation_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      voice_instrumentation: {
        Row: {
          created_at: string | null
          dwell_time_seconds: number | null
          event_type: string
          id: string
          metadata: Json | null
          module_name: string | null
          session_id: string | null
        }
        Insert: {
          created_at?: string | null
          dwell_time_seconds?: number | null
          event_type: string
          id?: string
          metadata?: Json | null
          module_name?: string | null
          session_id?: string | null
        }
        Update: {
          created_at?: string | null
          dwell_time_seconds?: number | null
          event_type?: string
          id?: string
          metadata?: Json | null
          module_name?: string | null
          session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "voice_instrumentation_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "conversation_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      voice_sessions: {
        Row: {
          audio_retention_consent: boolean | null
          compass_completed_at: string | null
          compass_focus_areas: string[] | null
          compass_scores: Json | null
          compass_tier: string | null
          created_at: string | null
          gated_unlocked_at: string | null
          id: string
          roi_assumptions: string[] | null
          roi_completed_at: string | null
          roi_conservative_value: number | null
          roi_inputs: Json | null
          roi_likely_value: number | null
          roi_transcript: string | null
          session_id: string
          sprint_signup_source: string | null
          updated_at: string | null
          voice_enabled: boolean | null
        }
        Insert: {
          audio_retention_consent?: boolean | null
          compass_completed_at?: string | null
          compass_focus_areas?: string[] | null
          compass_scores?: Json | null
          compass_tier?: string | null
          created_at?: string | null
          gated_unlocked_at?: string | null
          id?: string
          roi_assumptions?: string[] | null
          roi_completed_at?: string | null
          roi_conservative_value?: number | null
          roi_inputs?: Json | null
          roi_likely_value?: number | null
          roi_transcript?: string | null
          session_id: string
          sprint_signup_source?: string | null
          updated_at?: string | null
          voice_enabled?: boolean | null
        }
        Update: {
          audio_retention_consent?: boolean | null
          compass_completed_at?: string | null
          compass_focus_areas?: string[] | null
          compass_scores?: Json | null
          compass_tier?: string | null
          created_at?: string | null
          gated_unlocked_at?: string | null
          id?: string
          roi_assumptions?: string[] | null
          roi_completed_at?: string | null
          roi_conservative_value?: number | null
          roi_inputs?: Json | null
          roi_likely_value?: number | null
          roi_transcript?: string | null
          session_id?: string
          sprint_signup_source?: string | null
          updated_at?: string | null
          voice_enabled?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "voice_sessions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "conversation_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      public_index_snapshots: {
        Row: {
          avg_readiness_score: number | null
          avg_readiness_score_ci_lower: number | null
          avg_readiness_score_ci_upper: number | null
          company_size_benchmarks: Json | null
          consent_rate: number | null
          dimension_benchmarks: Json | null
          effective_sample_size: number | null
          industry_benchmarks: Json | null
          median_readiness_score: number | null
          methodology_version: string | null
          published_at: string | null
          qoq_change: number | null
          qoq_change_significant: boolean | null
          quarter: string | null
          role_benchmarks: Json | null
          tier_advancing_pct: number | null
          tier_emerging_pct: number | null
          tier_establishing_pct: number | null
          tier_leading_pct: number | null
          total_assessments: number | null
        }
        Insert: {
          avg_readiness_score?: number | null
          avg_readiness_score_ci_lower?: number | null
          avg_readiness_score_ci_upper?: number | null
          company_size_benchmarks?: Json | null
          consent_rate?: number | null
          dimension_benchmarks?: Json | null
          effective_sample_size?: number | null
          industry_benchmarks?: Json | null
          median_readiness_score?: number | null
          methodology_version?: string | null
          published_at?: string | null
          qoq_change?: number | null
          qoq_change_significant?: boolean | null
          quarter?: string | null
          role_benchmarks?: Json | null
          tier_advancing_pct?: number | null
          tier_emerging_pct?: number | null
          tier_establishing_pct?: number | null
          tier_leading_pct?: number | null
          total_assessments?: number | null
        }
        Update: {
          avg_readiness_score?: number | null
          avg_readiness_score_ci_lower?: number | null
          avg_readiness_score_ci_upper?: number | null
          company_size_benchmarks?: Json | null
          consent_rate?: number | null
          dimension_benchmarks?: Json | null
          effective_sample_size?: number | null
          industry_benchmarks?: Json | null
          median_readiness_score?: number | null
          methodology_version?: string | null
          published_at?: string | null
          qoq_change?: number | null
          qoq_change_significant?: boolean | null
          quarter?: string | null
          role_benchmarks?: Json | null
          tier_advancing_pct?: number | null
          tier_emerging_pct?: number | null
          tier_establishing_pct?: number | null
          tier_leading_pct?: number | null
          total_assessments?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_leadership_index_snapshots_methodology_version_fkey"
            columns: ["methodology_version"]
            isOneToOne: false
            referencedRelation: "index_publication_rules"
            referencedColumns: ["version"]
          },
        ]
      }
    }
    Functions: {
      calculate_bootstrap_ci: {
        Args: {
          confidence_level?: number
          iterations?: number
          sample_values: number[]
        }
        Returns: {
          ci_lower: number
          ci_upper: number
          mean: number
        }[]
      }
      calculate_conversion_metrics: {
        Args: { session_uuid: string }
        Returns: {
          avg_lead_score: number
          conversion_rate: number
          high_value_conversions: number
          total_sessions: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      hash_company_identifier: {
        Args: { email_domain: string }
        Returns: string
      }
      process_pending_sync_logs: {
        Args: never
        Returns: {
          error_count: number
          processed_count: number
          success_count: number
        }[]
      }
      round_percentile: {
        Args: { raw_percentile: number; rounding?: number }
        Returns: number
      }
      schedule_sync_processing: { Args: never; Returns: undefined }
      sync_lead_to_sheets: {
        Args: {
          lead_session_id?: string
          lead_user_id: string
          sync_type_param?: string
        }
        Returns: string
      }
      trigger_google_sheets_sync: {
        Args: { sync_type_param?: string }
        Returns: {
          records_prepared: number
          sync_id: string
          sync_status: string
        }[]
      }
    }
    Enums: {
      action_signal_level: "low" | "mid" | "high"
      app_role: "admin" | "moderator" | "user"
      consent_purpose:
        | "index_publication"
        | "sales_outreach"
        | "case_study"
        | "product_improvements"
        | "research_partnerships"
      exec_role:
        | "CEO"
        | "CTO"
        | "COO"
        | "CMO"
        | "CFO"
        | "VP"
        | "Director"
        | "Other"
      momentum_tier: "experimenting" | "scaling" | "institutionalizing"
      roi_provenance: "instrumented" | "system_report" | "estimate"
      roi_unit_type:
        | "hours_saved"
        | "revenue_increase"
        | "cost_reduction"
        | "nps_increase"
        | "time_to_market"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      action_signal_level: ["low", "mid", "high"],
      app_role: ["admin", "moderator", "user"],
      consent_purpose: [
        "index_publication",
        "sales_outreach",
        "case_study",
        "product_improvements",
        "research_partnerships",
      ],
      exec_role: ["CEO", "CTO", "COO", "CMO", "CFO", "VP", "Director", "Other"],
      momentum_tier: ["experimenting", "scaling", "institutionalizing"],
      roi_provenance: ["instrumented", "system_report", "estimate"],
      roi_unit_type: [
        "hours_saved",
        "revenue_increase",
        "cost_reduction",
        "nps_increase",
        "time_to_market",
      ],
    },
  },
} as const
