import { useEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import briefingSample from '@/assets/briefing-sample.mp3';
import { LANDING } from './publicCopy';

/**
 * BriefingSample - hear what the daily read sounds like, or read it.
 *
 * The audio is REAL. It came out of the same ElevenLabs voice the product
 * speaks with (voice 7ApmIXLoWa0cKUtJqfHc, eleven_multilingual_v2, the same
 * stability, style and speaker-boost settings the briefing uses), generated
 * through the deployed synthesize path rather than typed up somewhere else. So
 * "this is what yours sounds like" is a claim about the voice that holds.
 *
 * The WORDS are a sample, and the page says so under the player. A real
 * briefing cites the morning's actual headlines, which means any recording of
 * one is out of date within a day and a visitor in three months would hear
 * stale news and read it as an abandoned product. The sample keeps the format
 * exactly (cold open on the name, no greeting, the story, the nudge, the one
 * thing worth acting on) and leaves the specific story evergreen.
 *
 * THE TRANSCRIPT IS NOT A CAPTION TRACK, IT IS THE POINT. Most people scroll a
 * landing page with the sound off, so the words carry the whole beat on their
 * own and the audio is the reward for anyone who taps. That also means the
 * screen-reader path and the sound-off path are the same path, rather than an
 * accessibility afterthought bolted to a player.
 *
 * preload="none" so nothing is fetched until someone asks for it. The file is
 * 406KB, which would be a rude thing to spend on every visitor who never taps.
 */

/** The spoken words, verbatim. If the audio is regenerated, this changes with it. */
const TRANSCRIPT =
  'Alex, three things before your first meeting. First: inference pricing moved again, ' +
  'and it moves your build-versus-buy maths. The thing you costed out in March is cheaper ' +
  'now than the tool you were going to buy instead. Worth pressure-testing that assumption ' +
  'before you sign anything. The one thing from today worth acting on: re-run the numbers ' +
  'on the decision you parked.';

export function BriefingSample() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  // A player whose file will not load should not render a button that lies.
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    // Progress is read off the element, never interpolated from a timer, so the
    // bar cannot drift away from what is actually being heard.
    const onTime = () => {
      if (el.duration > 0) setProgress((el.currentTime / el.duration) * 100);
    };
    const onEnd = () => {
      setPlaying(false);
      setProgress(0);
      el.currentTime = 0;
    };
    const onError = () => {
      setBroken(true);
      setPlaying(false);
    };
    el.addEventListener('timeupdate', onTime);
    el.addEventListener('ended', onEnd);
    el.addEventListener('error', onError);
    return () => {
      el.removeEventListener('timeupdate', onTime);
      el.removeEventListener('ended', onEnd);
      el.removeEventListener('error', onError);
      el.pause();
    };
  }, []);

  const toggle = () => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) {
      el.pause();
      setPlaying(false);
      return;
    }
    // A blocked or failed play() must not leave the button stuck showing pause.
    void el.play().then(() => setPlaying(true)).catch(() => setBroken(true));
  };

  return (
    <div className="mt-8 rounded-2xl border border-border bg-card/40 p-5 sm:p-7">
      <div className="flex items-start gap-4 sm:gap-5">
        {!broken && (
          <button
            type="button"
            onClick={toggle}
            aria-label={playing ? 'Pause the sample briefing' : 'Play the sample briefing'}
            aria-pressed={playing}
            className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            {playing
              ? <Pause className="h-[18px] w-[18px]" fill="currentColor" />
              : <Play className="ml-0.5 h-[18px] w-[18px]" fill="currentColor" />}
          </button>
        )}

        <div className="min-w-0 flex-1">
          <p className="text-[15px] leading-[1.65] text-foreground sm:text-[16px]">{TRANSCRIPT}</p>

          {!broken && (
            <div className="mt-4 flex items-center gap-3">
              <div className="h-[3px] flex-1 overflow-hidden rounded-full bg-border">
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-150 ease-linear"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="shrink-0 font-display text-[12px] tabular-nums text-muted-foreground">
                0:26
              </span>
            </div>
          )}
        </div>
      </div>

      <p className="mt-5 border-t border-border/70 pt-4 text-[13px] leading-[1.6] text-muted-foreground">
        {LANDING.readNote}
      </p>

      <audio ref={audioRef} src={briefingSample} preload="none" />
    </div>
  );
}
