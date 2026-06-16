// The hero's signal VISUAL. A minimal "build cost vs rent cost" gap motif: two lines
// (one flat/high, one falling) with a filled widening gap and a lit endpoint, exactly
// the read the mock shows. It is FLUID (width:100% via .c-viz) so a fixed viewBox can
// never overflow the hero card.
//
// HONESTY: it never fabricates a data trend. If the hero carries a real `series` pair
// (cost-to-build, cost-to-rent over time) we draw those points; otherwise we render the
// tasteful static motif - a shape that says "a gap is widening" without claiming the
// curve is measured. The motif is tone-governed so a contested read drops the emerald.

export type HeroVizTone = 'signal' | 'contested' | 'neutral';

export interface HeroSeries {
  // two normalised series in [0,1] (0 = top of the box, 1 = bottom), same length >= 2.
  // `high` reads as the costly/flat line; `low` reads as the falling/cheaper line.
  high: number[];
  low: number[];
}

const W = 300;
const H = 84;
const PAD_X = 10;
const PAD_Y = 14;

const TONE: Record<HeroVizTone, { line: string; fillId: string; glowOpacity: number }> = {
  signal: { line: '#00D9B6', fillId: 'heroGapSignal', glowOpacity: 0.22 },
  neutral: { line: '#5aa9ff', fillId: 'heroGapNeutral', glowOpacity: 0.18 },
  contested: { line: '#f0a13c', fillId: 'heroGapContested', glowOpacity: 0.16 },
};

// map a normalised value (0 top .. 1 bottom) to a y inside the padded box
function y(v: number): number {
  const clamped = Math.max(0, Math.min(1, v));
  return PAD_Y + clamped * (H - PAD_Y * 2);
}

// even x spacing across the padded box for n points
function xs(n: number): number[] {
  if (n <= 1) return [PAD_X, W - PAD_X];
  const span = W - PAD_X * 2;
  return Array.from({ length: n }, (_, i) => PAD_X + (span * i) / (n - 1));
}

// a smooth-ish path (Catmull-Rom-lite via quadratic midpoints) for a set of points
function smoothPath(points: Array<[number, number]>): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M${points[0][0]},${points[0][1]}`;
  let d = `M${points[0][0]},${points[0][1]}`;
  for (let i = 1; i < points.length; i++) {
    const [px, py] = points[i - 1];
    const [cx, cy] = points[i];
    const mx = (px + cx) / 2;
    d += ` Q${px},${py} ${mx},${(py + cy) / 2} T${cx},${cy}`;
  }
  // T after a Q is well-defined; for the common 2-point case this reduces to a near-line
  return d;
}

export function HeroSparkline({
  tone = 'signal',
  series,
  labels = true,
  className,
}: {
  tone?: HeroVizTone;
  series?: HeroSeries | null;
  labels?: boolean;
  className?: string;
}) {
  const t = TONE[tone];

  // Resolve the two curves. Real series if honest + well-formed; otherwise the static motif.
  let highPts: Array<[number, number]>;
  let lowPts: Array<[number, number]>;
  const valid =
    series &&
    Array.isArray(series.high) &&
    Array.isArray(series.low) &&
    series.high.length >= 2 &&
    series.high.length === series.low.length;

  if (valid) {
    const xHigh = xs(series!.high.length);
    const xLow = xs(series!.low.length);
    highPts = series!.high.map((v, i) => [xHigh[i], y(v)] as [number, number]);
    lowPts = series!.low.map((v, i) => [xLow[i], y(v)] as [number, number]);
  } else {
    // static motif: flat/high cost line near the top, falling cheaper line crossing down
    highPts = [
      [PAD_X, 28],
      [W * 0.4, 30],
      [W * 0.72, 32],
      [W - PAD_X, 33],
    ];
    lowPts = [
      [PAD_X, 39],
      [W * 0.4, 47],
      [W * 0.72, 60],
      [W - PAD_X, 71],
    ];
  }

  const highD = smoothPath(highPts);
  const lowD = smoothPath(lowPts);
  // the gap fill: along the high line, then back along the low line reversed
  const fillD = `${highD} L${lowPts[lowPts.length - 1][0]},${lowPts[lowPts.length - 1][1]} ${smoothPath([...lowPts].reverse()).replace(/^M[^ ]+/, '')} Z`;

  const end = lowPts[lowPts.length - 1];

  return (
    <svg
      className={className}
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      fill="none"
      role="img"
      aria-label="Cost to build stays high while cost to rent falls"
    >
      <defs>
        <linearGradient id={t.fillId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={t.line} stopOpacity={t.glowOpacity} />
          <stop offset="1" stopColor={t.line} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* widening gap fill (build cost minus rent cost) */}
      <path d={fillD} fill={`url(#${t.fillId})`} />
      {/* build cost: flat / high */}
      <path d={highD} stroke="#6b7280" strokeWidth="2" strokeLinecap="round" />
      {/* rent cost: falling (cheaper) */}
      <path d={lowD} stroke={t.line} strokeWidth="2.4" strokeLinecap="round" />
      {/* lit endpoint on the cheaper line */}
      <circle cx={end[0]} cy={end[1]} r="3.4" fill={t.line} />
      <circle cx={end[0]} cy={end[1]} r="6.5" fill={t.line} opacity="0.22" />

      {labels && (
        <>
          <text x="244" y="24" fill="#7f8aa0" fontSize="8.5" fontFamily="Inter">
            build cost
          </text>
          <text x="246" y="82" fill="#9fe9da" fontSize="8.5" fontFamily="Inter">
            rent cost
          </text>
        </>
      )}
    </svg>
  );
}
