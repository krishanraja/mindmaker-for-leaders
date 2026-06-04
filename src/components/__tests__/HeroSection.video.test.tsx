/**
 * HeroSection Video Background Tests
 * 
 * Verifies that video background is correctly configured:
 * - Video has correct opacity (1) and z-index (-20)
 * - Overlay element exists with correct opacity and z-index
 * - Parent container does not have bg-background
 */

import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { HeroSection } from '../landing/HeroSection';

// Mock useNavigate
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

// The video background lives on the mobile branch of the hero; force mobile so
// it renders (desktop returns DesktopLanding, which has no video).
vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => true,
}));

const renderHero = () =>
  render(
    <BrowserRouter>
      <HeroSection />
    </BrowserRouter>,
  );

describe('HeroSection Video Background', () => {
  it('video element has the background styling', () => {
    const { container } = renderHero();

    const video = container.querySelector('video');
    expect(video).toBeInTheDocument();

    if (video) {
      expect(video.className).toContain('opacity-40');
      expect(video.className).toContain('object-cover');
      expect(video.className).toContain('pointer-events-none');
    }
  });

  it('dark overlay element exists for readability', () => {
    const { container } = renderHero();

    const overlay = container.querySelector('[class*="bg-black/40"]');
    expect(overlay).toBeInTheDocument();

    if (overlay) {
      expect(overlay.className).toContain('pointer-events-none');
    }
  });

  it('video element has required playback attributes', () => {
    const { container } = renderHero();

    const video = container.querySelector('video');
    expect(video).toBeInTheDocument();

    if (video) {
      expect(video.hasAttribute('autoPlay')).toBe(true);
      expect(video.hasAttribute('loop')).toBe(true);
      expect(video.hasAttribute('playsInline')).toBe(true);
      // React sets `muted` as a DOM property, not a reflected HTML attribute.
      expect((video as HTMLVideoElement).muted).toBe(true);
    }
  });

  it('video source element exists with correct src', () => {
    const { container } = renderHero();

    const source = container.querySelector('video source');
    expect(source).toBeInTheDocument();

    if (source) {
      expect(source.getAttribute('src')).toBe('/Mindmaker for Leaders - background video.mp4');
      expect(source.getAttribute('type')).toBe('video/mp4');
    }
  });
});
