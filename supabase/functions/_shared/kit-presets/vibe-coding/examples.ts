/**
 * Vibe Coding Field Kit: the Meridian Media worked example.
 *
 * Fictional throughout. This is the "shown done" side of the kit's
 * artifacts: a media-sales dashboard build with enough texture that a
 * student can see what good looks like before writing their own.
 */

export const MERIDIAN_SCENARIO = `Meridian Media is a fictional forty-person media sales house: three owned websites, a podcast network, eight sellers. Dana Okafor runs sales operations. Every Monday she spent ninety minutes rebuilding the same pacing update by hand: delivery numbers out of Google Ad Manager, deals out of HubSpot, targets out of a finance spreadsheet, all pasted into slides for the 9am revenue call. She wrote this brief before typing a single prompt. Version one took her a weekend in Lovable; the Monday deck was retired three weeks later.`;

export const MERIDIAN_BRIEF = `# Build brief: Monday pacing dashboard

## 1. Goal
The 9am Monday revenue call starts with everyone looking at the same live pacing numbers, and my ninety-minute Monday rebuild is gone by the end of the month.

## 2. Context
I run sales ops at Meridian Media. We sell advertising across three owned sites and a podcast network; eight sellers, two sales managers, one MD. Revenue data lives in three places: delivered impressions and revenue in Google Ad Manager, booked and pipeline deals in HubSpot, monthly targets in a finance-owned Google Sheet (tab "FY Targets", columns B to F, one row per seller). Today I export from each, reconcile in Excel, and paste charts into slides. It takes about ninety minutes and the deck is stale by Tuesday. Nobody edits any of it but me.

## 3. Format
One page, no tabs, readable on a phone in the lift on the way to the call.
- Top: month-to-date revenue against target as one big number, with pace in dollars and percent, ahead or behind.
- Middle: a table by seller: booked, delivered, gap to target. Sorted by gap, worst first, because that is the order the call runs in.
- Bottom: the five most at-risk deals from HubSpot: deal name, stage, value, close date, days since last activity.
- Top right: "Data as at [timestamp]". Numbers in AUD, thousands separated, no decimals.

## 4. Constraints
- Build in Lovable. Data in via scheduled CSV export from Google Ad Manager and the HubSpot API; targets read straight from the finance sheet.
- Read-only everywhere. The dashboard never writes back to any source system.
- Deal names can show; contact names, emails and phone numbers cannot.
- Refresh at 7am on weekdays and on page load. Nothing real-time; Monday morning truth is the job.
- Stakes tier: With review. I check every number against source on the first four Mondays before the team treats it as truth.
- No new vendors, nothing over $50 a month.

## 5. Acceptance
Shipped means something a teammate touched, not a demo.
1. Monday 8:55am: the MD opens the link on his phone and sees numbers no older than 7am that day.
2. I spot-check one seller's row against Google Ad Manager and HubSpot directly; it matches to the dollar.
3. A seller who has never seen it finds their own gap to target in under thirty seconds, unprompted.
4. By week three, nobody has asked for the deck.`;

/** The example appended to the student's brief under a worked-example divider. */
export const MERIDIAN_WORKED_EXAMPLE = `${MERIDIAN_SCENARIO}

${MERIDIAN_BRIEF}`;
