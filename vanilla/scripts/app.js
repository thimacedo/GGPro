// Ponto de entrada principal - Narrador Pro (Vanilla Premium)
// Arquitetura Modular e Reativa

import matchState from './state.js';
import { renderHeader, updateTimer } from './components/header.js';
import { toastManager } from './components/toasts.js';
import { modalManager } from './components/modals.js';
import { fieldManager } from './components/field.js';
import { statsManager } from './components/stats.js';
import { voice } from './services/voice.js';
import { processImageForPlayers, generateMatchReport, parseRegulationDocument } from './services/gemini.js';
import { TEAM_ABBREVIATIONS } from './constants.js';

// Estado local da UI (não persistente)
const ui = {
  activeTab: 'main',
  viewMode: 'field',
  isFullscreen: false,
  isLightMode: false,
  isSettingsOpen: false
};

// --- Inicialização ---

function init() {
  // Subscrever às mudanças de estado para re-renderizar
  matchState.subscribe(() => render());
  
  // Renderização inicial
  render();
  
  // Configurar timer global
  setInterval(() => {
    const state = matchState.getState();
    if (!state.isPaused && state.period !== 'PENALTIES' && state.period !== 'FINISHED' && state.period !== 'HALFTIME') {
      updateTimer();
    }
  }, 1000);

  // Expor funções necessárias globalmente para os onclick do HTML gerado
  window.render = render;
  window.handleAction = (action) => console.log("Action:", action);
  window.generateReport = handleGenerateReport;
  window.exportToClipboard = handleExportClipboard;
  window.handleImageUpload = handleImageUpload;
  window.handleRegulationUpload = handleRegulationUpload;
  window.handleVarReversal = handleVarReversal;
  window.modalManager = modalManager;
  window.generateDistinctShortName = generateDistinctShortName;
}

// --- Renderização ---

function render() {
  const app = document.getElementById('app');
  if (!app) return;

  const state = matchState.getState();

  app.innerHTML = `
    <div class="h-screen flex flex-col font-sans selection:bg-blue-500/20 overflow-hidden transition-colors duration-500 ${ui.isLightMode ? 'claro' : 'bg-slate-950 text-slate-50'}">
      
      <!-- Componente Header -->
      <div id="headerContainer"></div>
      
      <!-- Conteúdo Principal -->
      <main class="flex-1 flex flex-col px-2 md:px-4 min-h-0 ${ui.isFullscreen ? 'overflow-hidden pb-24 pt-2' : 'overflow-y-auto pb-40 pt-4'} custom-scrollbar">
        <div class="w-full max-w-7xl mx-auto flex flex-col min-h-0 ${ui.isFullscreen ? 'h-full' : 'gap-4 md:gap-6'}">
          
          <!-- Tabs (Apenas se não for fullscreen) -->
          ${!ui.isFullscreen ? `
          <div class="flex justify-center gap-2 bg-slate-900/50 p-1.5 rounded-2xl w-fit mx-auto border border-white/5 backdrop-blur-xl">
            <button id="tabMain" class="px-8 py-2.5 rounded-xl font-black text-[10px] tracking-widest transition-all ${ui.activeTab === 'main' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-500 hover:text-white'}">NARRAÇÃO</button>
            <button id="tabStats" class="px-8 py-2.5 rounded-xl font-black text-[10px] tracking-widest transition-all ${ui.activeTab === 'stats' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-500 hover:text-white'}">ESTATÍSTICAS</button>
          </div>
          ` : ''}
          
          <!-- Área de Conteúdo Dinâmico -->
          <div id="tabContent" class="flex-1 min-h-0">
            ${renderActiveTab(state)}
          </div>
        </div>
      </main>
      
      <!-- Command Bar (Controlador Inferior) -->
      ${renderCommandBar(state)}

      <!-- Botões de Atalho Flutuantes -->
      <div class="absolute top-4 right-4 z-[70] flex gap-2">
        <button id="toggleContrast" class="p-3 rounded-2xl bg-slate-900/80 text-white border border-white/10 backdrop-blur-md shadow-2xl hover:bg-slate-800 transition-all">🌓</button>
        <button id="openSettings" class="p-3 rounded-2xl bg-slate-900/80 text-white border border-white/10 backdrop-blur-md shadow-2xl hover:bg-slate-800 transition-all">⚙️</button>
      </div>

      <!-- Menu de Configurações (Overlay) -->
      ${renderSettingsMenu(state)}
    </div>
  `;

  // Inicializar componentes e listeners
  attachHeader(state);
  attachEventListeners();
}

function renderActiveTab(state) {
  if (ui.activeTab === 'main') {
    return `
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch ${ui.isFullscreen ? 'h-full' : ''}">
        <!-- Painel Esquerdo: Visualização (Lista ou Campo) -->
        <div class="${ui.isFullscreen ? 'lg:col-span-9 flex flex-col h-full min-h-0' : 'lg:col-span-8 flex flex-col'}">
          <div class="flex items-center gap-2 mb-3">
            <button id="setViewList" class="flex-1 py-3 rounded-2xl font-black text-[9px] uppercase tracking-widest border transition-all ${ui.viewMode === 'list' ? 'bg-blue-600 border-blue-400 text-white' : 'bg-slate-900 border-white/5 text-slate-500'}">📋 Lista Convencional</button>
            <button id="setViewField" class="flex-1 py-3 rounded-2xl font-black text-[9px] uppercase tracking-widest border transition-all ${ui.viewMode === 'field' ? 'bg-blue-600 border-blue-400 text-white' : 'bg-slate-900 border-white/5 text-slate-500'}">🏟 Mapa Tático</button>
            <button id="toggleFullscreen" class="p-3 rounded-2xl bg-slate-900 border border-white/5 text-slate-500 hover:text-white transition-all">${ui.isFullscreen ? '⊟' : '⊞'}</button>
          </div>
          
          <div id="mainDisplay" class="relative flex-1 min-h-0">
            ${ui.viewMode === 'field' ? fieldManager.render(state, ui.isFullscreen) : renderPlayerLists(state)}
          </div>
        </div>
        
        <!-- Painel Direito: Cronologia e Atalhos -->
        <div class="${ui.isFullscreen ? 'lg:col-span-3 flex flex-col h-full min-h-0' : 'lg:col-span-4 flex flex-col'}">
          <div class="bg-slate-900/50 rounded-[2.5rem] border border-white/5 flex flex-col overflow-hidden shadow-2xl flex-1 min-h-0 backdrop-blur-xl">
            <div class="p-6 border-b border-white/5 bg-white/5 flex justify-between items-center">
              <h3 class="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400 flex items-center gap-2">📜 Cronologia</h3>
              <button id="undoBtn" class="p-2 text-[10px] font-black text-slate-500 hover:text-red-400 transition-colors uppercase">Desfazer</button>
            </div>
            <div class="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
              ${(state.events || []).map(e => renderTimelineEvent(e, state)).join('')}
              ${(state.events || []).length === 0 ? '<div class="text-center text-slate-600 text-xs py-10">Nenhum lance registrado...</div>' : ''}
            </div>
          </div>
        </div>
      </div>
    `;
  }
  return statsManager.render(state);
}

function renderCommandBar(state) {
  return `
    <div class="fixed bottom-0 left-0 right-0 z-[70] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent">
      <div class="max-w-4xl mx-auto flex items-center gap-3">
        <button id="playPauseBottom" class="w-16 h-16 rounded-2xl shadow-2xl transition-all shrink-0 flex items-center justify-center text-2xl ${state.isPaused ? 'bg-emerald-600 text-white shadow-emerald-900/20' : 'bg-amber-500 text-slate-950 shadow-amber-900/20'}">
          ${state.isPaused ? '▶' : '⏸'}
        </button>
        
        <div class="flex-1 bg-slate-900/95 border border-white/10 p-2 rounded-3xl shadow-[0_30px_60px_-15px_rgba(0,0,0,0.7)] flex items-center gap-2 backdrop-blur-3xl ring-1 ring-white/5 overflow-hidden">
          <button id="micBtn" class="p-4 rounded-2xl transition-all shrink-0 hover:bg-white/5 relative group">
            <span class="text-2xl group-active:scale-95 transition-transform block">🎙️</span>
            <div id="micPulse" class="absolute inset-0 bg-red-600/20 rounded-2xl hidden animate-pulse"></div>
          </button>
          
          <input 
            type="text" 
            id="commandInput"
            placeholder="Narre algo (ex: 'Gol do Flamengo n 10'...)" 
            class="flex-1 bg-transparent border-none py-3 px-2 font-bold text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-0" 
          />
          
          <button id="sendBtn" class="p-4 bg-blue-600 rounded-2xl text-white hover:bg-blue-500 transition-all shadow-xl shadow-blue-900/30 flex items-center justify-center">
            <span class="text-xl">➤</span>
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderSettingsMenu(state) {
  if (!ui.isSettingsOpen) return '';
  return `
    <div id="settingsOverlay" class="fixed inset-0 bg-black/60 backdrop-blur-sm z-[75] animate-fade-in"></div>
    <div class="fixed top-20 right-4 w-80 bg-slate-900 border border-white/10 rounded-[2.5rem] shadow-2xl p-6 z-[80] animate-slide-up flex flex-col gap-3">
      <h4 class="text-[10px] font-black uppercase text-slate-500 tracking-[0.3em] mb-4 text-center">Menu Técnico</h4>
      
      <button onclick="modalManager.showSumula()" class="w-full p-4 bg-slate-800 hover:bg-slate-700 rounded-2xl text-left flex items-center gap-4 transition-all">
        <span class="text-xl">📋</span>
        <span class="text-xs font-black uppercase tracking-widest text-white">Editar Súmula</span>
      </button>
      
      <button id="btnNextPeriod" class="w-full p-4 bg-slate-800 hover:bg-blue-600 rounded-2xl text-left flex items-center gap-4 transition-all">
        <span class="text-xl">⏳</span>
        <span class="text-xs font-black uppercase tracking-widest text-white">Próximo Período</span>
      </button>

      <button onclick="handleVarReversal()" class="w-full p-4 bg-slate-800 hover:bg-amber-600 rounded-2xl text-left flex items-center gap-4 transition-all group">
        <span class="text-xl group-hover:scale-110 transition-transform">📺</span>
        <span class="text-xs font-black uppercase tracking-widest text-white">Reversão de VAR</span>
      </button>

      <button id="btnFinalize" class="w-full p-4 bg-red-600/10 border border-red-600/20 hover:bg-red-600 rounded-2xl text-left flex items-center gap-4 transition-all text-red-500 hover:text-white">
        <span class="text-xl">🏁</span>
        <span class="text-xs font-black uppercase tracking-widest">Encerrar Jogo</span>
      </button>

      <div class="h-px bg-white/5 my-2"></div>

      <button id="btnExport" class="w-full p-3 bg-slate-800/50 hover:bg-slate-800 rounded-xl text-center text-[10px] font-black uppercase tracking-widest text-slate-400">
        Salvar Backup (JSON)
      </button>
      
      <button id="btnReset" class="w-full p-3 bg-red-900/20 hover:bg-red-900/40 rounded-xl text-center text-[10px] font-black uppercase tracking-widest text-red-400 mt-2">
        Resetar Partida
      </button>
    </div>
  `;
}

// --- Listas de Jogadores ---

function renderPlayerLists(state) {
  return `
    <div class="bg-slate-900/50 rounded-[2.5rem] border border-white/5 p-6 md:p-8 flex flex-col shadow-2xl backdrop-blur-xl h-full overflow-y-auto custom-scrollbar">
      <div class="grid grid-cols-2 gap-6 h-full">
        <div class="flex flex-col gap-4">
          <div class="flex items-center justify-between px-2">
            <h4 class="text-xs font-black uppercase tracking-widest" style="color: ${state.homeTeam.color}">${state.homeTeam.shortName}</h4>
            <span class="text-[9px] font-black text-slate-600 uppercase">Mandante</span>
          </div>
          ${renderPlayerList(state.homeTeam, 'home')}
        </div>
        <div class="flex flex-col gap-4">
          <div class="flex items-center justify-between px-2">
            <h4 class="text-xs font-black uppercase tracking-widest" style="color: ${state.awayTeam.color}">${state.awayTeam.shortName}</h4>
            <span class="text-[9px] font-black text-slate-600 uppercase">Visitante</span>
          </div>
          ${renderPlayerList(state.awayTeam, 'away')}
        </div>
      </div>
    </div>
  `;
}

function renderPlayerList(team, teamId) {
  const starters = team.players.filter(p => p.isStarter).sort((a,b) => a.number - b.number);
  return `
    <div class="space-y-2">
      ${starters.map(p => `
        <button class="w-full p-3 bg-slate-800/40 hover:bg-slate-800 rounded-2xl flex items-center gap-4 transition-all border border-white/5 group" onclick="modalManager.showPlayerActions(JSON.parse(this.dataset.player), JSON.parse(this.dataset.team), '${teamId}')" data-player='${JSON.stringify(p)}' data-team='${JSON.stringify(team)}'>
          <div class="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black text-white shrink-0 group-hover:scale-110 transition-transform shadow-lg" style="background-color: ${team.color}">
            ${p.number}
          </div>
          <div class="flex flex-col items-start overflow-hidden">
            <span class="text-white font-black text-[11px] truncate w-full uppercase">${p.name}</span>
            <span class="text-[9px] font-black text-slate-500 uppercase">${p.position}</span>
          </div>
          ${p.cards?.yellow > 0 ? `<div class="ml-auto w-2 h-3 bg-yellow-500 rounded-sm"></div>` : ''}
          ${p.cards?.red > 0 ? `<div class="ml-auto w-2 h-3 bg-red-600 rounded-sm"></div>` : ''}
        </button>
      `).join('')}
    </div>
  `;
}

// --- Timeline & Eventos ---

function renderTimelineEvent(event, state) {
  const team = event.teamId === 'home' ? state.homeTeam : state.awayTeam;
  const isAnnulled = event.isAnnulled;
  const color = isAnnulled ? '#475569' : (team?.color || '#ffffff');
  
  return `
    <div class="flex gap-4 group relative ${isAnnulled ? 'opacity-40 grayscale pointer-events-none' : ''}">
      <div class="flex flex-col items-center">
        <div class="w-10 h-10 rounded-full bg-slate-800 border-2 border-white/10 flex items-center justify-center text-[10px] font-black text-white z-10 group-hover:border-white/30 transition-all">
          ${event.minute}'
        </div>
        <div class="w-0.5 h-full bg-white/5 group-last:hidden"></div>
      </div>
      <div class="flex-1 pb-6">
        <div class="p-4 bg-slate-800/50 rounded-[1.5rem] border-l-4 border-white/5 group-hover:bg-slate-800 transition-all" style="border-left-color: ${color}">
          <p class="text-xs font-black text-white mb-1">${event.description}</p>
          <div class="flex items-center justify-between">
            <span class="text-[8px] font-black uppercase tracking-widest text-slate-500">${matchState.formatEventType(event.type)}</span>
            ${isAnnulled ? `<span class="text-[8px] font-black uppercase text-red-500">ANULADO PELO VAR</span>` : ''}
          </div>
        </div>
      </div>
    </div>
  `;
}

// --- Lógica Auxiliar ---

function attachHeader(state) {
  const container = document.getElementById('headerContainer');
  if (container) {
    renderHeader(container, {
      onPlayPauseToggle: () => matchState.handlePlayPauseToggle(),
      onNextPeriodClick: handleAdvancePeriod,
      isFullscreen: ui.isFullscreen
    });
  }
}

function attachEventListeners() {
  // Tabs
  document.getElementById('tabMain')?.addEventListener('click', () => { ui.activeTab = 'main'; render(); });
  document.getElementById('tabStats')?.addEventListener('click', () => { ui.activeTab = 'stats'; render(); });
  
  // View Modes
  document.getElementById('setViewList')?.addEventListener('click', () => { ui.viewMode = 'list'; render(); });
  document.getElementById('setViewField')?.addEventListener('click', () => { ui.viewMode = 'field'; render(); });
  document.getElementById('toggleFullscreen')?.addEventListener('click', () => { ui.isFullscreen = !ui.isFullscreen; render(); });
  
  // Command Bar
  document.getElementById('playPauseBottom')?.addEventListener('click', () => matchState.handlePlayPauseToggle());
  document.getElementById('micBtn')?.addEventListener('click', () => voice.toggle());
  
  const cmdInput = document.getElementById('commandInput');
  cmdInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { handleCommandSubmit(cmdInput.value); cmdInput.value = ''; }
  });
  document.getElementById('sendBtn')?.addEventListener('click', () => {
    if (cmdInput) { handleCommandSubmit(cmdInput.value); cmdInput.value = ''; }
  });

  // Settings
  document.getElementById('openSettings')?.addEventListener('click', () => { ui.isSettingsOpen = true; render(); });
  document.getElementById('settingsOverlay')?.addEventListener('click', () => { ui.isSettingsOpen = false; render(); });
  document.getElementById('toggleContrast')?.addEventListener('click', () => { ui.isLightMode = !ui.isLightMode; render(); });
  
  // Settings Actions
  document.getElementById('btnNextPeriod')?.addEventListener('click', handleAdvancePeriod);
  document.getElementById('btnFinalize')?.addEventListener('click', () => {
    if (confirm("Encerrar partida e gerar relatório final?")) {
      matchState.handleFinalizeMatch();
      toastManager.show("Fim de Jogo", "A partida foi encerrada oficialmente.", "success");
      ui.isSettingsOpen = false;
      render();
    }
  });

  document.getElementById('btnReset')?.addEventListener('click', () => {
    if (confirm("ATENÇÃO: Isso apagará TODOS os dados da partida. Continuar?")) {
      matchState.handleReset();
      toastManager.show("Resert Realizado", "O sistema voltou ao estado inicial.", "warning");
      ui.isSettingsOpen = false;
      render();
    }
  });

  document.getElementById('undoBtn')?.addEventListener('click', () => {
    if (matchState.undo()) {
      toastManager.show("Undo", "Último evento desfeito.", "info");
      render();
    }
  });

  // Voice Event Listeners
  window.addEventListener('voiceStateChange', (e) => {
    const { isRecording } = e.detail;
    const pulse = document.getElementById('micPulse');
    if (pulse) isRecording ? pulse.classList.remove('hidden') : pulse.classList.add('hidden');
  });
}

function handleAdvancePeriod() {
  const state = matchState.getState();
  if (state.period === '2T' || state.period === '2ET') {
    // Verificar se está empatado para sugerir prorrogação ou pênaltis
    const goalsHome = state.events.filter(e => e.type === 'GOAL' && e.teamId === 'home' && !e.isAnnulled).length;
    const goalsAway = state.events.filter(e => e.type === 'GOAL' && e.teamId === 'away' && !e.isAnnulled).length;

    modalManager.open(`
      <div class="flex flex-col gap-4">
        <p class="text-xs text-slate-400">O tempo regulamentar acabou. Placar: ${goalsHome} x ${goalsAway}. Como deseja proceder?</p>
        ${goalsHome === goalsAway ? `
          <button class="w-full p-4 bg-blue-600 rounded-2xl text-xs font-black uppercase text-white hover:bg-blue-500 transition-all" onclick="matchState.advancePeriod(); modalManager.close();">Iniciar Prorrogação</button>
          <button class="w-full p-4 bg-indigo-600 rounded-2xl text-xs font-black uppercase text-white hover:bg-indigo-500 transition-all" onclick="handleStartPenalties(); modalManager.close();">Ir Direto p/ Pênaltis</button>
        ` : ''}
        <button class="w-full p-4 bg-red-600 rounded-2xl text-xs font-black uppercase text-white hover:bg-red-500 transition-all" onclick="matchState.advancePeriod('FINISHED'); modalManager.close();">Encerrar Partida</button>
        <button class="w-full p-4 bg-slate-800 rounded-2xl text-xs font-black uppercase text-slate-400" onclick="modalManager.close();">Cancelar</button>
      </div>
    `, 'Fim do Tempo');
  } else {
    matchState.advancePeriod();
    toastManager.show("Novo Período", `Início de ${matchState.formatPeriodName(matchState.getState().period)}`, "info");
  }
}

function handleStartPenalties() {
  modalManager.open(`
    <div class="flex flex-col gap-4">
      <p class="text-xs text-slate-400">Quem inicia as cobranças?</p>
      <div class="grid grid-cols-2 gap-3">
        <button class="p-4 bg-slate-800 border border-white/5 rounded-2xl hover:bg-blue-600 transition-all" onclick="matchState.setState({penaltyStarter: 'home', period: 'PENALTIES'}); modalManager.close();">
          <span class="text-xs font-black uppercase text-white">${matchState.getState().homeTeam.shortName}</span>
        </button>
        <button class="p-4 bg-slate-800 border border-white/5 rounded-2xl hover:bg-blue-600 transition-all" onclick="matchState.setState({penaltyStarter: 'away', period: 'PENALTIES'}); modalManager.close();">
          <span class="text-xs font-black uppercase text-white">${matchState.getState().awayTeam.shortName}</span>
        </button>
      </div>
    </div>
  `, 'Disputa de Pênaltis');
}

async function handleCommandSubmit(text) {
  if (!text.trim()) return;
  // Fallback rápido local para comandos básicos antes de mandar pra IA
  const t = text.toLowerCase();
  
  if (t === 'desfazer' || t === 'voltar') {
    matchState.undo();
    return;
  }
  
  // Se não for controle básico, deixa a IA processar
  toastManager.show("Processando", "Interpretando narração...", "ai");
  try {
    await voice.processCommand(text);
  } catch (e) {
    console.error("Erro ao processar comando de voz:", e);
    toastManager.show("Erro de IA", "Não foi possível interpretar o comando.", "error");
  }
}

async function handleGenerateReport() {
  const state = matchState.getState();
  const timeline = (state.events || []).map(e => `${e.minute}' - ${e.description}`).join('\n');
  const context = `Resultado: ${state.homeTeam.name} ${state.events.filter(e => e.type === 'GOAL' && e.teamId === 'home').length} x ${state.events.filter(e => e.type === 'GOAL' && e.teamId === 'away').length} ${state.awayTeam.name}`;
  
  toastManager.show("IA Escritora", "Criando crônica da partida...", "ai");
  try {
    const report = await generateMatchReport(context, timeline);
    modalManager.open(`<div class="prose prose-invert max-w-none text-slate-300 text-sm leading-relaxed">${report.replace(/\n/g, '<br>')}</div>`, "Crônica da Partida");
  } catch (e) {
    toastManager.show("Erro", "Não foi possível gerar a crônica agora.", "error");
  }
}

async function handleImageUpload(event, type) {
  const file = event.target.files[0];
  if (!file) return;

  toastManager.show("IA Vision", "Analisando imagem...", "ai");
  try {
    const result = await processImageForPlayers(file, type === 'players' ? 'Lista de Atletas' : 'Súmula de Partida');
    
    if (type === 'players') {
      // O resultado deve ser um array de jogadores
      if (Array.isArray(result)) {
        matchState.setState(prev => {
          // Adiciona à equipe atual (precisaríamos saber qual equipe, o modal passa isso)
          // Para simplificar, assumimos que o modal injetou a equipe no window
          const teamId = window.currentImportTeamId || 'home';
          const teamKey = teamId === 'home' ? 'homeTeam' : 'awayTeam';
          return { ...prev, [teamKey]: { ...prev[teamKey], players: [...prev[teamKey].players, ...result] } };
        });
        toastManager.show("Sucesso", `${result.length} atletas importados.`, "success");
      }
    } else {
      // Súmula: atualiza dados do jogo
      matchState.setState({
        competition: result.competition || "",
        stadium: result.stadium || "",
        matchDate: result.matchDate || new Date().toISOString().split('T')[0],
        referee: result.referee || ""
      });
      toastManager.show("Sucesso", "Dados da súmula atualizados.", "success");
    }
    render();
  } catch (e) {
    toastManager.show("Erro", "Falha ao processar imagem.", "error");
  }
}

async function handleRegulationUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  toastManager.show("IA Regulamento", "Analisando regras da competição...", "ai");
  try {
    const rules = await parseRegulationDocument(file, file.type);
    matchState.setState(prev => ({
      ...prev,
      rules: { ...prev.rules, ...rules }
    }));
    toastManager.show("Regras Atualizadas", "O sistema foi configurado conforme o regulamento.", "success");
    modalManager.close();
    render();
  } catch (e) {
    toastManager.show("Erro", "Não foi possível ler o regulamento.", "error");
  }
}

function handleVarReversal() {
  const state = matchState.getState();
  const majorEvents = (state.events || []).filter(e => ['GOAL', 'YELLOW_CARD', 'RED_CARD', 'PENALTY'].includes(e.type));
  
  if (majorEvents.length === 0) {
    toastManager.show("VAR", "Nenhum lance de impacto para revisar.", "info");
    return;
  }

  modalManager.open(`
    <div class="flex flex-col gap-3">
      <p class="text-[10px] font-black uppercase text-slate-500 mb-2">Selecionar lance para revisão:</p>
      ${majorEvents.slice(0, 5).map(e => `
        <button class="w-full p-4 bg-slate-800 hover:bg-amber-600 border border-white/5 rounded-2xl flex justify-between items-center transition-all group" onclick="matchState.annulEvent('${e.id}'); modalManager.close();">
          <div class="flex flex-col items-start">
            <span class="text-white font-bold text-xs group-hover:text-white">${e.description}</span>
            <span class="text-[9px] font-black text-slate-500 group-hover:text-amber-200 uppercase">${e.minute}' - ${matchState.formatEventType(e.type)}</span>
          </div>
          <span class="text-xl">${e.isAnnulled ? '✅' : '🚫'}</span>
        </button>
      `).join('')}
    </div>
  `, 'Reversão de VAR');
  ui.isSettingsOpen = false;
  render();
}

// --- Funções Utilitárias de Dados ---

function generateDistinctShortName(teamName, otherShortName) {
  if (!teamName) return 'UND';
  const rawName = teamName.toLowerCase().trim();
  
  for (const [key, value] of Object.entries(TEAM_ABBREVIATIONS)) {
    if (rawName.includes(key)) {
      if (!otherShortName || value !== otherShortName) return value;
    }
  }

  const cleanName = rawName.replace(/[^a-z]/g, '').toUpperCase();
  let candidate = cleanName.substring(0, 3) || 'UND';

  if (candidate === otherShortName && cleanName.length > 3) {
    candidate = cleanName[0] + cleanName[1] + cleanName[cleanName.length > 3 ? 3 : 2];
  }

  return candidate.padEnd(3, 'X');
}

function hexToRgb(hex) {
  let c = hex.replace(/^#/, '');
  if (c.length === 3) c = c.split('').map(char => char + char).join('');
  const num = parseInt(c, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

function ensureDistinctColors(color1, color2) {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);
  const distance = Math.sqrt(Math.pow(c1.r - c2.r, 2) + Math.pow(c1.g - c2.g, 2) + Math.pow(c1.b - c2.b, 2));
  return distance < 80;
}

// Expor handlers para o modal (removido daqui e movido para init)

function handleExportClipboard() {
  const state = matchState.getState();
  const text = `📋 RELATÓRIO NARRADOR PRO\n\n` +
    `${state.homeTeam.name} vs ${state.awayTeam.name}\n` +
    `Data: ${state.matchDate}\n` +
    `Local: ${state.stadium}\n\n` +
    `CRONOLOGIA:\n` +
    state.events.filter(e => !e.isAnnulled).map(e => `${e.minute}' - ${e.description}`).join('\n');
  
  navigator.clipboard.writeText(text);
  toastManager.show("Copiado", "Relatório enviado para a área de transferência.", "success");
}

// Iniciar Aplicação
init();
