import anthropicMark from '@/assets/tools/anthropic.svg';
import cursorMark from '@/assets/tools/cursor.svg';
import googleMark from '@/assets/tools/google.svg';
import openaiMark from '@/assets/tools/openai.svg';
import { LANDING, TOOLS } from './publicCopy';

/**
 * The "works with" wall, drifting slowly under the hero.
 *
 * The names come from the approved copy; this file only supplies the mark that
 * goes beside each one. The marks ship as their vendors publish them and are
 * rendered through brightness(0) invert(1), which flattens every one of them to
 * the same white silhouette. That is deliberate: the four assets arrive in four
 * different treatments (two near-black, one black cube, one four-colour), so on
 * a near-black page a raw row is half invisible and half shouting.
 *
 * The track holds the list twice and travels exactly half its width, so the
 * loop closes with no visible seam. Under prefers-reduced-motion it stops dead
 * and simply reads as a row.
 */
const MARKS: Record<string, string> = {
  ChatGPT: openaiMark,
  Claude: anthropicMark,
  Gemini: googleMark,
  Cursor: cursorMark,
  'Claude Code': anthropicMark,
};

function Tool({ name }: { name: string }) {
  const mark = MARKS[name];
  return (
    <span className="flex shrink-0 items-center gap-2.5">
      {mark && (
        <img
          src={mark}
          alt=""
          aria-hidden="true"
          className="h-[18px] w-auto shrink-0 opacity-45 brightness-0 invert"
        />
      )}
      <span className="whitespace-nowrap text-[12.5px] text-foreground/45">{name}</span>
    </span>
  );
}

export function ToolMarquee() {
  return (
    <div className="w-full">
      <p className="text-center font-display text-[9.5px] font-medium uppercase tracking-[0.14em] text-foreground/30">
        {LANDING.toolsLbl}
      </p>

      <div className="relative mt-4 overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_14%,#000_86%,transparent)]">
        <div className="flex w-max animate-marquee items-center gap-x-9 motion-reduce:animate-none sm:gap-x-12">
          {[...TOOLS, ...TOOLS].map((name, i) => (
            <Tool key={`${name}-${i}`} name={name} />
          ))}
        </div>
      </div>
    </div>
  );
}
