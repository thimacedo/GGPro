// js/services/voice.js - v5.0
// Motor Híbrido: Heurística (regex) + IA (Groq)
// Heurística primeiro = mais rápido, economiza tokens de IA

import { parseMatchCommand } from './gemini.js';
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
   * HEURÍSTICA (regex) - caminho rápido sem IA
   */
  tryHeuristic(text, state) {
    const lower = text.toLowerCase().trim();
    const homeName = state.homeTeam.name.toLowerCase();
    const awayName = state.awayTeam.name.toLowerCase();
    const homeShort = (state.homeTeam.shortName || '').toLowerCase();
    const awayShort = (state.awayTeam.shortName || '').toLowerCase();

    const isHome = this._teamMatch(lower, homeName, homeShort);
    const isAway = this._teamMatch(lower, awayName, awayShort);
    const teamId = isHome ? 'home' : (isAway ? 'away' : null);

    // Gol
    const goalMatch = lower.match(/gol|goool|golo/);
    if (goalMatch && teamId) {
      const player = this._extractPlayer(lower, state);
      return {
        type: 'GOAL',
        teamId,
        playerId: player?.id,
        description: null
      };
    }

    // Cartão amarelo
    if ((lower.match(/amarelo|cartão amarelo|yellow|yellow card/)) && teamId) {
      const player = this._extractPlayer(lower, state);
      return {
        type: 'YELLOW_CARD',
        teamId,
        playerId: player?.id,
        description: null
      };
    }

    // Cartão vermelho
    if ((lower.match(/vermelho|cartão vermelho|red|red card|expulso|expulsão/)) && teamId) {
      const player = this._extractPlayer(lower, state);
      return {
        type: 'RED_CARD',
        teamId,
        playerId: player?.id,
        description: null
      };
    }

    // Falta
    if (lower.match(/falta|infração|infracao/) && teamId) {
      const player = this._extractPlayer(lower, state);
      return {
        type: 'FOUL',
        teamId,
        playerId: player?.id,
        description: null
      };
    }

    // Escanteio
    if ((lower.match(/escanteio|canto|corner/)) && teamId) {
      return { type: 'CORNER', teamId };
    }

    // Impedimento
    if (lower.match(/impedimento|barra|offside/) && teamId) {
      const player = this._extractPlayer(lower, state);
      return { type: 'OFFSIDE', teamId, playerId: player?.id };
    }

    // Substituição
    if ((lower.match(/substitui|troca|entra|sai|sub /)) && teamId) {
      return { type: 'SUBSTITUTION', teamId };
    }

    // Contusão
    if (lower.match(/contusão|contusao|lesão|lesao|machucado|dor/) && teamId) {
      const player = this._extractPlayer(lower, state);
      return { type: 'INJURY', teamId, playerId: player?.id };
    }

    // Pênalti
    if ((lower.match(/pênalti|penalti|penalty/)) && teamId) {
      return { type: 'PENALTY', teamId };
    }

    // Defesa
    if ((lower.match(/defesa|defendeu|goleiro|guarda-redes/)) && teamId) {
      const player = this._extractPlayer(lower, state);
      return { type: 'SAVE', teamId, playerId: player?.id };
    }

    // Trave
    if (lower.match(/trave|ferro|poste/) && teamId) {
      return { type: 'WOODWORK', teamId };
    }

    // Finalização
    if ((lower.match(/finaliz|chut|remat|chute|remate/)) && teamId) {
      const player = this._extractPlayer(lower, state);
      return { type: 'SHOT', teamId, playerId: player?.id };
    }

    return null;
  }

  _teamMatch(text, name, short) {
    if (!name && !short) return false;
    if (name && (text.includes(name) || text.includes(name.normalize("NFD").replace(/[\u0300-\u036f]/g, "")))) return true;
    if (short && text.includes(short)) return true;
    // Atalhos comuns
    const aliases = {
      'flamengo': ['mengão', 'mengao', 'fla'],
      'corinthians': ['timão', 'timao', 'corin'],
      'palmeiras': ['verdão', 'verdao', 'pal'],
      'são paulo': ['sao paulo', 'tricolor', 'spfc'],
      'vasco': ['gigante', 'cruzmaltino', 'vas'],
    };
    for (const [key, vals] of Object.entries(aliases)) {
      if ((name && text.includes(name)) || (short && text.includes(short))) return true;
      if (name && name.toLowerCase().includes(key) && vals.some(v => text.includes(v))) return true;
    }
    return false;
  }

  _extractPlayer(text, state) {
    // Busca por "número N" ou "camisa N"
    const numMatch = text.match(/camisa\s*(\d+)|núm?\w*\s*(\d+)|n(\d+)/);
    if (numMatch) {
      const num = parseInt(numMatch[1] || numMatch[2] || numMatch[3]);
      for (const team of ['homeTeam', 'awayTeam']) {
        const found = state[team].players?.find(p => p.number === num && !p.hasLeftGame);
        if (found) return found;
      }
    }
    // Busca por nome parcial
    const words = text.split(/\s+/).filter(w => w.length > 3);
    for (const word of words) {
      for (const team of ['homeTeam', 'awayTeam']) {
        const found = state[team].players?.find(p =>
          p.name.toLowerCase().includes(word.toLowerCase()) && !p.hasLeftGame
        );
        if (found) return found;
      }
    }
    return null;
  }

  /**
   * PROCESSAMENTO DE COMANDO
   * Tenta heurística primeiro, depois IA se necessário
   */
  async processCommand(text) {
    if (!text.trim()) return;
    this.isProcessing = true;
    this.notifyUI();

    try {
      const state = matchState.getState();

      // 1. Tentar heurística (rápido, sem custo de IA)
      const heuristicResult = this.tryHeuristic(text, state);
      if (heuristicResult) {
        matchState.addEvent(heuristicResult);
        return;
      }

      // 2. Fallback para IA se heurística não conseguiu
      const result = await parseMatchCommand(text, state);
      if (result && result.type) {
        matchState.addEvent({
          type: result.type,
          teamId: result.teamId,
          description: result.description || text
        });
      }
    } catch (error) {
      console.error("Narração falhou:", error);
      if (window.toastManager) {
        window.toastManager.show("Erro de IA", "Falha ao interpretar comando de rádio.", "error");
      } else {
        window.dispatchEvent(new CustomEvent('toastAlert', {
          detail: { title: "IA: Falha", message: "Comando não processado.", type: "error" }
        }));
      }
    } finally {
      this.isProcessing = false;
      this.notifyUI();
    }
  }
}

export const voice = new VoiceController();
