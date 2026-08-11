export type ExtraSelf = 'think' | 'do' | 'talk' | 'watch';
export type CompanyFuture = 'same' | 'leaner' | 'hybrid' | 'autonomous';

export interface OnboardingAnswers {
  weekNeedsMe: number;
  extraSelf: ExtraSelf;
  companyAi: number;
  companyFuture: CompanyFuture;
  delayedDecision: string;
}

export interface OnboardingResult {
  archetypeTitle: string;
  archetypeKey: string;
  archetypeVariant: 'A' | 'B';
  twelveMonths: string;
  threeYears: string;
}

export const extraSelfOptions: Array<{ value: ExtraSelf; label: string }> = [
  { value: 'think', label: 'Thinking. The deep work I never get to.' },
  { value: 'do', label: 'Doing. The execution that piles up.' },
  { value: 'talk', label: 'Talking. The conversations that move the business.' },
  { value: 'watch', label: "Watching. Knowing what's actually happening." },
];

export const companyFutureOptions: Array<{ value: CompanyFuture; label: string }> = [
  { value: 'same', label: 'The same one, just sharper.' },
  { value: 'leaner', label: 'A leaner one. Half the headcount, double the output.' },
  { value: 'hybrid', label: 'A hybrid. Humans and agents working as one team.' },
  { value: 'autonomous', label: 'An autonomous business. I set direction, the system runs.' },
];

export const delayedDecisionExamples = [
  'Which AI tools to actually consolidate',
  "How to tell my board what's really happening",
  'Whether to rebuild the team around AI',
  'What only I should still decide',
];

export function weekNeedsMeLabel(value: number): string {
  if (value < 20) return 'Almost none of it';
  if (value < 50) return 'About a quarter to half';
  if (value < 80) return 'Most of it';
  return "All of it, and that's the problem";
}

export function companyAiLabel(value: number): string {
  if (value < 20) return 'A few corners';
  if (value < 50) return 'A whole function';
  if (value < 80) return 'Most of operations';
  return 'Almost everything except the choices';
}

const archetypes: Record<ExtraSelf, Record<CompanyFuture, [string, string]>> = {
  think: {
    same: ['The operator who finally has time to think.', 'The leader who decides faster than the room expects.'],
    leaner: ['The thinker running half a company twice as well.', 'The leader whose smallest team builds the biggest thing.'],
    hybrid: ['The mind behind the machine and the team.', 'The operator who hires agents the way they used to hire people.'],
    autonomous: ['The architect of a business that runs without them.', 'The mind that designed the system that runs the business.'],
  },
  do: {
    same: ['The doer who stopped being the bottleneck.', 'The operator whose execution finally caught up with their ambition.'],
    leaner: ['The leader whose team ships twice as much with half the headcount.', 'The doer who builds in days what teams used to build in quarters.'],
    hybrid: ['The operator running humans and agents as one team.', 'The leader who finally has the leverage their instincts deserved.'],
    autonomous: ['The builder of the business that builds itself.', 'The operator whose system out-executes their old company.'],
  },
  talk: {
    same: ['The leader people listen to because they actually know.', 'The operator whose conversations move the business every week.'],
    leaner: ['The leader of a smaller, sharper room.', 'The operator whose words now move a tighter system.'],
    hybrid: ['The voice both humans and agents are tuned to.', "The operator running the meetings AI couldn't replace."],
    autonomous: ['The director of a system they no longer have to manage.', "The leader whose conversations are the company's only manual input."],
  },
  watch: {
    same: ["The leader who finally sees what's actually happening.", 'The operator with the dashboard their old company never had.'],
    leaner: ['The leader who runs a small company they can hold in their head.', 'The operator whose visibility scales faster than their headcount.'],
    hybrid: ['The leader who watches the agents work and steps in only when needed.', 'The operator whose attention now goes where it matters.'],
    autonomous: ['The pilot of a business they can finally read like a book.', 'The leader who knows every important thing happening, instantly.'],
  },
};

function stableVariant(responseId: string): 'A' | 'B' {
  let hash = 0;
  for (let index = 0; index < responseId.length; index += 1) {
    hash = (hash * 31 + responseId.charCodeAt(index)) | 0;
  }
  return Math.abs(hash) % 2 === 0 ? 'A' : 'B';
}

export function fallbackResult(responseId: string, answers: OnboardingAnswers): OnboardingResult {
  const variant = stableVariant(responseId);
  const titles = archetypes[answers.extraSelf][answers.companyFuture];
  const leverage = answers.extraSelf === 'think'
    ? 'space to think before the room needs an answer'
    : answers.extraSelf === 'do'
      ? 'execution that no longer waits for you'
      : answers.extraSelf === 'talk'
        ? 'conversations reserved for the moments that need you'
        : 'a clear view of what deserves your attention';

  return {
    archetypeTitle: titles[variant === 'A' ? 0 : 1],
    archetypeKey: `${answers.extraSelf}+${answers.companyFuture}`,
    archetypeVariant: variant,
    twelveMonths: `A year from now, you have ${leverage}. The work still feels like yours, but far less of it depends on you being everywhere at once.`,
    threeYears: `Three years from now, the company is ${answers.companyFuture === 'same' ? 'recognisably yours, only sharper' : answers.companyFuture === 'leaner' ? 'smaller, faster and clearer' : answers.companyFuture === 'hybrid' ? 'run by humans and agents as one team' : 'a system you direct rather than a machine you carry'}. The choices remain human. The drag does not.`,
  };
}
