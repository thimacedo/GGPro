/**
 * Narrador Pro - main.js (Versão Integral Refatorada)
 * Foco: Rebranding, UI/UX, Padronização Técnica e Lógica Reativa.
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

// --- Sistema de Tempo (Modularizado) ---
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
  // Subscrever ao estado global para re-renderizar a UI
  matchState.subscribe(() => render());
  
  // Ciclo de atualização do cronômetro (apenas DOM, desacoplado da lógica de estado)
  setInterval(() => {
    const state = matchState.getState();
    if (!state.isPaused && !['PENALTIES', 'FINISHED', 'HALFTIME'].includes(state.period)) {
      const timerEl = document.getElementById('timerDisplay');
      if (timerEl) {
        timerEl.textContent = timerService.getFormattedTime(state);
      }
    }
  }, 100);

  // Handlers Globais para disparos via HTML (onclick)
  window.handleVarReversal = handleVarReversal;
  window.setViewMode = setViewMode;
  window.toggleFullscreen = toggleFullscreen;
  window.handleAdvancePeriod = handleAdvancePeriod;
  window.handleStartPenalties = handleStartPenalties;
  window.handleGenerateReport = handleGenerateReport;
  window.handleManualCommand = (input) => { 
    if (!input.value.trim()) return;
    voice.processCommand(input.value);
    input.value = '';
  };
  
  // Render inicial
  render();
}

// --- Funções de Renderização (BEM & Design System) ---

function render() {
  const app = document.getElementById('app');
  if (!app) return;

  const state = matchState.getState();
  document.body.className = ui.isLightMode ? 'claro' : 'dark-mode';

  app.innerHTML = `
    <!-- Header: Scoreboard Centralizado -->
    ${renderScoreboard(state)}

    <!-- Layout Principal Grid -->
    <main class="main-content">
      <!-- Painel de Visualização (Mapa ou Lista) -->
      <section class="view-panel">
        <div class="view-panel__controls">
          <div class="tabs">
            <button class="tabs__btn ${ui.viewMode === 'list' ? 'tabs__btn--active' : ''}" onclick="setViewMode('list')">Escalação</button>
            <button class="tabs__btn ${ui.viewMode === 'field' ? 'tabs__btn--active' : ''}" onclick="setViewMode('field')">Mapa Tático</button>
          </div>
          <button class="icon-btn" onclick="toggleFullscreen()">${ui.isFullscreen ? 'Sair Fullscreen' : 'Tela Cheia'}</button>
        </div>

        <div class="view-panel__display custom-scrollbar">
          ${ui.activeTab === 'main' 
            ? (ui.viewMode === 'field' ? fieldManager.render(state, ui.isFullscreen) : renderPlayerLists(state))
            : statsManager.render(state)
          }
        </div>
      </section>

      <!-- Painel de Cronologia Lateral -->
      ${renderTimeline(state)}
    </main>

    <!-- Barra de Comando Flutuante -->
    ${renderCommandBar(state)}

    <!-- Overlay de Configurações -->
    ${ui.isSettingsOpen ? renderSettingsOverlay(state) : ''}
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
          <h2 class="scoreboard__name">${state.homeTeam.shortName}</h2>
          <span class="scoreboard__formation">${state.homeTeam.formation}</span>
        </div>
        <div class="scoreboard__score" style="background-color: ${state.homeTeam.color}">${goalsHome}</div>
        ${state.period === 'PENALTIES' ? `<div class="scoreboard__penalties">(${state.penaltyScore?.home || 0})</div>` : ''}
      </div>

      <div class="scoreboard__center">
        <span class="scoreboard__period">${matchState.formatPeriodName(state.period)}</span>
        <div id="timerDisplay" class="scoreboard__timer">${timerService.getFormattedTime(state)}</div>
        <button class="scoreboard__next" onclick="handleAdvancePeriod()">AVANÇAR FASE ➔</button>
      </div>

      <div class="scoreboard__team scoreboard__team--away" onclick="modalManager.showEditTeam(matchState.getState().awayTeam, 'away')">
        ${state.period === 'PENALTIES' ? `<div class="scoreboard__penalties">(${state.penaltyScore?.away || 0})</div>` : ''}
        <div class="scoreboard__score" style="background-color: ${state.awayTeam.color}">${goalsAway}</div>
        <div class="scoreboard__info">
          <h2 class="scoreboard__name">${state.awayTeam.shortName}</h2>
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
        <h3 class="timeline__title">Eventos da Partida</h3>
        <div class="timeline__actions">
          <button class="text-btn text-btn--amber" onclick="handleVarReversal()">VAR</button>
          <button class="text-btn" onclick="matchState.undo()">Desfazer</button>
        </div>
      </div>
      <div class="timeline__content custom-scrollbar">
        ${events.length === 0 ? '<div class="timeline__empty">Aguardando início do jogo...</div>' : ''}
        ${[...events].reverse().map((event) => {
          // Renderização diferenciada para Marcadores de Início/Fim
          if (event.type === 'PERIOD_START' || event.type === 'PERIOD_END') {
            return `
              <div class="timeline__marker">
                <span class="timeline__marker-badge">${event.description}</span>
              </div>
            `;
          }

          const team = event.teamId === 'home' ? state.homeTeam : state.awayTeam;
          const isAnnulled = event.isAnnulled;
          const icon = getEventIcon(event.type);
          
          return `
            <div class="timeline__item ${isAnnulled ? 'timeline__item--annulled' : ''}">
              <div class="timeline__icon-wrap" style="border-color: ${isAnnulled ? 'var(--text-muted)' : (team?.color || 'var(--accent)')}">
                ${icon}
              </div>
              <div class="timeline__card">
                <div class="timeline__time">${event.minute}'</div>
                <div class="timeline__desc">${event.description}</div>
                <div class="timeline__player">
                   ${matchState.formatEventType(event.type)} 
                   ${isAnnulled ? ' — <span style="color: var(--error)">🚫 ANULADO</span>' : ''}
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
      <button class="icon-btn icon-btn--xl ${state.isPaused ? 'icon-btn--success' : 'icon-btn--warning'}" id="playPauseBottom">
        ${state.isPaused ? '▶' : '⏸'}
      </button>
      
      <div class="command-bar__group">
        <button class="icon-btn" id="micBtn">🎙️</button>
        <input 
          type="text" 
          id="commandInput" 
          class="command-bar__input" 
          placeholder="Narre p/ o Gemini (ex: 'Gol do 9')..."
        />
        <button class="command-bar__btn" id="sendBtn">➤</button>
      </div>

      <button class="icon-btn" id="settingsBtn">⚙️</button>
    </div>
  `;
}

function renderPlayerLists(state) {
  return `
    <div class="players">
      <div class="players__team">
        <h4 class="players__team-title" style="color: ${state.homeTeam.color}">
          ${state.homeTeam.name}
        </h4>
        <div class="players__grid">
          ${state.homeTeam.players.filter(p => p.isStarter).map(p => renderPlayerRow(p, state.homeTeam, 'home')).join('')}
        </div>
      </div>
      <div class="players__team">
        <h4 class="players__team-title" style="color: ${state.awayTeam.color}">
          ${state.awayTeam.name}
        </h4>
        <div class="players__grid">
          ${state.awayTeam.players.filter(p => p.isStarter).map(p => renderPlayerRow(p, state.awayTeam, 'away')).join('')}
        </div>
      </div>
    </div>
  `;
}

function renderPlayerRow(player, team, teamId) {
  return `
    <div class="player-row" onclick="modalManager.showPlayerActions(${JSON.stringify(player).replace(/"/g, '&quot;')}, ${JSON.stringify(team).replace(/"/g, '&quot;')}, '${teamId}')">
      <span class="player-row__num">${player.number}</span>
      <span class="player-row__name">${player.name}</span>
      <span class="player-row__status">T</span>
    </div>
  `;
}

function renderSettingsOverlay(state) {
  return `
    <div class="modal-overlay" id="settingsOverlay">
      <div class="modal" onclick="event.stopPropagation()">
        <h3 class="modal__title">Menu Principal</h3>
        <button class="w-full p-4 bg-slate-100 dark:bg-slate-800 rounded-xl mb-3 font-bold text-sm" onclick="modalManager.showSumula()">Editar Súmula e Regulamento</button>
        <button class="w-full p-4 bg-slate-100 dark:bg-slate-800 rounded-xl mb-3 font-bold text-sm" onclick="matchState.undo(); ui.isSettingsOpen=false;">Desfazer Última Ação</button>
        <div class="grid grid-cols-2 gap-3 mb-3">
           <button class="p-4 bg-blue-600 rounded-xl text-white font-bold text-[10px] uppercase" onclick="ui.isLightMode = !ui.isLightMode; render();">Alternar Tema</button>
           <button class="p-4 bg-indigo-600 rounded-xl text-white font-bold text-[10px] uppercase" onclick="handleGenerateReport()">Gerar Crônica IA</button>
        </div>
        <button class="w-full p-4 bg-red-600 rounded-xl text-white font-bold text-sm" onclick="if(confirm('Deseja resetar toda a partida?')) { matchState.handleReset(); ui.isSettingsOpen = false; }">Zerar Partida</button>
      </div>
    </div>
  `;
}

// --- Listeners e Auxiliares ---

function attachEventListeners() {
  document.getElementById('playPauseBottom')?.addEventListener('click', () => matchState.handlePlayPauseToggle());
  document.getElementById('micBtn')?.addEventListener('click', () => voice.toggle());
  document.getElementById('settingsBtn')?.addEventListener('click', () => { ui.isSettingsOpen = true; render(); });
  document.getElementById('settingsOverlay')?.addEventListener('click', () => { ui.isSettingsOpen = false; render(); });

  const cmdInput = document.getElementById('commandInput');
  cmdInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleManualCommand(cmdInput);
  });
  document.getElementById('sendBtn')?.addEventListener('click', () => handleManualCommand(cmdInput));

  window.addEventListener('voiceStateChange', (e) => {
    const mic = document.getElementById('micBtn');
    if (mic) e.detail.isRecording ? mic.classList.add('pulse') : mic.classList.remove('pulse');
  });
}

function setViewMode(mode) { ui.viewMode = mode; render(); }
function toggleFullscreen() { ui.isFullscreen = !ui.isFullscreen; render(); }

function getEventIcon(type) {
  switch (type) {
    case 'GOAL': return '⚽';
    case 'YELLOW_CARD': return '🟨';
    case 'RED_CARD': return '🟥';
    case 'SUBSTITUTION': return '🔄';
    case 'VAR': return '📺';
    default: return '📍';
  }
}

function handleAdvancePeriod() {
  const state = matchState.getState();
  if (state.period === '2T' || state.period === '2ET') {
    const goalsHome = state.events.filter(e => e.type === 'GOAL' && e.teamId === 'home' && !e.isAnnulled).length;
    const goalsAway = state.events.filter(e => e.type === 'GOAL' && e.teamId === 'away' && !e.isAnnulled).length;

    modalManager.open(`
      <div class="flex flex-col gap-3">
        <p class="text-xs text-slate-500">O jogo está atualmente ${goalsHome}x${goalsAway}.</p>
        <button class="w-full p-4 bg-blue-600 text-white rounded-xl text-xs font-bold uppercase" onclick="matchState.advancePeriod(); modalManager.close();">Ir para Prorrogação</button>
        <button class="w-full p-4 bg-indigo-600 text-white rounded-xl text-xs font-bold uppercase" onclick="handleStartPenalties(); modalManager.close();">Decisão por Pênaltis</button>
        <button class="w-full p-4 bg-red-600 text-white rounded-xl text-xs font-bold uppercase" onclick="matchState.advancePeriod('FINISHED'); modalManager.close();">Finalizar Jogo</button>
      </div>
    `, 'Próxima Fase');
  } else {
    matchState.advancePeriod();
    toastManager.show("Sistema", "Período atualizado com sucesso.", "info");
  }
}

function handleStartPenalties() {
  modalManager.open(`
    <div class="flex flex-col gap-3">
      <p class="text-xs text-slate-500">Selecione quem inicia a cobrança:</p>
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
    toastManager.show("VAR", "Não há eventos passíveis de revisão.", "info");
    return;
  }

  modalManager.open(`
    <div class="flex flex-col gap-2 max-h-[400px] overflow-y-auto custom-scrollbar">
      ${majorEvents.map(e => `
        <button class="p-4 bg-slate-100 dark:bg-slate-800 rounded-xl text-left flex justify-between items-center" onclick="matchState.annulEvent('${e.id}'); modalManager.close();">
          <div>
            <div class="font-bold text-sm">${e.description}</div>
            <div class="text-[10px] text-slate-500 uppercase font-bold">${e.minute}' - ${matchState.formatEventType(e.type)}</div>
          </div>
          <span style="font-size: 20px">${e.isAnnulled ? '✅' : '🚫'}</span>
        </button>
      `).join('')}
    </div>
  `, 'Revisão VAR');
}

async function handleGenerateReport() {
  const state = matchState.getState();
  const timeline = state.events.filter(e => !e.isAnnulled).map(e => `${e.minute}' - ${e.description}`).join('\n');
  try {
    toastManager.show("AI", "O Gemini está redigindo a crônica da partida...", "ai");
    const report = await generateMatchReport('', timeline);
    modalManager.open(`<div class="prose dark:prose-invert text-sm" style="line-height: 1.8">${report.replace(/\n/g, '<br>')}</div>`, "Relatório Final da Partida");
  } catch (e) {
    toastManager.show("Erro", "Erro ao conectar com o Gemini AI.", "error");
  }
}

// Início
init();
