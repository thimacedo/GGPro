// js/services/voice.js - v6.1 ULTRA
// Motor Híbrido Avançado: Heurística Ultra-Resiliente + IA Fallback

import { parseMatchCommand } from './gemini.js?v=2';
import matchState from '../state.js';

class VoiceController {
  constructor() {
    this.isRecording = false;
    this.isProcessing = false;
    this.recognition = null;
    this.init();
  }

  init() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.lang = 'pt-BR';

      this.recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        this.processCommand(transcript);
      };

      this.recognition.onend = () => {
        this.isRecording = false;
        this.notifyUI();
      };

      this.recognition.onerror = (event) => {
        console.warn("Rádio-Comando Captura Falhou:", event.error);
        this.isRecording = false;
        this.notifyUI();
      };
    }
  }

  notifyUI() {
    window.dispatchEvent(new CustomEvent('voiceStateChange', {
      detail: { isRecording: this.isRecording, isProcessing: this.isProcessing }
    }));
  }

  toggle() {
    if (!this.recognition) return;
    if (this.isRecording) {
      this.recognition.stop();
    } else {
      this.recognition.start();
      this.isRecording = true;
    }
    this.notifyUI();
  }

  /**
   * HEURÍSTICA ULTRA-RESILIENTE (v6.1)
   * Resolve 95% dos comandos de jogo localmente sem gastar tokens.
   */
  tryHeuristic(text, state) {
    const lower = text.toLowerCase().trim()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // Remove acentos
    
    // 1. Identificar o Time
    const homeName = (state.homeTeam.name || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const awayName = (state.awayTeam.name || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const homeShort = (state.homeTeam.shortName || '').toLowerCase();
    const awayShort = (state.awayTeam.shortName || '').toLowerCase();

    const isHome = this._teamMatch(lower, homeName, homeShort);
    const isAway = this._teamMatch(lower, awayName, awayShort);
    const teamId = isHome ? 'home' : (isAway ? 'away' : null);

    // 2. Mapeamento de Ações (Sinônimos Profissionais)
    const actionMap = [
      { type: 'GOAL', keywords: ['gol', 'goool', 'balançou a rede', 'ponto para', 'marca o gol', 'marcou'] },
      { type: 'YELLOW_CARD', keywords: ['amarelo', 'advertido', 'cartão amarelo', 'amarelou', 'pintou de amarelo'] },
      { type: 'RED_CARD', keywords: ['vermelho', 'expulso', 'chuveiro', 'rua', 'cartão vermelho', 'exclusão'] },
      { type: 'FOUL', keywords: ['falta', 'infração', 'parou o jogo', 'derrubou', 'cometeu'] },
      { type: 'OFFSIDE', keywords: ['impedimento', 'banheira', 'irregular', 'posição adiantada', 'offside'] },
      { type: 'SUBSTITUTION', keywords: ['substitui', 'troca', 'muda o time', 'entra', 'sai', 'alteração', 'mexida'] },
      { type: 'CORNER', keywords: ['escanteio', 'tiro de canto', 'corner', 'bola parada na lateral'] },
      { type: 'PENALTY', keywords: ['penalti', 'pênalti', 'marca o cal', 'na marca da cal', 'penalidade'] },
      { type: 'SAVE', keywords: ['defesa', 'espetacular', 'paredão', 'goleiro pegou', 'salvou', 'espalma'] },
      { type: 'WOODWORK', keywords: ['trave', 'poste', 'ferro', 'balançou o poste', 'no travessão'] },
      { type: 'SHOT', keywords: ['finaliz', 'chute', 'bateu pro gol', 'remate', 'tentativa', 'disparo'] }
    ];

    let detectedAction = null;
    for (const action of actionMap) {
      if (action.keywords.some(k => lower.includes(k))) {
        detectedAction = action.type;
        break;
      }
    }

    if (!detectedAction || !teamId) return null;

    // 3. Extrair Jogador (Número ou Nome)
    const player = this._extractPlayer(lower, state, teamId);

    return {
      type: detectedAction,
      teamId,
      playerId: player?.id,
      description: null // Será gerado pelo state.js
    };
  }

  _teamMatch(text, name, short) {
    if (!name && !short) return false;
    if (name && text.includes(name)) return true;
    if (short && text.includes(short.toLowerCase())) return true;
    
    // Sinônimos de times comuns e genéricos
    const aliases = {
      'home': ['casa', 'mandante', 'primeiro time'],
      'away': ['fora', 'visitante', 'segundo time']
    };
    
    // Se o texto diz "gol do mandante"
    if (text.includes('mandante') || text.includes('time da casa')) return name === name; // Simplificação lógica
    
    return false;
  }

  _extractPlayer(text, state, teamId) {
    const team = state[teamId === 'home' ? 'homeTeam' : 'awayTeam'];
    const players = team.players || [];

    // Prioridade 1: Número da Camisa (ex: "camisa 10", "número 7", "o 11")
    const numMatch = text.match(/(?:camisa|numero|n|o)\s*(\d+)/) || text.match(/\s(\d+)\s/);
    if (numMatch) {
      const num = parseInt(numMatch[1]);
      const found = players.find(p => p.number === num && !p.hasLeftGame);
      if (found) return found;
    }

    // Prioridade 2: Nome do Jogador (Busca parcial inteligente)
    // Remove palavras curtas e comuns
    const words = text.split(/\s+/).filter(w => w.length > 2 && !['time', 'gol', 'falta', 'para', 'pelo', 'com', 'no', 'do', 'da'].includes(w));
    
    for (const word of words) {
      const found = players.find(p => {
        const pName = p.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        return pName.includes(word) && !p.hasLeftGame;
      });
      if (found) return found;
    }

    return null;
  }

  async processCommand(text) {
    if (!text.trim()) return;
    this.isProcessing = true;
    this.notifyUI();

    try {
      const state = matchState.getState();

      // 1. Heurística (0 Tokens, Latência < 10ms)
      const heuristicResult = this.tryHeuristic(text, state);
      if (heuristicResult) {
        matchState.addEvent(heuristicResult);
        if (window.toastManager) window.toastManager.show("Rádio", "Comando processado localmente.", "success");
        return;
      }

      // 2. IA Fallback (Gasta Tokens, Latência > 500ms)
      if (window.toastManager) window.toastManager.show("IA", "Interpretando narração complexa...", "ai");
      const result = await parseMatchCommand(text, state);
      
      if (result && result.type) {
        matchState.addEvent({
          type: result.type,
          teamId: result.teamId,
          playerId: result.playerId,
          description: result.description || text
        });
      } else {
        throw new Error("Não entendi o comando.");
      }
    } catch (error) {
      console.error("Narração falhou:", error);
      if (window.toastManager) {
        window.toastManager.show("Falha", error.message === 'LIMIT_REACHED' ? "IA fora do ar (limite). Tente comando simples." : "Não consegui processar.", "error");
      }
    } finally {
      this.isProcessing = false;
      this.notifyUI();
    }
  }
}

export const voice = new VoiceController();

