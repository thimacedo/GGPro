// js/app.js - v5.0 COMPLETE
// Ponto de entrada principal - Narrador Pro com todas as funcionalidades do original

import matchState from './state.js';
import { renderHeader, updateTimer } from './components/header.js';
import { toastManager } from './components/toasts.js';
import { modalManager } from './components/modals.js';
import { fieldManager } from './components/field.js';
import { statsManager } from './components/stats.js';
import { voice } from './services/voice.js';
import { processImageForPlayers, generateMatchReport, parseRegulationDocument } from './services/gemini.js';
import { FORMATIONS, TEAM_ABBREVIATIONS } from './constants.js';

// Expor FORMATIONS globalmente para modais
window.FORMATIONS = FORMATIONS;

/**
 *  HOISTING DE APIS GLOBAIS
 */
window.handleImageUpload = handleImageUpload;
window.handleRegulationUpload = handleRegulationUpload;
window.handleVarReversal = handleVarReversal;
window.generateReport = handleGenerateReport;
window.exportToClipboard = handleExportClipboard;
window.modalManager = modalManager;
window.render = render;
window.handleAction = (action) => console.log("Ação do Operador:", action);
window.generateDistinctShortName = generateDistinctShortName;

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
  matchState.subscribe(() => render());
  render();
  runClockEngine();
  runPenaltyEngine();
}

/**
 *  MOTOR DO CRONÔMETRO
 */
function runClockEngine() {
  setInterval(() => {
    const state = matchState.getState();
    if (state.isPaused || state.period === 'PENALTIES' || state.period === 'FINISHED' || state.period === 'HALFTIME') {
      return;
    }
    updateTimer();
  }, 1000);
}

/**
 *  MOTOR DE PÊNALIS
 * Monitora transição para período de pênaltis
 */
function runPenaltyEngine() {
  matchState.subscribe((state) => {
    if (state.isPenaltyShootoutActive && state.period === 'PENALTIES') {
      const overlay = document.getElementById('modalOverlay');
      if (!overlay) {
        // Auto-abrir modal de pênaltis se ainda não houver modal
        setTimeout(() => modalManager.showPenaltyShootout(), 500);
      }
    }
  });
}

// --- Renderização ---

function render() {
  const root = document.getElementById('root') || document.getElementById('app');
  if (!root) return;

  const state = matchState.getState();

  root.innerHTML = `
    <div class="h-screen flex flex-col font-sans selection:bg-blue-500/20 overflow-hidden transition-colors duration-500 ${ui.isLightMode ? 'claro' : 'bg-slate-950 text-slate-50'}">

      <!-- Componente Header -->
      <div id="headerContainer"></div>

      <!-- Conteúdo Principal -->
      <main class="flex-1 flex flex-col px-2 md:px-4 min-h-0 ${ui.isFullscreen ? 'overflow-hidden pb-24 pt-2' : 'overflow-y-auto pb-40 pt-4'} custom-scrollbar">
        <div class="w-full max-w-7xl mx-auto flex flex-col min-h-0 ${ui.isFullscreen ? 'h-full' : 'gap-4 md:gap-6'}">

          <!-- Tabs -->
          <div id="tabsContainer" class="flex justify-center gap-2 ${ui.isFullscreen ? 'hidden' : ''}">
            <div class="flex justify-center gap-2 bg-slate-900/50 p-1.5 rounded-2xl w-fit mx-auto border border-white/5 backdrop-blur-xl">
              <button id="tabMain" class="px-8 py-2.5 rounded-xl font-black text-[10px] tracking-widest transition-all ${ui.activeTab === 'main' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-500 hover:text-white'}">NARRAÇÃO</button>
              <button id="tabStats" class="px-8 py-2.5 rounded-xl font-black text-[10px] tracking-widest transition-all ${ui.activeTab === 'stats' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-500 hover:text-white'}">ESTATÍSTICAS</button>
              <button id="tabReport" class="px-8 py-2.5 rounded-xl font-black text-[10px] tracking-widest transition-all ${ui.activeTab === 'report' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-500 hover:text-white'}">RELATÓRIO</button>
            </div>
          </div>

          <div id="tabContent" class="flex-1 min-h-0">
            ${renderActiveTab(state)}
          </div>
        </div>
      </main>

      <!-- Command Bar -->
      ${renderCommandBar(state)}

      <!-- Quick Action Buttons (top right) -->
      <div class="absolute top-4 right-4 z-[70] flex gap-2">
        <button id="toggleContrast" class="p-3 rounded-2xl bg-slate-900/80 text-white border border-white/10 backdrop-blur-md shadow-2xl hover:bg-slate-800 transition-all" title="Modo Claro/Escuro">🌓</button>
        <button id="openSettings" class="p-3 rounded-2xl bg-slate-900/80 text-white border border-white/10 backdrop-blur-md shadow-2xl hover:bg-slate-800 transition-all" title="Menu Técnico">⚙️</button>
      </div>

      <!-- Settings Menu -->
      ${renderSettingsMenu(state)}
    </div>
  `;

  attachHeader(state);
  attachEventListeners();
}

function renderActiveTab(state) {
  if (ui.activeTab === 'main') {
    return `
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch ${ui.isFullscreen ? 'h-full' : ''}">
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

        <div class="${ui.isFullscreen ? 'lg:col-span-3 flex flex-col h-full min-h-0' : 'lg:col-span-4 flex flex-col'}">
          <div class="bg-slate-900/50 rounded-[2.5rem] border border-white/5 flex flex-col overflow-hidden shadow-2xl flex-1 min-h-0 backdrop-blur-xl">
            <div class="p-6 border-b border-white/5 bg-white/5 flex justify-between items-center">
              <h3 class="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400 flex items-center gap-2">📜 Cronologia</h3>
              <div class="flex gap-2">
                <button onclick="handleVarReversal()" class="p-2 text-[10px] font-black text-amber-500 hover:text-amber-400 transition-colors uppercase">VAR</button>
                <button id="undoBtn" class="p-2 text-[10px] font-black text-slate-500 hover:text-red-400 transition-colors uppercase">Desfazer</button>
              </div>
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

  if (ui.activeTab === 'stats') {
    return statsManager.render(state);
  }

  if (ui.activeTab === 'report') {
    return renderReportTab(state);
  }

  return '';
}

function renderReportTab(state) {
  const report = matchState.generateStructuredReport();
  return `
    <div class="max-w-3xl mx-auto w-full">
      <div class="bg-slate-900/50 rounded-[2.5rem] border border-white/5 p-8 shadow-2xl backdrop-blur-xl">
        <h3 class="text-sm font-black uppercase tracking-widest text-slate-400 mb-6 text-center">📄 Relatório da Partida</h3>
        <pre class="text-sm text-slate-300 whitespace-pre-wrap font-mono bg-slate-800/50 p-6 rounded-2xl max-h-96 overflow-y-auto custom-scrollbar border border-white/5">${report}</pre>
        <div class="grid grid-cols-2 gap-3 mt-6">
          <button onclick="window.copyReportSelf_report()" class="p-4 bg-blue-600 hover:bg-blue-500 rounded-2xl text-[11px] font-black uppercase text-white transition-all">📋 Copiar</button>
          <button onclick="window.downloadReportSelf_report()" class="p-4 bg-emerald-600 hover:bg-emerald-500 rounded-2xl text-[11px] font-black uppercase text-white transition-all">💾 Salvar .txt</button>
        </div>
      </div>
    </div>
  `;
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
  const isEndPeriod = ['INTERVAL', '2T', '2ET'].includes(state.period);

  return `
    <div id="settingsOverlay" class="fixed inset-0 bg-black/60 backdrop-blur-sm z-[75] animate-fade-in"></div>
    <div class="fixed top-20 right-4 w-80 bg-slate-900 border border-white/10 rounded-[2.5rem] shadow-2xl p-6 z-[80] animate-slide-up flex flex-col gap-3">
      <h4 class="text-[10px] font-black uppercase text-slate-500 tracking-[0.3em] mb-4 text-center">Menu Técnico</h4>

      <button onclick="modalManager.showPreMatchSetup()" class="w-full p-4 bg-slate-800 hover:bg-slate-700 rounded-2xl text-left flex items-center gap-4 transition-all">
        <span class="text-xl">🏷️</span>
        <span class="text-xs font-black uppercase tracking-widest text-white">Pré-Jogo</span>
      </button>

      <button onclick="modalManager.showSumula()" class="w-full p-4 bg-slate-800 hover:bg-slate-700 rounded-2xl text-left flex items-center gap-4 transition-all">
        <span class="text-xl">📋</span>
        <span class="text-xs font-black uppercase tracking-widest text-white">Editar Súmula</span>
      </button>

      ${isEndPeriod ? `
      <button onclick="modalManager.showEndGameOptions()" class="w-full p-4 bg-amber-600/20 border border-amber-500/30 hover:bg-amber-600 rounded-2xl text-left flex items-center gap-4 transition-all">
        <span class="text-xl">⏳</span>
        <span class="text-xs font-black uppercase tracking-widest text-amber-400">Fim do Período</span>
      </button>
      ` : `
      <button id="btnNextPeriod" class="w-full p-4 bg-slate-800 hover:bg-blue-600 rounded-2xl text-left flex items-center gap-4 transition-all">
        <span class="text-xl">⏳</span>
        <span class="text-xs font-black uppercase tracking-widest text-white">Próximo Período</span>
      </button>
      `}

      <button onclick="handleVarReversal()" class="w-full p-4 bg-slate-800 hover:bg-amber-600 rounded-2xl text-left flex items-center gap-4 transition-all group">
        <span class="text-xl group-hover:scale-110 transition-transform">📺</span>
        <span class="text-xs font-black uppercase tracking-widest text-white">Reversão de VAR</span>
      </button>

      ${state.period === 'PENALTIES' ? `
      <button onclick="modalManager.showPenaltyShootout()" class="w-full p-4 bg-blue-600/20 border border-blue-500/30 hover:bg-blue-600 rounded-2xl text-left flex items-center gap-4 transition-all">
        <span class="text-xl">🥅</span>
        <span class="text-xs font-black uppercase tracking-widest text-blue-400">Disputa de Pênaltis</span>
      </button>
      ` : ''}

      <button id="btnFinalize" class="w-full p-4 bg-red-600/10 border border-red-600/20 hover:bg-red-600 rounded-2xl text-left flex items-center gap-4 transition-all text-red-500 hover:text-white">
        <span class="text-xl">🏁</span>
        <span class="text-xs font-black uppercase tracking-widest">Encerrar Jogo</span>
      </button>

      <div class="h-px bg-white/5 my-2"></div>

      <button id="btnExport" class="w-full p-3 bg-slate-800/50 hover:bg-slate-800 rounded-xl text-center text-[10px] font-black uppercase tracking-widest text-slate-400">
        Salvar Backup (JSON)
      </button>

      <button onclick="modalManager.showResetConfirm()" class="w-full p-3 bg-red-900/20 hover:bg-red-900/40 rounded-xl text-center text-[10px] font-black uppercase tracking-widest text-red-400 mt-2">
        Resetar Partida
      </button>
    </div>
  `;
}

// --- Player Lists ---

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
  const starters = team.players.filter(p => p.isStarter && !p.hasLeftGame).sort((a,b) => a.number - b.number);
  return `
    <div class="space-y-2">
      ${starters.map(p => `
        <button class="w-full p-3 bg-slate-800/40 hover:bg-slate-800 rounded-2xl flex items-center gap-4 transition-all border border-white/5 group" data-player='${JSON.stringify(p).replace(/'/g, '&#39;')}' data-team='${JSON.stringify(team).replace(/'/g, '&#39;')}' data-teamid="${teamId}">
          <div class="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black text-white shrink-0 group-hover:scale-110 transition-transform shadow-lg" style="background-color: ${team.color}">
            ${p.number}
          </div>
          <div class="flex flex-col items-start overflow-hidden">
            <span class="text-white font-black text-[11px] truncate w-full uppercase">${p.name}</span>
            <span class="text-[9px] font-black text-slate-500 uppercase">${p.position}${p.position === 'GK' ? ' 🧤' : ''}</span>
          </div>
        </button>
      `).join('')}
    </div>
  `;
}

function renderTimelineEvent(event, state) {
  const team = event.teamId === 'home' ? state.homeTeam : state.awayTeam;
  const isAnnulled = event.isAnnulled;
  const color = isAnnulled ? '#475569' : (team?.color || '#ffffff');

  return `
    <div class="flex gap-4 group relative ${isAnnulled ? 'opacity-40 grayscale pointer-events-none' : ''}">
      <div class="flex flex-col items-center">
        <div class="w-10 h-10 rounded-full bg-slate-800 border-2 border-white/10 flex items-center justify-center text-[10px] font-black text-white z-10">
          ${event.minute}'
        </div>
        <div class="w-0.5 h-full bg-white/5 group-last:hidden"></div>
      </div>
      <div class="flex-1 pb-6">
        <div class="p-4 bg-slate-800/50 rounded-[1.5rem] border-l-4 border-white/5" style="border-left-color: ${color}">
          <p class="text-xs font-black text-white mb-1">${event.description}</p>
          <div class="flex items-center justify-between">
            <span class="text-[8px] font-black uppercase tracking-widest text-slate-500">${matchState.formatEventType(event.type)}</span>
            ${isAnnulled ? `<span class="text-[8px] font-black uppercase text-red-500">ANULADO</span>` : ''}
          </div>
        </div>
      </div>
    </div>
  `;
}

// --- Handlers & API ---

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
  document.getElementById('tabMain')?.addEventListener('click', () => { ui.activeTab = 'main'; render(); });
  document.getElementById('tabStats')?.addEventListener('click', () => { ui.activeTab = 'stats'; render(); });
  document.getElementById('tabReport')?.addEventListener('click', () => { ui.activeTab = 'report'; render(); });
  document.getElementById('setViewList')?.addEventListener('click', () => { ui.viewMode = 'list'; render(); });
  document.getElementById('setViewField')?.addEventListener('click', () => { ui.viewMode = 'field'; render(); });
  document.getElementById('toggleFullscreen')?.addEventListener('click', () => { ui.isFullscreen = !ui.isFullscreen; render(); });
  document.getElementById('playPauseBottom')?.addEventListener('click', () => matchState.handlePlayPauseToggle());
  document.getElementById('micBtn')?.addEventListener('click', () => voice.toggle());

  const cmdInput = document.getElementById('commandInput');
  cmdInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { handleCommandSubmit(cmdInput.value); cmdInput.value = ''; }
  });
  document.getElementById('sendBtn')?.addEventListener('click', () => {
    if (cmdInput) { handleCommandSubmit(cmdInput.value); cmdInput.value = ''; }
  });

  document.getElementById('openSettings')?.addEventListener('click', () => { ui.isSettingsOpen = true; render(); });
  document.getElementById('settingsOverlay')?.addEventListener('click', () => { ui.isSettingsOpen = false; render(); });
  document.getElementById('toggleContrast')?.addEventListener('click', () => { ui.isLightMode = !ui.isLightMode; render(); });

  document.getElementById('btnNextPeriod')?.addEventListener('click', handleAdvancePeriod);
  document.getElementById('btnFinalize')?.addEventListener('click', () => {
    modalManager.showEndGameOptions();
  });

  document.getElementById('btnExport')?.addEventListener('click', () => {
    const data = matchState.exportMatchData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `narrador_pro_backup_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toastManager.show('Backup', 'Backup JSON exportado.', 'success');
  });

  // Player list clicks
  document.querySelectorAll('[data-player]').forEach(btn => {
    btn.addEventListener('click', () => {
      const player = JSON.parse(btn.dataset.player);
      const team = JSON.parse(btn.dataset.team);
      const teamId = btn.dataset.teamid;
      modalManager.showPlayerActions(player, team, teamId);
    });
  });

  // Undo
  document.getElementById('undoBtn')?.addEventListener('click', () => {
    if (matchState.undo()) {
      toastManager.show("Undo", "Evento desfeito.", "info");
      render();
    }
  });

  voice.notifyUI();

  window.addEventListener('voiceStateChange', (e) => {
    const { isRecording, isProcessing } = e.detail;
    const pulse = document.getElementById('micPulse');
    if (pulse) isRecording ? pulse.classList.remove('hidden') : pulse.classList.add('hidden');
  });

  window.copyReportSelf_report = () => {
    navigator.clipboard.writeText(matchState.generateStructuredReport());
    toastManager.show('Copiado', 'Relatório copiado.', 'success');
  };
  window.downloadReportSelf_report = () => {
    const report = matchState.generateStructuredReport();
    const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio_${new Date().toISOString().slice(0,10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };
}

function handleAdvancePeriod() {
  const state = matchState.getState();
  if (state.period === '2T' || state.period === '2ET') {
    modalManager.showEndGameOptions();
  } else {
    matchState.advancePeriod();
    toastManager.show("Período", `Início de ${matchState.formatPeriodName(matchState.getState().period)}`, "info");
  }
}

async function handleCommandSubmit(text) {
  if (!text.trim()) return;
  toastManager.show("IA", "Interpretando narração...", "ai");
  try {
    await voice.processCommand(text);
  } catch (e) {
    toastManager.show("Erro", e.message || "Falha na IA.", "error");
  }
}

async function handleGenerateReport() {
  const state = matchState.getState();
  const timeline = (state.events || []).filter(e => !e.isAnnulled).map(e => `${e.minute}' - ${e.description}`).join('\n');
  const context = `Resultado: ${state.homeTeam.name} ${state.score.home} x ${state.score.away} ${state.awayTeam.name}`;

  toastManager.show("Escritor AI", "Gerando crônica...", "ai");
  try {
    const report = await generateMatchReport(context, timeline);
    modalManager.open(`<div class="prose prose-invert text-slate-300 text-sm">${report.replace(/\n/g, '<br>')}</div>`, "Crônica");
  } catch (e) {
    // Fallback to structured report
    modalManager.showMatchReport();
  }
}

async function handleImageUpload(event, type) {
  const file = event.target.files[0];
  if (!file) return;

  toastManager.show("Vision AI", "Analisando imagem...", "ai");
  try {
    const result = await processImageForPlayers(file, type);
    if (type === 'players' && Array.isArray(result)) {
      const teamKey = window.currentImportTeamId === 'away' ? 'awayTeam' : 'homeTeam';
      matchState.setState(prev => {
        const existing = prev[teamKey].players || [];
        // Merge avoiding duplicates by number
        const existingNumbers = new Set(existing.map(p => p.number));
        const newPlayers = result.filter(p => !existingNumbers.has(p.number));
        return { ...prev, [teamKey]: { ...prev[teamKey], players: [...existing, ...newPlayers] } };
      });
      toastManager.show("Sucesso", `${result.length} atletas importados.`, "success");
    }
  } catch (e) {
    toastManager.show("Erro", e.message || "Falha no processamento.", "error");
  }
}

async function handleRegulationUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  try {
    const rules = await parseRegulationDocument(file, file.type);
    matchState.setState(prev => ({ ...prev, rules: { ...prev.rules, ...rules }, extractedRules: rules }));
    toastManager.show("Regras", "Configuração atualizada.", "success");
  } catch (e) {
    toastManager.show("Erro", "Erro ao ler documento.", "error");
  }
}

function handleVarReversal() {
  const state = matchState.getState();
  const majorEvents = (state.events || []).filter(e => !e.isAnnulled);

  if (majorEvents.length === 0) {
    toastManager.show("VAR", "Nenhum evento registrado para análise no momento.", "info");
    return;
  }

  modalManager.open(`
    <div class="flex flex-col gap-3">
      ${majorEvents.slice(0, 5).map(e => `
        <button class="w-full p-4 bg-slate-800 rounded-2xl text-left hover:bg-slate-700 transition-all border border-white/5" onclick="matchState.annulEvent('${e.id}'); modalManager.close(); toastManager.show('VAR', 'Evento anulado após revisão.', 'warning');">
          <span class="text-white font-bold text-xs">${e.description}</span>
        </button>
      `).join('')}
    </div>
  `, 'Revisão VAR');
}

function generateDistinctShortName(name) {
  return (name || 'UND').substring(0, 3).toUpperCase();
}

function handleExportClipboard() {
  const report = matchState.generateStructuredReport();
  navigator.clipboard.writeText(report);
  toastManager.show("Copiado", "Relatório na área de transferência.", "success");
}

// Iniciar Aplicação com DOM Pronto segura
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

/**
 *  EXPOSIÇÃO DE GLOBAIS PARA O DOM (Inline Handlers)
 */
window.matchState = matchState;
window.modalManager = modalManager;
window.handleVarReversal = handleVarReversal;
window.handleAdvancePeriod = handleAdvancePeriod;
window.handleAction = (action) => console.log("Ação do Operador:", action);
window.handleGenerateReport = handleGenerateReport;
window.handleExportClipboard = handleExportClipboard;
