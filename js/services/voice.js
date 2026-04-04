// js/services/voice.js
// Canal de Interação (Voz) - Narrador Pro
// Resiliência de Captura com Feedback UI (Toast System)

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
      // Inicia feedback sonoro se necessário ou apenas visual
    }
    this.notifyUI();
  }

  /**
   * 📡 PROCESSAMENTO DE COMANDO IA
   * Executa a interpretação do comando de voz com isolamento de falhas.
   */
  async processCommand(text) {
    if (!text.trim()) return;
    this.isProcessing = true;
    this.notifyUI();

    try {
      const state = matchState.getState();
      
      /**
       * 🚀 CHAMADA ISOLADA
       * Bloco try/catch específico para a API Gemini conforme diretiva v3.1.
       */
      const result = await parseMatchCommand(text, state);

      if (result && result.type) {
        matchState.addEvent({
          type: result.type,
          description: result.description || text
        });
      }
    } catch (error) {
      /**
       * ⚠️ FALLBACK UI / TOAST
       * Em caso de falha na IA, o sistema dispara um evento ou aciona o Toast Manager global.
       */
      console.error("Narração falhou:", error);
      
      if (window.addToast) {
        window.addToast("Erro de IA", "Falha ao interpretar comando de rádio.", "error");
      } else {
        // Fallback secundário via CustomEvent
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
