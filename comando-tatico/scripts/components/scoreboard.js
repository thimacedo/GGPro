/**
 * scoreboard.js — Componente: Placar + Cronômetro + Período
 */

import state from '../state.js';
import Clock from '../services/clock.js';
import { PERIOD_NAMES } from '../constants.js';

export function render() {
  const s = state.get();
  const t = Clock.getFormatted();
  const period = PERIOD_NAMES[s.match.period];
  const isLive = !s.match.isPaused && !['PRE', 'INTERVAL', 'FINISHED', 'PENALTIES'].includes(s.match.period);

  return `
    <header id="scoreboard" style="
      background:linear-gradient(180deg,#0d1520,#080e18);
      border-bottom:1px solid #1a2a3a;
      padding:12px 20px;
      display:flex; align-items:center; justify-content:center; gap:0;
      user-select:none;
    ">
      <!-- Home Team -->
      <div style="flex:1;text-align:right;padding-right:16px;">
        <div class="team-name-edit" data-team="home" style="
          font-size:16px;font-weight:900;text-transform:uppercase;
          letter-spacing:-0.5px;color:${s.homeTeam.color};cursor:pointer;
          transition:color 0.2s;
        ">${s.homeTeam.short}</div>
        <div style="font-size:9px;color:#4a6a8a;font-weight:700;text-transform:uppercase;">${s.homeTeam.formation}</div>
      </div>

      <!-- Score Boxes + Clock -->
      <div style="display:flex;align-items:center;gap:12px;">
        <div id="homeScore" style="
          width:48px;height:48px;border-radius:12px;
          display:flex;align-items:center;justify-content:center;
          font-size:24px;font-weight:900;color:#fff;
          background:${s.homeTeam.color};
          box-shadow:0 4px 20px ${s.homeTeam.color}44;
          transition:all 0.3s;
        ">${s.match.score.home}</div>

        <div style="text-align:center;min-width:90px;">
          <div style="font-size:9px;color:#4a6a8a;font-weight:700;letter-spacing:2px;text-transform:uppercase;">${period}</div>
          <div id="timerDisplay" style="
            font-size:28px;font-weight:900;font-family:'Courier New',monospace;
            letter-spacing:2px;color:#fff;margin:2px 0;
          ">
            ${t.minutes}<span class="${isLive ? 'pulse' : ''}" style="color:${isLive ? '#22c55e' : '#2a3a4a'};">:</span>${t.seconds}
          </div>
          <div style="display:flex;align-items:center;justify-content:center;gap:8px;">
            <button id="playPauseBtn" style="
              padding:2px 8px;border-radius:4px;border:none;
              background:transparent;color:${s.match.isPaused ? '#22c55e' : '#f59e0b'};
              font-size:12px;cursor:pointer;font-weight:900;
            " title="${s.match.isPaused ? 'Iniciar' : 'Pausar'}">
              ${s.match.isPaused ? '▶ INICIAR' : '⏸ PAUSAR'}
            </button>
            <button id="advancePeriodBtn" style="
              padding:2px 6px;border-radius:4px;border:none;
              background:transparent;color:#3a5a7a;
              font-size:10px;cursor:pointer;
            " title="Próximo período">▶▶</button>
          </div>
        </div>

        <div id="awayScore" style="
          width:48px;height:48px;border-radius:12px;
          display:flex;align-items:center;justify-content:center;
          font-size:24px;font-weight:900;color:#fff;
          background:${s.awayTeam.color};
          box-shadow:0 4px 20px ${s.awayTeam.color}44;
          transition:all 0.3s;
        ">${s.match.score.away}</div>
      </div>

      <!-- Away Team -->
      <div style="flex:1;text-align:left;padding-left:16px;">
        <div class="team-name-edit" data-team="away" style="
          font-size:16px;font-weight:900;text-transform:uppercase;
          letter-spacing:-0.5px;color:${s.awayTeam.color};cursor:pointer;
          transition:color 0.2s;
        ">${s.awayTeam.short}</div>
        <div style="font-size:9px;color:#4a6a8a;font-weight:700;text-transform:uppercase;">${s.awayTeam.formation}</div>
      </div>
    </header>
  `;
}
