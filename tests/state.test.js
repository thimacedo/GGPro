/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import matchState from '../js/state.js';

describe('MatchState - 100% Coverage Suite', () => {
  beforeEach(() => {
    localStorage.clear();
    matchState.handleReset();
    vi.stubGlobal('window', { dispatchEvent: vi.fn() });
    vi.stubGlobal('crypto', { randomUUID: () => 'test-uuid-' + Math.random() });
  });

  describe('Core & Persistence', () => {
    it('should initialize with default state', () => {
      const state = matchState.getState();
      expect(state.period).toBe('PRE_MATCH');
      expect(state.score.home).toBe(0);
    });

    it('should persist and load from localStorage', () => {
      matchState.setState({ period: '2T' });
      // Simular novo carregamento
      matchState.init();
      expect(matchState.getState().period).toBe('2T');
    });

    it('should handle corrupted JSON in localStorage gracefully', () => {
      localStorage.setItem('narrador_pro_v3_state', 'invalid-json');
      matchState.init();
      expect(matchState.getState().period).toBe('PRE_MATCH');
    });

    it('should handle notification listeners', () => {
      const listener = vi.fn();
      const unsubscribe = matchState.subscribe(listener);
      matchState.setState({ lastAction: 'TEST' });
      expect(listener).toHaveBeenCalled();
      
      unsubscribe();
      matchState.setState({ lastAction: 'TEST2' });
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe('Event Engine', () => {
    it('should increment scores for both teams', () => {
      matchState.addEvent({ type: 'GOAL', teamId: 'home' });
      matchState.addEvent({ type: 'GOAL', teamId: 'away' });
      const state = matchState.getState();
      expect(state.score.home).toBe(1);
      expect(state.score.away).toBe(1);
    });

    it('should process auto-red card (2nd yellow)', () => {
      const pId = 'p1';
      matchState.addEvent({ type: 'YELLOW_CARD', teamId: 'home', playerId: pId });
      matchState.addEvent({ type: 'YELLOW_CARD', teamId: 'home', playerId: pId });
      
      const events = matchState.getState().events;
      expect(events[0].type).toBe('RED_CARD');
      expect(events[0].description).toContain('Expulsão automática');
    });

    it('should handle events without teamId', () => {
      matchState.addEvent({ type: 'GENERIC', description: 'Tempo técnico' });
      expect(matchState.getState().events[0].type).toBe('GENERIC');
    });
  });

  describe('History & Undo', () => {
    it('should undo last action correctly', () => {
      matchState.addEvent({ type: 'GOAL', teamId: 'home' });
      expect(matchState.getState().score.home).toBe(1);
      
      matchState.handleUndo();
      expect(matchState.getState().score.home).toBe(0);
      expect(matchState.getState().events.length).toBe(0);
    });

    it('should limit history size', () => {
      for(let i=0; i<60; i++) {
        matchState.addEvent({ type: 'SHOT', teamId: 'home' });
      }
      expect(matchState.history.length).toBe(50);
    });
  });

  describe('Periods & Helpers', () => {
    it('should advance periods in sequence', () => {
      expect(matchState.getState().period).toBe('PRE_MATCH');
      matchState.advancePeriod();
      expect(matchState.getState().period).toBe('1T');
      matchState.advancePeriod();
      expect(matchState.getState().period).toBe('INTERVAL');
    });

    it('should force a specific period', () => {
      matchState.advancePeriod('PENALTIES');
      expect(matchState.getState().period).toBe('PENALTIES');
    });

    it('should return team short names correctly', () => {
      expect(matchState.getTeamShortName('home')).toBe('CAS');
      expect(matchState.getTeamShortName('away')).toBe('VIS');
      expect(matchState.getTeamShortName('invalid')).toBe('');
    });

    it('should find players in both teams', () => {
      const p = { id: 'test-p', name: 'Player', number: 7 };
      matchState.setState(s => {
        s.homeTeam.players = [p];
        return s;
      });
      expect(matchState.findPlayer('test-p')).toEqual(p);
      expect(matchState.findPlayer('ghost')).toBeUndefined();
    });
  });
});
