/**
 * app.js — Orquestrador Principal
 * Conecta componentes, serviços e renderiza a UI
 */

import state from './state.js';
import Clock from './services/clock.js';
import Commander from './services/commander.js';
import Engine from './services/matchEngine.js';
import { FORMATIONS, INSTRUCTIONS, MARKINGS, QUICK_EVENTS } from './constants.js';

import { render as renderScoreboard } from './components/scoreboard.js';
import { render as renderField, setupDrag } from './components/field.js';
import { render as renderTimeline } from './components/timeline.js';
import { render as renderStats } from './components/stats.js';
import Toasts from './components/toasts.js';
import { showVarPanel, showEndGameOptions, showSettings } from './components/modals.js';
import { render as renderCommandBar, attachEvents as attachCommandBar } from './components/commandBar.js';

// =============================================
// UI State
// =============================================
const ui = {
  activeTab:    'match',
  fieldTeam:    'home',
  selectedPlayer: null,
  settingsOpen: false
};

// =============================================
// Root Render
// =============================================
function render() {
  const s = state.get();
  const root = document.getElementById('root');
  if (!root) return;

  root.innerHTML = `
    <div id="app" style="
      height:100vh;display:flex;flex-direction:column;
      background:#070b14;color:#e0e0e0;
      font-family:'Segoe UI',system-ui,sans-serif;
      overflow:hidden;
    ">
      ${renderScoreboard()}
      ${renderTabBar(s)}
      <main style="flex:1;overflow-y:auto;padding:0 16px 100px;">
        <div style="max-width:1200px;margin:0 auto;">
          ${ui.activeTab === 'match'  ? renderMatchTab(s)  : ''}
          ${ui.activeTab === 'stats'  ? renderStats()        : ''}
          ${ui.activeTab === 'report' ? renderReportTab(s)   : ''}
        </div>
      </main>
      ${renderCommandBar()}
    </div>
    <style>
      @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
      .pulse { animation: pulse 1s infinite; }
      @keyframes toastIn { from{opacity:0;transform:translateY(-10px)} to{opacity:1;transform:translateY(0)} }
      @keyframes modalIn { from{opacity:0;transform:translate(-50%,-50%) scale(0.95)} to{opacity:1;transform:translate(-50%,-50%) scale(1)} }
      ::-webkit-scrollbar{width:6px} ::-webkit-scrollbar-track{background:transparent} ::-webkit-scrollbar-thumb{background:#1a2a3a;border-radius:3px}
    </style>
  `;

  attachGlobalEvents(s);
  setupDrag((playerId) => { ui.selectedPlayer = playerId; });
}

// =============================================
// Tab Bar
// =============================================
function renderTabBar(s) {
  const tabs = [
    { id: 'match',  label: '⚽ PARTIDA' },
    { id: 'stats',  label: '📊 ESTATÍSTICAS' },
    { id: 'report', label: '📄 RELATÓRIO' }
  ];
  return `<div style="display:flex;justify-content:center;gap:4px;padding:12px 16px 0;">
    ${tabs.map(t => `
      <button class="tab-btn" data-tab="${t.id}" style="
        padding:8px 20px;border-radius:10px;border:none;
        font-size:11px;font-weight:800;letter-spacing:1px;cursor:pointer;
        background:${ui.activeTab === t.id ? '#1e90ff' : '#111c2a'};
        color:${ui.activeTab === t.id ? '#fff' : '#4a6a8a'};
        transition:all 0.2s;
      ">${t.label}</button>
    `).join('')}
  </div>`;
}

// =============================================
// Match Tab
// =============================================
function renderMatchTab(s) {
  return `
    <div style="display:grid;grid-template-columns:1fr 340px;gap:16px;margin-top:16px;height:calc(100vh - 220px);">
      <div style="display:flex;flex-direction:column;gap:12px;min-height:0;">
        ${renderTeamSelector(s)}
        ${renderField(ui.fieldTeam, ui.selectedPlayer)}
        ${renderQuickActions()}
      </div>
      ${renderTimeline()}
    </div>
  `;
}

function renderTeamSelector(s) {
  return `
    <div style="display:flex;gap:4px;">
      <button class="field-team-btn" data-team="home" style="
        flex:1;padding:10px;border-radius:10px;
        border:1px solid ${ui.fieldTeam === 'home' ? s.homeTeam.color + '66' : '#1a2a3a'};
        background:${ui.fieldTeam === 'home' ? s.homeTeam.color + '22' : '#111c2a'};
        color:${ui.fieldTeam === 'home' ? s.homeTeam.color : '#4a6a8a'};
        font-weight:800;font-size:11px;cursor:pointer;text-transform:uppercase;letter-spacing:1px;
        transition:all 0.2s;
      ">${s.homeTeam.name}</button>
      <button class="field-team-btn" data-team="away" style="
        flex:1;padding:10px;border-radius:10px;
        border:1px solid ${ui.fieldTeam === 'away' ? s.awayTeam.color + '66' : '#1a2a3a'};
        background:${ui.fieldTeam === 'away' ? s.awayTeam.color + '22' : '#111c2a'};
        color:${ui.fieldTeam === 'away' ? s.awayTeam.color : '#4a6a8a'};
        font-weight:800;font-size:11px;cursor:pointer;text-transform:uppercase;letter-spacing:1px;
        transition:all 0.2s;
      ">${s.awayTeam.name}</button>
    </div>
  `;
}

function renderQuickActions() {
  const colorMap = {
    GOAL: '#22c55e', YELLOW_CARD: '#eab308', RED_CARD: '#ef4444', FOUL: '#f97316',
    SHOT: '#a855f7', CORNER: '#06b6d4', PENALTY: '#f59e0b', OFFSIDE: '#64748b',
    SAVE: '#14b8a6', WOODWORK: '#78716c'
  };
  const labelMap = {
    GOAL: '⚽ Gol', YELLOW_CARD: '🟨 Amarelo', RED_CARD: '🟥 Vermelho', FOUL: '🛑 Falta',
    SHOT: '🎯 Finalização', CORNER: '🚩 Escanteio', PENALTY: '💥 Pênalti', OFFSIDE: '📏 Impedimento',
    SAVE: '🧤 Defesa', WOODWORK: '🪵 Trave'
  };

  return `
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(95px,1fr));gap:6px;">
      ${QUICK_EVENTS.map(type => {
        const c = colorMap[type] || '#64748b';
        return `
          <button class="quick-event-btn" data-type="${type}" style="
            padding:10px;border-radius:10px;
            border:1px solid ${c}33;background:${c}11;
            color:${c};font-weight:800;font-size:10px;cursor:pointer;
            text-transform:uppercase;transition:all 0.2s;
          ">${labelMap[type]}</button>
        `;
      }).join('')}
    </div>
  `;
}

// =============================================
// Report Tab
// =============================================
function renderReportTab(s) {
  const events = s.match.events.filter(e => !e.isAnnulled);
  const goals = events.filter(e => e.type === 'GOAL');
  const yellows = events.filter(e => e.type === 'YELLOW_CARD');
  const reds = events.filter(e => e.type === 'RED_CARD');
  const subs = events.filter(e => e.type === 'SUBSTITUTION');
  const other = events.filter(e => !['GOAL','YELLOW_CARD','RED_CARD','SUBSTITUTION','PERIOD_START','PERIOD_END','GENERIC','VAR'].includes(e.type));

  let report = `⚽ RELATÓRIO DA PARTIDA\n${'═'.repeat(40)}\n\n`;
  report += `🏟 ${s.details.competition || 'Competição não informada'}\n`;
  report += `📍 ${s.details.stadium || 'Estádio não informado'}\n`;
  report += `📅 ${s.details.date || new Date().toLocaleDateString('pt-BR')}\n`;
  report += `👨‍💼 Árbitro: ${s.details.referee || 'Não informado'}\n\n`;
  report += `${s.homeTeam.name.toUpperCase()} ${s.match.score.home} × ${s.match.score.away} ${s.awayTeam.name.toUpperCase()}\n`;
  if (s.match.period === 'PENALTIES') report += `(Pênaltis: ${s.match.penaltyScore.home} × ${s.match.penaltyScore.away})\n`;
  report += `\n`;
  if (goals.length) { report += `⚽ GOLS:\n`; goals.forEach(g => report += `  ${g.minute}' — ${g.description}\n`); report += `\n`; }
  if (yellows.length) { report += `🟨 AMARELOS:\n`; yellows.forEach(c => report += `  ${c.minute}' — ${c.description}\n`); report += `\n`; }
  if (reds.length) { report += `🟥 VERMELHOS:\n`; reds.forEach(c => report += `  ${c.minute}' — ${c.description}\n`); report += `\n`; }
  if (subs.length) { report += `🔄 SUBSTITUIÇÕES:\n`; subs.forEach(su => report += `  ${su.minute}' — ${su.description}\n`); report += `\n`; }
  if (other.length) { report += `📋 OUTROS:\n`; other.forEach(o => report += `  ${o.minute}' — ${o.description}\n`); }

  window.__reportText = report;

  return `
    <div style="max-width:600px;margin:24px auto;">
      <div style="background:#0d1520;border-radius:16px;border:1px solid #1a2a3a;padding:24px;">
        <div style="font-size:10px;font-weight:800;color:#4a6a8a;letter-spacing:2px;text-transform:uppercase;margin-bottom:16px;text-align:center;">📄 RELATÓRIO DA PARTIDA</div>
        <pre style="
          font-family:'Courier New',monospace;font-size:12px;color:#a0b0c0;
          background:#080e18;padding:16px;border-radius:10px;
          white-space:pre-wrap;max-height:400px;overflow-y:auto;border:1px solid #1a2a3a;
        ">${report}</pre>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:16px;">
          <button id="copyReportBtn" style="padding:12px;border-radius:10px;border:none;background:#1e90ff;color:#fff;font-weight:800;font-size:11px;cursor:pointer;">📋 COPIAR</button>
          <button id="downloadReportBtn" style="padding:12px;border-radius:10px;border:none;background:#22c55e;color:#fff;font-weight:800;font-size:11px;cursor:pointer;">💾 SALVAR .TXT</button>
        </div>
      </div>
    </div>
  `;
}

// =============================================
// Event Binding
// =============================================
function attachGlobalEvents(s) {
  // Tabs
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => { ui.activeTab = btn.dataset.tab; render(); });
  });

  // Field team switcher
  document.querySelectorAll('.field-team-btn').forEach(btn => {
    btn.addEventListener('click', () => { ui.fieldTeam = btn.dataset.team; render(); });
  });

  // Quick event buttons
  document.querySelectorAll('.quick-event-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.dataset.type;
      if (ui.selectedPlayer) {
        let result;
        if (type === 'GOAL') result = Engine.goal(ui.fieldTeam, ui.selectedPlayer);
        else if (type === 'YELLOW_CARD') result = Engine.yellowCard(ui.fieldTeam, ui.selectedPlayer);
        else if (type === 'RED_CARD') result = Engine.redCard(ui.fieldTeam, ui.selectedPlayer);
        else result = Engine.simpleEvent(type, ui.fieldTeam, ui.selectedPlayer);
        if (result) Toasts.show(result.ok ? '✅' : '❌', result.msg, result.type || 'info');
      } else {
        Toasts.show('ℹ️', 'Selecione um jogador no campo primeiro', 'info');
      }
    });
  });

  // Scoreboard buttons
  document.getElementById('playPauseBtn')?.addEventListener('click', () => Clock.togglePause());
  document.getElementById('advancePeriodBtn')?.addEventListener('click', () => {
    const period = s.match.period;
    if (period === '2T' || period === '2ET') showEndGameOptions();
    else Clock.advancePeriod();
  });

  // Team name edit (click on name in scoreboard)
  document.querySelectorAll('.team-name-edit').forEach(el => {
    el.addEventListener('click', () => showSettings());
  });

  // Timeline buttons
  document.getElementById('varBtn')?.addEventListener('click', showVarPanel);
  document.getElementById('undoBtn')?.addEventListener('click', () => {
    if (state.undo()) Toasts.show('↩️', 'Evento desfeito', 'info');
    else Toasts.show('ℹ️', 'Nada para desfazer', 'info');
  });

  // Command bar
  attachCommandBar();

  // Settings button
  document.getElementById('settingsBtn')?.addEventListener('click', showSettings);

  // Report buttons
  document.getElementById('copyReportBtn')?.addEventListener('click', () => {
    if (window.__reportText) {
      navigator.clipboard.writeText(window.__reportText);
      Toasts.show('📋', 'Relatório copiado!', 'success');
    }
  });
  document.getElementById('downloadReportBtn')?.addEventListener('click', () => {
    if (!window.__reportText) return;
    const blob = new Blob([window.__reportText], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `relatorio_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    Toasts.show('💾', 'Salvo!', 'success');
  });
}

// =============================================
// Boot
// =============================================
state.subscribe(() => render());
render();
