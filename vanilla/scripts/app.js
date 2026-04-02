// Ponto de entrada principal - Narrador Pro
// Versão Vanilla JS

import matchState from './state.js';
import { renderHeader, updateTimer } from './components/header.js';

// Estado da UI
const uiState = {
  activeTab: 'main',
  viewMode: 'list',
  isFullscreen: false,
  isLightMode: false,
  isSettingsOpen: false,
  isContextModalOpen: false,
  showEndGameModal: false,
  showResetModal: false,
  selectedPlayerForAction: null,
  selectedTeamForAction: null
};

// Toasts
const toasts = [];

function addToast(title, message, type = 'info') {
  const id = Math.random().toString(36).substr(2, 9);
  toasts.push({ id, title, message, type });
  renderToasts();
  
  const duration = type === 'ai' ? 10000 : 4000;
  setTimeout(() => {
    const idx = toasts.findIndex(t => t.id === id);
    if (idx !== -1) {
      toasts.splice(idx, 1);
      renderToasts();
    }
  }, duration);
}

function removeToast(id) {
  const idx = toasts.findIndex(t => t.id === id);
  if (idx !== -1) {
    toasts.splice(idx, 1);
    renderToasts();
  }
}

function renderToasts() {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  container.innerHTML = toasts.map(toast => `
    <div class="pointer-events-auto animate-slide-in bg-slate-900/95 border border-white/10 p-3 rounded-xl shadow-2xl flex items-center gap-3 min-w-[240px] max-w-[400px] backdrop-blur-md">
      <div class="p-2 rounded-lg ${
        toast.type === 'success' ? 'bg-emerald-500/20 text-emerald-400' : 
        toast.type === 'ai' ? 'bg-purple-500/20 text-purple-400' : 
        toast.type === 'error' ? 'bg-red-500/20 text-red-400' : 
        toast.type === 'warning' ? 'bg-amber-500/20 text-amber-400' : 
        'bg-blue-500/20 text-blue-400'
      }">
        ${toast.type === 'success' ? '✓' : toast.type === 'ai' ? '💬' : '🔔'}
      </div>
      <div class="flex flex-col">
        <span class="text-xs font-black uppercase text-white tracking-tight">${toast.title}</span>
        <span class="text-[10px] text-slate-300 font-medium leading-tight mt-0.5">${toast.message}</span>
      </div>
      <button onclick="window.removeToast('${toast.id}')" class="ml-auto text-slate-600 hover:text-white p-1 flex-shrink-0">✕</button>
    </div>
  `).join('');
}

// Expor removeToast globalmente para os botões inline
window.removeToast = removeToast;

// Renderização principal
function render() {
  const app = document.getElementById('app');
  if (!app) return;

  const state = matchState.getState();

  app.innerHTML = `
    <div class="h-screen flex flex-col font-sans selection:bg-blue-500/20 overflow-hidden transition-colors duration-500 ${uiState.isLightMode ? 'claro' : 'bg-slate-950 text-slate-50'}">
      <!-- Toast Container -->
      <div id="toastContainer" class="fixed top-24 right-4 z-[100] flex flex-col gap-2 pointer-events-none"></div>
      
      <!-- Header -->
      <div id="headerContainer"></div>
      
      <!-- Main Content -->
      <main class="flex-1 flex flex-col px-2 md:px-4 min-h-0 ${uiState.isFullscreen ? 'overflow-hidden pb-24 pt-2 md:pt-4' : 'overflow-y-auto pb-40 pt-4'} custom-scrollbar transition-all">
        <div class="w-full max-w-7xl mx-auto flex flex-col min-h-0 ${uiState.isFullscreen ? 'h-full' : 'gap-4 md:gap-6'}">
          <!-- Tabs -->
          ${!uiState.isFullscreen ? `
          <div class="flex justify-center gap-4">
            <button id="tabMain" class="px-6 py-2 rounded-full font-black text-[10px] tracking-widest transition-all ${uiState.activeTab === 'main' ? 'bg-slate-700 text-white shadow-lg' : 'text-slate-500 hover:text-white'}">DASHBOARD</button>
            <button id="tabStats" class="px-6 py-2 rounded-full font-black text-[10px] tracking-widest transition-all ${uiState.activeTab === 'stats' ? 'bg-slate-700 text-white shadow-lg' : 'text-slate-500 hover:text-white'}">ESTATÍSTICAS</button>
          </div>
          ` : ''}
          
          <!-- Tab Content -->
          <div id="tabContent" class="flex-1 min-h-0"></div>
        </div>
      </main>
      
      <!-- Bottom Command Bar -->
      <div class="fixed bottom-0 left-0 right-0 z-[70] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-gradient-to-t from-slate-950 via-slate-950/95 to-transparent">
        <div class="max-w-4xl mx-auto flex items-center gap-2">
          <button id="playPauseBottom" class="p-4 rounded-2xl shadow-xl transition-all shrink-0 ${state.isPaused ? 'bg-emerald-600 text-white' : 'bg-yellow-500 text-slate-900'}">
            ${state.isPaused ? '▶' : '⏸'}
          </button>
          <div class="flex-1 bg-slate-900/95 p-1.5 rounded-2xl shadow-2xl border border-white/10 flex items-center gap-1.5 backdrop-blur-3xl ring-1 ring-white/5 relative">
            <button id="micBtn" class="p-3 rounded-xl transition-all shrink-0 bg-slate-800 hover:bg-slate-700">🎤</button>
            <div class="flex-1 relative min-w-0">
              <input 
                type="text" 
                id="commandInput"
                placeholder="Lance ou pergunta..." 
                class="w-full bg-transparent border-none py-2.5 px-1 font-bold text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-0" 
              />
            </div>
            <button id="sendBtn" class="p-3 bg-blue-600 rounded-xl text-white font-black hover:bg-blue-500 transition-colors active:scale-95 shadow-lg shrink-0">➤</button>
          </div>
        </div>
      </div>
      
      <!-- Settings Menu -->
      <div id="settingsMenu" class="fixed top-0 right-0 bottom-0 z-[75] ${uiState.isSettingsOpen ? '' : 'hidden'}">
        <div class="absolute inset-0 bg-black/50" id="settingsOverlay"></div>
        <div class="absolute top-14 right-4 w-72 max-h-[70vh] overflow-y-auto custom-scrollbar bg-slate-900 border border-white/10 rounded-[2rem] shadow-2xl p-4 flex flex-col gap-2 z-[80]">
          <button id="btnEditSumula" class="w-full p-4 rounded-xl text-[10px] font-black uppercase text-slate-400 hover:bg-white/5 hover:text-white text-left flex items-center gap-3">📋 Editar Súmula</button>
          <button id="btnNextPeriod" class="w-full p-4 rounded-xl text-[10px] font-black uppercase text-white hover:bg-white/5 text-left flex items-center gap-3">▶ Próxima Fase</button>
          <button id="btnFinalize" class="w-full p-4 rounded-xl text-[10px] font-black uppercase text-blue-400 hover:bg-blue-500/10 text-left flex items-center gap-3">🏁 Finalizar Partida</button>
          <button id="btnExport" class="w-full p-4 rounded-xl text-[10px] font-black uppercase flex items-center gap-3">💾 Exportar Backup</button>
          <button id="btnReset" class="w-full p-4 rounded-xl text-[10px] font-black text-red-500 border border-red-500/20 flex items-center gap-3">🔄 Resetar Partida</button>
        </div>
      </div>
      
      <!-- Settings Button -->
      <div class="absolute top-2 right-2 md:top-4 md:right-4 z-[70] flex gap-2">
        <button id="settingsBtn" class="p-2 rounded-full bg-slate-800 text-slate-200 border border-slate-700 shadow-xl opacity-80 hover:opacity-100" title="Menu">⚙</button>
        <button id="lightModeBtn" class="p-2 rounded-full bg-slate-800 text-slate-200 border border-slate-700 shadow-xl opacity-80 hover:opacity-100" title="Alternar Contraste">ℹ</button>
      </div>
    </div>
  `;

  // Renderizar header
  const headerContainer = document.getElementById('headerContainer');
  if (headerContainer) {
    renderHeader(headerContainer, {
      onPlayPauseToggle: () => {
        matchState.handlePlayPauseToggle();
        render();
        startTimer();
      },
      onNextPeriodClick: handleNextPeriod,
      onUpdateTeamName: (teamId, name) => {
        matchState.setState(prev => {
          const key = teamId === 'home' ? 'homeTeam' : 'awayTeam';
          return { ...prev, [key]: { ...prev[key], name } };
        });
        render();
      },
      isFullscreen: uiState.isFullscreen
    });
  }

  // Renderizar conteúdo da tab
  renderTabContent();

  // Configurar event listeners
  setupEventListeners();

  // Iniciar timer se não estiver pausado
  if (!state.isPaused) {
    startTimer();
  }
}

function renderTabContent() {
  const container = document.getElementById('tabContent');
  if (!container) return;

  const state = matchState.getState();

  if (uiState.activeTab === 'main') {
    container.innerHTML = `
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch ${uiState.isFullscreen ? 'h-full' : 'h-auto'}">
        <div class="${uiState.isFullscreen ? 'lg:col-span-9 flex flex-col h-full min-h-0' : 'lg:col-span-8 flex flex-col'}">
          <!-- View Mode Toggle -->
          <div class="flex items-center gap-2 mb-1">
            <button id="viewList" class="flex-1 py-3 rounded-2xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest border transition-all ${uiState.viewMode === 'list' ? 'bg-blue-600 border-blue-400 text-white' : 'bg-slate-900 border-white/5 text-slate-500'}">📋 Lista</button>
            <button id="viewField" class="flex-1 py-3 rounded-2xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest border transition-all ${uiState.viewMode === 'field' ? 'bg-blue-600 border-blue-400 text-white' : 'bg-slate-900 border-white/5 text-slate-500'}">🏟 Mapa Tático</button>
            <button id="fullscreenBtn" class="p-3 rounded-2xl flex items-center justify-center border transition-all ${uiState.isFullscreen ? 'bg-blue-600 border-blue-400 text-white' : 'bg-slate-900 border-white/5 text-slate-500'}">${uiState.isFullscreen ? '⊟' : '⊞'}</button>
          </div>
          
          <!-- Content Area -->
          <div id="mainContent" class="relative ${uiState.isFullscreen ? 'flex-1 flex flex-col min-h-0' : 'flex flex-col'}">
            ${uiState.viewMode === 'field' ? renderField(state) : renderPlayerLists(state)}
          </div>
        </div>
        
        <!-- Sidebar -->
        <div class="${uiState.isFullscreen ? 'lg:col-span-3 flex flex-col h-full min-h-0' : 'lg:col-span-4 flex flex-col h-full min-h-0 content-stretch'}">
          ${!uiState.isFullscreen ? `
          <div class="grid grid-cols-2 gap-3 flex-none mb-4">
            ${renderQuickActions(state.homeTeam, 'home')}
            ${renderQuickActions(state.awayTeam, 'away')}
          </div>
          ` : ''}
          
          <!-- Event Timeline -->
          <div class="bg-slate-900/50 rounded-[2rem] border border-white/5 flex flex-col overflow-hidden shadow-2xl flex-1 min-h-0">
            <div class="p-6 border-b border-white/5 bg-white/5 flex justify-between items-center">
              <h3 class="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400 flex items-center gap-2">📜 Cronologia</h3>
              ${(state.events || []).length > 0 ? `<button id="undoBtn" class="text-[9px] font-black text-slate-500 hover:text-red-400 uppercase">Desfazer Último</button>` : ''}
            </div>
            <div class="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-3">
              ${(state.events || []).map(e => renderEventItem(e, state)).join('')}
              ${(state.events || []).length === 0 ? '<div class="text-center text-slate-500 text-xs py-2">Nenhum evento registrado</div>' : ''}
            </div>
          </div>
        </div>
      </div>
    `;
  } else {
    container.innerHTML = renderStats(state);
  }

  // Configurar listeners do conteúdo
  setupContentListeners();
}

function renderField(state) {
  return `
    <div class="flex flex-col gap-2 ${uiState.isFullscreen ? 'h-full w-full' : ''}">
      <div class="relative bg-emerald-700 rounded-[2.5rem] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] border-4 border-emerald-800/50 select-none ${uiState.isFullscreen ? 'h-full w-full' : 'w-full aspect-[4/3]'}">
        <div class="absolute inset-0 opacity-20 pointer-events-none" style="background-image: repeating-linear-gradient(90deg, transparent, transparent 10%, rgba(0,0,0,0.2) 10%, rgba(0,0,0,0.2) 20%)"></div>
        <div class="absolute inset-0 border-2 border-white/30 m-6 rounded-sm"></div>
        <div class="absolute inset-y-0 left-1/2 w-0.5 bg-white/30"></div>
        <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 border-2 border-white/30 rounded-full"></div>
        <div class="absolute top-1/2 left-0 -translate-y-1/2 w-28 h-56 border-2 border-white/30 border-l-0 rounded-r-lg"></div>
        <div class="absolute top-1/2 right-0 -translate-y-1/2 w-28 h-56 border-2 border-white/30 border-r-0 rounded-l-lg"></div>
        
        ${renderPlayersOnField(state.homeTeam)}
        ${renderPlayersOnField(state.awayTeam)}

        <div class="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md px-5 py-2 rounded-full border border-white/10 pointer-events-none">
          <p class="text-[8px] font-black text-white/80 uppercase tracking-[0.2em]">Mapa Tático Interativo • Narrador Pro</p>
        </div>
      </div>
    </div>
  `;
}

function renderPlayersOnField(team) {
  const isHome = team.id === 'home';
  return team.players.filter(p => p.isStarter).map(player => {
    const displayX = isHome ? player.x : (100 - player.x);
    const displayY = isHome ? player.y : (100 - player.y);
    
    return `
      <div class="absolute -translate-x-1/2 -translate-y-1/2 transition-shadow cursor-move select-none z-10" style="top: ${displayY}%; left: ${displayX}%">
        <div class="group relative flex flex-col items-center">
          <div class="relative">
            <button class="w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center border-[3px] border-white/90 shadow-lg font-black text-sm md:text-base transition-all text-white" style="background-color: ${team.color}" data-player-id="${player.id}" data-team-id="${team.id}">
              ${player.number}
            </button>
          </div>
          <div class="mt-1.5 bg-slate-900/80 text-white px-2 py-0.5 rounded text-[10px] md:text-xs font-bold whitespace-nowrap drop-shadow-md border border-white/5 transition-all opacity-100">
            ${player.name}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function renderPlayerLists(state) {
  return `
    <div class="bg-slate-900/50 rounded-[2.5rem] border border-white/5 p-6 flex flex-col shadow-2xl">
      <div class="grid grid-cols-2 gap-4 flex-1 min-h-0">
        <div class="flex flex-col min-h-0">
          <div class="sticky top-0 bg-slate-900/90 z-10 py-1.5 md:py-2 border-b border-white/10 mb-2 cursor-pointer hover:bg-slate-800 transition-colors" data-team-action="home">
            <h4 class="text-[10px] font-black uppercase text-center" style="color: ${state.homeTeam.color}">${state.homeTeam.shortName}</h4>
          </div>
          ${renderPlayerList(state.homeTeam, 'home')}
        </div>
        <div class="flex flex-col min-h-0">
          <div class="sticky top-0 bg-slate-900/90 z-10 py-1.5 md:py-2 border-b border-white/10 mb-2 cursor-pointer hover:bg-slate-800 transition-colors" data-team-action="away">
            <h4 class="text-[10px] font-black uppercase text-center" style="color: ${state.awayTeam.color}">${state.awayTeam.shortName}</h4>
          </div>
          ${renderPlayerList(state.awayTeam, 'away')}
        </div>
      </div>
    </div>
  `;
}

function renderPlayerList(team, teamId) {
  const players = [...(team.players || [])];
  const starters = players.filter(p => p.isStarter).sort((a, b) => {
    if (a.position === 'GK' && b.position !== 'GK') return -1;
    if (a.position !== 'GK' && b.position === 'GK') return 1;
    return a.number - b.number;
  });

  return `
    <div class="flex flex-col min-h-0 flex-1">
      <div class="space-y-1.5">
        ${starters.slice(0, 11).map(player => `
          <button 
            class="w-full p-2.5 rounded-xl text-left font-bold text-sm flex items-center gap-3 transition-all border border-white/5 bg-slate-900/40 hover:bg-slate-800"
            style="border-color: ${team.color}15"
            data-player-id="${player.id}"
            data-team-id="${teamId}"
          >
            <div class="font-mono text-sm w-8 h-8 font-black flex items-center justify-center rounded-lg shadow-xl text-white shrink-0" style="background-color: ${team.color}">
              ${player.number}
            </div>
            <span class="flex-1 truncate text-white font-black text-sm">${player.name}</span>
          </button>
        `).join('')}
        ${players.length === 0 ? `
          <div class="text-center text-slate-500 text-xs py-10 flex flex-col items-center gap-3">
            <span class="text-2xl opacity-30">👥</span>
            Nenhum jogador cadastrado.
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

function renderQuickActions(team, teamId) {
  return `
    <div class="p-4 bg-slate-900 rounded-3xl border border-white/5 shadow-xl" style="border-top: 2px solid ${team.color}">
      <button 
        class="w-full p-3 bg-emerald-600 rounded-xl font-black text-[10px] mb-2 text-white shadow-lg truncate"
        data-event="GOAL"
        data-team="${teamId}"
      >
        ⚽ GOL ${team.shortName}
      </button>
      
      <div class="grid grid-cols-2 gap-1.5 mb-1.5">
        <button class="p-2 bg-amber-500 text-black rounded-lg font-black text-[8px] uppercase" data-event="YELLOW_CARD" data-team="${teamId}">🟨 Amarelo</button>
        <button class="p-2 bg-red-600 text-white rounded-lg font-black text-[8px] uppercase" data-event="RED_CARD" data-team="${teamId}">🟥 Vermelho</button>
      </div>
      
      <div class="grid grid-cols-2 gap-1.5">
        <button class="p-2 bg-blue-600/30 text-blue-400 hover:bg-blue-600 hover:text-white rounded-lg font-black text-[8px] uppercase transition-colors flex items-center justify-center gap-1" data-event="SHOT" data-team="${teamId}">🎯 Chute</button>
        <button class="p-2 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white rounded-lg font-black text-[8px] uppercase transition-colors" data-event="CORNER" data-team="${teamId}">🚩 Escanteio</button>
        <button class="p-2 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white rounded-lg font-black text-[8px] uppercase transition-colors" data-event="FOUL" data-team="${teamId}">🛑 Falta</button>
        <button class="p-2 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white rounded-lg font-black text-[8px] uppercase transition-colors" data-event="OFFSIDE" data-team="${teamId}">🚩 Imped.</button>
      </div>
    </div>
  `;
}

function renderEventItem(event, state) {
  const team = event.teamId === 'home' ? state.homeTeam : event.teamId === 'away' ? state.awayTeam : null;
  const borderColor = event.isAnnulled ? '#64748b' : (event.teamId === 'home' ? state.homeTeam.color : event.teamId === 'away' ? state.awayTeam.color : '#475569');
  const bgColor = event.isAnnulled ? 'transparent' : `${event.teamId === 'home' ? state.homeTeam.color : event.teamId === 'away' ? state.awayTeam.color : '#ffffff'}08`;

  return `
    <div class="flex gap-3 py-3 border-l-4 mb-1 pl-3 transition-colors rounded-r shadow-lg ${event.isAnnulled ? 'opacity-50 grayscale' : ''}" style="border-color: ${borderColor}; background-color: ${bgColor}">
      <span class="font-mono font-black text-[10px] pt-1 min-w-[28px] ${event.isAnnulled ? 'line-through text-slate-600' : 'text-slate-400'}">
        ${event.minute}'
      </span>
      <div class="flex flex-col flex-1">
        <span class="text-slate-100 font-bold text-xs ${event.isAnnulled ? 'line-through decoration-slate-500 text-slate-500' : ''}">${event.description}</span>
        <div class="flex gap-2 mt-1">
          <span class="text-[7px] font-black uppercase tracking-widest text-slate-500">${matchState.formatEventType(event.type)}</span>
          ${event.isAnnulled ? '<span class="text-[7px] font-black uppercase tracking-widest text-red-500">ANULADO</span>' : ''}
        </div>
      </div>
    </div>
  `;
}

function renderStats(state) {
  const safeEvents = state.events || [];
  const getCount = (teamId, types) => safeEvents.filter(e => e.teamId === teamId && types.includes(e.type) && !e.isAnnulled).length;

  const homeGoals = getCount('home', ['GOAL']);
  const awayGoals = getCount('away', ['GOAL']);
  const homeTotalShots = getCount('home', ['SHOT', 'WOODWORK']) + homeGoals;
  const awayTotalShots = getCount('away', ['SHOT', 'WOODWORK']) + awayGoals;
  const homeCorners = getCount('home', ['CORNER']);
  const awayCorners = getCount('away', ['CORNER']);
  const homeFouls = getCount('home', ['FOUL']);
  const awayFouls = getCount('away', ['FOUL']);
  const homeYellows = getCount('home', ['YELLOW_CARD']);
  const awayYellows = getCount('away', ['YELLOW_CARD']);
  const homeReds = getCount('home', ['RED_CARD']);
  const awayReds = getCount('away', ['RED_CARD']);

  const now = Date.now();
  const elapsed = state.timeElapsed + (state.timerStartedAt && !state.isPaused ? now - state.timerStartedAt : 0);
  const currentMin = Math.floor(elapsed / 60000);

  const homePossession = 50 + Math.floor(Math.random() * 10 - 5);
  const awayPossession = 100 - homePossession;

  return `
    <div class="bg-[#0a0f1c] p-6 sm:p-8 md:p-12 rounded-[2rem] border border-white/5 shadow-2xl relative w-full max-w-4xl mx-auto animate-fade-in">
      <div class="flex items-center justify-between mb-10 pb-6 border-b border-white/5">
        <div class="flex flex-col items-center gap-3 w-1/3">
          <div class="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black shadow-xl text-white" style="background-color: ${state.homeTeam.color}">
            ${state.homeTeam.shortName.substring(0, 1)}
          </div>
          <span class="text-white font-black uppercase text-xs text-center">${state.homeTeam.name}</span>
        </div>
        
        <div class="flex flex-col items-center w-1/3">
          <span class="text-4xl md:text-5xl font-black text-white tabular-nums tracking-tighter">
            ${homeGoals} <span class="text-slate-700 text-3xl">-</span> ${awayGoals}
          </span>
          <span class="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-2 bg-slate-900 px-3 py-1 rounded-full border border-white/5">
            ${state.period === 'FINISHED' ? 'Encerrado' : `Tempo: ${currentMin}'`}
          </span>
        </div>
        
        <div class="flex flex-col items-center gap-3 w-1/3">
          <div class="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black shadow-xl text-white" style="background-color: ${state.awayTeam.color}">
            ${state.awayTeam.shortName.substring(0, 1)}
          </div>
          <span class="text-white font-black uppercase text-xs text-center">${state.awayTeam.name}</span>
        </div>
      </div>

      <div class="text-center mb-6"><span class="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em]">Principais</span></div>

      ${renderStatBar('Posse de bola', homePossession, awayPossession, state.homeTeam.color, state.awayTeam.color, true)}
      ${renderStatBar('Total de finalizações', homeTotalShots, awayTotalShots, state.homeTeam.color, state.awayTeam.color)}
      ${renderStatBar('Escanteios', homeCorners, awayCorners, state.homeTeam.color, state.awayTeam.color)}

      <div class="text-center mt-10 mb-6"><span class="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em]">Disciplina</span></div>

      ${renderStatBar('Cartões Amarelos', homeYellows, awayYellows, '#eab308', '#eab308')}
      ${renderStatBar('Cartões Vermelhos', homeReds, awayReds, '#ef4444', '#ef4444')}
    </div>
  `;
}

function renderStatBar(label, homeValue, awayValue, homeColor, awayColor, isPercentage = false) {
  const total = homeValue + awayValue;
  const homeWidth = total === 0 ? 0 : (homeValue / total) * 100;
  const awayWidth = total === 0 ? 0 : (awayValue / total) * 100;
  const displayHome = isPercentage ? `${homeValue}%` : homeValue;
  const displayAway = isPercentage ? `${awayValue}%` : awayValue;

  return `
    <div class="mb-5 group">
      <div class="flex justify-between items-end mb-1.5 relative px-1">
        <div class="flex flex-col items-start w-20">
          <span class="text-sm font-black text-white">${displayHome}</span>
        </div>
        <span class="absolute left-1/2 -translate-x-1/2 bottom-1 text-[10px] sm:text-xs font-bold text-slate-300 uppercase tracking-wider whitespace-nowrap text-center">${label}</span>
        <div class="flex flex-col items-end w-20">
          <span class="text-sm font-black text-white">${displayAway}</span>
        </div>
      </div>
      <div class="flex w-full h-1.5 gap-1">
        <div class="w-1/2 flex justify-end bg-slate-800/50 rounded-l-full overflow-hidden">
          <div class="h-full rounded-l-full transition-all duration-700 ease-out" style="width: ${homeWidth}%; background-color: ${homeColor}"></div>
        </div>
        <div class="w-1/2 flex justify-start bg-slate-800/50 rounded-r-full overflow-hidden">
          <div class="h-full rounded-r-full transition-all duration-700 ease-out" style="width: ${awayWidth}%; background-color: ${awayColor}"></div>
        </div>
      </div>
    </div>
  `;
}

function setupEventListeners() {
  // Settings
  const settingsBtn = document.getElementById('settingsBtn');
  const settingsOverlay = document.getElementById('settingsOverlay');
  const settingsMenu = document.getElementById('settingsMenu');

  if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
      uiState.isSettingsOpen = !uiState.isSettingsOpen;
      if (settingsMenu) settingsMenu.classList.toggle('hidden');
    });
  }

  if (settingsOverlay) {
    settingsOverlay.addEventListener('click', () => {
      uiState.isSettingsOpen = false;
      if (settingsMenu) settingsMenu.classList.add('hidden');
    });
  }

  // Light mode
  const lightModeBtn = document.getElementById('lightModeBtn');
  if (lightModeBtn) {
    lightModeBtn.addEventListener('click', () => {
      uiState.isLightMode = !uiState.isLightMode;
      render();
    });
  }

  // Tabs
  const tabMain = document.getElementById('tabMain');
  const tabStats = document.getElementById('tabStats');

  if (tabMain) {
    tabMain.addEventListener('click', () => {
      uiState.activeTab = 'main';
      render();
    });
  }

  if (tabStats) {
    tabStats.addEventListener('click', () => {
      uiState.activeTab = 'stats';
      render();
    });
  }

  // Play/Pause bottom
  const playPauseBottom = document.getElementById('playPauseBottom');
  if (playPauseBottom) {
    playPauseBottom.addEventListener('click', () => {
      matchState.handlePlayPauseToggle();
      render();
      startTimer();
    });
  }

  // Command input
  const commandInput = document.getElementById('commandInput');
  const sendBtn = document.getElementById('sendBtn');

  if (commandInput) {
    commandInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        processCommand(commandInput.value);
        commandInput.value = '';
      }
    });
  }

  if (sendBtn) {
    sendBtn.addEventListener('click', () => {
      if (commandInput) {
        processCommand(commandInput.value);
        commandInput.value = '';
      }
    });
  }

  // Settings buttons
  const btnReset = document.getElementById('btnReset');
  const btnFinalize = document.getElementById('btnFinalize');
  const btnExport = document.getElementById('btnExport');

  if (btnReset) {
    btnReset.addEventListener('click', () => {
      if (confirm('Tem certeza que deseja resetar a partida?')) {
        matchState.handleReset();
        addToast('Partida Resetada', 'Todos os dados foram zerados.', 'info');
        render();
      }
    });
  }

  if (btnFinalize) {
    btnFinalize.addEventListener('click', () => {
      matchState.handleFinalizeMatch();
      addToast('Partida Finalizada', 'O jogo foi encerrado.', 'success');
      uiState.isSettingsOpen = false;
      render();
    });
  }

  if (btnExport) {
    btnExport.addEventListener('click', () => {
      const state = matchState.getState();
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state));
      const dlAnchorElem = document.createElement('a');
      dlAnchorElem.setAttribute("href", dataStr);
      dlAnchorElem.setAttribute("download", "backup_partida.json");
      dlAnchorElem.click();
      addToast('Backup Exportado', 'O arquivo JSON foi salvo.', 'success');
    });
  }
}

function setupContentListeners() {
  // View mode
  const viewList = document.getElementById('viewList');
  const viewField = document.getElementById('viewField');
  const fullscreenBtn = document.getElementById('fullscreenBtn');

  if (viewList) {
    viewList.addEventListener('click', () => {
      uiState.viewMode = 'list';
      render();
    });
  }

  if (viewField) {
    viewField.addEventListener('click', () => {
      uiState.viewMode = 'field';
      render();
    });
  }

  if (fullscreenBtn) {
    fullscreenBtn.addEventListener('click', () => {
      uiState.isFullscreen = !uiState.isFullscreen;
      render();
    });
  }

  // Quick actions
  document.querySelectorAll('[data-event]').forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.dataset.event;
      const teamId = btn.dataset.team;
      const state = matchState.getState();
      const team = teamId === 'home' ? state.homeTeam : state.awayTeam;
      
      matchState.addEvent({
        type,
        teamId,
        description: `Lance rápido (${matchState.formatEventType(type)})`
      });
      
      addToast('Evento Registrado', `${matchState.formatEventType(type)} - ${team.shortName}`, 'info');
      render();
    });
  });

  // Player clicks
  document.querySelectorAll('[data-player-id]').forEach(btn => {
    btn.addEventListener('click', () => {
      const playerId = btn.dataset.playerId;
      const teamId = btn.dataset.teamId;
      const state = matchState.getState();
      const team = teamId === 'home' ? state.homeTeam : state.awayTeam;
      const player = team.players.find(p => p.id === playerId);
      
      if (player) {
        showPlayerActionModal(player, team, teamId);
      }
    });
  });

  // Undo button
  const undoBtn = document.getElementById('undoBtn');
  if (undoBtn) {
    undoBtn.addEventListener('click', () => {
      matchState.setState(prev => {
        if (!prev.events || prev.events.length === 0) return prev;
        return { ...prev, events: prev.events.slice(1) };
      });
      addToast('Ação Desfeita', 'Último evento removido.', 'info');
      render();
    });
  }
}

function showPlayerActionModal(player, team, teamId) {
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-fade-in';
  modal.innerHTML = `
    <div class="bg-slate-900 border border-white/10 rounded-3xl p-6 max-w-sm w-full shadow-2xl relative">
      <button class="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors text-xl" id="closeModal">✕</button>
      
      <div class="mb-6 pr-6">
        <h3 class="text-xl font-black text-white flex items-center gap-2">
          <span class="text-slate-500 font-mono">#${player.number}</span> ${player.name}
        </h3>
        <p class="text-xs text-slate-400 uppercase tracking-widest">${team.name} • ${player.isStarter ? 'Titular' : 'Reserva'}</p>
      </div>

      <div class="grid grid-cols-1 gap-2">
        <button class="w-full p-3 rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 font-bold text-sm transition-all" data-action="GOAL">⚽ Registrar GOL</button>
        
        <div class="grid grid-cols-2 gap-2 mt-2">
          <button class="p-3 rounded-xl bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500 hover:text-slate-900 font-bold text-sm transition-all" data-action="YELLOW_CARD">🟨 Amarelo</button>
          <button class="p-3 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white font-bold text-sm transition-all" data-action="RED_CARD">🟥 Vermelho</button>
        </div>
        
        <div class="grid grid-cols-2 gap-2 mt-2">
          <button class="p-3 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 font-bold text-sm transition-all flex items-center justify-center gap-2" data-action="FOUL">🛑 Falta</button>
          <button class="p-3 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 font-bold text-sm transition-all flex items-center justify-center gap-2" data-action="OFFSIDE">🚩 Impedimento</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Close button
  modal.querySelector('#closeModal').addEventListener('click', () => {
    modal.remove();
  });

  // Action buttons
  modal.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.action;
      matchState.addEvent({
        type: action,
        teamId,
        playerId: player.id,
        description: `${matchState.formatEventType(action)}: ${player.name} (${team.shortName})`
      });
      addToast('Evento Registrado', `${matchState.formatEventType(action)} - ${player.name}`, 'info');
      modal.remove();
      render();
    });
  });

  // Close on backdrop click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });
}

function handleNextPeriod() {
  const state = matchState.getState();
  
  if (state.period === '2T' || state.period === '2ET') {
    if (confirm('Finalizar a partida?')) {
      matchState.handleFinalizeMatch();
      addToast('Partida Finalizada', 'O jogo foi encerrado.', 'success');
    }
  } else {
    matchState.advancePeriod();
    addToast('Período Avançado', `Início de ${matchState.getState().period}`, 'info');
  }
  
  render();
}

function processCommand(text) {
  if (!text.trim()) return;
  
  const state = matchState.getState();
  const t = text.toLowerCase().trim();
  
  // Timer controls
  if (t.match(/^(começar|iniciar|soltar|rodar|continuar)/i)) {
    matchState.handlePlayPauseToggle();
    addToast('Comando Executado', 'Cronômetro iniciado.', 'info');
    render();
    startTimer();
    return;
  }
  
  if (t.match(/^(pausar|parar|interromper)/i)) {
    matchState.handlePlayPauseToggle();
    addToast('Comando Executado', 'Cronômetro pausado.', 'info');
    render();
    return;
  }

  // Simple event detection
  const teams = {
    home: ['mandante', 'casa', state.homeTeam.name.toLowerCase(), state.homeTeam.shortName.toLowerCase()],
    away: ['visitante', 'fora', state.awayTeam.name.toLowerCase(), state.awayTeam.shortName.toLowerCase()]
  };

  const findTeam = (txt) => {
    if (teams.home.some(n => txt.includes(n))) return 'home';
    if (teams.away.some(n => txt.includes(n))) return 'away';
    return null;
  };

  const numMatch = t.match(/(\d{1,2})/);
  const num = numMatch ? parseInt(numMatch[1]) : null;
  const teamId = findTeam(t);

  if (t.includes('gol') && teamId) {
    const team = teamId === 'home' ? state.homeTeam : state.awayTeam;
    const player = num ? team.players.find(p => p.number === num) : null;
    
    matchState.addEvent({
      type: 'GOAL',
      teamId,
      playerId: player?.id,
      description: `⚽ Gol do ${team.shortName}${player ? ` - ${player.name} (${player.number})` : ''}`
    });
    addToast('GOL!', `⚽ ${team.shortName}`, 'success');
    render();
    return;
  }

  if (t.includes('amarelo') && num) {
    const teamId2 = teamId || 'home';
    const team = teamId2 === 'home' ? state.homeTeam : state.awayTeam;
    const player = team.players.find(p => p.number === num);
    
    matchState.addEvent({
      type: 'YELLOW_CARD',
      teamId: teamId2,
      playerId: player?.id,
      description: `🟨 Amarelo - ${player ? player.name : `Nº ${num}`} (${team.shortName})`
    });
    addToast('Cartão Amarelo', `🟨 ${team.shortName}`, 'warning');
    render();
    return;
  }

  if (t.includes('vermelho') && num) {
    const teamId2 = teamId || 'home';
    const team = teamId2 === 'home' ? state.homeTeam : state.awayTeam;
    const player = team.players.find(p => p.number === num);
    
    matchState.addEvent({
      type: 'RED_CARD',
      teamId: teamId2,
      playerId: player?.id,
      description: `🟥 Vermelho - ${player ? player.name : `Nº ${num}`} (${team.shortName})`
    });
    addToast('Cartão Vermelho', `🟥 ${team.shortName}`, 'error');
    render();
    return;
  }

  addToast('Comando não reconhecido', 'Tente: "gol mandante", "amarelo 10", etc.', 'info');
}

// Timer
let timerInterval = null;

function startTimer() {
  if (timerInterval) clearInterval(timerInterval);
  
  timerInterval = setInterval(() => {
    const state = matchState.getState();
    if (!state.isPaused && !['PRE_MATCH', 'INTERVAL', 'FINISHED', 'PENALTIES'].includes(state.period)) {
      updateTimer();
    }
  }, 200);
}

// Função para mostrar modal de edição de time
function showTeamEditModal(teamId) {
  const state = matchState.getState();
  const team = teamId === 'home' ? state.homeTeam : state.awayTeam;
  
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-4 animate-fade-in';
  modal.innerHTML = `
    <div class="bg-slate-800 p-6 rounded-[2rem] max-w-sm w-full text-center shadow-2xl text-white">
      <h3 class="text-sm font-black uppercase mb-4">Editar Equipe</h3>
      <input id="teamNameInput" class="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white focus:outline-none mb-3" value="${team.name}" placeholder="Nome Completo" />
      <input id="teamShortInput" class="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white focus:outline-none mb-4 uppercase" value="${team.shortName}" maxlength="3" placeholder="SIGLA (3 letras)" />
      <div class="mb-6 bg-slate-900/50 p-4 rounded-2xl border border-slate-700">
        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-3 text-center">Cor no Mapa Tático</span>
        <div class="grid grid-cols-6 gap-3 justify-items-center" id="colorPicker">
          ${['#ef4444','#f97316','#f59e0b','#22c55e','#10b981','#14b8a6','#06b6d4','#3b82f6','#4f46e5','#a855f7','#1e293b','#ffffff'].map(c => `<button type="button" class="w-8 h-8 rounded-full transition-all border-4 ${team.color===c?'border-white scale-125 shadow-xl':'border-transparent hover:scale-110'}" style="background-color:${c}" data-color="${c}"></button>`).join('')}
        </div>
      </div>
      <div class="flex gap-2">
        <button id="saveTeamBtn" class="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-black text-xs uppercase">Salvar</button>
        <button id="cancelTeamBtn" class="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-xl font-black text-xs uppercase">Cancelar</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  let selectedColor = team.color;
  modal.querySelectorAll('[data-color]').forEach(btn => {
    btn.addEventListener('click', () => {
      modal.querySelectorAll('[data-color]').forEach(b => { b.classList.remove('border-white','scale-125','shadow-xl'); b.classList.add('border-transparent'); });
      btn.classList.remove('border-transparent'); btn.classList.add('border-white','scale-125','shadow-xl');
      selectedColor = btn.dataset.color;
    });
  });
  modal.querySelector('#saveTeamBtn').addEventListener('click', () => {
    const name = modal.querySelector('#teamNameInput').value.trim();
    const shortName = modal.querySelector('#teamShortInput').value.trim().toUpperCase();
    if (name) {
      matchState.setState(prev => {
        const key = teamId === 'home' ? 'homeTeam' : 'awayTeam';
        return { ...prev, [key]: { ...prev[key], name, shortName: shortName || prev[key].shortName, color: selectedColor } };
      });
      addToast('Equipe Atualizada', `${name} atualizado com sucesso.`, 'success');
      render();
    }
    modal.remove();
  });
  modal.querySelector('#cancelTeamBtn').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
}

// Função para mostrar modal de edição de jogador
function showPlayerEditModal(playerId, teamId) {
  const state = matchState.getState();
  const team = teamId === 'home' ? state.homeTeam : state.awayTeam;
  const player = team.players.find(p => p.id === playerId);
  if (!player) return;
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-4 animate-fade-in';
  modal.innerHTML = `
    <div class="bg-slate-800 p-6 rounded-[2rem] max-w-sm w-full text-center shadow-2xl text-white">
      <h3 class="text-sm font-black uppercase mb-4">Editar Jogador</h3>
      <input id="playerNumInput" type="number" class="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white focus:outline-none mb-3 font-mono" value="${player.number}" placeholder="Número" />
      <input id="playerNameInput" class="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white focus:outline-none mb-4" value="${player.name}" placeholder="Nome" />
      <div class="flex items-center justify-between bg-slate-900 border border-slate-700 rounded-xl p-3 mb-6">
        <span class="text-xs font-bold text-slate-400 uppercase tracking-widest">Escalação</span>
        <button id="toggleStarterBtn" class="px-4 py-2 rounded-lg text-xs font-black uppercase transition-all ${player.isStarter?'bg-emerald-600 text-white':'bg-slate-700 text-slate-400 hover:text-white'}">${player.isStarter?'Titular':'Reserva'}</button>
      </div>
      <div class="flex gap-2">
        <button id="savePlayerBtn" class="flex-1 bg-blue-600 text-white py-3 rounded-xl font-black text-xs uppercase">Salvar</button>
        <button id="cancelPlayerBtn" class="flex-1 bg-slate-700 text-white py-3 rounded-xl font-black text-xs uppercase">Cancelar</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  let isStarter = player.isStarter;
  modal.querySelector('#toggleStarterBtn').addEventListener('click', (e) => {
    isStarter = !isStarter;
    e.target.textContent = isStarter ? 'Titular' : 'Reserva';
    e.target.className = `px-4 py-2 rounded-lg text-xs font-black uppercase transition-all ${isStarter?'bg-emerald-600 text-white':'bg-slate-700 text-slate-400 hover:text-white'}`;
  });
  modal.querySelector('#savePlayerBtn').addEventListener('click', () => {
    const name = modal.querySelector('#playerNameInput').value.trim();
    const number = parseInt(modal.querySelector('#playerNumInput').value) || player.number;
    if (name) {
      matchState.setState(prev => {
        const key = teamId === 'home' ? 'homeTeam' : 'awayTeam';
        return { ...prev, [key]: { ...prev[key], players: prev[key].players.map(p => p.id === playerId ? { ...p, name, number, isStarter } : p) } };
      });
      addToast('Jogador Atualizado', `${name} atualizado com sucesso.`, 'success');
      render();
    }
    modal.remove();
  });
  modal.querySelector('#cancelPlayerBtn').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
}

// Função para mostrar modal de edição de técnico
function showCoachEditModal(teamId) {
  const state = matchState.getState();
  const team = teamId === 'home' ? state.homeTeam : state.awayTeam;
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-4 animate-fade-in';
  modal.innerHTML = `
    <div class="bg-slate-800 p-6 rounded-[2rem] max-w-sm w-full text-center shadow-2xl text-white">
      <h3 class="text-sm font-black uppercase mb-4">Editar Técnico</h3>
      <input id="coachNameInput" class="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white focus:outline-none mb-4" value="${team.coach||''}" placeholder="Nome do Técnico" />
      <div class="flex gap-2">
        <button id="saveCoachBtn" class="flex-1 bg-blue-600 text-white py-3 rounded-xl font-black text-xs uppercase">Salvar</button>
        <button id="cancelCoachBtn" class="flex-1 bg-slate-700 text-white py-3 rounded-xl font-black text-xs uppercase">Cancelar</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.querySelector('#saveCoachBtn').addEventListener('click', () => {
    const name = modal.querySelector('#coachNameInput').value.trim();
    matchState.setState(prev => {
      const key = teamId === 'home' ? 'homeTeam' : 'awayTeam';
      return { ...prev, [key]: { ...prev[key], coach: name } };
    });
    addToast('Técnico Atualizado', `${name||'Técnico'} atualizado com sucesso.`, 'success');
    render();
    modal.remove();
  });
  modal.querySelector('#cancelCoachBtn').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
}

// Função para mostrar modal de importação de lista
function showImportListModal(teamId) {
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-4 animate-fade-in';
  modal.innerHTML = `
    <div class="bg-slate-800 p-6 rounded-[2rem] max-w-2xl w-full text-white">
      <div class="flex justify-between items-center mb-6">
        <h3 class="text-sm font-black uppercase">Importar Lista (Texto Bruto)</h3>
        <button id="closeImportBtn" class="p-2 hover:bg-white/10 rounded-full">✕</button>
      </div>
      <textarea id="importTextArea" class="w-full h-64 bg-slate-950 border border-white/10 rounded-2xl p-6 font-mono text-xs text-blue-100 mb-6 focus:outline-none" placeholder="Cole a lista completa aqui..."></textarea>
      <button id="processImportBtn" class="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 py-4 rounded-2xl font-black uppercase tracking-widest">Processar Lista</button>
    </div>
  `;
  document.body.appendChild(modal);
  modal.querySelector('#closeImportBtn').addEventListener('click', () => modal.remove());
  modal.querySelector('#processImportBtn').addEventListener('click', async () => {
    const text = modal.querySelector('#importTextArea').value.trim();
    if (!text) return;
    const btn = modal.querySelector('#processImportBtn');
    btn.disabled = true;
    btn.textContent = 'Processando...';
    const lines = text.split(/\r?\n/);
    const players = [];
    let starterCount = 0;
    for (let line of lines) {
      line = line.trim();
      if (!line || line.length < 3) continue;
      const match = line.match(/^[\D]*(\d{1,2})[\s\-\.\,:]+(.+)$/);
      let num = 0, name = '';
      if (match) { num = parseInt(match[1], 10); name = match[2].trim().replace(/[\*\-\_]/g, '').trim(); }
      else { name = line.replace(/^[\d\s\-\.\,:]+/, '').replace(/[\*\-\_]/g, '').trim(); num = players.length + 1; }
      if (name.length > 2 && !name.toLowerCase().includes('treinador')) {
        let isGK = false;
        if (/(\(gol\)|\(gk\)|goleiro)/i.test(name) || (num === 1 && starterCount === 0)) { isGK = true; name = name.replace(/\(gol\)|\(gk\)|goleiro|\(\)/ig, '').trim(); }
        players.push({ id: `player-${Date.now()}-${Math.random().toString(36).substr(2,9)}`, name: name.substring(0,20), fullName: name, number: num, position: isGK?'GK':'MF', teamId, isStarter: starterCount < 11, events: [], x: 50+(Math.random()-0.5)*5, y: 50+(Math.random()-0.5)*5 });
        starterCount++;
      }
    }
    if (players.length > 0) {
      matchState.setState(prev => { const key = teamId === 'home' ? 'homeTeam' : 'awayTeam'; return { ...prev, [key]: { ...prev[key], players: [...prev[key].players, ...players] } }; });
      addToast('Lista Importada', `${players.length} jogadores adicionados.`, 'success');
      render();
    } else { addToast('Erro', 'Não foi possível extrair jogadores.', 'error'); }
    modal.remove();
  });
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
}

// Função para mostrar modal de configuração da partida
function showMatchSetupModal() {
  const state = matchState.getState();
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-4 animate-fade-in';
  modal.innerHTML = `
    <div class="w-full max-w-2xl max-h-[90vh] flex flex-col bg-slate-900 border border-slate-700 rounded-[2.5rem] shadow-2xl relative ring-1 ring-white/10 overflow-hidden">
      <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 via-blue-400 to-blue-600 z-10"></div>
      <button id="closeSetupBtn" class="absolute top-4 right-4 p-3 text-slate-500 hover:text-white hover:bg-white/10 rounded-full transition-all z-20">✕</button>
      <div class="p-8 overflow-y-auto custom-scrollbar flex-1">
        <div class="flex flex-col items-center mb-8">
          <div class="w-16 h-16 bg-blue-600/20 border border-blue-500/30 rounded-3xl flex items-center justify-center mb-4 text-blue-400">📋</div>
          <h1 class="text-3xl font-black text-center text-white uppercase tracking-tighter">Súmula da Partida</h1>
        </div>
        <div class="space-y-5">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div><label class="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1 block">Competição</label><input id="competitionInput" type="text" placeholder="Ex: Copa Trampolim" value="${state.competition}" class="w-full bg-slate-950/50 border border-white/5 rounded-2xl py-4 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-bold text-sm" /></div>
            <div><label class="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1 block">Árbitro</label><input id="refereeInput" type="text" placeholder="Ex: Wilton P. Sampaio" value="${state.referee||''}" class="w-full bg-slate-950/50 border border-white/5 rounded-2xl py-4 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-bold text-sm" /></div>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div><label class="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1 block">Estádio</label><input id="stadiumInput" type="text" placeholder="Ex: Maracanã" value="${state.stadium}" class="w-full bg-slate-950/50 border border-white/5 rounded-2xl py-4 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-bold text-sm" /></div>
            <div><label class="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1 block">Data</label><input id="dateInput" type="date" value="${state.matchDate}" class="w-full bg-slate-950/50 border border-white/5 rounded-2xl py-4 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-bold text-sm" /></div>
          </div>
          <div><label class="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1 block">Observações</label><textarea id="observationsInput" placeholder="Ex: Final - Jogo Único" class="w-full bg-slate-950/50 border border-white/5 rounded-2xl p-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-bold text-sm min-h-[80px] resize-none">${state.observations||''}</textarea></div>
        </div>
        <div class="mt-10 mb-2"><button id="saveSetupBtn" class="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-5 rounded-2xl uppercase tracking-[0.2em] text-xs">💾 Confirmar</button></div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.querySelector('#closeSetupBtn').addEventListener('click', () => modal.remove());
  modal.querySelector('#saveSetupBtn').addEventListener('click', () => {
    matchState.setState(prev => ({ ...prev, competition: modal.querySelector('#competitionInput').value.trim(), referee: modal.querySelector('#refereeInput').value.trim(), stadium: modal.querySelector('#stadiumInput').value.trim(), matchDate: modal.querySelector('#dateInput').value, observations: modal.querySelector('#observationsInput').value.trim() }));
    addToast('Súmula Atualizada', 'Configurações salvas com sucesso.', 'success');
    render();
    modal.remove();
  });
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
}

// Função para importar backup
function importBackup() {
  const input = document.createElement('input');
  input.type = 'file'; input.accept = '.json';
  input.addEventListener('change', (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const importedState = JSON.parse(ev.target.result);
        if (importedState.homeTeam && importedState.awayTeam) { matchState.setState(importedState); addToast('Sucesso', 'Backup restaurado!', 'success'); render(); }
        else { addToast('Erro', 'Backup inválido.', 'error'); }
      } catch (err) { addToast('Erro', 'Backup inválido.', 'error'); }
    };
    reader.readAsText(file);
  });
  input.click();
}

// Função para copiar relatório
function copyMatchReport() {
  const state = matchState.getState();
  const safeEvents = state.events || [];
  const homeScore = safeEvents.filter(e => e.teamId === 'home' && e.type === 'GOAL' && !e.isAnnulled).length;
  const awayScore = safeEvents.filter(e => e.teamId === 'away' && e.type === 'GOAL' && !e.isAnnulled).length;
  let report = `🔴 GG PRO - Resumo da Partida 🔴\n`;
  if (state.competition) report += `${state.competition}\n`;
  report += `${state.homeTeam.name} ${homeScore} x ${awayScore} ${state.awayTeam.name}\n`;
  const now = Date.now();
  const elapsed = state.timeElapsed + (state.timerStartedAt && !state.isPaused ? now - state.timerStartedAt : 0);
  report += `Tempo: ${Math.floor(elapsed / 60000)}'\n\n`;
  const goals = safeEvents.filter(e => e.type === 'GOAL' && !e.isAnnulled).reverse();
  if (goals.length > 0) { report += `⚽ GOLS:\n`; goals.forEach(g => { const tn = g.teamId === 'home' ? state.homeTeam.shortName : state.awayTeam.shortName; report += `- ${g.minute}': ${g.description.replace(/⚽/g,'').trim()} (${tn})\n`; }); }
  navigator.clipboard.writeText(report).then(() => addToast('Copiado', 'Relatório copiado!', 'success')).catch(() => addToast('Erro', 'Não foi possível copiar.', 'error'));
}

// Função para mostrar modal de confirmação de reset
function showResetConfirmModal() {
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-6 backdrop-blur-xl animate-fade-in';
  modal.innerHTML = `<div class="bg-slate-900 p-10 rounded-[2.5rem] border border-white/10 text-center"><h3 class="text-2xl font-black mb-2 uppercase text-white">Nova Partida?</h3><p class="text-slate-400 text-sm mb-6">Todos os dados serão apagados.</p><div class="flex gap-4"><button id="confirmResetBtn" class="flex-1 bg-red-600 text-white py-4 rounded-2xl font-black text-xs uppercase">Confirmar</button><button id="cancelResetBtn" class="flex-1 bg-slate-800 text-white py-4 rounded-2xl font-black text-xs uppercase">Cancelar</button></div></div>`;
  document.body.appendChild(modal);
  modal.querySelector('#confirmResetBtn').addEventListener('click', () => { matchState.handleReset(); addToast('Resetado', 'Dados zerados.', 'info'); render(); modal.remove(); });
  modal.querySelector('#cancelResetBtn').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
}

// Função para mostrar modal de fim de jogo
function showEndGameModal() {
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-4 animate-fade-in';
  modal.innerHTML = `<div class="bg-slate-800 p-6 rounded-[2rem] max-w-sm w-full text-center shadow-2xl text-white"><h3 class="text-lg font-black mb-1 uppercase">Próximo Passo</h3><p class="text-xs text-slate-400 mb-6">Tempo regulamentar acabou.</p><div class="flex flex-col gap-3"><button id="finishGameBtn" class="w-full bg-slate-700 py-4 rounded-xl font-black text-xs uppercase">🏁 Encerrar Jogo</button><div class="flex gap-3"><button id="extraTimeBtn" class="flex-1 bg-blue-600 py-4 rounded-xl font-black text-xs uppercase">➕ Prorrogação</button><button id="penaltiesBtn" class="flex-1 bg-indigo-600 py-4 rounded-xl font-black text-xs uppercase">⚠️ Pênaltis</button></div><button id="cancelEndGameBtn" class="mt-2 text-slate-500 text-xs font-bold underline">Cancelar</button></div></div>`;
  document.body.appendChild(modal);
  modal.querySelector('#finishGameBtn').addEventListener('click', () => { matchState.handleFinalizeMatch(); addToast('Finalizado', 'Jogo encerrado.', 'success'); render(); modal.remove(); });
  modal.querySelector('#extraTimeBtn').addEventListener('click', () => { matchState.advancePeriod('1ET'); addToast('Prorrogação', 'Início da prorrogação.', 'info'); render(); modal.remove(); });
  modal.querySelector('#penaltiesBtn').addEventListener('click', () => { matchState.advancePeriod('PENALTIES'); addToast('Pênaltis', 'Disputa iniciada.', 'info'); render(); modal.remove(); });
  modal.querySelector('#cancelEndGameBtn').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
}

// Exportar funções para uso global
window.showTeamEditModal = showTeamEditModal;
window.showPlayerEditModal = showPlayerEditModal;
window.showCoachEditModal = showCoachEditModal;
window.showImportListModal = showImportListModal;
window.showMatchSetupModal = showMatchSetupModal;
window.importBackup = importBackup;
window.copyMatchReport = copyMatchReport;
window.showResetConfirmModal = showResetConfirmModal;
window.showEndGameModal = showEndGameModal;

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
  render();
  matchState.subscribe(() => { render(); });
});
