// Canal de Rádio (Comando de Voz) - Narrador Pro
// Utiliza a Web Speech API e o motor de IA Gemini

import { processVoiceCommand } from './gemini.js';
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
        console.warn("Rádio-Comando: Erro de captura", event.error);
        if (event.error !== 'no-speech') {
          window.addToast("Erro de Voz", `Falha na captura: ${event.error}`, "error");
        }
        this.isRecording = false;
        this.notifyUI();
      };
    } else {
      console.error("Reconhecimento de voz não suportado neste navegador.");
    }
  }

  notifyUI() {
    // Dispara evento para o app.js renderizar se necessário
    const event = new CustomEvent('voiceStateChange', { 
      detail: { isRecording: this.isRecording, isProcessing: this.isProcessing } 
    });
    window.dispatchEvent(event);
  }

  toggle() {
    if (!this.recognition) {
      window.addToast("Erro", "Reconhecimento de voz não disponível.", "error");
      return;
    }

    if (this.isRecording) {
      this.recognition.stop();
    } else {
      try {
        this.recognition.start();
        this.isRecording = true;
        window.addToast("Canal Aberto", "Ouvindo narração...", "info");
      } catch (e) {
        console.error("Falha ao abrir canal de voz", e);
        window.addToast("Erro", "Não foi possível abrir o microfone.", "error");
      }
    }
    this.notifyUI();
  }

  async processCommand(text) {
    if (!text.trim()) return;
    this.isProcessing = true;
    this.notifyUI();

    try {
      const state = matchState.getState();
      const eventsSummary = (state.events || []).slice(0, 5).map(e => e.description).join('; ');
      
      const actions = await processVoiceCommand(text, state.homeTeam, state.awayTeam, eventsSummary);

      for (const res of actions) {
        if (!res.type || res.type === 'INVALID') continue;
        
        if (res.type === 'CORRECTION') {
          window.addToast("IA: Correção", `Processando correção: ${res.description}`, "warning");
          // No app.js teremos o trigger de anulação se necessário
          const lastEvent = state.events[0];
          if (lastEvent) {
            matchState.annulEvent(lastEvent.id);
            window.addToast("VAR", `Evento anulado: ${lastEvent.description}`, "success");
          }
          continue;
        }

        if (res.type === 'ANSWER') {
          window.addToast("IA: Resposta", res.answerText || res.description, "ai");
          continue;
        }

        let teamId = res.team === 'away' ? 'away' : 'home';
        const team = teamId === 'home' ? state.homeTeam : state.awayTeam;
        const p = res.playerNumber ? team.players.find(pl => pl.number === res.playerNumber) : null;

        // Se for substituição
        if (res.type === 'SUBSTITUTION' || res.type === 'SUB') {
          const pOut = res.playerOutNumber ? team.players.find(pl => pl.number === res.playerOutNumber) : p;
          const pIn = res.playerInNumber ? team.players.find(pl => pl.number === res.playerInNumber) : null;
          
          if (pOut && pIn) {
            matchState.addEvent({
              type: 'SUBSTITUTION',
              teamId,
              playerId: pOut.id,
              relatedPlayerId: pIn.id
            });
            window.addToast("IA: Substituição", `${team.shortName}: Entra ${pIn.name}`, "success");
          } else {
            window.addToast("IA: Ops", "Substituição incompleta (falta jogador).", "warning");
          }
          continue;
        }

        // Eventos normais
        matchState.addEvent({
          type: res.type,
          teamId,
          playerId: p ? p.id : null,
          description: res.description
        });
        
        window.addToast("IA: Comando", `Registrado: ${res.description}`, "success");
      }
    } catch (e) {
      console.error("Narração falhou:", e);
      window.addToast("Erro de IA", "Falha ao interpretar comando de rádio.", "error");
    } finally {
      this.isProcessing = false;
      this.notifyUI();
    }
  }
}

export const voice = new VoiceController();
