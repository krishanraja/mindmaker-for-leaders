import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BlindSpotInstrument } from '@/components/blind-spot/BlindSpotInstrument';
import { blindSpotPatternFixture, blindSpotTensionFixture } from '@/components/blind-spot/fixtures';

const callbacks = () => ({ onConfirm: vi.fn(), onReject: vi.fn(), onTalk: vi.fn() });

describe('BlindSpotInstrument', () => {
  it('renders the approved private read, grounded strength and experiment', () => {
    render(<BlindSpotInstrument candidate={blindSpotPatternFixture} {...callbacks()} />);
    expect(screen.getByText('Between us')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Strategy is outrunning ownership.' })).toBeInTheDocument();
    expect(screen.getByLabelText(/Evidence strength: 3 signals · 2 sources · 6 weeks/i)).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /tension between your intention/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Hand over one live product call.' })).toBeInTheDocument();
  });

  it('keeps confirmation, correction and advisor paths explicit', () => {
    const handlers = callbacks();
    render(<BlindSpotInstrument candidate={blindSpotPatternFixture} {...handlers} />);
    fireEvent.click(screen.getByRole('button', { name: /try this/i }));
    fireEvent.click(screen.getByRole('button', { name: /not quite/i }));
    fireEvent.click(screen.getByRole('button', { name: /talk this through/i }));
    expect(handlers.onConfirm).toHaveBeenCalledTimes(1);
    expect(handlers.onReject).toHaveBeenCalledTimes(1);
    expect(handlers.onTalk).toHaveBeenCalledTimes(1);
  });

  it('opens the exact stored evidence without model paraphrase', () => {
    render(<BlindSpotInstrument candidate={blindSpotPatternFixture} {...callbacks()} />);
    fireEvent.click(screen.getByRole('button', { name: /Your objective/i }));
    expect(screen.getByRole('dialog')).toHaveTextContent('Build a team that can ship without me in every loop.');
  });

  it('presents thin evidence as a question and offers no save action', () => {
    render(<BlindSpotInstrument candidate={blindSpotTensionFixture} {...callbacks()} />);
    expect(screen.getByText('A question, not a claim')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /try this/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /talk this through/i })).toBeInTheDocument();
  });

  it.each(['accepted', 'rejected', 'stale-evidence'] as const)('renders the %s fixture state', (status) => {
    render(<BlindSpotInstrument candidate={blindSpotPatternFixture} status={status} {...callbacks()} />);
    if (status === 'accepted') expect(screen.getByText(/future briefing/i)).toBeInTheDocument();
    if (status === 'rejected') expect(screen.getByText(/until the evidence changes/i)).toBeInTheDocument();
    if (status === 'stale-evidence') expect(screen.getByRole('alert')).toHaveTextContent(/evidence changed/i);
  });
});
