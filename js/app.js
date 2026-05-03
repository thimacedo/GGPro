// js/app.js - v9.0 MOBILE-FIRST WAR CONSOLE
// O motor definitivo para operação em tempo real (Desktop & Mobile)

import matchState from './state.js';
import { renderHeader, updateTimer } from './components/header.js';
import { toastManager } from './components/toasts.js';
import { fieldManager } from './components/field.js';
import { statsManager } from './components/stats.js';
import { renderTimelineEvent } from './components/timeline.js';
import { renderPlayerLists } from './components/details.js';
import { voice } from './services/voice.js';

// Estado da UI (Mobile-First)
const ui = {
  activeMobileTab: 'field', // 'aside' (Atalhos), 'field' (Mapa), 'stats' (Status)
  viewMode: 'field',       // 'field' ou 'list' para o container central
  isLightMode: false,
  voiceState: { isRecording: false, isProcessing: false }
};

// --- Injeção de APIs Globais ---
window.matchState = matchState;
window.toastManager = toastManager;
window.render = render;
window.setMobileTab = (tab) => { ui.activeMobileTab = tab; render(); };
window.quickEvent = (type, teamId) => {
  const teamName = matchState.getTeamShortName(teamId);
  const emoji = { 'GOAL': '⚽', 'YELLOW_CARD': '🟨', 'RED_CARD': '🟥', 'FOUL': '⚠', 'CORNER': '🚩', 'SHOT': '🎯' };
  const descriptions = {
    'GOAL': `GOL do ${teamName}!`,
    'YELLOW_CARD': `Cartão Amarelo: ${teamName}`,
    'RED_CARD': `Cartão Vermelho: ${teamName}`,
    'FOUL': `Falta do ${teamName}`,
    'CORNER': `Escanteio: ${teamName}`,
    'SHOT': `Finalização: ${teamName}`
  };
  matchState.addEvent({ type, teamId, description: `${emoji[type] || ''} ${descriptions[type] || type}` });
  toastManager.show('Console', descriptions[type], 'success');
};

// --- Inicialização ---
function init() {
  matchState.subscribe(() => render());
  
  // Remover loader inicial
  const loader = document.getElementById('main-loader');
  if (loader) loader.style.opacity = '0';
  setTimeout(() => loader?.remove(), 500);

  render();
  runClockEngine();
}

function runClockEngine() {
  setInterval(() => {
    const state = matchState.getState();
    if (!state.isPaused && !['PENALTIES', 'FINISHED', 'HALFTIME'].includes(state.period)) {
      updateTimer();
    }
  }, 1000);
}

// --- Renderização ---
function render() {
  const root = document.getElementById('root');
  if (!root) return;

  const state = matchState.getState();

  root.innerHTML = `
    <header class="header justify-between">
      <div id="headerContainer" class="flex-1"></div>
      <button onclick="window.matchState.handleUndo()" class="p-2 text-[10px] font-black text-slate-500 uppercase">Desfazer</button>
    </header>

    <main class="main-container">
      <!-- Atalhos (Aside) -->
      <aside class="col-aside ${ui.activeMobileTab === 'aside' ? 'active-mobile-tab' : ''}">
        <div class="flex flex-col gap-2">
          <button onclick="quickEvent('GOAL', 'home')" class="btn-action" style="border-left: 4px solid #10b981">GOL Casa</button>
          <button onclick="quickEvent('GOAL', 'away')" class="btn-action" style="border-left: 4px solid #10b981">GOL Visit.</button>
          <button onclick="quickEvent('YELLOW_CARD', 'home')" class="btn-action" style="border-left: 4px solid #f59e0b">Amarelo</button>
          <button onclick="quickEvent('RED_CARD', 'home')" class="btn-action" style="border-left: 4px solid #ef4444">Vermelho</button>
          <button onclick="quickEvent('FOUL', 'home')" class="btn-action">Falta</button>
          <button onclick="quickEvent('CORNER', 'home')" class="btn-action">Escanteio</button>
          <button onclick="quickEvent('SHOT', 'home')" class="btn-action" style="border-left: 4px solid #3b82f6">Chute</button>
        </div>
      </aside>

      <!-- Centro (Campo/Lista) -->
      <section class="col-main ${ui.activeMobileTab === 'field' ? 'active-mobile-tab' : ''}">
        <div class="flex gap-2 mb-2">
          <button onclick="renderView('field')" class="flex-1 p-2 rounded-lg text-[10px] font-black bg-slate-900 border border-white/5 ${ui.viewMode === 'field' ? 'text-blue-400 border-blue-500' : 'text-slate-500'}">CAMPO</button>
          <button onclick="renderView('list')" class="flex-1 p-2 rounded-lg text-[10px] font-black bg-slate-900 border border-white/5 ${ui.viewMode === 'list' ? 'text-blue-400 border-blue-500' : 'text-slate-500'}">ELENCO</button>
        </div>
        <div class="flex-1 relative bg-slate-900/50 rounded-2xl overflow-hidden border border-white/5">
          ${ui.viewMode === 'field' ? fieldManager.render(state, true) : renderPlayerLists(state)}
        </div>
      </section>

      <!-- Status (Stats/Timeline) -->
      <aside class="col-right ${ui.activeMobileTab === 'stats' ? 'active-mobile-tab' : ''}">
        <div class="flex flex-col h-full gap-4">
          <div class="stats-compact">${statsManager.render(state, true)}</div>
          <div class="flex-1 overflow-y-auto custom-scrollbar pr-2">
            <h4 class="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3">Timeline</h4>
            <div class="space-y-2">
              ${(state.events || []).slice(0, 15).map(e => renderTimelineEvent(e, state)).join('')}
            </div>
          </div>
        </div>
      </aside>
    </main>

    <!-- Navegação Mobile Inferior -->
    <nav class="mobile-nav">
      <button onclick="setMobileTab('aside')" class="nav-item ${ui.activeMobileTab === 'aside' ? 'active' : ''}">
        <span class="nav-item-icon">⚡</span>
        <span>Ações</span>
      </button>
      <button onclick="setMobileTab('field')" class="nav-item ${ui.activeMobileTab === 'field' ? 'active' : ''}">
        <span class="nav-item-icon">🏟️</span>
        <span>Campo</span>
      </button>
      <button onclick="setMobileTab('stats')" class="nav-item ${ui.activeMobileTab === 'stats' ? 'active' : ''}">
        <span class="nav-item-icon">📊</span>
        <span>Stats</span>
      </button>
    </nav>
  `;

  attachHeader(state);
  attachFieldInteractions();
}

function attachHeader(state) {
  const container = document.getElementById('headerContainer');
  if (container) renderHeader(container, {
    onPlayPauseToggle: () => matchState.handlePlayPauseToggle(),
    onNextPeriodClick: () => matchState.advancePeriod(),
    isFullscreen: false
  });
}

function attachFieldInteractions() {
  // Simplificado para mobile-first (clique para selecionar jogador vindo em breve)
}

window.renderView = (mode) => { ui.viewMode = mode; render(); };

// Iniciar
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
