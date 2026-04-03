/**
 * Narrador Pro - main.js (Refatoração UI/UX Avançada)
 * Integração de Feed Style Timeline, Match Details (La Liga) e Modais com IA.
 */

import matchState from './state.js';
import { toastManager } from './components/toasts.js';
import { modalManager, showMatchSettings } from './components/modals.js';
import { fieldManager } from './components/field.js';
import { statsManager } from './components/stats.js';
import { renderMatchDetails } from './components/details.js';
import { renderTimeline } from './components/timeline.js';
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

// --- Serviço de Tempo ---
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
  
  // Timer de alta precisão
  setInterval(() => {
    if (!matchState.getState().isPaused) {
      const timerEl = document.getElementById('timerDisplay');
      if (timerEl) timerEl.textContent = timerService.getFormattedTime(matchState.getState());
    }
  }, 100);

  // Handlers Globais
  window.handleVarReversal = handleVarReversal;
  window.setViewMode = setViewMode;
  window.toggleFullscreen = toggleFullscreen;
  window.handleAdvancePeriod = handleAdvancePeriod;
  window.addToast = (t, m, ty) => toastManager.show(t, m, ty);
  window.render = render; // Expor render para chamadas externas

  render();
}

function render() {
  const app = document.getElementById('app');
  if (!app) return;

  const state = matchState.getState();
  document.body.className = ui.isLightMode ? 'claro' : 'dark-mode';

  app.innerHTML = `
    <div class="app-container">
      ${renderScoreboard(state)}

      <main class="main-content">
        <!-- Painel de Visualização -->
        <section class="view-panel">
          <div class="view-panel__controls" style="display: flex; justify-content: space-between; padding-bottom: 12px">
            <div class="tabs">
              <button class="tabs__btn ${ui.viewMode === 'list' ? 'tabs__btn--active' : ''}" onclick="setViewMode('list')">Escalação</button>
              <button class="tabs__btn ${ui.viewMode === 'field' ? 'tabs__btn--active' : ''}" onclick="setViewMode('field')">Tática</button>
            </div>
            <button class="icon-btn" onclick="toggleFullscreen()">📺</button>
          </div>

          <div class="view-panel__display custom-scrollbar">
            ${ui.viewMode === 'field' ? fieldManager.render(state, ui.isFullscreen) : renderPlayerLists(state)}
          </div>
        </section>

        <!-- Sidebar: Detalhes e Cronologia -->
        <aside class="timeline">
          <div id="details-container"></div>
          
          <div class="timeline__header">
            <h3 class="timeline__title">Cronologia Direta</h3>
            <div style="display: flex; gap: 12px">
               <button class="text-btn" style="color: var(--warning)" onclick="handleVarReversal()">VAR</button>
               <button class="text-btn" onclick="matchState.undo()">⬅</button>
            </div>
          </div>
          <div class="timeline__content custom-scrollbar" id="timeline-container">
             ${state.events.length === 0 ? '<div class="timeline__empty">Aguardando início...</div>' : ''}
          </div>
        </aside>
      </main>

      <!-- Command Bar -->
      ${renderCommandBar(state)}
    </div>
  `;

  // Renderizar Sub-Componentes
  renderMatchDetails(state, 'details-container');
  renderTimeline(state.events, (id) => findPlayer(id, state), 'timeline-container');

  attachEventListeners();
}

function findPlayer(id, state) {
  const allPlayers = [...state.homeTeam.players, ...state.awayTeam.players];
  return allPlayers.find(p => p.id === id);
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
      </div>

      <div class="scoreboard__center">
        <span class="scoreboard__period">${matchState.formatPeriodName(state.period)}</span>
        <div id="timerDisplay" class="scoreboard__timer">${timerService.getFormattedTime(state)}</div>
        <button class="scoreboard__next" onclick="handleAdvancePeriod()">PRÓXIMA FASE ➔</button>
      </div>

      <div class="scoreboard__team scoreboard__team--away" onclick="modalManager.showEditTeam(matchState.getState().awayTeam, 'away')">
        <div class="scoreboard__score-badge">${goalsAway}</div>
        <div class="scoreboard__info">
          <h2 class="scoreboard__name" style="color: ${state.awayTeam.color}">${state.awayTeam.shortName}</h2>
          <span class="scoreboard__formation">${state.awayTeam.formation}</span>
        </div>
      </div>
    </header>
  `;
}

function renderCommandBar(state) {
  return `
    <div class="command-bar">
      <button class="icon-btn icon-btn--xl ${state.isPaused ? '' : 'pulse'}" 
              style="background: ${state.isPaused ? 'var(--success)' : 'var(--warning)'}; color: white; border: none; border-radius: 50%; width: 56px; height: 56px; cursor: pointer"
              onclick="matchState.handlePlayPauseToggle()">
        ${state.isPaused ? '▶' : '⏸'}
      </button>
      
      <div class="command-bar__group" style="border-left: 3px solid ${state.homeTeam.color}; border-right: 3px solid ${state.awayTeam.color}">
        <button class="icon-btn" id="micBtn" style="border: none; background: transparent; font-size: 1.5rem; cursor: pointer">🎙️</button>
        <input type="text" id="commandInput" class="command-bar__input" placeholder="Narre o lance da partida..."/>
        <button class="command-bar__submit" onclick="handleManualSubmit()">➤</button>
      </div>

      <button class="icon-btn" style="border: none; background: var(--bg-surface); border-radius: 50%; width: 44px; height: 44px; cursor: pointer" onclick="handleOpenSettings()">⚙️</button>
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
      <div class="player-grid__cell" style="font-weight: 800">${player.number}</div>
      <div class="player-grid__cell">${player.name}</div>
      <div class="player-grid__cell" style="color: var(--text-muted); font-size: 0.7rem">TIT</div>
    </div>
  `;
}

// --- Handlers ---
window.handleOpenSettings = () => {
  const state = matchState.getState();
  showMatchSettings(state.homeTeam, state.awayTeam);
};

window.handleManualSubmit = () => {
  const input = document.getElementById('commandInput');
  if (input && input.value.trim()) {
    voice.processCommand(input.value);
    input.value = '';
  }
};

function attachEventListeners() {
  const input = document.getElementById('commandInput');
  input?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') window.handleManualSubmit();
  });
  document.getElementById('micBtn')?.addEventListener('click', () => voice.toggle());
}

function setViewMode(mode) { ui.viewMode = mode; render(); }
function toggleFullscreen() { ui.isFullscreen = !ui.isFullscreen; render(); }

function handleAdvancePeriod() {
  matchState.advancePeriod();
}

function handleVarReversal() {
  const state = matchState.getState();
  const majorEvents = state.events.filter(e => ['GOAL', 'YELLOW_CARD', 'RED_CARD'].includes(e.type));
  if (majorEvents.length === 0) return toastManager.show("VAR", "Nada a revisar", "info");

  const content = `
    <div class="flex flex-col gap-2">
      ${majorEvents.map(e => `
        <button class="btn-block btn-block--outline text-left flex justify-between items-center" onclick="matchState.annulEvent('${e.id}'); modalManager.close();">
          <span>${e.description} (${e.minute}')</span>
          <span>${e.isAnnulled ? '✅' : '🚫'}</span>
        </button>
      `).join('')}
    </div>
  `;
  modalManager.open(content, "Revisão VAR");
}

init();
