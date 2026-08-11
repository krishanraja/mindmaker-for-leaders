import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FirstLens } from '@/components/cockpit/FirstLens';

const signal = {
  q2: 'do',
  q4: 'hybrid',
  anxietyLane: 'orchestration',
  archetypeTitle: 'The operator running humans and agents as one team',
};

describe('FirstLens', () => {
  it('renders the approved handoff hierarchy and privacy boundary', () => {
    render(
      <FirstLens
        variant="desktop"
        signal={signal}
        saving={false}
        error={null}
        onConfirm={vi.fn()}
        onDismiss={vi.fn()}
        onWeigh={vi.fn()}
      />,
    );

    expect(screen.getByRole('heading', { name: 'I know what to watch for now.' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Wire agents into the work. Keep judgment human.' })).toBeInTheDocument();
    expect(screen.getByText(/exact words stayed private/i)).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /personal CTRL lens/i })).toBeInTheDocument();
  });

  it('keeps confirmation, dismissal, and the first decision as explicit actions', () => {
    const onConfirm = vi.fn();
    const onDismiss = vi.fn();
    const onWeigh = vi.fn();
    render(
      <FirstLens
        variant="mobile"
        signal={signal}
        saving={false}
        error={null}
        onConfirm={onConfirm}
        onDismiss={onDismiss}
        onWeigh={onWeigh}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /yes, start here/i }));
    fireEvent.click(screen.getByRole('button', { name: /not quite/i }));
    fireEvent.click(screen.getByRole('button', { name: /weigh it/i }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(onWeigh).toHaveBeenCalledWith('Where should AI take work off my team first?');
  });

  it('keeps a failed save visible and retryable', () => {
    render(
      <FirstLens
        variant="mobile"
        signal={signal}
        saving={false}
        error="I could not save that starting point. Try once more."
        onConfirm={vi.fn()}
        onDismiss={vi.fn()}
        onWeigh={vi.fn()}
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Try once more');
    expect(screen.getByRole('button', { name: /yes, start here/i })).toBeEnabled();
  });
});
