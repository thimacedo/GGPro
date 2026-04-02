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
        console.error("Speech error", event.error);
        this.isRecording = false;
        window.app.render(store.getState());
      };
    }
  }

  toggle() {
    if (this.isRecording) {
      this.recognition?.stop();
    } else {
      this.recognition?.start();
      this.isRecording = true;
    }
    window.app.render(store.getState());
  }

  async processCommand(text) {
    if (!text.trim()) return;
    this.isProcessing = true;
    window.app.render(store.getState());

    try {
      const state = store.getState();
      const results = await processVoiceCommand(text, state.homeTeam, state.awayTeam, "");
      const actions = Array.isArray(results) ? results : [results];

      for (const res of actions) {
        if (!res.type || res.type === 'INVALID') continue;
        
        let teamId = res.team === 'away' ? 'away' : 'home';
        let description = res.description || `Evento de Voz: ${res.type}`;
        
        if (res.type === 'GOAL') {
          const team = teamId === 'home' ? state.homeTeam : state.awayTeam;
          const p = res.playerNumber ? team.players.find(pl => pl.number === res.playerNumber) : null;
          description = `⚽ GOL do ${team.shortName}${p ? ` - ${p.name}` : ''}`;
        }

        window.app.addEvent(res.type, teamId, description);
      }
    } catch (e) {
      console.error("Voice process error", e);
      alert("Erro ao processar comando de voz");
    } finally {
      this.isProcessing = false;
      window.app.render(store.getState());
    }
  }
}

export const voice = new VoiceController();
