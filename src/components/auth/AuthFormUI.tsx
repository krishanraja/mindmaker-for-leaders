import { Loader2 } from 'lucide-react';

export function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

export function GoogleAuthButton({ loading, disabled, onClick }: { loading: boolean; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex min-h-12 w-full items-center justify-center rounded-2xl border border-[#f5f1ea]/20 px-5 font-mymu-serif text-base text-[#f5f1ea] transition-colors hover:border-[#f5f1ea]/45 hover:bg-[#f5f1ea]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f5f1ea] disabled:opacity-55"
    >
      {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <GoogleIcon className="mr-2 h-4 w-4" />}
      Continue with Google
    </button>
  );
}

export function AuthDivider() {
  return (
    <div className="flex items-center gap-4" aria-hidden="true">
      <span className="h-px flex-1 bg-[#f5f1ea]/12" />
      <span className="font-mymu-mono text-[9px] uppercase tracking-[0.2em] text-[#f5f1ea]/35">or use email</span>
      <span className="h-px flex-1 bg-[#f5f1ea]/12" />
    </div>
  );
}

export const authLabelClass = 'font-mymu-mono text-[10px] uppercase tracking-[0.16em] text-[#f5f1ea]/50';
export const authInputClass = 'mt-2 h-12 w-full rounded-none border-0 border-b border-[#f5f1ea]/22 bg-transparent px-0 font-mymu-serif text-lg text-[#f5f1ea] outline-none transition-colors placeholder:text-[#f5f1ea]/24 focus:border-[#f5f1ea] focus-visible:ring-0';
export const authSubmitClass = 'flex min-h-14 w-full items-center justify-center rounded-2xl bg-[#f5f1ea] px-5 font-mymu-serif text-lg font-semibold text-[#0a0908] transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f5f1ea] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0908] disabled:translate-y-0 disabled:opacity-55';

export function AuthError({ message }: { message: string | null }) {
  if (!message) return null;
  return <p role="alert" aria-live="polite" className="rounded-2xl bg-[#fb7185]/10 px-4 py-3 font-mymu-serif text-sm leading-relaxed text-[#fda4af]">{message}</p>;
}
