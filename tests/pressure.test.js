/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { pressureService } from '../js/services/pressureService.js';
import matchState from '../js/state.js';

// Mock do serviço Gemini
import * as gemini from '../js/services/gemini-api.js';
vi.spyOn(gemini, 'callAI').mockImplementation(() => Promise.resolve(JSON.stringify({
  score: 85,
  narrative: "Pressão total simulada.",
  dominance: "home"
})));

describe('PressureService - IA Logic', () => {
  beforeEach(() => {
    matchState.handleReset();
    pressureService.reset();
    vi.stubGlobal('window', { 
      dispatchEvent: vi.fn(),
      location: { protocol: 'http:', host: 'localhost:8080', hostname: 'localhost' }
    });
  });

  it('should analyze pressure based on recent events', async () => {
    // Simular que o jogo está no minuto 10
    matchState.setState({ timeElapsed: 10 * 60000 });

    matchState.addEvent({ type: 'SHOT', teamId: 'home' });
    matchState.addEvent({ type: 'CORNER', teamId: 'home' });
    matchState.addEvent({ type: 'SHOT', teamId: 'home' });

    const analysis = await pressureService.analyzeRecentPressure(10);
    
    expect(analysis.score).toBe(85);
    expect(analysis.dominance).toBe('home');
  });

  it('should respect analysis cooldown (debounce)', async () => {
    const firstRun = await pressureService.analyzeRecentPressure();
    const secondRun = await pressureService.analyzeRecentPressure();
    expect(firstRun.timestamp).toBe(secondRun.timestamp);
  });

  it('should handle IA parsing errors gracefully', async () => {
    matchState.setState({ timeElapsed: 5 * 60000 });
    matchState.addEvent({ type: 'SHOT', teamId: 'home' });
    matchState.addEvent({ type: 'SHOT', teamId: 'home' });
    matchState.addEvent({ type: 'SHOT', teamId: 'home' });

    // Mock retornando lixo
    vi.spyOn(gemini, 'callAI').mockImplementationOnce(() => Promise.resolve('Lixo não JSON'));
    
    const analysis = await pressureService.analyzeRecentPressure(10);
    expect(analysis.score).toBe(50); // Deve retornar default
  });

  it('should handle IA network errors gracefully', async () => {
    matchState.setState({ timeElapsed: 5 * 60000 });
    matchState.addEvent({ type: 'SHOT', teamId: 'home' });
    matchState.addEvent({ type: 'SHOT', teamId: 'home' });
    matchState.addEvent({ type: 'SHOT', teamId: 'home' });

    vi.spyOn(gemini, 'callAI').mockImplementationOnce(() => Promise.reject('Network Error'));
    
    const analysis = await pressureService.analyzeRecentPressure(10);
    expect(analysis.score).toBe(50);
  });
});
