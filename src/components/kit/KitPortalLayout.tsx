import { useEffect, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { formatPassDate } from "@/lib/kit";
import "./kit-portal.css";

interface KitPortalLayoutProps {
  /** Class title chip in the header, e.g. "Vibe Coding Field Kit". */
  classTitle?: string | null;
  /** When known, a quiet "Pass ends {date}" sits in the header. */
  passEndsAt?: string | null;
  children: ReactNode;
}

/**
 * The slim shell every kit portal page shares. Students scan a QR mid-class
 * on their phone, so this is deliberately landing-page calm.
 *
 * Brand: the portal is the one light-mode, Mindmaker-branded surface in the
 * forced-dark CTRL app. The `.kit-portal` scope (see kit-portal.css) re-maps
 * the shadcn tokens to the locked mock's premium light palette, so every kit
 * page that renders inside this layout inherits the brand with no extra work.
 * The Mindmaker wordmark sits in the header; Gobold is reserved for the
 * wordmark + small uppercase labels; Inter carries body and lowercase
 * headlines.
 */
export function KitPortalLayout({ classTitle, passEndsAt, children }: KitPortalLayoutProps) {
  // The portal is always light, whatever theme the app shell is in. Restore
  // the previous theme class when the student leaves the portal.
  useEffect(() => {
    const root = document.documentElement;
    const hadDark = root.classList.contains("dark");
    root.classList.remove("dark");
    return () => {
      if (hadDark) root.classList.add("dark");
    };
  }, []);

  // The app shell sets html/body/#root to height:100% overflow:hidden (the
  // no-scroll pattern), so the portal must own its own scroll. A fixed-height
  // flex column with a scrollable main keeps the header pinned and lets the
  // kit page (which runs well past one screen) scroll on mobile.
  return (
    <div className="kit-portal flex h-screen-safe flex-col overflow-hidden text-foreground">
      <header className="shrink-0 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-2xl items-center justify-between gap-3 px-5 py-4">
          <Link
            to="/kit/me"
            aria-label="Your Mindmaker kit"
            className="flex shrink-0 items-center gap-3"
          >
            <img
              src="/mindmaker-wordmark-onlight.png"
              alt="Mindmaker"
              className="kit-wordmark"
            />
          </Link>
          <div className="flex min-w-0 items-center gap-3">
            {classTitle && (
              <span className="kit-tag truncate rounded-full border border-[color:var(--kit-acc-line)] bg-[color:var(--kit-acc-soft)] px-3 py-1 text-[color:var(--kit-acc-deep)]">
                {classTitle}
              </span>
            )}
            {passEndsAt && (
              <span className="hidden whitespace-nowrap text-[11px] text-muted-foreground sm:block">
                Pass ends {formatPassDate(passEndsAt)}
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto w-full max-w-2xl px-5 py-8 sm:py-12">{children}</div>
        <footer className="pb-8 pt-4 text-center">
          <span className="kit-label text-[10px]">CTRL by Mindmaker</span>
        </footer>
      </main>
    </div>
  );
}
