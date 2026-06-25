// GlobeLoader - the branded news-loading experience: a slowly rotating Earth with
// luminous emerald city dots wired together by glowing great-circle arcs. Replaces
// the grey skeleton on Home while the headlines feed warms up, so "Reading the
// market and your world" is shown, not just told.
//
// CTRL-SYSTEM-SPEC s6: "No raw spinners: loading is purposeful, branded,
// anticipatory." Tokens only (the ctrl-ds emerald on the deep surface). Built on
// `cobe` (~tiny WebGL globe); the arcs/markers/rotation are all native to cobe v2,
// driven by our own rAF loop calling globe.update({ phi }). Motion respects
// prefers-reduced-motion (a single static frame, no spin, no shimmer).

import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import createGlobe from 'cobe';
import { LoadingCaption } from '@/components/system/SkeletonCard';
import { cn } from '@/lib/utils';

// Emerald accent (#00D9B6) in cobe's 0..1 RGB. Kept in sync with --accent.
const EMERALD: [number, number, number] = [0, 0.851, 0.714];
// The dotted landmass colour - a muted slate so continents read on the dark
// surface without competing with the emerald signal.
const LAND: [number, number, number] = [0.16, 0.2, 0.26];

// A globe-spanning set of "market" cities - the luminous dots. [lat, lng].
const CITIES: Array<[number, number]> = [
  [37.77, -122.42], // San Francisco
  [40.71, -74.0], //   New York
  [51.51, -0.13], //   London
  [25.2, 55.27], //    Dubai
  [1.35, 103.82], //   Singapore
  [35.68, 139.69], //  Tokyo
  [-33.87, 151.21], // Sydney
  [-23.55, -46.63], // Sao Paulo
];

// The network wired across the globe (indices into CITIES). Each connection
// pulses on its own phase so the web reads as actively lighting up.
const LINKS: Array<[number, number]> = [
  [0, 1], // SF -> NY
  [1, 2], // NY -> London
  [2, 3], // London -> Dubai
  [3, 4], // Dubai -> Singapore
  [4, 5], // Singapore -> Tokyo
  [5, 6], // Tokyo -> Sydney
  [0, 5], // SF -> Tokyo
  [2, 7], // London -> Sao Paulo
  [7, 1], // Sao Paulo -> NY
  [4, 6], // Singapore -> Sydney
];

export interface GlobeLoaderProps {
  /** Anticipatory caption under the globe (with the three-dot pulse). */
  caption?: string;
  className?: string;
}

export function GlobeLoader({ caption = 'Reading the market and your world', className }: GlobeLoaderProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduceMotion = useReducedMotion();
  // Square globe diameter, derived from the available space (capped so it sits
  // calmly inside the bounded no-scroll feed zone).
  const [size, setSize] = useState(0);

  // Measure the available square space.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const measure = () => {
      const r = stage.getBoundingClientRect();
      const next = Math.max(0, Math.min(r.width, r.height, 360));
      setSize(Math.round(next));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(stage);
    return () => ro.disconnect();
  }, []);

  // Create + drive the globe whenever the size changes.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || size <= 0) return;

    let phi = 0;
    let frame = 0;
    let raf = 0;
    const dpr = Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, 2);

    const buildArcs = (t: number) =>
      LINKS.map(([a, b], i) => {
        // Each link breathes on its own phase: dim links recede into the dark,
        // bright ones glow - the "being connected" pulse.
        const pulse = reduceMotion ? 0.85 : 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 0.0016 + i * 1.7));
        return {
          from: CITIES[a],
          to: CITIES[b],
          color: [EMERALD[0] * pulse, EMERALD[1] * pulse, EMERALD[2] * pulse] as [number, number, number],
        };
      });

    const globe = createGlobe(canvas, {
      devicePixelRatio: dpr,
      width: size * dpr,
      height: size * dpr,
      phi: 0,
      theta: 0.28,
      dark: 1,
      diffuse: 1.2,
      mapSamples: 16000,
      mapBrightness: 6,
      baseColor: LAND,
      markerColor: EMERALD,
      glowColor: EMERALD,
      arcColor: EMERALD,
      arcWidth: 1.6,
      arcHeight: 0.45,
      markerElevation: 0.02,
      markers: CITIES.map((location) => ({ location, size: 0.06 })),
      arcs: buildArcs(0),
    });

    if (reduceMotion) {
      // One static, fully-formed frame - no spin, no shimmer.
      globe.update({ phi: 0.3, arcs: buildArcs(0) });
    } else {
      const render = (t: number) => {
        phi += 0.0042;
        frame = t;
        globe.update({ phi, arcs: buildArcs(frame) });
        raf = requestAnimationFrame(render);
      };
      raf = requestAnimationFrame(render);
    }

    return () => {
      if (raf) cancelAnimationFrame(raf);
      globe.destroy();
    };
  }, [size, reduceMotion]);

  return (
    <div className={cn('flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-3', className)}>
      <div ref={stageRef} className="relative flex min-h-0 w-full flex-1 items-center justify-center">
        {size > 0 && (
          <div
            className="relative"
            style={{
              width: size,
              height: size,
              // a soft emerald halo so the globe feels embedded in the surface
              filter: 'drop-shadow(0 0 32px hsl(var(--accent) / 0.18))',
            }}
          >
            <canvas
              ref={canvasRef}
              style={{ width: '100%', height: '100%', contain: 'layout paint size' }}
              aria-hidden="true"
            />
          </div>
        )}
      </div>
      {caption && <LoadingCaption>{caption}</LoadingCaption>}
    </div>
  );
}
