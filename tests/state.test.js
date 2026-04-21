/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import matchState from '../js/state.js';

describe('MatchState - Core Logic', () => {
  beforeEach(() => {
    matchState.handleReset();
    // Mock global components to avoid window errors
    vi.stubGlobal('window', { toastManager: { show: vi.fn() } });
    vi.stubGlobal('crypto', { randomUUID: () => Math.random().toString(36) });
  });

  it('should correctly increment home score when a goal is added', () => {
    matchState.addEvent({ type: 'GOAL', teamId: 'home', description: 'Gol!' });
    expect(matchState.getState().score.home).toBe(1);
  });

  it('should handle auto-red card after two yellow cards', async () => {
    const playerId = 'player-1';
    // Mock findPlayer
    vi.spyOn(matchState, 'findPlayer').mockReturnValue({ id: playerId, name: 'Test', number: 10 });

    matchState.addEvent({ type: 'YELLOW_CARD', teamId: 'home', playerId });
    matchState.addEvent({ type: 'YELLOW_CARD', teamId: 'home', playerId });

    // Wait for the setTimeout in state.js
    await new Promise(r => setTimeout(r, 200));

    const redCards = matchState.getState().events.filter(e => e.type === 'RED_CARD');
    expect(redCards.length).toBe(1);
  });
});
