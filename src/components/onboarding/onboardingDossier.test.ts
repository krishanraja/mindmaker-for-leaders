import { describe, expect, it } from 'vitest';
import { dossierMilestones, parseOnboardingDossier } from './onboardingDossier';

const readyDossier = {
  status: 'ready',
  person: { name: 'Krish Raja', role: 'Founder', linkedinUrl: 'https://linkedin.com/in/krish' },
  company: { name: 'Mindmaker', domain: 'themindmaker.ai', summary: 'Decision support for leaders.', logoUrl: 'https://cdn.example.com/logo.png' },
  signals: [{
    title: 'Mindmaker launches CTRL',
    url: 'https://example.com/story',
    source: 'example.com',
    publishedAt: '2026-08-11T12:00:00.000Z',
    excerpt: 'A grounded company update.',
    sourceCount: 2,
    verified: true,
  }],
  strength: { providerCount: 3, signalCount: 1, verifiedSignalCount: 1, newestSignalAt: '2026-08-11T12:00:00.000Z' },
};

describe('onboarding dossier contract', () => {
  it('accepts a grounded, source-linked company dossier', () => {
    const dossier = parseOnboardingDossier(readyDossier);
    expect(dossier?.company.name).toBe('Mindmaker');
    expect(dossierMilestones(dossier)).toEqual({ identity: true, company: true, signals: true, verified: true });
  });

  it('rejects unlinked evidence and oversized source counts', () => {
    expect(parseOnboardingDossier({
      ...readyDossier,
      signals: [{ ...readyDossier.signals[0], url: 'javascript:alert(1)' }],
    })).toBeNull();
    expect(parseOnboardingDossier({
      ...readyDossier,
      signals: [{ ...readyDossier.signals[0], sourceCount: 21 }],
    })).toBeNull();
  });

  it('keeps thin enrichment honest', () => {
    const dossier = parseOnboardingDossier({
      status: 'thin',
      person: { name: null, role: null, linkedinUrl: null },
      company: { name: null, domain: null, summary: null, logoUrl: null },
      signals: [],
      strength: { providerCount: 0, signalCount: 0, verifiedSignalCount: 0, newestSignalAt: null },
    });
    expect(dossierMilestones(dossier)).toEqual({ identity: false, company: false, signals: false, verified: false });
  });
});
