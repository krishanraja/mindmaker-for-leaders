import { useEffect, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { CtrlLogo } from "@/components/landing/CtrlLogo";
import { formatPassDate } from "@/lib/kit";

interface KitPortalLayoutProps {
  /** Class title chip in the header, e.g. "Vibe Coding Field Kit". */
  classTitle?: string | null;
  /** When known, a quiet "Pass ends {date}" sits in the header. */
  passEndsAt?: string | null;
  children: ReactNode;
}

/**
 * The slim shell every kit portal page shares. Students scan a QR mid-class
 * on their phone, so this is deliberately landing-page calm: warm light
 * background, one centred column, no app chrome.
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

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/85 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-2xl items-center justify-between gap-3 px-5 py-3.5">
          <Link to="/kit/me" aria-label="Your kit" className="flex shrink-0 items-center gap-2">
            <img src="/mindmaker-favicon.png" alt="" className="h-6 w-6" />
            <CtrlLogo className="h-3.5 w-auto" />
          </Link>
          <div className="flex min-w-0 items-center gap-3">
            {classTitle && (
              <span className="truncate rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-foreground/80">
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

      <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-8 sm:py-12">{children}</main>

      <footer className="pb-8 pt-4 text-center text-xs text-muted-foreground">
        CTRL by Mindmaker
      </footer>
    </div>
  );
}
