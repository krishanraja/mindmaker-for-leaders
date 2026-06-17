/**
 * KitPicksBoard - the generic SHARED live-assembling preview board.
 *
 * The "picks" analog to OrgChartView: where the org-chart preset draws a
 * leadership node + connector-railed boxes, the three retrofitted kits draw a
 * title node + the picked items as cards that pop in as the student chooses
 * them, with the START item flagged. Used in TWO places, exactly like
 * OrgChartView:
 *   1. The live intake preview (KitIntake right pane), building={true} and a
 *      PARTIAL board that fills in card-by-card as the student answers.
 *   2. The final artifact a kit's SHARED agent renders, building={false}.
 *
 * Brand: reads the `--kit-*` tokens + Gobold/Inter rules wired by the portal
 * (KitPortalLayout + kit-portal.css). It must render INSIDE a `.kit-portal`
 * scope (both call sites are). No app (dark) tokens are used, so it matches the
 * mock regardless of the forced-dark app theme. Labels are Gobold uppercase;
 * the headline line is Inter lowercase, per the portal house style.
 *
 * Honesty: every item on the board comes from the caller (the student's actual
 * structured picks). This component never invents an item, a flag, or a note;
 * an empty model simply renders the empty state.
 *
 * The model shape matches PicksModel from useIntakeFlow.buildPicksModel, kept
 * structural here so a kit's SHARED agent can emit the same shape from its own
 * chartFeed answers without importing the hook.
 */

import type { CSSProperties } from "react";

/* ------------------------------------------------------------------ */
/* Contract (structurally identical to useIntakeFlow's PicksModel)     */
/* ------------------------------------------------------------------ */

export interface KitPicksItem {
  /** Stable id (used as the React key). */
  id: string;
  /** The picked option's label. */
  label: string;
  /** The START item: the first thing worth doing, flagged on the board. */
  isStart?: boolean;
  /** Optional one-line note under the card. */
  note?: string;
}

export interface KitPicksModel {
  /** The title node line (e.g. the business / person name, or a default). */
  title: string;
  /** A small Gobold framing label above the items. */
  framingLabel: string;
  /** The picked items, in selection order; the start item flagged isStart. */
  items: KitPicksItem[];
}

export interface KitPicksBoardProps {
  model: KitPicksModel;
  /** true = live intake preview (animate new cards, "building" affordance). */
  building?: boolean;
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export function KitPicksBoard({ model, building = false }: KitPicksBoardProps) {
  const { title, framingLabel, items } = model;
  const revealed = !building;
  const hasItems = items.length > 0;

  return (
    <div className="kit-picksboard" style={S.scope}>
      {/* Panel head: small Gobold label + the title line + building pill. */}
      <div style={S.phead}>
        <div>
          <div className="kit-label" style={S.ptag}>
            {revealed ? framingLabel : "Your picks"}
          </div>
          <div style={S.title}>{title}</div>
        </div>
        {building && (
          <span className="kit-tag" style={S.livePill}>
            <span style={S.liveDot} aria-hidden />
            building
          </span>
        )}
      </div>

      {!hasItems ? (
        <div style={S.empty}>
          {building
            ? "Make your picks and they assemble here, one at a time."
            : "Your picks appear here, one card at a time."}
        </div>
      ) : (
        <div style={S.board}>
          {/* Title node + spine, mirroring the org chart's leadership node. */}
          <div style={S.node}>
            <small style={S.nodeLabel}>{framingLabel}</small>
            {title}
          </div>
          <div style={S.spine} aria-hidden />

          {/* Connector rail + the picked cards. */}
          <div style={S.row}>
            <span style={S.rail} aria-hidden />
            {items.map((item, i) => (
              <PickCard key={item.id} item={item} index={i} animate={building} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Card                                                                */
/* ------------------------------------------------------------------ */

function PickCard({
  item,
  index,
  animate,
}: {
  item: KitPicksItem;
  index: number;
  animate: boolean;
}) {
  const cardStyle: CSSProperties = {
    ...S.card,
    ...(item.isStart ? S.cardStart : null),
    // Stagger the live "pop" so cards appear to assemble one at a time.
    animation: animate ? `kitPicksPop .42s cubic-bezier(.2,.85,.25,1) both` : "none",
    animationDelay: animate ? `${Math.min(index, 8) * 60}ms` : undefined,
  };

  return (
    <div style={cardStyle}>
      {item.isStart && <span style={S.flag}>START HERE</span>}
      <span style={S.cardConnector} aria-hidden />
      <span style={S.cardName}>{item.label}</span>
      {item.note && <span style={S.note}>{item.note}</span>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Styles (ported from OrgChartView so the two previews feel identical) */
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
  title: {
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
    animation: "kitPicksBlink 1.6s infinite",
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
  board: {
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
  card: {
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
  cardStart: {
    borderColor: "var(--kit-acc-line)",
    background: "linear-gradient(180deg,#F3FBF8,#E9F7F1)",
    boxShadow:
      "0 0 0 1px var(--kit-acc-line),0 14px 30px -18px rgba(10,158,132,.7)",
  },
  cardConnector: {
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
  cardName: {
    fontSize: 13,
    fontWeight: 800,
    letterSpacing: "-0.01em",
    lineHeight: 1.15,
  },
  note: {
    fontSize: 11,
    color: "var(--kit-mut)",
    lineHeight: 1.3,
  },
};

/**
 * Inline styles cannot declare @keyframes, so inject them once at module load
 * (guarded for SSR / repeated mounts). Scoped names avoid collisions with
 * OrgChartView's own keyframes.
 */
const KEYFRAMES_ID = "kit-picksboard-keyframes";
if (typeof document !== "undefined" && !document.getElementById(KEYFRAMES_ID)) {
  const style = document.createElement("style");
  style.id = KEYFRAMES_ID;
  style.textContent = `
@keyframes kitPicksPop{from{opacity:0;transform:translateY(8px) scale(.96)}to{opacity:1;transform:none}}
@keyframes kitPicksBlink{50%{opacity:.4}}`;
  document.head.appendChild(style);
}

export default KitPicksBoard;
