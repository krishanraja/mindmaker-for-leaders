// GlobalBriefingPlayer - the briefing audio player, mounted ONCE app-wide.
//
// The briefing is an audio drawer, not a page. It is driven entirely by the
// app-wide BriefingContext, so mounting it once in the authed layout lets the
// top-bar "Your audio digest" button open + play it from ANY tab, with one tap.
// (Previously it was re-mounted per page, which is why it only worked on
// /briefing and the Home door had to navigate there first.)

import { BriefingSheet } from './BriefingSheet';
import { MiniPlayer } from './MiniPlayer';

export function GlobalBriefingPlayer() {
  return (
    <>
      <MiniPlayer />
      <BriefingSheet />
    </>
  );
}
