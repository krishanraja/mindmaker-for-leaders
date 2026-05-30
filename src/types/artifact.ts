export type ArtifactKind =
  | "skill"
  | "draft"
  | "export"
  | "framework"
  | "briefing_custom";

/**
 * A row from `public.generated_artifacts`. Created whenever an edge function
 * successfully generates a markdown artifact for the user. Powers the Library
 * tab on /memory.
 */
export interface GeneratedArtifact {
  id: string;
  user_id: string;
  kind: ArtifactKind;
  name: string;
  /** Markdown body - SKILL.md for skills, raw markdown for everything else. */
  body: string;
  /** Kind-specific bag. Skills: { trigger, zip_filename, seed_ref }. */
  metadata: Record<string, unknown>;
  created_at: string;
}

export const ARTIFACT_KIND_LABEL: Record<ArtifactKind, string> = {
  skill: "Skill",
  draft: "Draft",
  export: "Export",
  framework: "Framework",
  briefing_custom: "Custom briefing",
};

export const ARTIFACT_KIND_PLURAL: Record<ArtifactKind, string> = {
  skill: "Skills",
  draft: "Drafts",
  export: "Exports",
  framework: "Frameworks",
  briefing_custom: "Custom briefings",
};
