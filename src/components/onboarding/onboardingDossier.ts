import { z } from 'zod';

const httpsUrl = z.string().url().refine((value) => value.startsWith('https://'), 'HTTPS URL required');

export const onboardingSignalSchema = z.object({
  title: z.string().min(1).max(180),
  url: httpsUrl,
  source: z.string().min(1).max(100),
  publishedAt: z.string().datetime().nullable(),
  excerpt: z.string().max(320),
  sourceCount: z.number().int().min(1).max(20),
  verified: z.boolean(),
});

export const onboardingDossierSchema = z.object({
  status: z.enum(['pending', 'ready', 'thin', 'failed']),
  person: z.object({
    name: z.string().max(160).nullable(),
    role: z.string().max(180).nullable(),
    linkedinUrl: httpsUrl.nullable(),
  }),
  company: z.object({
    name: z.string().max(180).nullable(),
    domain: z.string().max(255).nullable(),
    summary: z.string().max(520).nullable(),
    logoUrl: httpsUrl.nullable(),
  }),
  signals: z.array(onboardingSignalSchema).max(3),
  strength: z.object({
    providerCount: z.number().int().min(0).max(20),
    signalCount: z.number().int().min(0).max(3),
    verifiedSignalCount: z.number().int().min(0).max(3),
    newestSignalAt: z.string().datetime().nullable(),
  }),
});

export type OnboardingDossier = z.infer<typeof onboardingDossierSchema>;

export function parseOnboardingDossier(value: unknown): OnboardingDossier | null {
  const parsed = onboardingDossierSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function dossierMilestones(dossier: OnboardingDossier | null) {
  return {
    identity: Boolean(dossier?.person.name || dossier?.person.role),
    company: Boolean(dossier?.company.name || dossier?.company.domain),
    signals: (dossier?.signals.length ?? 0) > 0,
    verified: (dossier?.strength.verifiedSignalCount ?? 0) > 0,
  };
}
