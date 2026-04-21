/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import { cleanAndParseJSON } from '../js/services/gemini-api.js';

describe('Gemini API Logic - JSON Parsing', () => {
  it('should parse clean JSON correctly', () => {
    const raw = '{"players": [{"name": "Messi"}]}';
    const result = cleanAndParseJSON(raw);
    expect(result.players[0].name).toBe('Messi');
  });

  it('should clean markdown backticks before parsing', () => {
    const raw = '```json\n{"score": 85}\n```';
    const result = cleanAndParseJSON(raw);
    expect(result.score).toBe(85);
  });

  it('should ignore leading/trailing text and find the JSON object', () => {
    const raw = 'Análise concluída: {"dominance": "home"} pronto.';
    const result = cleanAndParseJSON(raw);
    expect(result.dominance).toBe('home');
  });

  it('should return default object on invalid JSON', () => {
    const raw = 'Isso não é um JSON';
    const result = cleanAndParseJSON(raw);
    expect(result.players).toEqual([]);
    expect(result.events).toEqual([]);
  });
});
