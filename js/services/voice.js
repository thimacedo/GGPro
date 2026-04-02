import { processVoiceCommand } from './gemini.js';
import store from '../state.js';

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
        window.app.render(store.getState());
      };

      this.recognition.onerror = (event) => {
        console.warn("Rádio-Comando: Erro de captura", event.error);
        this.isRecording = false;
        window.app.render(store.getState());
      };
    }
  }

  toggle() {
    if (this.isRecording) {
      this.recognition?.stop();
    } else {
      try {
        this.recognition?.start();
        this.isRecording = true;
      } catch (e) {
        console.error("Falha ao abrir canal de voz", e);
      }
    }
    window.app.render(store.getState());
  }

  async processCommand(text) {
    if (!text.trim()) return;
    this.isProcessing = true;
    window.app.render(store.getState());

    try {
      const state = store.getState();
      
      // O Prompt da IA já está instruído para retornar a ação e os envolvidos.
      // A minutagem será aplicada pelo App.js usando o cronômetro oficial.
      const results = await processVoiceCommand(text, state.homeTeam, state.awayTeam, "");
      const actions = Array.isArray(results) ? results : [results];

      for (const res of actions) {
        if (!res.type || res.type === 'INVALID') continue;
        
        let teamId = res.team === 'away' ? 'away' : 'home';
        let description = res.description || `Evento: ${res.type}`;
        
        // Melhoria de descrição baseada nos jogadores detectados pela IA
        const team = teamId === 'home' ? state.homeTeam : state.awayTeam;
        const p = res.playerNumber ? team.players.find(pl => pl.number === res.playerNumber) : null;
        const playerName = p ? p.name : (res.playerNumber ? `Nº ${res.playerNumber}` : '');

        if (res.type === 'GOAL') {
          description = `⚽ GOL do ${team.shortName}${playerName ? ` - ${playerName}` : ''}`;
        } else if (res.type === 'YELLOW_CARD') {
          description = `🟨 Amarelo - ${playerName} (${team.shortName})`;
        } else if (res.type === 'RED_CARD') {
          description = `🟥 Vermelho - ${playerName} (${team.shortName})`;
        } else if (res.type === 'FOUL') {
          description = `🛑 Falta para o ${team.shortName}${playerName ? ` (${playerName})` : ''}`;
        }

        // Envia para o app sem informar minuto, deixando o app decidir com base no timer
        window.app.addEvent(res.type, teamId, description);
      }
    } catch (e) {
      console.error("Narração falhou:", e);
      alert("IA: Falha ao interpretar comando.");
    } finally {
      this.isProcessing = false;
      window.app.render(store.getState());
    }
  }
}

export const voice = new VoiceController();
