/**
 * The moving background behind every public hero.
 *
 * One component so the landing hero and the inner pages cannot drift: the same
 * footage, the same scrim, only the weight changes. `full` is the landing hero;
 * `quiet` is /try, /upgrade, /agents and /auth, where the copy has to carry.
 *
 * Under prefers-reduced-motion the video is dropped for a static emerald wash,
 * so nobody who asked for stillness gets a looping video.
 */

const VIDEO_SRC = '/Mindmaker for Leaders - background video.mp4';

interface HeroBackdropProps {
  weight?: 'full' | 'quiet';
}

export function HeroBackdrop({ weight = 'full' }: HeroBackdropProps) {
  const isFull = weight === 'full';
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <video
        autoPlay
        loop
        muted
        playsInline
        className={`absolute inset-0 h-full w-full object-cover motion-reduce:hidden ${
          isFull ? 'opacity-40' : 'opacity-[0.22]'
        }`}
      >
        <source src={VIDEO_SRC} type="video/mp4" />
      </video>
      {/* Reduced-motion stand-in: the same emerald wash, holding still. */}
      <div
        className={`absolute inset-0 hidden bg-[radial-gradient(45%_55%_at_25%_35%,hsl(var(--accent)/0.30),transparent_65%),radial-gradient(40%_50%_at_75%_60%,hsl(var(--accent)/0.18),transparent_68%)] motion-reduce:block ${
          isFull ? '' : 'opacity-50'
        }`}
      />
      <div className={`absolute inset-0 ${isFull ? 'bg-black/50' : 'bg-black/65'}`} />
    </div>
  );
}
