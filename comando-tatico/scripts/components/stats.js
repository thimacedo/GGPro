/**
 * stats.js — Componente: KPIs Comparativos em Tempo Real
 * Barras visuais comparando home vs away
 */

import state from '../state.js';
import { INSTRUCTIONS, EVENT_TYPES } from '../constants.js';

export function render() {
  const s = state.get();
  const events = s.match.events.filter(e => !e.isAnnulled);
  const homeEvents = events.filter(e => e.teamId === 'home');
  const awayEvents = events.filter(e => e.teamId === 'away');

  const count = (arr, type) => arr.filter(e => e.type === type).length;

  const homeShots = count(homeEvents, 'SHOT') + s.homeTeam.players.filter(p => p.isStarter).reduce((a, p) => a + p.stats.shots, 0);
  const awayShots = count(awayEvents, 'SHOT') + s.awayTeam.players.filter(p => p.isStarter).reduce((a, p) => a + p.stats.shots, 0);
  const homeSaves = count(homeEvents, 'SAVE') + s.homeTeam.players.filter(p => p.isStarter).reduce((a, p) => a + p.stats.saves, 0);
  const awaySaves = count(awayEvents, 'SAVE') + s.awayTeam.players.filter(p => p.isStarter).reduce((a, p) => a + p.stats.saves, 0);

  const stats = [
    { label: 'Gols',           hv: s.match.score.home, av: s.match.score.away },
    { label: 'Finalizações',   hv: homeShots,          av: awayShots },
    { label: 'Escanteios',     hv: count(homeEvents, 'CORNER'),   av: count(awayEvents, 'CORNER') },
    { label: 'Faltas',         hv: count(homeEvents, 'FOUL'),     av: count(awayEvents, 'FOUL') },
    { label: 'Amarelos',       hv: count(homeEvents, 'YELLOW_CARD'), av: count(awayEvents, 'YELLOW_CARD') },
    { label: 'Vermelhos',      hv: count(homeEvents, 'RED_CARD'), av: count(awayEvents, 'RED_CARD') },
    { label: 'Impedimentos',   hv: count(homeEvents, 'OFFSIDE'), av: count(awayEvents, 'OFFSIDE') },
    { label: 'Defesas',        hv: homeSaves, av: awaySaves },
  ];

  return `
    <div style="max-width:500px;margin:24px auto;">
      <!-- Header -->
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;">
        <span style="font-size:14px;font-weight:900;color:${s.homeTeam.color};">${s.homeTeam.short}</span>
        <span style="font-size:10px;font-weight:800;color:#4a6a8a;letter-spacing:2px;text-transform:uppercase;">ESTATÍSTICAS</span>
        <span style="font-size:14px;font-weight:900;color:${s.awayTeam.color};">${s.awayTeam.short}</span>
      </div>

      <!-- Stat Bars -->
      ${stats.map(({ label, hv, av }) => statBar(label, hv, av, s)).join('')}

      <!-- Tactical Panel -->
      <div style="margin-top:24px;padding:16px;background:#111c2a;border-radius:12px;border:1px solid #1a2a3a;">
        <div style="font-size:10px;font-weight:800;color:#4a6a8a;letter-spacing:2px;text-transform:uppercase;margin-bottom:12px;">PLANO TÁTICO</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          <miniStat icon="${s.tactic.instruction ? INSTRUCTIONS[s.tactic.instruction]?.label?.charAt(0) || '—' : '—'}" label="Instrução" value="${s.tactic.instruction ? INSTRUCTIONS[s.tactic.instruction]?.label?.split(' ').slice(1).join(' ') || '—' : 'Nenhuma'}" />
          <miniStat icon="🛡️" label="Marcação" value="${s.tactic.marking.toUpperCase()}" />
          <miniStat icon="🔥" label="Pressing" value="${s.tactic.pressing}%" />
          <miniStat icon="⚽" label="Total Gols" value="${s.match.score.home + s.match.score.away}" />
        </div>
      </div>
    </div>
  `;
}

function statBar(label, hv, av, s) {
  const max = Math.max(hv, av, 1);
  return `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
      <div style="width:36px;text-align:right;font-size:14px;font-weight:900;color:#fff;">${hv}</div>
      <div style="flex:1;display:flex;gap:4px;">
        <div style="flex:1;height:6px;border-radius:3px;background:#111c2a;overflow:hidden;">
          <div style="width:${(hv/max)*100}%;height:100%;background:${s.homeTeam.color};border-radius:3px;transition:width 0.5s;"></div>
        </div>
        <div style="flex:1;height:6px;border-radius:3px;background:#111c2a;overflow:hidden;">
          <div style="width:${(av/max)*100}%;height:100%;background:${s.awayTeam.color};border-radius:3px;transition:width 0.5s;"></div>
        </div>
      </div>
      <div style="width:36px;font-size:14px;font-weight:900;color:#fff;">${av}</div>
    </div>
    <div style="text-align:center;font-size:9px;font-weight:700;color:#4a6a8a;text-transform:uppercase;letter-spacing:1px;margin-bottom:14px;">${label}</div>
  `;
}

function miniStat({ icon, label, value }) {
  return `
    <div style="padding:10px;background:#0a1020;border-radius:8px;text-align:center;">
      <div style="font-size:18px;margin-bottom:2px;">${icon}</div>
      <div style="font-size:11px;font-weight:900;color:#e0e0e0;">${value}</div>
      <div style="font-size:9px;color:#4a6a8a;">${label}</div>
    </div>
  `;
}
