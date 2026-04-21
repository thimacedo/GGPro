// js/app.js - v6.5 BROADCAST EDITION
// Ponto de entrada principal - Narrador Pro com Skins e Voice HUD

import matchState from './state.js';
import { renderHeader, updateTimer } from './components/header.js';
import { toastManager } from './components/toasts.js';
import { modalManager } from './components/modals.js';
import { fieldManager } from './components/field.js';
import { statsManager } from './components/stats.js';
import { renderVoiceHud } from './components/voice-hud.js';
import { renderPressureGauge } from './components/pressure-gauge.js';
import { renderTimelineEvent } from './components/timeline.js';
import { renderPlayerLists } from './components/details.js';
import { voice } from './services/voice.js';
import { pressureService } from './services/pressureService.js';
import { obsService } from './services/obsService.js';
import { processImageForPlayers, generateMatchReport, parseRegulationDocument } from './services/gemini-api.js';
import { FORMATIONS, TEAM_ABBREVIATIONS, BROADCAST_THEMES } from './constants.js';

// Expor FORMATIONS globalmente para modais
window.FORMATIONS = FORMATIONS;

/**
 *  HOISTING E EXPOSIÇÃO DE APIS GLOBAIS
 */
window.matchState = matchState;
window.modalManager = modalManager;
window.toastManager = toastManager;
window.handleImageUpload = handleImageUpload;
window.handleRegulationUpload = handleRegulationUpload;
window.handleVarReversal = handleVarReversal;
window.handleAdvancePeriod = handleAdvancePeriod;
window.generateReport = handleGenerateReport;
window.exportToClipboard = handleExportClipboard;
window.render = render;
window.handleAction = (action) => console.log("Ação do Operador:", action);
window.generateDistinctShortName = generateDistinctShortName;
window.saveObsConfig = (addr, pass, auto) => obsService.saveConfig({ address: addr, password: pass, autoSwitch: auto });

window.changeTheme = (themeId) => {
  const theme = BROADCAST_THEMES[themeId];
  if (!theme) return;
  
  Object.values(BROADCAST_THEMES).forEach(t => document.body.classList.remove(t.id));
  document.body.classList.add(theme.id);
  ui.activeTheme = themeId;
  localStorage.setItem('GGPRO_THEME', themeId);
  render();
  toastManager.show('Broadcast', `Tema: ${theme.name}`, 'info');
};

// Estado local da UI (não persistente)
const ui = {
  activeTab: 'main',
  viewMode: 'field',
  isFullscreen: false,
  isLightMode: false,
  isSettingsOpen: false,
  activeTheme: localStorage.getItem('GGPRO_THEME') || 'classic',
  voiceState: { isRecording: false, isProcessing: false },
  pressureAnalysis: null,
  obsConnected: false
};

// --- Inicialização ---

function init() {
  document.body.classList.add(BROADCAST_THEMES[ui.activeTheme]?.id || 'theme-classic');
  
  matchState.subscribe((state) => {
    render();
    // Gatilho de pressão após eventos
    pressureService.analyzeRecentPressure();
    
    // Gatilho OBS para o último evento
    if (state.events && state.events.length > 0) {
      obsService.handleGameEvent(state.events[0]);
    }
  });

  window.addEventListener('pressureUpdate', (e) => {
    ui.pressureAnalysis = e.detail;
    obsService.handlePressureUpdate(e.detail);
    render();
  });

  window.addEventListener('obsStatusChange', (e) => {
    ui.obsConnected = e.detail.isConnected;
    render();
  });

  // Tentar conexão inicial com OBS
  obsService.connect();

  render();
  runClockEngine();
  runPenaltyEngine();
  
  // Listen for voice state changes
  window.addEventListener('voiceStateChange', (e) => {
    ui.voiceState = e.detail;
    render(); // Re-render minimal or full
  });
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
 */
function runPenaltyEngine() {
  matchState.subscribe((state) => {
    if (state.isPenaltyShootoutActive && state.period === 'PENALTIES') {
      const overlay = document.getElementById('modalOverlay');
      if (!overlay) {
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
    <div class="h-screen flex flex-col font-sans selection:bg-blue-500/20 overflow-hidden transition-colors duration-700 ${ui.isLightMode ? 'claro' : 'bg-slate-950 text-slate-50'}">

      <!-- Componente Header -->
      <div id="headerContainer"></div>

      <!-- Voice HUD -->
      ${renderVoiceHud(ui.voiceState)}

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

      <!-- Quick Action Buttons -->
      <div class="absolute top-4 right-4 z-[70] flex gap-2">
        <button id="toggleContrast" class="p-3 rounded-2xl bg-slate-900/80 text-white border border-white/10 backdrop-blur-md shadow-2xl hover:bg-slate-800 transition-all">🌓</button>
        <button id="openSettings" class="p-3 rounded-2xl bg-slate-900/80 text-white border border-white/10 backdrop-blur-md shadow-2xl hover:bg-slate-800 transition-all">⚙️</button>
      </div>

      <!-- Settings Menu -->
      ${renderSettingsMenu(state)}
    </div>
  `;

  attachHeader(state);
  attachEventListeners();
  attachFieldInteractions();
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
            <!-- Medidor de Pressão IA -->
            <div class="p-4 border-b border-white/5">
              ${renderPressureGauge(ui.pressureAnalysis)}
            </div>
            
            <div class="p-6 border-b border-white/5 bg-white/5 flex justify-between items-center">
              <h3 class="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400 flex items-center gap-2">📜 Cronologia</h3>
              <div class="flex gap-2">
                <button id="undoBtn" class="p-2 text-[10px] font-black text-slate-500 hover:text-red-400 transition-colors uppercase">Desfazer</button>
              </div>
            </div>
            <div class="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
              ${(state.events || []).map(e => renderTimelineEvent(e, state)).join('')}
            </div>
          </div>
        </div>
      </div>
    `;
  }
  if (ui.activeTab === 'stats') return statsManager.render(state);
  if (ui.activeTab === 'report') return renderReportTab(state);
  return '';
}

function renderReportTab(state) {
  const report = matchState.generateStructuredReport();
  return `
    <div class="max-w-3xl mx-auto w-full">
      <div class="bg-slate-900/50 rounded-[2.5rem] border border-white/5 p-8 shadow-2xl backdrop-blur-xl animate-fade-in">
        <h3 class="text-sm font-black uppercase tracking-widest text-slate-400 mb-6 text-center">📄 Relatório da Partida</h3>
        <pre class="text-sm text-slate-300 whitespace-pre-wrap font-mono bg-slate-800/50 p-6 rounded-2xl max-h-96 overflow-y-auto custom-scrollbar border border-white/5">${report}</pre>
        <div class="grid grid-cols-2 gap-3 mt-6">
          <button onclick="window.copyReportSelf_report()" class="p-4 bg-blue-600 hover:bg-blue-500 rounded-2xl text-[11px] font-black uppercase text-white transition-all shadow-lg shadow-blue-900/20">📋 Copiar</button>
          <button onclick="window.downloadReportSelf_report()" class="p-4 bg-emerald-600 hover:bg-emerald-500 rounded-2xl text-[11px] font-black uppercase text-white transition-all shadow-lg shadow-emerald-900/20">💾 Salvar .txt</button>
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
            <div id="micPulse" class="absolute inset-0 bg-red-600/20 rounded-2xl ${ui.voiceState.isRecording ? '' : 'hidden'} animate-pulse"></div>
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
  const obsConfig = obsService.config;

  return `
    <div id="settingsOverlay" class="fixed inset-0 bg-black/60 backdrop-blur-sm z-[75] animate-fade-in"></div>
    <div class="fixed top-20 right-4 w-80 bg-slate-900 border border-white/10 rounded-[2.5rem] shadow-2xl p-6 z-[80] animate-slide-up flex flex-col gap-6 max-h-[85vh] overflow-y-auto custom-scrollbar">
      <h4 class="text-[10px] font-black uppercase text-slate-500 tracking-[0.3em] mb-2 text-center">Menu Técnico</h4>

      <!-- OBS Integration Section -->
      <div class="bg-slate-800/40 p-4 rounded-3xl border border-white/5 space-y-4">
        <div class="flex justify-between items-center">
          <label class="text-[9px] font-black uppercase tracking-widest text-slate-500">OBS Studio</label>
          <div class="flex items-center gap-2">
            <div class="w-2 h-2 rounded-full ${ui.obsConnected ? 'bg-green-500 shadow-[0_0_10px_#22c55e]' : 'bg-red-500'}"></div>
            <span class="text-[8px] font-bold ${ui.obsConnected ? 'text-green-500' : 'text-red-500'} uppercase">${ui.obsConnected ? 'Conectado' : 'Desconectado'}</span>
          </div>
        </div>

        <div class="space-y-2">
          <input type="text" id="obsAddr" placeholder="Host:Port (ex: localhost:4455)" value="${obsConfig.address}" class="w-full bg-slate-900/50 border border-white/10 rounded-xl p-2 text-[10px] text-white outline-none focus:border-blue-500 transition-all" />
          <input type="password" id="obsPass" placeholder="Senha do WebSocket" value="${obsConfig.password}" class="w-full bg-slate-900/50 border border-white/10 rounded-xl p-2 text-[10px] text-white outline-none focus:border-blue-500 transition-all" />
        </div>

        <div class="flex items-center justify-between px-1">
          <span class="text-[9px] font-bold text-slate-400 uppercase">Auto-Troca de Cenas</span>
          <button onclick="window.saveObsConfig(document.getElementById('obsAddr').value, document.getElementById('obsPass').value, !${obsConfig.autoSwitch})" class="w-10 h-5 rounded-full relative transition-all ${obsConfig.autoSwitch ? 'bg-blue-600' : 'bg-slate-700'}">
            <div class="absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${obsConfig.autoSwitch ? 'left-6' : 'left-1'}"></div>
          </button>
        </div>

        <button onclick="window.saveObsConfig(document.getElementById('obsAddr').value, document.getElementById('obsPass').value, ${obsConfig.autoSwitch})" class="w-full py-2.5 bg-blue-600/20 hover:bg-blue-600 border border-blue-500/30 rounded-xl text-[9px] font-black uppercase text-blue-400 hover:text-white transition-all">
          Atualizar Conexão
        </button>
      </div>

      <div class="space-y-4">
        <label class="text-[9px] font-black uppercase tracking-widest text-slate-600 block">Pele Visual (Broadcast Skin)</label>
...
        <div class="grid grid-cols-1 gap-2">
          ${Object.entries(BROADCAST_THEMES).map(([id, theme]) => `
            <button onclick="changeTheme('${id}')" class="w-full p-3 rounded-xl border ${ui.activeTheme === id ? 'border-blue-500 bg-blue-500/10 text-white' : 'border-white/5 bg-slate-800/50 text-slate-400'} text-left text-[10px] font-bold uppercase transition-all hover:bg-slate-800">
              <span class="inline-block w-2 h-2 rounded-full mr-2" style="background-color: ${theme.primary}"></span>
              ${theme.name}
            </button>
          `).join('')}
        </div>
      </div>

      <div class="h-px bg-white/5 my-2"></div>

      <button onclick="matchState.saveMatchToHistory(); toastManager.show('Sucesso', 'Partida salva no histórico.', 'success');" class="w-full p-4 bg-emerald-600/20 border border-emerald-500/30 hover:bg-emerald-600 rounded-2xl text-left flex items-center gap-4 transition-all group">
        <span class="text-xl group-hover:scale-110 transition-transform">💾</span>
        <span class="text-xs font-black uppercase tracking-widest text-emerald-400 group-hover:text-white">Salvar Partida</span>
      </button>

      <button onclick="modalManager.showMatchHistory()" class="w-full p-4 bg-slate-800 hover:bg-blue-600 rounded-2xl text-left flex items-center gap-4 transition-all group">
        <span class="text-xl group-hover:scale-110 transition-transform">📚</span>
        <span class="text-xs font-black uppercase tracking-widest text-white">Histórico de Jogos</span>
      </button>

      <button id="btnFinalize" class="w-full p-4 bg-red-600/10 border border-red-600/20 hover:bg-red-600 rounded-2xl text-left flex items-center gap-4 transition-all text-red-500 hover:text-white">
        <span class="text-xl">🏁</span>
        <span class="text-xs font-black uppercase tracking-widest">Encerrar Jogo</span>
      </button>

      <button onclick="modalManager.showResetConfirm()" class="w-full p-3 bg-red-900/20 hover:bg-red-900/40 rounded-xl text-center text-[10px] font-black uppercase tracking-widest text-red-400">
        Resetar Partida
      </button>
    </div>
  `;
}

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

function attachFieldInteractions() {
  const pitch = document.getElementById('tactical-pitch');
  if (!pitch) return;

  let draggedPlayerId = null;
  let draggedTeamId = null;

  const handleMove = (e) => {
    if (!draggedPlayerId) return;
    const rect = pitch.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    const clampedX = Math.max(0, Math.min(100, x));
    const clampedY = Math.max(0, Math.min(100, y));

    const marker = document.querySelector(`[data-player-id="${draggedPlayerId}"]`);
    if (marker) {
      marker.style.left = `${clampedX}%`;
      marker.style.top = `${clampedY}%`;
    }
  };

  const handleEnd = (e) => {
    if (!draggedPlayerId) return;
    const marker = document.querySelector(`[data-player-id="${draggedPlayerId}"]`);
    if (marker) {
      const x = parseFloat(marker.style.left);
      const y = parseFloat(marker.style.top);
      matchState.setState(prev => {
        const teamKey = draggedTeamId === 'home' ? 'homeTeam' : 'awayTeam';
        const players = prev[teamKey].players.map(p => p.id === draggedPlayerId ? { ...p, coordX: x, coordY: y } : p);
        return { ...prev, [teamKey]: { ...prev[teamKey], players } };
      });
    }
    draggedPlayerId = null;
    draggedTeamId = null;
  };

  pitch.querySelectorAll('.player-marker').forEach(marker => {
    marker.onmousedown = (e) => {
      draggedPlayerId = marker.dataset.playerId;
      draggedTeamId = marker.dataset.teamId;
      document.onmousemove = handleMove;
      document.onmouseup = () => { document.onmousemove = null; handleEnd(); };
    };
  });
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
  if (cmdInput) {
    cmdInput.onkeydown = (e) => { if (e.key === 'Enter') { handleCommandSubmit(cmdInput.value); cmdInput.value = ''; } };
  }
  const sendBtn = document.getElementById('sendBtn');
  if (sendBtn) {
    sendBtn.onclick = () => { if (cmdInput) { handleCommandSubmit(cmdInput.value); cmdInput.value = ''; } };
  }

  document.getElementById('openSettings')?.addEventListener('click', () => { ui.isSettingsOpen = true; render(); });
  document.getElementById('settingsOverlay')?.addEventListener('click', () => { ui.isSettingsOpen = false; render(); });
  document.getElementById('toggleContrast')?.addEventListener('click', () => { ui.isLightMode = !ui.isLightMode; render(); });

  document.getElementById('btnFinalize')?.addEventListener('click', () => modalManager.showEndGameOptions());
  document.getElementById('undoBtn')?.addEventListener('click', () => { if (matchState.undo()) { render(); } });
}

// Global functions for events
async function handleCommandSubmit(text) {
  if (!text.trim()) return;
  try { await voice.processCommand(text); } catch (e) { toastManager.show("Erro", "Falha na IA.", "error"); }
}

async function handleGenerateReport() {
  const state = matchState.getState();
  const timeline = (state.events || []).filter(e => !e.isAnnulled).map(e => `${e.minute}' - ${e.description}`).join('\n');
  const context = `Resultado: ${state.homeTeam.name} ${state.score.home} x ${state.score.away} ${state.awayTeam.name}`;
  toastManager.show("Escritor AI", "Gerando crônica...", "ai");
  try {
    const report = await generateMatchReport(context, timeline);
    modalManager.open(`<div class="prose prose-invert text-slate-300 text-sm">${report.replace(/\n/g, '<br>')}</div>`, "Crônica");
  } catch (e) { modalManager.showMatchReport(); }
}

async function handleImageUpload(event, type) { /* Implementação OCR */ }
async function handleRegulationUpload(event) { /* Implementação Regulamento */ }
function handleVarReversal() { /* Implementação VAR */ }
function handleAdvancePeriod() { /* Implementação Período */ }
function generateDistinctShortName(name) { return (name || 'UND').substring(0, 3).toUpperCase(); }
function handleExportClipboard() { /* Implementação Export */ }

if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); } else { init(); }
