/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { pressureService } from '../js/services/pressureService.js';
import matchState from '../js/state.js';

// Importar tudo de gemini para mockar
import * as gemini from '../js/services/gemini.js?v=2';

// Spy no método callAI
const callAISpy = vi.spyOn(gemini, 'callAI').mockImplementation(() => Promise.resolve(JSON.stringify({
  score: 85,
  narrative: "Pressão total simulada.",
  dominance: "home"
})));

describe('PressureService - IA Logic', () => {
  beforeEach(() => {
    matchState.handleReset();
    vi.stubGlobal('window', { 
      dispatchEvent: vi.fn(),
      location: { protocol: 'http:', host: 'localhost:8080', hostname: 'localhost' }
    });
  });

  it('should analyze pressure based on recent events', async () => {
    // Adicionar eventos simulados nos últimos 10 minutos
    matchState.addEvent({ type: 'SHOT', teamId: 'home', minute: 5 });
    matchState.addEvent({ type: 'CORNER', teamId: 'home', minute: 7 });
    matchState.addEvent({ type: 'SHOT', teamId: 'home', minute: 9 });

    const analysis = await pressureService.analyzeRecentPressure(10);
    
    expect(analysis.score).toBe(85);
    expect(analysis.dominance).toBe('home');
  });

  it('should respect analysis cooldown (debounce)', async () => {
    const firstRun = await pressureService.analyzeRecentPressure();
    const secondRun = await pressureService.analyzeRecentPressure();
    
    // O timestamp deve ser o mesmo indicando que a segunda chamada retornou o cache
    expect(firstRun.timestamp).toBe(secondRun.timestamp);
  });
});
