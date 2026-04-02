import store from './state.js';
import { Header } from './components/Header.js';
import { Dashboard } from './components/Dashboard.js';
import { Stats } from './components/Stats.js';
import { Modal, PreMatchSetupContent } from './components/Modals.js';
import { formatDuration, generateId } from './utils.js';
import { voice } from './services/voice.js';
import { parseMatchBannerFromImage } from './services/gemini.js';

class App {
  constructor() {
    this.root = document.getElementById('root');
    this.viewMode = 'list';
    this.activeTab = 'main'; // 'main' ou 'stats'
    this.timerInterval = null;
    this.activeModal = null;
    this.init();
  }

  init() {
    store.subscribe((state) => this.render(state));
    this.startTimerLoop();
    
    const state = store.getState();
    if (state.period === 'PRE_MATCH' && !state.competition) {
      this.openSetup();
    }
  }

  render(state) {
    if (!document.getElementById('header-container')) {
      this.root.innerHTML = `
        <div class="app-container">
          <div id="header-container"></div>
          <main class="main-content custom-scrollbar">
             <div id="view-container" class="max-width-wrapper"></div>
          </main>
          
          <div class="fixed-footer">
            <div class="footer-content">
              <button onclick="app.togglePlayPause()" id="footer-play-pause" class="btn-play-pause shadow-xl active:scale-90 flex items-center justify-center">
              </button>
              <div class="command-bar shadow-2xl">
                <button type="button" onclick="app.toggleVoice()" id="voice-btn" class="icon-btn active:scale-90">
                  <i data-lucide="mic" style="width: 1.125rem; height: 1.125rem; color: white;"></i>
                </button>
                <div style="flex: 1; position: relative; min-width: 0;">
                  <input 
                    id="command-input"
                    type="text" 
                    placeholder="Lance ou pergunta..." 
                    class="command-input"
                    onkeydown="if(event.key==='Enter') app.submitCommand()"
                  />
                  <div id="processing-spinner" style="position: absolute; right: 0; top: 50%; transform: translateY(-50%); display: none;">
                    <i data-lucide="loader-2" class="animate-spin" style="color: var(--blue-500); margin-right: 0.5rem; width: 1rem; height: 1rem;"></i>
                  </div>
                </div>
                <button type="button" onclick="app.submitCommand()" id="send-btn" class="icon-btn" style="background: var(--blue-600); color: white;">
                  <i data-lucide="send" style="width: 1.125rem; height: 1.125rem;"></i>
                </button>
              </div>
            </div>
          </div>
          
          <div id="modal-container"></div>
          
          <div id="ai-overlay" class="modal-overlay animate-in fade-in duration-300" style="display: none; z-index: 200;">
            <div class="card" style="background: var(--slate-900); padding: 2.5rem; border-radius: 2.5rem; border: 1px solid rgba(59, 130, 246, 0.2); box-shadow: 0 0 50px rgba(59,130,246,0.2); display: flex; flex-direction: column; align-items: center; gap: 1.5rem; max-width: 20rem; width: 100%;">
              <div style="position: relative;">
                <div style="width: 4rem; height: 4rem; border-radius: 50%; border: 4px solid rgba(59, 130, 246, 0.2); border-top-color: var(--blue-500); animation: spin 1s linear infinite;"></div>
                <div style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;">
                  <i data-lucide="mic" class="animate-pulse" style="color: var(--blue-400); width: 1.5rem; height: 1.5rem;"></i>
                </div>
              </div>
              <div style="text-align: center;">
                <h3 style="font-size: 1.125rem; font-weight: 900; color: white; text-transform: uppercase; letter-spacing: -0.05em;">Gemini está PENSANDO</h3>
                <p style="font-size: 0.625rem; color: var(--slate-500); font-weight: 700; text-transform: uppercase; letter-spacing: 0.2em; margin-top: 0.25rem;">Sincronizando com a Narração...</p>
              </div>
            </div>
          </div>
        </div>
        <style>@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }</style>
      `;
    }

    document.getElementById('header-container').innerHTML = Header(state);
    
    if (this.activeTab === 'main') {
      document.getElementById('view-container').innerHTML = Dashboard(state, this.viewMode);
    } else {
      document.getElementById('view-container').innerHTML = Stats(state);
    }
    
    // Update Play/Pause Button
    const playBtn = document.getElementById('footer-play-pause');
    if (playBtn) {
      playBtn.style.backgroundColor = state.isPaused ? 'var(--emerald-600)' : 'var(--yellow-500)';
      playBtn.style.color = state.isPaused ? 'white' : 'var(--slate-900)';
      playBtn.innerHTML = `<i data-lucide="${state.isPaused ? 'play' : 'pause'}" style="width: 1.375rem; height: 1.375rem;" fill="currentColor"></i>`;
    }

    // Voice button
    const vBtn = document.getElementById('voice-btn');
    if (vBtn) {
      vBtn.classList.toggle('active', voice.isRecording);
    }

    // Processing states
    const input = document.getElementById('command-input');
    if (input) {
      input.disabled = voice.isProcessing;
      input.placeholder = voice.isRecording ? "Ouvindo..." : (voice.isProcessing ? "Interpretando..." : "Lance ou pergunta...");
    }

    document.getElementById('ai-overlay').style.display = voice.isProcessing ? 'flex' : 'none';
    
    if (this.activeModal) {
      document.getElementById('modal-container').innerHTML = this.activeModal(state);
    } else {
      document.getElementById('modal-container').innerHTML = '';
    }

    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  async handleBannerUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    voice.isProcessing = true;
    this.render(store.getState());

    try {
      const reader = new FileReader();
      const base64 = await new Promise((resolve) => {
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.readAsDataURL(file);
      });

      const data = await parseMatchBannerFromImage(base64);
      if (data.matches && data.matches.length > 0) {
        const match = data.matches[0];
        store.setState({
          competition: match.competition || '',
          stadium: match.stadium || '',
          homeTeam: { ...store.getState().homeTeam, name: match.homeTeam || store.getState().homeTeam.name },
          awayTeam: { ...store.getState().awayTeam, name: match.awayTeam || store.getState().awayTeam.name }
        });
        alert("✅ Banner lido com sucesso!");
      }
    } catch (e) {
      console.error("Erro ao ler banner:", e);
      alert("❌ Falha na leitura da imagem.");
    } finally {
      voice.isProcessing = false;
      this.render(store.getState());
    }
  }

  async handleRegulationUpload(event) {
    alert("Funcionalidade de regulamento (PDF/Imagem) integrada ao motor de IA.");
    // Implementação similar ao banner, chamando parseRegulationDocument
  }

  toggleVoice() {
    voice.toggle();
  }

  submitCommand() {
    const input = document.getElementById('command-input');
    const text = input.value;
    if (text.trim()) {
      voice.processCommand(text);
      input.value = '';
    }
  }

  openSetup() {
    this.activeModal = (state) => Modal(PreMatchSetupContent(state), "Configurar Partida");
    this.render(store.getState());
  }

  saveSetup() {
    const comp = document.getElementById('setup-competition').value;
    const ref = document.getElementById('setup-referee').value;
    const stad = document.getElementById('setup-stadium').value;

    store.setState({
      competition: comp,
      referee: ref,
      stadium: stad,
      period: '1T'
    });
    this.closeModal();
  }

  setActiveTab(tab) {
    this.activeTab = tab;
    this.render(store.getState());
  }

  closeModal() {
    this.activeModal = null;
    this.render(store.getState());
  }

  setViewMode(mode) {
    this.viewMode = mode;
    this.render(store.getState());
  }

  togglePlayPause() {
    const state = store.getState();
    const now = Date.now();
    if (state.isPaused) {
      store.setState({
        isPaused: false,
        timerStartedAt: now
      });
    } else {
      const elapsed = state.timeElapsed + (now - (state.timerStartedAt || now));
      store.setState({
        isPaused: true,
        timerStartedAt: null,
        timeElapsed: elapsed
      });
    }
  }

  startTimerLoop() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      const state = store.getState();
      const display = document.getElementById('timer-display');
      if (display) {
        let totalMs = state.timeElapsed;
        if (!state.isPaused && state.timerStartedAt) {
          totalMs += (Date.now() - state.timerStartedAt);
        }
        display.innerText = formatDuration(totalMs);
      }
    }, 200);
  }

  undoLastEvent() {
    store.setState(prev => ({
      ...prev,
      events: prev.events.slice(1)
    }));
  }

  addEvent(type, teamId, description) {
    const state = store.getState();
    const now = Date.now();
    
    // Calcula minuto base oficial: 0-59s = 1', 60-119s = 2', etc.
    const elapsed = state.timeElapsed + (state.timerStartedAt ? now - state.timerStartedAt : 0);
    const minute = Math.floor(elapsed / 60000) + 1;

    const newEvent = {
        id: generateId(),
        type,
        teamId,
        minute: minute,
        timestamp: now,
        description,
        isAnnulled: false
    };

    store.setState(prev => ({
        ...prev,
        events: [newEvent, ...prev.events]
    }));
  }

  selectPlayer(playerId, teamId) {
    const state = store.getState();
    const team = teamId === 'home' ? state.homeTeam : state.awayTeam;
    const player = team.players.find(p => p.id === playerId);
    
    if (confirm(`GOL de ${player.name}?`)) {
      this.addEvent('GOAL', teamId, `GOL: ${player.name} (${player.number})`);
    }
  }

  editTeamName(teamId) {
    const state = store.getState();
    const team = teamId === 'home' ? state.homeTeam : state.awayTeam;
    const newName = prompt(`Novo nome para ${team.name}:`, team.name);
    if (newName && newName.trim()) {
      store.setState(prev => {
        const teamKey = teamId === 'home' ? 'homeTeam' : 'awayTeam';
        return {
          ...prev,
          [teamKey]: { ...prev[teamKey], name: newName.trim() }
        };
      });
    }
  }

  nextPeriod() {
    const periods = ['PRE_MATCH', '1T', 'INTERVAL', '2T', 'FINISHED'];
    const current = store.getState().period;
    const nextIdx = periods.indexOf(current) + 1;
    if (nextIdx < periods.length) {
      store.setState({ period: periods[nextIdx] });
    }
  }
}

window.app = new App();
