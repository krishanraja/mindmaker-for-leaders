/**
 * OrgChartView - the SHARED CONTRACT chart renderer for the Agentic Org Chart kit.
 *
 * Locked spec: prototypes/kit-orgchart.html (the `.org` panel). This is a pure
 * presentational component used in TWO places:
 *   1. The live intake preview (Agent B's KitIntake right pane), building={true}
 *      and a PARTIAL chart that fills in box-by-box as the student answers.
 *   2. The final 'agentic-org-chart' artifact on KitHome (building={false}),
 *      every box tagged + roled.
 *
 * Brand: reads the `--kit-*` tokens + Gobold/Inter rules wired by the portal
 * (KitPortalLayout + kit-portal.css). It must therefore render INSIDE a
 * `.kit-portal` scope (both call sites are). No app (dark) tokens are used, so
 * the chart matches the mock regardless of the forced-dark app theme.
 *
 * Honesty: every label, tag and role on a box comes from the caller (the
 * compose LLM off the student's real answers). This component never invents a
 * tag or a role; a box with tag=null and no roles simply renders unlabelled
 * (the live-preview state, before the reveal).
 */

import type { CSSProperties } from "react";

/* ------------------------------------------------------------------ */
/* Shared contract types (Agent C emits, Agent B imports)              */
/* ------------------------------------------------------------------ */

export type OrgChartTag = "led" | "assisted" | "excluded" | null;

export interface OrgChartBox {
  /** Stable id (used as React key; mock keys off the label). */
  id: string;
  /** The function / hat, e.g. "Sales" or "Finding clients". */
  label: string;
  /** Agent posture for this box. null = not yet revealed (live preview). */
  tag: OrgChartTag;
  /** Named agent role for a led/assisted box, e.g. "SDR agent". */
  agentRole?: string;
  /** One-line description of what the agent does, e.g. "drafts your outreach". */
  agentDesc?: string;
  /** New human role to grow into beside the agent, e.g. "Head of revenue". */
  humanRole?: string;
  /** The START-HERE box: the first thing worth handing to an agent. */
  isStart?: boolean;
}

export interface OrgChart {
  /** The student / business name shown on the leadership node. */
  businessName: string;
  /** 'self' = team-of-one operating model; 'biz' = scoped org chart. */
  pathway: "self" | "biz";
  /** The leadership node label, e.g. "You" or "Owns the outcomes". */
  leadershipLabel: string;
  boxes: OrgChartBox[];
}

export interface OrgChartViewProps {
  chart: OrgChart;
  /** true = live intake preview (animate new boxes, "building" affordance). */
  building?: boolean;
}

/* ------------------------------------------------------------------ */
/* Tag presentation (matches the mock's .t-led / .t-ass / .t-exc)      */
/* ------------------------------------------------------------------ */

const TAG_META: Record<
  Exclude<OrgChartTag, null>,
  { label: string; color: string; bg: string; border: string; legendDot: string }
> = {
  led: {
    label: "Agent-led",
    color: "var(--kit-acc-deep)",
    bg: "var(--kit-acc-soft)",
    border: "var(--kit-acc-line)",
    legendDot: "var(--kit-acc)",
  },
  assisted: {
    label: "Agent-assisted",
    color: "var(--kit-ind)",
    bg: "var(--kit-ind-soft)",
    border: "var(--kit-ind-line)",
    legendDot: "var(--kit-ind)",
  },
  excluded: {
    label: "You only",
    color: "var(--kit-slate)",
    bg: "var(--kit-slate-soft)",
    border: "var(--kit-slate-line)",
    legendDot: "var(--kit-slate)",
  },
};

/* ------------------------------------------------------------------ */
/* Component                                                            */
/* ------------------------------------------------------------------ */

export function OrgChartView({ chart, building = false }: OrgChartViewProps) {
  const { businessName, pathway, leadershipLabel, boxes } = chart;
  const revealed = !building;
  const hasBoxes = boxes.length > 0;
  const anyTagged = boxes.some((b) => b.tag);
  const showLegend = revealed && anyTagged;

  return (
    <div className="kit-orgchart" style={S.scope}>
      {/* The panel head: small Gobold tag + the live-or-name line + building pill */}
      <div style={S.phead}>
        <div>
          <div className="kit-label" style={S.ptag}>
            {revealed
              ? pathway === "self"
                ? "Agentic operating model"
                : "Agentic org chart"
              : "Your chart"}
          </div>
          <div style={S.bizname}>{businessName}</div>
        </div>
        {building && (
          <span className="kit-tag" style={S.livePill}>
            <span style={S.liveDot} aria-hidden />
            building
          </span>
        )}
      </div>

      {!hasBoxes ? (
        <div style={S.empty}>
          {building
            ? `Pick your ${pathway === "self" ? "hats" : "functions"} and the chart starts drawing itself.`
            : "Your agentic org chart appears here, one box at a time."}
        </div>
      ) : (
        <div style={S.org}>
          {/* Leadership node */}
          <div style={S.node}>
            <small style={S.nodeLabel}>{leadershipLabel}</small>
            {businessName}
          </div>
          <div style={S.spine} aria-hidden />

          {/* Connector rail + boxes */}
          <div style={S.row}>
            <span style={S.rail} aria-hidden />
            {boxes.map((box, i) => (
              <ChartBox key={box.id} box={box} index={i} animate={building} />
            ))}
          </div>
        </div>
      )}

      {showLegend && (
        <div style={S.legend}>
          <LegendItem color="var(--kit-acc)" label="Agent-led" />
          <LegendItem color="var(--kit-ind)" label="Agent-assisted" />
          <LegendItem color="var(--kit-slate)" label="You only" />
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Box                                                                 */
/* ------------------------------------------------------------------ */

function ChartBox({
  box,
  index,
  animate,
}: {
  box: OrgChartBox;
  index: number;
  animate: boolean;
}) {
  const tagMeta = box.tag ? TAG_META[box.tag] : null;
  const isExcluded = box.tag === "excluded";

  const boxStyle: CSSProperties = {
    ...S.box,
    ...(box.isStart ? S.boxStart : null),
    // Stagger the live "pop" so boxes appear to assemble one at a time.
    animation: animate ? `kitOrgPop .42s cubic-bezier(.2,.85,.25,1) both` : "none",
    animationDelay: animate ? `${Math.min(index, 8) * 60}ms` : undefined,
  };

  return (
    <div style={boxStyle}>
      {box.isStart && <span style={S.flag}>START HERE</span>}
      <span style={S.boxConnector} aria-hidden />
      <span style={S.boxName}>{box.label}</span>

      {tagMeta && (
        <span
          style={{
            ...S.tag,
            color: tagMeta.color,
            background: tagMeta.bg,
            borderColor: tagMeta.border,
          }}
        >
          {tagMeta.label}
        </span>
      )}

      {/* Roles only render on a revealed box. Excluded = stays human. */}
      {box.tag &&
        (isExcluded ? (
          <span style={S.role}>{box.humanRole ? box.humanRole : "stays human"}</span>
        ) : (
          <>
            {box.agentRole && (
              <span style={S.role}>
                <b style={S.roleStrong}>{box.agentRole}</b>
                {box.agentDesc ? <> &middot; {box.agentDesc}</> : null}
              </span>
            )}
            {box.humanRole && (
              <span style={S.roleHuman}>
                <span style={S.roleHumanLabel}>You grow into</span> {box.humanRole}
              </span>
            )}
          </>
        ))}
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <span style={S.legendItem}>
      <i style={{ ...S.legendDot, background: color }} aria-hidden />
      {label}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Styles (literal port of the mock's .org / .node / .row / .box CSS)  */
/* The keyframes the boxes reference are injected once below.          */
/* ------------------------------------------------------------------ */

const S: Record<string, CSSProperties> = {
  scope: {
    fontFamily:
      "'Inter', ui-sans-serif, -apple-system, 'Segoe UI', system-ui, sans-serif",
    color: "var(--kit-ink)",
    letterSpacing: "-0.005em",
  },
  phead: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 6,
  },
  ptag: {
    fontSize: 11,
    marginBottom: 3,
  },
  bizname: {
    fontFamily: "'Inter', sans-serif",
    fontWeight: 800,
    fontSize: 17,
    letterSpacing: "-0.015em",
  },
  livePill: {
    color: "var(--kit-acc-deep)",
    background: "var(--kit-acc-soft)",
    border: "1px solid var(--kit-acc-line)",
    padding: "5px 10px",
    borderRadius: 999,
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    fontSize: 11,
    whiteSpace: "nowrap",
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 99,
    background: "var(--kit-acc)",
    boxShadow: "0 0 0 3px var(--kit-acc-soft)",
    animation: "kitOrgBlink 1.6s infinite",
  },
  empty: {
    color: "var(--kit-faint)",
    fontSize: 13.5,
    textAlign: "center",
    padding: "48px 16px",
    border: "1.5px dashed var(--kit-line)",
    borderRadius: 14,
    width: "100%",
    marginTop: 14,
  },
  org: {
    marginTop: 14,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  node: {
    border: "1px solid var(--kit-line)",
    background: "linear-gradient(180deg,#fff,#FBFBFA)",
    borderRadius: 13,
    padding: "11px 18px",
    fontWeight: 800,
    fontSize: 14,
    letterSpacing: "-0.01em",
    boxShadow: "0 1px 2px rgba(16,28,30,.05)",
    textAlign: "center",
    maxWidth: "78%",
  },
  nodeLabel: {
    display: "block",
    fontFamily: "var(--kit-display)",
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    color: "var(--kit-faint)",
    marginBottom: 2,
  },
  spine: {
    width: 1.5,
    height: 18,
    background: "var(--kit-rail)",
  },
  row: {
    display: "flex",
    gap: 12,
    alignItems: "stretch",
    width: "100%",
    position: "relative",
    paddingTop: 14,
    justifyContent: "center",
    flexWrap: "wrap",
  },
  rail: {
    position: "absolute",
    top: 0,
    left: "8%",
    right: "8%",
    height: 1.5,
    background: "var(--kit-rail)",
  },
  box: {
    flex: "1 1 0",
    minWidth: 130,
    maxWidth: 210,
    border: "1px solid var(--kit-line)",
    background: "linear-gradient(180deg,#fff,#FCFCFB)",
    borderRadius: 13,
    padding: "11px 12px",
    display: "flex",
    flexDirection: "column",
    gap: 6,
    position: "relative",
    boxShadow: "0 1px 2px rgba(16,28,30,.05)",
  },
  boxStart: {
    borderColor: "var(--kit-acc-line)",
    background: "linear-gradient(180deg,#F3FBF8,#E9F7F1)",
    boxShadow:
      "0 0 0 1px var(--kit-acc-line),0 14px 30px -18px rgba(10,158,132,.7)",
  },
  boxConnector: {
    position: "absolute",
    top: -14,
    left: "50%",
    width: 1.5,
    height: 14,
    background: "var(--kit-rail)",
  },
  flag: {
    position: "absolute",
    top: -10,
    left: "50%",
    transform: "translateX(-50%)",
    whiteSpace: "nowrap",
    fontFamily: "var(--kit-display)",
    fontSize: 9,
    fontWeight: 800,
    letterSpacing: "0.06em",
    color: "#fff",
    background: "linear-gradient(180deg,var(--kit-acc),var(--kit-acc-deep))",
    padding: "3px 9px",
    borderRadius: 999,
    boxShadow: "0 5px 12px -4px rgba(10,158,132,.8)",
  },
  boxName: {
    fontSize: 13,
    fontWeight: 800,
    letterSpacing: "-0.01em",
    lineHeight: 1.15,
  },
  tag: {
    alignSelf: "flex-start",
    fontFamily: "var(--kit-display)",
    fontSize: 9.5,
    fontWeight: 800,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    padding: "3px 7px",
    borderRadius: 7,
    border: "1px solid transparent",
  },
  role: {
    fontSize: 11,
    color: "var(--kit-mut)",
    lineHeight: 1.3,
  },
  roleStrong: {
    color: "var(--kit-ink2)",
  },
  roleHuman: {
    fontSize: 11,
    color: "var(--kit-mut)",
    lineHeight: 1.3,
  },
  roleHumanLabel: {
    fontFamily: "var(--kit-display)",
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: "var(--kit-faint)",
  },
  legend: {
    display: "flex",
    gap: 16,
    flexWrap: "wrap",
    marginTop: 18,
    fontSize: 11.5,
    color: "var(--kit-mut)",
    justifyContent: "center",
  },
  legendItem: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 3,
    display: "inline-block",
  },
};

/**
 * The mock animates boxes with a `pop` keyframe and the live dot with `blink`.
 * Inline styles cannot declare @keyframes, so inject them once at module load
 * (guarded for SSR / repeated mounts). Scoped names avoid collisions.
 */
const KEYFRAMES_ID = "kit-orgchart-keyframes";
if (typeof document !== "undefined" && !document.getElementById(KEYFRAMES_ID)) {
  const style = document.createElement("style");
  style.id = KEYFRAMES_ID;
  style.textContent = `
@keyframes kitOrgPop{from{opacity:0;transform:translateY(8px) scale(.96)}to{opacity:1;transform:none}}
@keyframes kitOrgBlink{50%{opacity:.4}}
@media (max-width:560px){
  .kit-orgchart [data-kit-row]{flex-wrap:wrap}
}`;
  document.head.appendChild(style);
}

export default OrgChartView;
