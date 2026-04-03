/**
 * Narrador Pro - main.js (Rebranding UI/UX)
 * Foco: Scoreboard Profissional, Timeline Bouncer e Grid Blindado.
 */

import matchState from './state.js';
import { toastManager } from './components/toasts.js';
import { modalManager } from './components/modals.js';
import { fieldManager } from './components/field.js';
import { statsManager } from './components/stats.js';
import { voice } from './services/voice.js';
import { generateMatchReport } from './services/gemini.js';

// --- Estado da UI ---
const ui = {
  viewMode: 'field', // 'field' ou 'list'
  isFullscreen: false,
  isLightMode: false,
  isSettingsOpen: false,
  activeTab: 'main'
};

// --- Serviço de Tempo (Modularizado) ---
const timerService = {
  getFormattedTime(state) {
    const now = Date.now();
    const totalMs = state.timeElapsed + (state.timerStartedAt && !state.isPaused ? now - state.timerStartedAt : 0);
    const totalSecs = Math.floor(totalMs / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
};

// --- Inicialização ---
function init() {
  matchState.subscribe(() => render());
  
  // Timer de alta precisão para UI (Tabular Nums)
  setInterval(() => {
    const state = matchState.getState();
    if (!state.isPaused && !['PENALTIES', 'FINISHED', 'HALFTIME'].includes(state.period)) {
      const timerEl = document.getElementById('timerDisplay');
      if (timerEl) timerEl.textContent = timerService.getFormattedTime(state);
    }
  }, 100);

  // Handlers Globais
  window.handleVarReversal = handleVarReversal;
  window.setViewMode = setViewMode;
  window.toggleFullscreen = toggleFullscreen;
  window.handleAdvancePeriod = handleAdvancePeriod;
  window.handleStartPenalties = handleStartPenalties;
  window.handleManualCommand = (input) => {
    if (!input.value.trim()) return;
    voice.processCommand(input.value);
    input.value = '';
  };
  
  render();
}

// --- Funções de Renderização (BEM & Design System) ---

function render() {
  const app = document.getElementById('app');
  if (!app) return;

  const state = matchState.getState();
  document.body.className = ui.isLightMode ? 'claro' : 'dark-mode';

  app.innerHTML = `
    <div class="app-container">
      <!-- Módulo Scoreboard -->
      ${renderScoreboard(state)}

      <main class="main-content">
        <!-- Módulo Lateral Esquerdo (Lista / Mapa) -->
        <section class="view-panel">
          <div class="view-panel__controls">
            <div class="tabs">
              <button class="tabs__btn ${ui.viewMode === 'list' ? 'tabs__btn--active' : ''}" onclick="setViewMode('list')">Escalação</button>
              <button class="tabs__btn ${ui.viewMode === 'field' ? 'tabs__btn--active' : ''}" onclick="setViewMode('field')">Tática</button>
            </div>
            <button class="icon-btn" onclick="toggleFullscreen()">📺</button>
          </div>

          <div class="view-panel__display custom-scrollbar">
            ${ui.activeTab === 'main' 
              ? (ui.viewMode === 'field' ? fieldManager.render(state, ui.isFullscreen) : renderPlayerLists(state))
              : statsManager.render(state)
            }
          </div>
        </section>

        <!-- Módulo Timeline Bouncer -->
        ${renderTimeline(state)}
      </main>

      <!-- Barra de Comando Glassmorphism -->
      ${renderCommandBar(state)}

      <!-- Overlay de Configurações -->
      ${ui.isSettingsOpen ? renderSettingsOverlay(state) : ''}
    </div>
  `;

  attachEventListeners();
}

function renderScoreboard(state) {
  const goalsHome = state.events.filter(e => e.teamId === 'home' && e.type === 'GOAL' && !e.isAnnulled).length;
  const goalsAway = state.events.filter(e => e.teamId === 'away' && e.type === 'GOAL' && !e.isAnnulled).length;

  return `
    <header class="scoreboard">
      <div class="scoreboard__team scoreboard__team--home" onclick="modalManager.showEditTeam(matchState.getState().homeTeam, 'home')">
        <div class="scoreboard__info">
          <h2 class="scoreboard__name" style="color: ${state.homeTeam.color}">${state.homeTeam.shortName}</h2>
          <span class="scoreboard__formation">${state.homeTeam.formation}</span>
        </div>
        <div class="scoreboard__score-badge">${goalsHome}</div>
        ${state.period === 'PENALTIES' ? `<div class="scoreboard__penalties">(${state.penaltyScore?.home || 0})</div>` : ''}
      </div>

      <div class="scoreboard__center">
        <span class="scoreboard__period">${matchState.formatPeriodName(state.period)}</span>
        <div id="timerDisplay" class="scoreboard__timer">${timerService.getFormattedTime(state)}</div>
        <button class="scoreboard__next" onclick="handleAdvancePeriod()">AVANÇAR FASE ➔</button>
      </div>

      <div class="scoreboard__team scoreboard__team--away" onclick="modalManager.showEditTeam(matchState.getState().awayTeam, 'away')">
        ${state.period === 'PENALTIES' ? `<div class="scoreboard__penalties">(${state.penaltyScore?.away || 0})</div>` : ''}
        <div class="scoreboard__score-badge">${goalsAway}</div>
        <div class="scoreboard__info">
          <h2 class="scoreboard__name" style="color: ${state.awayTeam.color}">${state.awayTeam.shortName}</h2>
          <span class="scoreboard__formation">${state.awayTeam.formation}</span>
        </div>
      </div>
    </header>
  `;
}

function renderTimeline(state) {
  const events = state.events || [];
  
  return `
    <aside class="timeline">
      <div class="timeline__header">
        <h3 class="timeline__title">Cronologia Direta</h3>
        <div class="timeline__actions" style="display: flex; gap: 8px">
          <button class="text-btn" style="color: var(--warning)" onclick="handleVarReversal()">VAR</button>
          <button class="text-btn" onclick="matchState.undo()">Desfazer</button>
        </div>
      </div>
      <div class="timeline__content custom-scrollbar">
        ${events.length === 0 ? '<div class="timeline__empty">Aguardando início da partida...</div>' : ''}
        ${[...events].reverse().map((event) => {
          // Marcadores Delimitadores (PERIOD_START / PERIOD_END)
          if (event.type === 'PERIOD_START' || event.type === 'PERIOD_END') {
            return `
              <div class="timeline__marker">
                <span class="timeline__marker-label">${event.description}</span>
              </div>
            `;
          }

          const team = event.teamId === 'home' ? state.homeTeam : state.awayTeam;
          const isAnnulled = event.isAnnulled;
          const icon = getEventIcon(event.type);
          
          return `
            <div class="timeline__item ${isAnnulled ? 'timeline__item--annulled' : ''}">
              <div class="timeline__time-box" style="border-color: ${isAnnulled ? 'var(--text-muted)' : (team?.color || 'var(--accent)')}">
                ${event.minute}'
              </div>
              <div class="timeline__card">
                <div class="timeline__event-title">${icon} ${event.description}</div>
                <div class="timeline__event-detail">
                   ${matchState.formatEventType(event.type)} 
                   ${isAnnulled ? ' — <span style="color: var(--error)">🚫 LANCE ANULADO</span>' : ''}
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </aside>
  `;
}

function renderCommandBar(state) {
  return `
    <div class="command-bar">
      <button class="icon-btn icon-btn--xl ${state.isPaused ? 'icon-btn' : 'pulse'}" 
              style="background: ${state.isPaused ? 'var(--success)' : 'var(--warning)'}; color: white"
              onclick="matchState.handlePlayPauseToggle()">
        ${state.isPaused ? '▶' : '⏸'}
      </button>
      
      <div class="command-bar__group" style="border-left: 3px solid ${state.homeTeam.color}; border-right: 3px solid ${state.awayTeam.color}">
        <button class="icon-btn" id="micBtn" style="border: none; background: transparent">🎙️</button>
        <input 
          type="text" 
          id="commandInput" 
          class="command-bar__input" 
          placeholder="Narre o lance da partida..."
        />
        <button class="command-bar__submit" id="sendBtn">➤</button>
      </div>

      <button class="icon-btn" id="settingsBtn">⚙️</button>
    </div>
  `;
}

function renderPlayerLists(state) {
  return `
    <div class="player-grid">
      <div class="player-grid__team-title" style="color: ${state.homeTeam.color}">${state.homeTeam.name}</div>
      ${state.homeTeam.players.filter(p => p.isStarter).map(p => renderPlayerCell(p, state.homeTeam, 'home')).join('')}
    </div>
    <div class="player-grid">
      <div class="player-grid__team-title" style="color: ${state.awayTeam.color}">${state.awayTeam.name}</div>
      ${state.awayTeam.players.filter(p => p.isStarter).map(p => renderPlayerCell(p, state.awayTeam, 'away')).join('')}
    </div>
  `;
}

function renderPlayerCell(player, team, teamId) {
  return `
    <div class="player-row" style="display: contents" onclick="modalManager.showPlayerActions(${JSON.stringify(player).replace(/"/g, '&quot;')}, ${JSON.stringify(team).replace(/"/g, '&quot;')}, '${teamId}')">
      <div class="player-grid__cell player-grid__cell--num">${player.number}</div>
      <div class="player-grid__cell player-grid__cell--name">${player.name}</div>
      <div class="player-grid__cell player-grid__cell--status">T</div>
    </div>
  `;
}

function renderSettingsOverlay(state) {
  return `
    <div class="modal-overlay" id="settingsOverlay" style="position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 2000">
      <div class="modal" onclick="event.stopPropagation()" style="background: var(--bg-surface); padding: 40px; border-radius: var(--radius-xl); width: 100%; max-width: 440px; box-shadow: var(--shadow-overlay)">
        <h3 class="modal__title" style="text-align: center; margin-bottom: 32px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em">Painel Operacional</h3>
        <button class="w-full p-4 bg-slate-100 dark:bg-slate-800 rounded-xl mb-3 font-bold text-sm" onclick="modalManager.showSumula()">Editar Súmula / Regulamento</button>
        <button class="w-full p-4 bg-slate-100 dark:bg-slate-800 rounded-xl mb-3 font-bold text-sm" onclick="matchState.undo(); ui.isSettingsOpen=false;">Desfazer Última Ação</button>
        <div class="grid grid-cols-2 gap-3 mb-3">
           <button class="p-4 bg-blue-600 rounded-xl text-white font-bold text-[11px] uppercase" onclick="ui.isLightMode = !ui.isLightMode; render();">Tema</button>
           <button class="p-4 bg-indigo-600 rounded-xl text-white font-bold text-[11px] uppercase" onclick="handleGenerateReport()">Relatório IA</button>
        </div>
        <button class="w-full p-4 bg-red-600 rounded-xl text-white font-bold text-sm" onclick="if(confirm('Zerar partida?')) { matchState.handleReset(); ui.isSettingsOpen = false; }">Resetar Partida</button>
      </div>
    </div>
  `;
}

// --- Listeners de Eventos ---

function attachEventListeners() {
  document.getElementById('micBtn')?.addEventListener('click', () => voice.toggle());
  document.getElementById('settingsBtn')?.addEventListener('click', () => { ui.isSettingsOpen = true; render(); });
  document.getElementById('settingsOverlay')?.addEventListener('click', () => { ui.isSettingsOpen = false; render(); });

  const cmdInput = document.getElementById('commandInput');
  cmdInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') window.handleManualCommand(cmdInput);
  });
  document.getElementById('sendBtn')?.addEventListener('click', () => window.handleManualCommand(cmdInput));

  window.addEventListener('voiceStateChange', (e) => {
    const mic = document.getElementById('micBtn');
    if (mic) e.detail.isRecording ? mic.classList.add('pulse') : mic.classList.remove('pulse');
  });
}

function setViewMode(mode) { ui.viewMode = mode; render(); }
function toggleFullscreen() { ui.isFullscreen = !ui.isFullscreen; render(); }

function getEventIcon(type) {
  const map = { 'GOAL': '⚽', 'YELLOW_CARD': '🟨', 'RED_CARD': '🟥', 'SUBSTITUTION': '🔄', 'VAR': '📺' };
  return map[type] || '📍';
}

function handleAdvancePeriod() {
  const state = matchState.getState();
  if (state.period === '2T' || state.period === '2ET') {
    modalManager.open(`
      <div class="flex flex-col gap-3">
        <button class="w-full p-4 bg-blue-600 text-white rounded-xl text-xs font-bold uppercase" onclick="matchState.advancePeriod(); modalManager.close();">Prorrogação</button>
        <button class="w-full p-4 bg-indigo-600 text-white rounded-xl text-xs font-bold uppercase" onclick="handleStartPenalties(); modalManager.close();">Pênaltis</button>
        <button class="w-full p-4 bg-red-600 text-white rounded-xl text-xs font-bold uppercase" onclick="matchState.advancePeriod('FINISHED'); modalManager.close();">Encerrar</button>
      </div>
    `, 'Decisão');
  } else {
    matchState.advancePeriod();
  }
}

function handleStartPenalties() {
  modalManager.open(`
    <div class="flex flex-col gap-3">
      <div class="grid grid-cols-2 gap-3">
        <button class="p-4 bg-slate-100 dark:bg-slate-800 rounded-xl font-bold" onclick="matchState.setState({penaltyStarter: 'home', period: 'PENALTIES'}); modalManager.close();">${matchState.getState().homeTeam.shortName}</button>
        <button class="p-4 bg-slate-100 dark:bg-slate-800 rounded-xl font-bold" onclick="matchState.setState({penaltyStarter: 'away', period: 'PENALTIES'}); modalManager.close();">${matchState.getState().awayTeam.shortName}</button>
      </div>
    </div>
  `, 'Pênaltis');
}

function handleVarReversal() {
  const state = matchState.getState();
  const majorEvents = (state.events || []).filter(e => ['GOAL', 'YELLOW_CARD', 'RED_CARD'].includes(e.type));
  
  if (majorEvents.length === 0) {
    toastManager.show("VAR", "Nada a revisar", "info");
    return;
  }

  modalManager.open(`
    <div class="flex flex-col gap-2 max-h-[400px] overflow-y-auto custom-scrollbar">
      ${majorEvents.map(e => `
        <button class="p-4 bg-slate-100 dark:bg-slate-800 rounded-xl text-left flex justify-between items-center" onclick="matchState.annulEvent('${e.id}'); modalManager.close();">
          <div>
            <div class="font-bold text-sm text-white">${e.description}</div>
            <div class="text-[10px] text-slate-500 uppercase font-bold">${e.minute}' - ${matchState.formatEventType(e.type)}</div>
          </div>
          <span>${e.isAnnulled ? '✅' : '🚫'}</span>
        </button>
      `).join('')}
    </div>
  `, 'Revisão VAR');
}

async function handleGenerateReport() {
  const state = matchState.getState();
  const timeline = state.events.filter(e => !e.isAnnulled).map(e => `${e.minute}' - ${e.description}`).join('\n');
  try {
    toastManager.show("Gerando...", "Aguarde", "ai");
    const report = await generateMatchReport('', timeline);
    modalManager.open(`<div class="prose dark:prose-invert text-sm">${report.replace(/\n/g, '<br>')}</div>`, "Crônica IA");
  } catch (e) {
    toastManager.show("Erro", "Falha na IA", "error");
  }
}

// Inicializar
init();
