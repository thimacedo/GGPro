/**
 * timeline.js — Componente: Cronologia de Eventos
 * Lista vertical com minuteiro, ícones e cores dos times
 */

import state from '../state.js';

export function render() {
  const s = state.get();
  const events = s.match.events;

  return `
    <div id="timelinePanel" style="
      display:flex;flex-direction:column;
      background:#0d1520;border-radius:16px;border:1px solid #1a2a3a;
      overflow:hidden;min-height:0;
    ">
      <!-- Header -->
      <div style="
        padding:12px 16px;border-bottom:1px solid #1a2a3a;
        display:flex;justify-content:space-between;align-items:center;
      ">
        <span style="font-size:10px;font-weight:800;letter-spacing:2px;color:#4a6a8a;text-transform:uppercase;">📜 Cronologia</span>
        <div style="display:flex;gap:8px;">
          <button id="varBtn" style="
            padding:4px 10px;border-radius:6px;border:1px solid #f59e0b33;
            background:transparent;color:#f59e0b;font-size:9px;font-weight:800;cursor:pointer;
          ">VAR</button>
          <button id="undoBtn" style="
            padding:4px 10px;border-radius:6px;border:1px solid #1a2a3a;
            background:transparent;color:#4a6a8a;font-size:9px;font-weight:800;cursor:pointer;
          ">↩ DESFAZER</button>
        </div>
      </div>

      <!-- Events List -->
      <div id="timelineList" style="flex:1;overflow-y:auto;padding:12px;">
        ${events.length === 0
          ? `<div style="text-align:center;color:#2a3a4a;font-size:11px;padding:40px 0;">Nenhum lance registrado...</div>`
          : events.map(renderEvent).join('')
        }
      </div>
    </div>
  `;
}

function renderEvent(e, s) {
  const team = e.teamId === 'home' ? state.get().homeTeam : e.teamId === 'away' ? state.get().awayTeam : null;
  const borderColor = e.isAnnulled ? '#1a2a3a' : (team?.color || '#1a2a3a');

  return `
    <div style="display:flex;gap:10px;margin-bottom:12px;${e.isAnnulled ? 'opacity:0.3;' : ''}">
      <div style="
        width:36px;height:36px;border-radius:50%;
        background:#111c2a;border:2px solid #1a2a3a;
        display:flex;align-items:center;justify-content:center;
        font-size:9px;font-weight:900;color:#4a6a8a;flex-shrink:0;
      ">${e.minute}'</div>
      <div style="
        flex:1;padding:8px 12px;background:#111c2a;
        border-radius:10px;border-left:3px solid ${borderColor};
      ">
        <div style="font-size:11px;font-weight:700;color:#e0e0e0;">${e.description}</div>
        ${e.isAnnulled ? '<div style="font-size:9px;font-weight:800;color:#ef4444;margin-top:2px;">ANULADO</div>' : ''}
      </div>
    </div>
  `;
}
