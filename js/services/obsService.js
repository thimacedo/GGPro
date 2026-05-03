// js/services/obsService.js - Integração Narrador Pro & OBS Studio v1.0
// Automatiza troca de cenas e elementos visuais no OBS via WebSocket.

import OBSWebSocket from './obs-ws.js';
import { toastManager } from '../components/toasts.js';
import matchState from '../state.js';

class OBSService {
  constructor() {
    this.obs = new OBSWebSocket();
    this.isConnected = false;
    
    let addr = 'localhost:4455';
    let pass = '';
    let auto = 'false';

    if (typeof localStorage !== 'undefined') {
      addr = localStorage.getItem('GGPRO_OBS_ADDR') || addr;
      pass = localStorage.getItem('GGPRO_OBS_PASS') || pass;
      auto = localStorage.getItem('GGPRO_OBS_AUTO') || auto;
    }

    this.config = {
      address: addr,
      password: pass,
      autoSwitch: auto === 'true'
    };

    // Mapeamento padrão de cenas
    this.sceneMap = {
      'GOAL': 'CENA_GOL',
      'REPLAY': 'CENA_REPLAY',
      'TACTICAL': 'CENA_TATICA',
      'STATS': 'CENA_STATS',
      'PRESSURE_HIGH': 'CENA_ATAQUE'
    };
    this.lastReplaySave = 0;
  }

  async connect() {
    try {
      await this.obs.connect(`ws://${this.config.address}`, this.config.password);
      this.isConnected = true;
      toastManager.show('OBS Studio', 'Conectado com sucesso!', 'success');
      this.dispatchStatus();
    } catch (error) {
      this.isConnected = false;
      console.error('Erro de conexão OBS:', error);
      toastManager.show('OBS Studio', 'Falha na conexão. Verifique host/senha.', 'error');
      this.dispatchStatus();
    }
  }

  async disconnect() {
    await this.obs.disconnect();
    this.isConnected = false;
    this.dispatchStatus();
  }

  async switchScene(sceneName) {
    if (!this.isConnected) return;
    try {
      await this.obs.call('SetCurrentProgramScene', { sceneName });
      toastManager.show('OBS', `Cena alterada: ${sceneName}`, 'info');
    } catch (e) {
      console.warn(`Cena "${sceneName}" não encontrada no OBS.`);
    }
  }

  /**
   * Alterna o estado do Replay Buffer (liga/desliga).
   */
  async toggleReplayBuffer() {
    if (!this.isConnected) return;
    try {
      await this.obs.call('ToggleReplayBuffer');
      toastManager.show('OBS', 'Replay Buffer alterado', 'info');
    } catch (e) {
      console.error('Erro ao alternar Replay Buffer:', e);
    }
  }

  /**
   * Salva o conteúdo atual do Replay Buffer.
   */
  async saveReplayBuffer() {
    if (!this.isConnected) return;
    try {
      await this.obs.call('SaveReplayBuffer');
      toastManager.show('OBS', 'Replay salvo!', 'success');
      
      // Registrar na timeline
      matchState.addEvent({
        type: 'HIGHLIGHT',
        description: '💾 Replay de destaque salvo'
      });
    } catch (e) {
      console.warn('Falha ao salvar replay. O Replay Buffer está ativo?');
    }
  }

  /**
   * Reage a eventos do jogo e dispara ações no OBS se o autoSwitch estiver ativo.
   */
  handleGameEvent(event) {
    if (!this.config.autoSwitch || !this.isConnected) return;

    if (event.type === 'GOAL') {
      this.switchScene(this.sceneMap.GOAL);
      this.saveReplayBuffer();
      // Opcional: Voltar para a cena tática após 10 segundos
      setTimeout(() => this.switchScene(this.sceneMap.TACTICAL), 15000);
    }
  }

  /**
   * Reage a mudanças no Pressure Gauge
   */
  handlePressureUpdate(analysis) {
    if (!this.config.autoSwitch || !this.isConnected) return;
    
    // Se a pressão for maior que 80%, mudar para cena de ataque
    if (analysis.score > 80 || analysis.score < 20) {
      this.switchScene(this.sceneMap.PRESSURE_HIGH);
      
      // Gatilho de Replay automático com cooldown de 30s
      const now = Date.now();
      if (now - this.lastReplaySave > 30000) {
        this.saveReplayBuffer();
        this.lastReplaySave = now;
      }
    }
  }

  saveConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    localStorage.setItem('GGPRO_OBS_ADDR', this.config.address);
    localStorage.setItem('GGPRO_OBS_PASS', this.config.password);
    localStorage.setItem('GGPRO_OBS_AUTO', this.config.autoSwitch);
    
    if (this.isConnected) {
      this.disconnect().then(() => this.connect());
    } else {
      this.connect();
    }
  }

  dispatchStatus() {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('obsStatusChange', { detail: { isConnected: this.isConnected } }));
    }
  }

  reset() {
    this.isConnected = false;
    if (this.obs) {
      try { this.obs.disconnect(); } catch(e) {}
    }
  }
}

export const obsService = new OBSService();
