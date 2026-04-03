import store from './state.js';
import { Header } from './components/Header.js';
import { Dashboard } from './components/Dashboard.js';
import { Stats } from './components/Stats.js';
import { Modal, PreMatchSetupContent, EditPlayerContent, EditTeamContent, EndGameOptionsContent, PlayerActionContent, TeamActionContent, ImportListContent } from './components/Modals.js';
import { formatDuration, generateId } from './utils.js';
import { toasts } from './components/Toasts.js';
import { voice } from './services/voice.js';
import { parseMatchBannerFromImage, parsePlayersFromImage, parsePlayersFromText, parseRegulationDocument, generateMatchReport } from './services/gemini.js';

class App {
  constructor() {
    window.app = this; // Define imediatamente para que componentes possam acessar durante o init/render
    this.root = document.getElementById('root');
    this.viewMode = 'list';
    this.activeTab = 'main'; // 'main' ou 'stats'
    this.timerInterval = null;
    this.activeModal = null;
    this.draggingPlayer = null;
    
    // Bind handlers for drag/drop to access 'this'
    this.handlePlayerDragBound = this.handlePlayerDrag.bind(this);
    this.handlePlayerDragEndBound = this.handlePlayerDragEnd.bind(this);
    this.isLightMode = localStorage.getItem('THEME') === 'light';
    if (this.isLightMode) document.body.classList.add('light-mode');
    
    this.init();
  }

  toggleTheme() {
    this.isLightMode = !this.isLightMode;
    document.body.classList.toggle('light-mode', this.isLightMode);
    localStorage.setItem('THEME', this.isLightMode ? 'light' : 'dark');
    toasts.show("Tema Alterado", `Modo ${this.isLightMode ? 'Claro' : 'Escuro'} ativado.`, "info");
    this.render(store.getState());
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
    const file = event.target.files[0];
    if (!file) return;

    toasts.show("IA", "Analisando regulamento...", "info");
    
    try {
      const base64 = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.readAsDataURL(file);
      });

      const rules = await parseRegulationDocument(base64, file.type);
      
      store.setState({ rules });
      toasts.show("IA: Sucesso", `Regulamento aplicado: ${rules.halfDuration}min por tempo.`, "success");
      this.openSetup();
    } catch (e) {
      toasts.show("Erro", "IA falhou ao ler regulamento.", "error");
    }
  }

  // --- TACTICAL DRAG & DROP ---
  handlePlayerDragStart(e, teamId, playerId) {
    if (e.type === 'mousedown' && e.button !== 0) return;
    
    this.draggingPlayer = { 
      teamId, 
      playerId, 
      startX: e.touches ? e.touches[0].clientX : e.clientX, 
      startY: e.touches ? e.touches[0].clientY : e.clientY,
      hasMoved: false 
    };
    
    window.addEventListener('mousemove', this.handlePlayerDragBound);
    window.addEventListener('mouseup', this.handlePlayerDragEndBound);
    window.addEventListener('touchmove', this.handlePlayerDragBound, { passive: false });
    window.addEventListener('touchend', this.handlePlayerDragEndBound);
  }

  handlePlayerDrag(e) {
    if (!this.draggingPlayer) return;
    
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    // Pequena margem de movimento para considerar arrasto
    const dist = Math.hypot(clientX - this.draggingPlayer.startX, clientY - this.draggingPlayer.startY);
    if (!this.draggingPlayer.hasMoved && dist < 5) return;
    
    this.draggingPlayer.hasMoved = true;
    if (e.cancelable) e.preventDefault(); 

    const field = document.getElementById('tactical-field');
    if (!field) return;

    const rect = field.getBoundingClientRect();
    let x = ((clientX - rect.left) / rect.width) * 100;
    let y = ((clientY - rect.top) / rect.height) * 100;

    x = Math.max(2, Math.min(98, x));
    y = Math.max(2, Math.min(98, y));

    const isHome = this.draggingPlayer.teamId === 'home';
    const finalX = isHome ? x : (100 - x);
    const finalY = isHome ? y : (100 - y);

    this.updatePlayerPosition(this.draggingPlayer.teamId, this.draggingPlayer.playerId, finalX, finalY);
  }

  handlePlayerDragEnd(e) {
    // Se não se moveu significativamente, o evento de 'click' natural do navegador cuidará do openPlayerActions
    // mas precisamos limpar os listeners
    this.draggingPlayer = null;
    window.removeEventListener('mousemove', this.handlePlayerDragBound);
    window.removeEventListener('mouseup', this.handlePlayerDragEndBound);
    window.removeEventListener('touchmove', this.handlePlayerDragBound);
    window.removeEventListener('touchend', this.handlePlayerDragEndBound);
  }

  updatePlayerPosition(teamId, playerId, x, y) {
    store.setState(prev => {
      const teamKey = teamId === 'home' ? 'homeTeam' : 'awayTeam';
      const players = prev[teamKey].players.map(p => 
        p.id === playerId ? { ...p, x, y } : p
      );
      return { ...prev, [teamKey]: { ...prev[teamKey], players } };
    });
  }

  // --- MATCH FINALIZATION ---
  async finishMatch() {
    store.setState({ period: 'FINISHED' });
    toasts.show("Partida Finalizada", "O cronômetro foi parado e o jogo encerrado.", "success");
    this.closeModal();
  }

  confirmAction(message, onConfirm) {
    this.activeModal = () => Modal(`
      <div style="text-align: center; padding: 1rem;">
        <p style="margin-bottom: 2rem; font-weight: 700; color: var(--slate-200); font-size: 0.875rem;">${message}</p>
        <div style="display: flex; gap: 1rem;">
          <button onclick="app.closeModal()" class="btn-submit" style="background: var(--slate-800); flex: 1; box-shadow: none;">CANCELAR</button>
          <button id="modal-confirm-btn" class="btn-submit" style="flex: 1; background: var(--blue-600);">CONFIRMAR</button>
        </div>
      </div>
    `, "Confirmação");
    this.render(store.getState());
    
    setTimeout(() => {
        const btn = document.getElementById('modal-confirm-btn');
        if (btn) btn.onclick = () => { onConfirm(); };
    }, 50);
  }

  // --- AÇÕES DO JOGADOR ---
  showAIAnswer(text) {
    this.activeModal = () => Modal(`
        <div class="card" style="background: rgba(30, 41, 59, 0.5); padding: 1.5rem; border-radius: 1rem; color: var(--slate-200); line-height: 1.6; font-size: 0.875rem;">
            ${text}
        </div>
        <button onclick="app.closeModal()" class="btn-submit" style="margin-top: 1.5rem; background: var(--slate-800);">ENTENDIDO</button>
    `, "Rádio-Controle (IA)");
    this.render(store.getState());
  }

  openPlayerActions(playerId, teamId) {
    const state = store.getState();
    const team = teamId === 'home' ? state.homeTeam : state.awayTeam;
    const player = team.players.find(p => p.id === playerId);
    
    if (player.hasLeftGame && !confirm("Este jogador já saiu ou foi expulso. Deseja editar seus dados mesmo assim?")) return;

    this.activeModal = (s) => Modal(PlayerActionContent(player, team), `${player.name} (#${player.number})`);
    this.render(state);
  }

  handlePlayerAction(type, playerId, teamId) {
    const state = store.getState();
    const team = teamId === 'home' ? state.homeTeam : state.awayTeam;
    const player = team.players.find(p => p.id === playerId);

    if (type === 'SUBSTITUTION') {
      if (player.isStarter) {
        // Se for titular, abre lista de reservas
        const reserves = team.players.filter(p => !p.isStarter && !p.hasLeftGame);
        if (reserves.length === 0) {
          toasts.show("Aviso", "Não há reservas disponíveis.", "warning");
          return;
        }

        const reservesHtml = reserves.map(r => `
          <button onclick="app.addEvent('SUBSTITUTION', '${teamId}', '', '${player.id}', '${r.id}'); app.closeModal();" class="btn-submit" style="background: rgba(255,255,255,0.05); box-shadow: none; display: flex; align-items: center; gap: 1rem; padding: 1rem; border: 1px solid rgba(255,255,255,0.05); justify-content: flex-start;">
            <span class="num-tag" style="background: var(--blue-600); color: white; width: 1.5rem; height: 1.5rem; display: flex; align-items: center; justify-content: center; border-radius: 0.25rem;">${r.number}</span>
            <span style="font-weight: 700;">${r.name}</span>
          </button>
        `).join('');

        this.activeModal = () => Modal(`
          <div style="display: flex; flex-direction: column; gap: 0.75rem;">
            <p style="font-size: 0.625rem; color: var(--slate-400); text-align: center; margin-bottom: 0.5rem; font-weight: 900; text-transform: uppercase;">Quem entra no lugar de ${player.name}?</p>
            ${reservesHtml}
            <button onclick="app.closeModal()" class="btn-submit" style="background: var(--slate-800); margin-top: 1rem;">CANCELAR</button>
          </div>
        `, "Substituição");
        this.render(state);
      } else {
        // Se for reserva, tenta entrar (precisa de alguém saindo - lógica simplificada ou manual)
        toasts.show("Aviso", "Selecione o jogador TITULAR que irá sair primeiro.", "info");
      }
      return;
    }

    // Ações diretas (GOL, CARTÕES, etc)
    const labels = { 
      GOAL: 'GOL', 
      YELLOW_CARD: 'CARTÃO AMARELO', 
      RED_CARD: 'CARTÃO VERMELHO', 
      FOUL: 'FALTA', 
      SHOT: 'CHUTE / FINALIZAÇÃO',
      OFFSIDE: 'IMPEDIMENTO',
      CORNER: 'ESCANTEIO',
      PENALTY: 'PÊNALTI',
      VAR: 'VAR',
      INJURY: 'ATENDIMENTO',
      GK_8_SECONDS: 'INFRAÇÃO 8S'
    };
    const label = labels[type] || type;
    this.addEvent(type, teamId, `${label}: ${player ? player.name + ' (#' + player.number + ')' : (teamId === 'home' ? state.homeTeam.shortName : state.awayTeam.shortName)}`, playerId);
    this.closeModal();
  }

  savePlayerEdit(playerId, teamId) {
    const name = document.getElementById('edit-player-name').value;
    const num = document.getElementById('edit-player-number').value;
    const isStarter = document.getElementById('edit-player-starter').checked;

    store.saveToHistory();
    store.setState(prev => {
      const teamKey = teamId === 'home' ? 'homeTeam' : 'awayTeam';
      const players = prev[teamKey].players.map(p => 
        p.id === playerId ? { ...p, name, number: parseInt(num), isStarter } : p
      );
      return { ...prev, [teamKey]: { ...prev[teamKey], players } };
    });

    toasts.show("Atleta Atualizado", `${name} (#${num}) salvo com sucesso.`, "success");
    this.closeModal();
  }

  editTeam(teamId) {
    const state = store.getState();
    const team = teamId === 'home' ? state.homeTeam : state.awayTeam;
    this.activeModal = (s) => Modal(EditTeamContent(team), `Configurar Equipe: ${team.shortName}`);
    this.render(state);
  }

  setEditTeamColor(color) {
    document.getElementById('edit-team-color').value = color;
    // Update visual selectors
    document.querySelectorAll('.color-swatch').forEach(btn => {
      const btnColor = btn.style.backgroundColor;
      btn.classList.toggle('active', btnColor === color);
      btn.style.border = btnColor === color ? '3px solid white' : '3px solid transparent';
    });
  }

  saveTeamEdit(teamId) {
    const name = document.getElementById('edit-team-name').value;
    const short = document.getElementById('edit-team-short').value.toUpperCase();
    const color = document.getElementById('edit-team-color').value;
    const coach = document.getElementById('edit-team-coach').value;

    store.saveToHistory();
    store.setState(prev => {
      const teamKey = teamId === 'home' ? 'homeTeam' : 'awayTeam';
      return { ...prev, [teamKey]: { ...prev[teamKey], name, shortName: short, color, coach } };
    });

    toasts.show("Equipe Atualizada", `${short} agora está sob comando de ${coach || 'Técnico'}.`, "success");
    this.closeModal();
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
    this.activeModal = (state) => Modal(PreMatchSetupContent(state), "Ajustes da Partida");
    this.render(store.getState());
  }

  openImportModal(teamId) {
    this.activeModal = () => Modal(ImportListContent(teamId), "Importar Atletas");
    this.render(store.getState());
  }

  async processImport(teamId, text) {
    if (!text.trim()) {
      toasts.show("Aviso", "Cole o texto da súmula primeiro.", "warning");
      return;
    }
    
    toasts.show("IA", "Analisando lista de jogadores...", "info");
    
    try {
      const { players } = await parsePlayersFromText(text);
      this.applyImportedPlayers(teamId, players);
    } catch (e) {
      toasts.show("Erro", "Falha ao processar texto.", "error");
    }
  }

  async handlePlayerImageUpload(event, teamId) {
    const file = event.target.files[0];
    if (!file) return;

    toasts.show("IA", "Lendo imagem da súmula...", "info");
    
    try {
      const base64 = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.readAsDataURL(file);
      });

      const data = await parsePlayersFromImage(base64);
      
      // A IA pode retornar vários formatos, pegamos o primeiro time se houver
      const players = data.teams?.[0]?.players || data.players || [];
      if (players.length === 0) throw new Error("Nenhum jogador encontrado.");
      
      this.applyImportedPlayers(teamId, players);
    } catch (e) {
      console.error(e);
      toasts.show("Erro", "IA falhou ao ler a imagem.", "error");
    }
  }

  applyImportedPlayers(teamId, players) {
    const teamKey = teamId === 'home' ? 'homeTeam' : 'awayTeam';
    const state = store.getState();
    const team = { ...state[teamKey] };
    
    const positionedPlayers = players.map((p, idx) => {
      let x = 50, y = 50;
      const isGK = p.position === 'GK' || p.name.toLowerCase().includes('rossi') || p.number === 1;
      
      if (isGK) { 
        x = 8; y = 50; 
      } else if (p.isStarter || idx < 11) {
        // Distribuição básica para evitar sobreposição total
        x = p.position === 'DF' ? 25 : p.position === 'MF' ? 50 : 75;
        y = 15 + ((idx % 7) * 12); 
      }

      return {
        id: generateId(),
        name: p.name,
        number: parseInt(p.number) || (idx + 1),
        position: p.position || (isGK ? 'GK' : 'MF'),
        isStarter: p.isStarter !== undefined ? p.isStarter : idx < 11,
        x, y,
        events: [],
        hasLeftGame: false
      };
    });

    store.setState({ [teamKey]: { ...team, players: positionedPlayers } });
    toasts.show("Sucesso", `${positionedPlayers.length} atletas carregados!`, "success");
    this.openSetup();
  }

  saveSetup() {
    const state = store.getState();
    const comp = document.getElementById('setup-competition').value;
    const ref = document.getElementById('setup-referee').value;
    const stad = document.getElementById('setup-stadium').value;
    const date = document.getElementById('setup-date').value;
    const obs = document.getElementById('setup-observations').value;
    const halfDuration = parseInt(document.getElementById('rules-duration').value) || 45;
    const maxSubstitutions = parseInt(document.getElementById('rules-subs').value) || 5;

    store.setState({
      competition: comp,
      referee: ref,
      stadium: stad,
      matchDate: date,
      observations: obs,
      rules: { ...state.rules, halfDuration, maxSubstitutions }
    });
    toasts.show("Súmula", "Configurações profissionais salvas.", "success");
    this.closeModal();
  }

  setActiveTab(tab) {
    this.activeTab = tab;
    this.render(store.getState());
  }

  openEndGameOptions() {
    this.activeModal = () => Modal(EndGameOptionsContent(), "Próximo Passo");
    this.render(store.getState());
  }

  startExtraTime() {
    store.saveToHistory();
    store.setState({ 
      period: '1ET', 
      timeElapsed: 0, 
      timerStartedAt: null, 
      isPaused: true 
    });
    this.addEvent('PERIOD_START', 'none', 'Início da Prorrogação (1º Tempo Prorr.)');
    toasts.show("Prorrogação", "Partida avançada para o tempo extra.", "info");
    this.closeModal();
  }

  startPenalties() {
    store.saveToHistory();
    store.setState({ 
      period: 'PENALTIES', 
      timeElapsed: 0, 
      timerStartedAt: null, 
      isPaused: true,
      penaltyScore: { home: 0, away: 0 },
      penaltySequence: []
    });
    this.addEvent('PERIOD_START', 'none', 'Início da Disputa de Pênaltis');
    toasts.show("Pênaltis", "A decisão será nas penalidades!", "warning");
    this.closeModal();
  }

  handlePenaltyShot(teamId, success) {
    store.saveToHistory();
    store.setState(prev => {
        const newScore = { ...prev.penaltyScore };
        if (success) newScore[teamId]++;
        
        const newSequence = [...(prev.penaltySequence || []), { teamId, success, timestamp: Date.now() }];
        
        return { ...prev, penaltyScore: newScore, penaltySequence: newSequence };
    });
    
    toasts.show("Pênaltis", success ? "GOL!" : "PERDEU!", success ? "success" : "error");
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
      let newState = {
        isPaused: false,
        timerStartedAt: now,
        startTime: state.startTime || now
      };

      // Início automático de períodos se pausado no início
      if (state.period === 'PRE_MATCH') {
        newState.period = '1T';
        newState.timeElapsed = 0;
        this.addEvent('PERIOD_START', 'none', 'Início de Jogo (1º Tempo)');
      } else if (state.period === 'INTERVAL') {
        newState.period = '2T';
        newState.timeElapsed = 0;
        this.addEvent('PERIOD_START', 'none', 'Recomeço de Jogo (2º Tempo)');
      }

      store.setState(newState);
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
        
        // Alerta de Fim de Tempo
        const currentMin = Math.floor(totalMs / 60000);
        if (!state.isPaused && currentMin >= state.rules.halfDuration && !this._timeAlerted) {
          toasts.show("Fim do Tempo", `Atingidos os ${state.rules.halfDuration} minutos regulamentares.`, "warning");
          this._timeAlerted = true;
        }
        if (currentMin < state.rules.halfDuration) this._timeAlerted = false;
      }
    }, 200);
  }

  undoLastEvent() {
    if (store.undo()) {
      toasts.show("Desfeito", "Ação anterior revertida com sucesso.", "info");
    } else {
      toasts.show("Aviso", "Nada para desfazer no histórico.", "warning");
    }
  }

  triggerVAR() {
    const state = store.getState();
    const importantEventIdx = state.events.findIndex(e => 
      ['GOAL', 'RED_CARD', 'PENALTY'].includes(e.type) && !e.isAnnulled
    );

    if (importantEventIdx !== -1) {
      store.saveToHistory();
      store.setState(prev => {
        const events = [...prev.events];
        const target = events[importantEventIdx];
        events[importantEventIdx] = { 
          ...target, 
          isAnnulled: true, 
          description: `${target.description} (ANULADO PELO VAR)` 
        };
        
        // Add VAR event
        const varEvent = {
          id: generateId(),
          type: 'VAR',
          teamId: 'none',
          minute: Math.floor(prev.timeElapsed / 60000),
          timestamp: Date.now(),
          description: `📺 VAR: Decisão revertida (${target.type})`,
          isAnnulled: false
        };
        
        return { ...prev, events: [varEvent, ...events] };
      });
      toasts.show("VAR", "Decisão de campo anulada com sucesso.", "warning");
    } else {
      toasts.show("AVISO", "Nenhum lance de impacto elegível para VAR.", "info");
    }
  }

  addEvent(type, teamId, description, playerId = null, relatedPlayerId = null) {
    store.saveToHistory();
    const state = store.getState();
    const now = Date.now();
    
    const elapsed = state.timeElapsed + (state.timerStartedAt ? now - state.timerStartedAt : 0);
    const minute = Math.floor(elapsed / 60000); // Removido +1 para bater com cronômetro real (0' é início)

    const newEvent = {
        id: generateId(),
        type: type.toUpperCase(),
        teamId,
        playerId,
        relatedPlayerId,
        minute: minute,
        timestamp: now,
        description,
        isAnnulled: false
    };

    store.setState(prev => {
      let newState = { ...prev };
      const teamKey = teamId === 'home' ? 'homeTeam' : 'awayTeam';
      const otherTeamKey = teamId === 'home' ? 'awayTeam' : 'homeTeam';

      // --- LÓGICA DE NEGÓCIO POR TIPO DE EVENTO ---
      const team = prev[teamKey];
      const player = team ? team.players.find(p => p.id === playerId) : null;

      if (type === 'SUBSTITUTION' || type === 'CONCUSSION_SUBSTITUTION') {
        const team = { ...prev[teamKey] };
        
        // Validação de Limite de Subs
        const subsCount = prev.events.filter(e => e.teamId === teamId && e.type === 'SUBSTITUTION' && !e.isAnnulled).length;
        if (subsCount >= prev.rules.maxSubstitutions && type === 'SUBSTITUTION') {
            toasts.show("Limite Excedido", `O ${team.shortName} já realizou as ${prev.rules.maxSubstitutions} substituições permitidas.`, "error");
            // Permitimos continuar (o narrador manda), mas avisamos.
        }

        const playerOut = team.players.find(p => p.id === playerId);
        const playerIn = team.players.find(p => p.id === relatedPlayerId);

        if (playerOut && playerIn) {
          const updatedPlayers = team.players.map(p => {
            if (p.id === playerId) return { ...p, isStarter: false, hasLeftGame: true };
            if (p.id === relatedPlayerId) return { ...p, isStarter: true, x: playerOut.x, y: playerOut.y }; // Herda posição tática
            return p;
          });
          newState[teamKey] = { ...team, players: updatedPlayers };
          newEvent.description = `Sai ${playerOut.name} (#${playerOut.number}), Entra ${playerIn.name} (#${playerIn.number})`;
        }
      } 
      
      else if (type === 'YELLOW_CARD' && playerId) {
        const team = { ...prev[teamKey] };
        const player = team.players.find(p => p.id === playerId);
        const yellowCount = (player.events || []).filter(e => e.type === 'YELLOW_CARD' && !e.isAnnulled).length;

        if (yellowCount >= 1) { 
          const redEvent = {
            id: generateId(),
            type: 'RED_CARD',
            teamId,
            playerId,
            minute: minute,
            timestamp: now + 1,
            description: `Expulsão (2º Amarelo): ${player.name}`,
            isAnnulled: false
          };
          const updatedPlayers = team.players.map(p => 
            p.id === playerId ? { ...p, isStarter: false, hasLeftGame: true } : p
          );
          newState[teamKey] = { ...team, players: updatedPlayers };
          newState.events = [redEvent, newEvent, ...prev.events];
          toasts.show("EXPULSÃO", `${player.name} recebeu o 2º amarelo.`, "error");
          return newState;
        }
        toasts.show("CARTÃO AMARELO", `${player.name} foi advertido.`, "warning");
      }
      
      else if (type === 'RED_CARD' && playerId) {
        const team = { ...prev[teamKey] };
        const player = team.players.find(p => p.id === playerId);
        const updatedPlayers = team.players.map(p => 
          p.id === playerId ? { ...p, isStarter: false, hasLeftGame: true } : p
        );
        newState[teamKey] = { ...team, players: updatedPlayers };
        toasts.show("CARTÃO VERMELHO", `${player.name} expulso de campo!`, "error");
      }

      else if (type === 'GOAL') {
        toasts.show("GOL!", `Goooool do ${team.shortName}!`, "success");
      }

      else if (type === 'GK_8_SECONDS') {
        const otherTeamKey = teamId === 'home' ? 'awayTeam' : 'homeTeam';
        const otherTeamId = teamId === 'home' ? 'away' : 'home';
        
        const cornerEvent = {
          id: generateId(),
          type: 'CORNER',
          teamId: otherTeamId,
          minute: minute,
          timestamp: now + 1,
          description: `ESCANTEIO (Infração 8s GK): ${otherTeamId === 'home' ? prev.homeTeam.shortName : prev.awayTeam.shortName}`,
          isAnnulled: false
        };
        newState.events = [cornerEvent, newEvent, ...prev.events];
        toasts.show("Infração 8s", "Goleiro excedeu tempo. Escanteio para o adversário.", "warning");
        return newState;
      }

      else if (type === 'SET_GOALKEEPER' && playerId) {
        const team = { ...prev[teamKey] };
        const updatedPlayers = team.players.map(p => {
          if (p.id === playerId) return { ...p, position: 'GK' };
          if (p.position === 'GK' && p.isStarter) return { ...p, position: 'MF' }; // Antigo vira linha
          return p;
        });
        newState[teamKey] = { ...team, players: updatedPlayers };
        toasts.show("Novo Goleiro", `${team.players.find(p => p.id === playerId).name} assumiu a meta.`, "info");
      }

      // Novos Eventos: Impedimento, Escanteio, Pênalti, Finalização
      else if (type === 'OFFSIDE') {
          newEvent.description = `IMPEDIMENTO: ${player ? player.name : (teamId === 'home' ? prev.homeTeam.shortName : prev.awayTeam.shortName)}`;
      }
      else if (type === 'CORNER') {
          newEvent.description = `ESCANTEIO: ${player ? player.name : (teamId === 'home' ? prev.homeTeam.shortName : prev.awayTeam.shortName)}`;
      }
      else if (type === 'PENALTY') {
          newEvent.description = `PÊNALTI: ${player ? player.name : (teamId === 'home' ? prev.homeTeam.shortName : prev.awayTeam.shortName)}`;
          toasts.show("PÊNALTI!", "Lance perigoso na área.", "warning");
      }
      else if (type === 'SHOT') {
          newEvent.description = `CHUTE / FINALIZAÇÃO: ${player ? player.name : (teamId === 'home' ? prev.homeTeam.shortName : prev.awayTeam.shortName)}`;
      }
      else if (type === 'VAR') {
          newEvent.description = `ANÁLISE VAR: ${teamId === 'home' ? prev.homeTeam.shortName : prev.awayTeam.shortName}`;
          toasts.show("📺 VAR", "Verificando lance na cabine.", "info");
      }
      else if (type === 'INJURY') {
          newEvent.description = `ATENDIMENTO MÉDICO: ${teamId === 'home' ? prev.homeTeam.shortName : prev.awayTeam.shortName}`;
      }

      // Verificação Final: Time sem Goleiro
      const teamAfter = newState[teamKey];
      if (teamAfter && teamAfter.id !== 'none') {
        const hasGK = teamAfter.players.some(p => p.isStarter && p.position === 'GK');
        if (!hasGK && (type === 'RED_CARD' || type === 'SUBSTITUTION' || type === 'SET_GOALKEEPER')) {
            toasts.show("⚠️ TIME SEM GOLEIRO", `O ${teamAfter.shortName} está sem goleiro em campo!`, "warning");
        }
      }

      newState.events = [newEvent, ...prev.events];
      return newState;
    });
  }

  openEditPlayer(playerId, teamId) {
    const state = store.getState();
    const team = teamId === 'home' ? state.homeTeam : state.awayTeam;
    const player = team.players.find(p => p.id === playerId);
    
    this.activeModal = () => Modal(EditPlayerContent(player, teamId), `Editar Atleta: ${player.name}`);
    this.render(state);
  }

  openTeamActions(teamId) {
    const state = store.getState();
    const team = teamId === 'home' ? state.homeTeam : state.awayTeam;
    
    this.activeModal = () => Modal(TeamActionContent(teamId, team), `Ações Coletivas: ${team.shortName}`);
    this.render(state);
  }

  savePlayerEdit(playerId, teamId) {
    const name = document.getElementById('edit-player-name').value;
    const number = parseInt(document.getElementById('edit-player-number').value);
    const position = document.getElementById('edit-player-position').value;
    const isStarter = document.getElementById('edit-player-starter').checked;

    store.saveToHistory();
    store.setState(prev => {
      const teamKey = teamId === 'home' ? 'homeTeam' : 'awayTeam';
      const team = { ...prev[teamKey] };
      const players = team.players.map(p => {
        if (p.id === playerId) {
          return { ...p, name, number, position, isStarter };
        }
        return p;
      });
      return { ...prev, [teamKey]: { ...team, players } };
    });

    toasts.show("Atleta Atualizado", `${name} (#${number}) atualizado com sucesso.`, "success");
    this.closeModal();
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
    
    if (current === 'FINISHED') return;

    const nextIdx = periods.indexOf(current) + 1;
    if (nextIdx < periods.length) {
      const nextPeriod = periods[nextIdx];
      const label = nextPeriod === '1T' ? 'Início do 1º Tempo' :
                    nextPeriod === 'INTERVAL' ? 'Intervalo' :
                    nextPeriod === '2T' ? 'Início do 2º Tempo' :
                    nextPeriod === 'FINISHED' ? 'Fim de Jogo' : 'Próxima Etapa';

      store.setState({ period: nextPeriod, isPaused: true });
      this.addEvent('PERIOD_START', 'none', label);
      toasts.show("Etapa Atualizada", `Partida agora em: ${nextPeriod}`, "info");
    }
  }

  handleTeamAction(type, teamId) {
    const labels = { 
        CORNER: 'ESCANTEIO', 
        OFFSIDE: 'IMPEDIMENTO', 
        FOUL: 'FALTA COLETIVA', 
        PENALTY: 'PÊNALTI', 
        VAR: 'VAR', 
        INJURY: 'ATENDIMENTO' 
    };
    const label = labels[type] || type;
    const team = store.getState()[teamId === 'home' ? 'homeTeam' : 'awayTeam'];
    this.addEvent(type, teamId, `${label}: ${team.shortName}`);
    this.closeModal();
  }

  resetMatch() {
    this.confirmAction("Deseja mesmo zerar tudo e voltar ao início?", () => {
      store.reset();
      this.activeModal = null;
      this.openSetup();
    });
  }
}

new App();
