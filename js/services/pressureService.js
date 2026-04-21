// js/services/pressureService.js - Motor de Análise de Momento de Pressão v1.0
// Usa IA para interpretar o domínio de jogo baseado em eventos recentes.

import matchState from '../state.js';
import { callAI } from './gemini.js?v=2';

class PressureService {
  constructor() {
    this.lastAnalysis = {
      score: 50,
      narrative: "Equilíbrio tático no centro do campo.",
      timestamp: 0,
      dominance: 'neutral' // 'home', 'away', 'neutral'
    };
    this.isAnalyzing = false;
  }

  /**
   * Analisa os últimos X minutos de partida para detectar pressão.
   * @param {number} windowMinutes Janela de tempo em minutos (default 10)
   */
  async analyzeRecentPressure(windowMinutes = 10) {
    if (this.isAnalyzing) return this.lastAnalysis;
    
    const state = matchState.getState();
    const now = Date.now();
    
    // Evitar análises repetidas em menos de 30 segundos
    if (now - this.lastAnalysis.timestamp < 30000) return this.lastAnalysis;

    this.isAnalyzing = true;
    
    try {
      const currentMin = Math.floor((state.timeElapsed + (state.timerStartedAt && !state.isPaused ? now - state.timerStartedAt : 0)) / 60000);
      const startMin = Math.max(0, currentMin - windowMinutes);
      
      const recentEvents = (state.events || [])
        .filter(e => !e.isAnnulled && e.minute >= startMin && e.minute <= currentMin);

      if (recentEvents.length < 3) {
        this.isAnalyzing = false;
        return this.lastAnalysis;
      }

      // Preparar resumo para a IA
      const homeStats = this.summarizeEvents(recentEvents, 'home');
      const awayStats = this.summarizeEvents(recentEvents, 'away');
      
      const possession = state.possession || { home: 50, away: 50 };
      
      const prompt = `
        Analise o momento de pressão desta partida de futebol nos últimos ${windowMinutes} minutos (Minuto ${startMin} ao ${currentMin}).
        
        EQUIPE MANDANTE (${state.homeTeam.name}):
        - Gols: ${homeStats.goals}
        - Finalizações: ${homeStats.shots}
        - Escanteios: ${homeStats.corners}
        - Faltas: ${homeStats.fouls}
        
        EQUIPE VISITANTE (${state.awayTeam.name}):
        - Gols: ${awayStats.goals}
        - Finalizações: ${awayStats.shots}
        - Escanteios: ${awayStats.corners}
        - Faltas: ${awayStats.fouls}
        
        Posse de bola atual: ${possession.home}% vs ${possession.away}%
        
        OBJETIVO:
        1. Identificar se há um time pressionando intensamente.
        2. Gerar um "Pressure Score" de 0 a 100 (50 = equilíbrio, >50 pressão mandante, <50 pressão visitante).
        3. Gerar uma narrativa curta (máx 15 palavras) sobre o domínio.
        
        RETORNE APENAS JSON: { "score": 75, "narrative": "Pressão total do Mandante, sufocando a saída de bola.", "dominance": "home" }
      `;

      const response = await callAI(prompt);
      const result = this.parseJson(response);
      
      this.lastAnalysis = {
        ...result,
        timestamp: now
      };

      // Notificar sistema sobre mudança de momento (opcional: tocar som ou mudar HUD)
      this.dispatchUpdate();
      
      return this.lastAnalysis;
    } catch (error) {
      console.error("Erro na análise de pressão:", error);
    } finally {
      this.isAnalyzing = false;
    }
  }

  summarizeEvents(events, teamId) {
    const teamEvents = events.filter(e => e.teamId === teamId);
    return {
      goals: teamEvents.filter(e => e.type === 'GOAL').length,
      shots: teamEvents.filter(e => ['SHOT', 'WOODWORK', 'GOAL'].includes(e.type)).length,
      corners: teamEvents.filter(e => e.type === 'CORNER').length,
      fouls: teamEvents.filter(e => e.type === 'FOUL').length
    };
  }

  parseJson(text) {
    try {
      let clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const firstBrace = clean.indexOf('{');
      const lastBrace = clean.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) {
          return JSON.parse(clean.substring(firstBrace, lastBrace + 1));
      }
    } catch (e) {
      console.warn('Falha no parse JSON de pressão:', e);
    }
    return { score: 50, narrative: "Jogo equilibrado.", dominance: 'neutral' };
  }

  dispatchUpdate() {
    const event = new CustomEvent('pressureUpdate', { detail: this.lastAnalysis });
    window.dispatchEvent(event);
  }
}

export const pressureService = new PressureService();
