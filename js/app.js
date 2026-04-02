import store from './state.js';
import { Header } from './components/Header.js';
import { Dashboard } from './components/Dashboard.js';
import { Modal, PreMatchSetupContent } from './components/Modals.js';
import { formatDuration, generateId } from './utils.js';
import { voice } from './services/voice.js';

class App {
  constructor() {
    this.root = document.getElementById('root');
    this.viewMode = 'list';
    this.timerInterval = null;
    this.activeModal = null;
    this.commandText = '';
    this.init();
  }

  init() {
    store.subscribe((state) => this.render(state));
    this.startTimerLoop();
    
    // Auto-open setup if new match
    const state = store.getState();
    if (state.period === 'PRE_MATCH' && !state.competition) {
      this.openSetup();
    }
  }

  render(state) {
    if (!document.getElementById('header-container')) {
      this.root.innerHTML = `
        <div class="h-screen flex flex-col font-sans selection:bg-blue-500/20 overflow-hidden bg-slate-950 text-slate-50">
          <div id="header-container"></div>
          <main id="main-container" class="flex-1 flex flex-col px-2 md:px-4 min-h-0 overflow-y-auto pb-40 pt-4 custom-scrollbar">
             <div id="view-container" class="w-full max-w-7xl mx-auto flex flex-col gap-4 md:gap-6"></div>
          </main>
          
          <!-- Roda-Pé de Comando -->
          <div class="fixed bottom-0 left-0 right-0 z-[70] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-gradient-to-t from-slate-950 via-slate-950/95 to-transparent">
            <div class="max-w-4xl mx-auto flex items-center gap-2">
              <button onclick="app.togglePlayPause()" id="footer-play-pause" class="p-4 rounded-2xl shadow-xl transition-all shrink-0 flex items-center justify-center active:scale-90">
                <!-- Icon injected by render -->
              </button>
              <div class="flex-1 bg-slate-900/95 p-1.5 rounded-2xl shadow-2xl border border-white/10 flex items-center gap-1.5 backdrop-blur-3xl ring-1 ring-white/5 relative">
                <button type="button" onclick="app.toggleVoice()" id="voice-btn" class="p-3 rounded-xl transition-all active:scale-90 shrink-0">
                  <i data-lucide="mic" class="w-[18px] h-[18px] text-white"></i>
                </button>
                <div class="flex-1 relative min-w-0">
                  <input 
                    id="command-input"
                    type="text" 
                    placeholder="Lance ou pergunta..." 
                    class="w-full bg-transparent border-none py-2.5 px-1 font-bold text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-0" 
                    onkeydown="if(event.key==='Enter') app.submitCommand()"
                  />
                  <div id="processing-spinner" class="absolute right-0 top-1/2 -translate-y-1/2 hidden">
                    <i data-lucide="loader-2" class="animate-spin text-blue-500 mr-2 w-4 h-4"></i>
                  </div>
                </div>
                <button type="button" onclick="app.submitCommand()" id="send-btn" class="p-3 bg-blue-600 rounded-xl text-white font-black hover:bg-blue-500 transition-colors active:scale-95 shadow-lg shrink-0">
                  <i data-lucide="send" class="w-[18px] h-[18px]"></i>
                </button>
              </div>
            </div>
          </div>
          
          <div id="modal-container"></div>
          
          <!-- AI Thinking Overlay -->
          <div id="ai-overlay" class="fixed inset-0 z-[100] bg-slate-950/40 backdrop-blur-sm hidden items-center justify-center animate-in fade-in duration-300">
            <div class="bg-slate-900/90 p-8 rounded-[2.5rem] border border-blue-500/20 shadow-[0_0_50px_rgba(59,130,246,0.2)] flex flex-col items-center gap-4 max-w-xs w-full">
              <div class="relative">
                <div class="w-16 h-16 rounded-full border-4 border-blue-500/20 border-t-blue-500 animate-spin"></div>
                <div class="absolute inset-0 flex items-center justify-center">
                  <i data-lucide="mic" class="text-blue-400 animate-pulse w-6 h-6"></i>
                </div>
              </div>
              <div class="text-center">
                <h3 class="text-lg font-black text-white uppercase tracking-tighter">Gemini está PENSANDO</h3>
                <p class="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-1">Sincronizando com a Narração...</p>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    // Update Elements
    document.getElementById('header-container').innerHTML = Header(state);
    document.getElementById('view-container').innerHTML = Dashboard(state, this.viewMode);
    
    // Footer button colors
    const playBtn = document.getElementById('footer-play-pause');
    if (playBtn) {
      playBtn.className = `p-4 rounded-2xl shadow-xl transition-all shrink-0 flex items-center justify-center active:scale-90 ${state.isPaused ? 'bg-emerald-600 text-white' : 'bg-yellow-500 text-slate-900'}`;
      playBtn.innerHTML = `<i data-lucide="${state.isPaused ? 'play' : 'pause'}" class="w-[22px] h-[22px]" fill="currentColor"></i>`;
    }

    // Voice button state
    const voiceBtn = document.getElementById('voice-btn');
    if (voiceBtn) {
      voiceBtn.className = `p-3 rounded-xl transition-all active:scale-90 shrink-0 ${voice.isRecording ? 'bg-red-600 animate-pulse' : 'bg-slate-800 hover:bg-slate-700'}`;
    }

    // Input state
    const input = document.getElementById('command-input');
    if (input) {
      input.disabled = voice.isProcessing;
      input.placeholder = voice.isRecording ? "Ouvindo..." : (voice.isProcessing ? "Interpretando..." : "Lance ou pergunta...");
    }

    const spinner = document.getElementById('processing-spinner');
    if (spinner) {
      spinner.classList.toggle('hidden', !voice.isProcessing);
    }

    const overlay = document.getElementById('ai-overlay');
    if (overlay) {
      overlay.style.display = voice.isProcessing ? 'flex' : 'none';
    }
    
    if (this.activeModal) {
      document.getElementById('modal-container').innerHTML = this.activeModal(state);
    } else {
      document.getElementById('modal-container').innerHTML = '';
    }

    if (window.lucide) {
      window.lucide.createIcons();
    }
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
    }, 100);
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
    const elapsed = state.timeElapsed + (state.timerStartedAt ? now - state.timerStartedAt : 0);
    const minute = Math.floor(elapsed / 60000);

    const newEvent = {
        id: generateId(),
        type,
        teamId,
        minute: minute || 1,
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
