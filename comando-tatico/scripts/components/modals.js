/**
 * modals.js — Componente: Modais (VAR, Substituição, Encerrar, Reset)
 */

import state from '../state.js';
import Engine from '../services/matchEngine.js';
import Clock from '../services/clock.js';
import Toasts from './toasts.js';
import { EVENT_TYPES, PERIOD_NAMES } from '../constants.js';

/**
 * Show VAR Review Modal
 */
export function showVarPanel() {
  const s = state.get();
  const major = s.match.events
    .filter(e => !e.isAnnulled && !['PERIOD_START', 'PERIOD_END', 'GENERIC', 'VAR'].includes(e.type))
    .slice(0, 8);

  if (!major.length) { Toasts.show('📺', 'Nenhum evento para revisar', 'info'); return; }

  openModal('📺 REVISÃO VAR', `
    <div style="display:flex;flex-direction:column;gap:6px;">
      ${major.map(e => `
        <button class="var-action" data-event-id="${e.id}" style="
          width:100%;padding:10px;margin-bottom:4px;border-radius:10px;
          border:1px solid #1a2a3a;background:#111c2a;color:#e0e0e0;
          font-size:11px;cursor:pointer;text-align:left;
          transition:background 0.2s;
        ">${e.description}</button>
      `).join('')}
    </div>
  `);

  // Bind buttons
  setTimeout(() => {
    document.querySelectorAll('.var-action').forEach(btn => {
      btn.addEventListener('click', () => {
        Engine.annulEvent(btn.dataset.eventId);
        Toasts.show('📺', 'Evento anulado pelo VAR', 'warning');
        closeModal();
      });
    });
  }, 50);
}

/**
 * Show End Game Options Modal
 */
export function showEndGameOptions() {
  const s = state.get();
  const canPenalties = s.match.score.home === s.match.score.away;
  const canExtraTime = s.match.period === '2T' && s.match.score.home === s.match.score.away;

  openModal('⏳ FIM DE PERÍODO', `
    <div style="display:flex;flex-direction:column;gap:6px;">
      <button id="endNormal" style="width:100%;padding:14px;border-radius:12px;border:1px solid #22c55e33;background:#22c55e11;color:#22c55e;font-size:12px;font-weight:800;cursor:pointer;">
        🏁 ENCERRAR PARTIDA
      </button>
      ${canExtraTime ? `
      <button id="endExtraTime" style="width:100%;padding:14px;border-radius:12px;border:1px solid #f59e0b33;background:#f59e0b11;color:#f59e0b;font-size:12px;font-weight:800;cursor:pointer;">
        ⏱ PRORROGAÇÃO
      </button>` : ''}
      ${canPenalties ? `
      <button id="endPenalties" style="width:100%;padding:14px;border-radius:12px;border:1px solid #3b82f633;background:#3b82f611;color:#3b82f6;font-size:12px;font-weight:800;cursor:pointer;">
        🥅 DISPUTA DE PÊNALTIS
      </button>` : ''}
      <button id="cancelEnd" style="width:100%;padding:10px;border-radius:10px;border:none;background:#1a2a3a;color:#4a6a8a;font-size:11px;cursor:pointer;margin-top:4px;">
        CANCELAR
      </button>
    </div>
  `);

  setTimeout(() => {
    document.getElementById('endNormal')?.addEventListener('click', () => { Clock.advancePeriod('FINISHED'); closeModal(); Toasts.show('🏁', 'Partida encerrada!', 'celebration'); });
    document.getElementById('endExtraTime')?.addEventListener('click', () => { Clock.advancePeriod('1ET'); closeModal(); });
    document.getElementById('endPenalties')?.addEventListener('click', () => { Clock.advancePeriod('PENALTIES'); closeModal(); showPenaltyShootout(); });
    document.getElementById('cancelEnd')?.addEventListener('click', closeModal);
  }, 50);
}

/**
 * Show Penalty Shootout Modal
 */
export function showPenaltyShootout() {
  const s = state.get();
  renderPenaltyModal(s);
}

function renderPenaltyModal(s) {
  const seq = s.match.penaltySequence || [];
  const homeShots = seq.filter(p => p.team === 'home');
  const awayShots = seq.filter(p => p.team === 'away');

  openModal('🥅 DISPUTA DE PÊNALTIS', `
    <div style="text-align:center;margin-bottom:16px;">
      <span style="font-size:32px;font-weight:900;color:${s.homeTeam.color};">${s.match.penaltyScore.home}</span>
      <span style="font-size:20px;color:#4a6a8a;margin:0 12px;">×</span>
      <span style="font-size:32px;font-weight:900;color:${s.awayTeam.color};">${s.match.penaltyScore.away}</span>
    </div>
    <div style="display:flex;justify-content:space-between;margin-bottom:16px;">
      <div style="text-align:center;">
        <div style="font-size:9px;color:${s.homeTeam.color};font-weight:800;text-transform:uppercase;">${s.homeTeam.short}</div>
        <div style="margin-top:4px;">${homeShots.map((s,i) => `<span style="margin-right:2px;">${s.scored ? '✅' : '❌'}</span>`).join('')}</div>
      </div>
      <div style="text-align:center;">
        <div style="font-size:9px;color:${s.awayTeam.color};font-weight:800;text-transform:uppercase;">${s.awayTeam.short}</div>
        <div style="margin-top:4px;">${awayShots.map((s,i) => `<span style="margin-right:2px;">${s.scored ? '✅' : '❌'}</span>`).join('')}</div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">
      <button class="pen-action" data-team="home" data-scored="true" style="padding:12px;border-radius:10px;border:1px solid #22c55e33;background:#22c55e11;color:#22c55e;font-weight:800;font-size:11px;cursor:pointer;">✅ ${s.homeTeam.short} GOL</button>
      <button class="pen-action" data-team="home" data-scored="false" style="padding:12px;border-radius:10px;border:1px solid #ef444433;background:#ef444411;color:#ef4444;font-weight:800;font-size:11px;cursor:pointer;">❌ ${s.homeTeam.short} ERROU</button>
      <button class="pen-action" data-team="away" data-scored="true" style="padding:12px;border-radius:10px;border:1px solid #22c55e33;background:#22c55e11;color:#22c55e;font-weight:800;font-size:11px;cursor:pointer;">✅ ${s.awayTeam.short} GOL</button>
      <button class="pen-action" data-team="away" data-scored="false" style="padding:12px;border-radius:10px;border:1px solid #ef444433;background:#ef444411;color:#ef4444;font-weight:800;font-size:11px;cursor:pointer;">❌ ${s.awayTeam.short} ERROU</button>
    </div>
  `);

  setTimeout(() => {
    document.querySelectorAll('.pen-action').forEach(btn => {
      btn.addEventListener('click', () => {
        const teamId = btn.dataset.team;
        const scored = btn.dataset.scored === 'true';
        Engine.registerPenalty(teamId, scored);
        // Re-render modal with updated state
        renderPenaltyModal(state.get());
      });
    });
  }, 50);
}

/**
 * Show Settings Modal
 */
import { FORMATIONS, INSTRUCTIONS, MARKINGS } from '../constants.js';

export function showSettings() {
  const s = state.get();

  openModal('⚙️ MENU TÉCNICO', `
    <div style="display:flex;flex-direction:column;gap:12px;">
      <!-- Team Names -->
      <div>
        <div style="font-size:9px;font-weight:800;color:#4a6a8a;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">Times</div>
        <input id="settingsHomeName" value="${s.homeTeam.name}" placeholder="Time Casa" style="
          width:100%;padding:8px 12px;border-radius:8px;border:1px solid #1a2a3a;
          background:#111c2a;color:#e0e0e0;font-size:12px;font-weight:700;outline:none;margin-bottom:4px;
        "/>
        <input id="settingsAwayName" value="${s.awayTeam.name}" placeholder="Time Visitante" style="
          width:100%;padding:8px 12px;border-radius:8px;border:1px solid #1a2a3a;
          background:#111c2a;color:#e0e0e0;font-size:12px;font-weight:700;outline:none;
        "/>
      </div>

      <!-- Formations -->
      <div>
        <div style="font-size:9px;font-weight:800;color:#4a6a8a;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">Formações (${s.homeTeam.short})</div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:4px;">
          ${Object.keys(FORMATIONS).map(f => `
            <button class="formation-btn" data-formation="${f}" style="
              padding:8px;border-radius:8px;
              border:1px solid ${s.homeTeam.formation===f?'#1e90ff':'#1a2a3a'};
              background:${s.homeTeam.formation===f?'#1e90ff22':'#111c2a'};
              color:${s.homeTeam.formation===f?'#1e90ff':'#4a6a8a'};
              font-weight:800;font-size:10px;cursor:pointer;
            ">${f}</button>
          `).join('')}
        </div>
      </div>

      <!-- Instructions -->
      <div>
        <div style="font-size:9px;font-weight:800;color:#4a6a8a;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">Instruções</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;">
          ${Object.entries(INSTRUCTIONS).map(([k,v]) => `
            <button class="instruction-btn" data-instr="${k}" style="
              padding:8px;border-radius:8px;
              border:1px solid ${s.tactic.instruction===k?'#22c55e':'#1a2a3a'};
              background:${s.tactic.instruction===k?'#22c55e22':'#111c2a'};
              color:${s.tactic.instruction===k?'#22c55e':'#4a6a8a'};
              font-weight:700;font-size:9px;cursor:pointer;text-align:left;
            ">${v.label}</button>
          `).join('')}
        </div>
      </div>

      <!-- Marking -->
      <div>
        <div style="font-size:9px;font-weight:800;color:#4a6a8a;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">Marcação</div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px;">
          ${Object.entries(MARKINGS).map(([k,v]) => `
            <button class="marking-btn" data-marking="${k}" style="
              padding:8px;border-radius:8px;
              border:1px solid ${s.tactic.marking===k?'#f59e0b':'#1a2a3a'};
              background:${s.tactic.marking===k?'#f59e0b22':'#111c2a'};
              color:${s.tactic.marking===k?'#f59e0b':'#4a6a8a'};
              font-weight:800;font-size:9px;cursor:pointer;text-transform:uppercase;
            ">${k}</button>
          `).join('')}
        </div>
      </div>

      <!-- Actions -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">
        <button id="settingsExport" style="padding:10px;border-radius:8px;border:1px solid #1a2a3a;background:#111c2a;color:#4a6a8a;font-weight:800;font-size:9px;cursor:pointer;text-transform:uppercase;">💾 BACKUP</button>
        <button id="settingsReset" style="padding:10px;border-radius:8px;border:1px solid #ef444433;background:#ef444411;color:#ef4444;font-weight:800;font-size:9px;cursor:pointer;text-transform:uppercase;">🗑 RESETAR</button>
      </div>
    </div>
  `);

  setTimeout(() => {
    document.getElementById('settingsHomeName')?.addEventListener('change', (e) => {
      state.set(prev => ({ homeTeam: { ...prev.homeTeam, name: e.target.value, short: e.target.value.substring(0, 3).toUpperCase() } }));
    });
    document.getElementById('settingsAwayName')?.addEventListener('change', (e) => {
      state.set(prev => ({ awayTeam: { ...prev.awayTeam, name: e.target.value, short: e.target.value.substring(0, 3).toUpperCase() } }));
    });

    // Formation buttons
    document.querySelectorAll('.formation-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const f = btn.dataset.formation;
        const key = 'homeTeam';
        const positions = FORMATIONS[f].positions;
        state.set(prev => ({
          [key]: { ...prev[key], formation: f, players: prev[key].players.map((p, i) => i < positions.length ? { ...p, x: positions[i].x, y: positions[i].y } : p) }
        }));
        closeModal();
        Toasts.show('📐', `Formação ${f}`, 'success');
      });
    });

    // Instruction buttons
    document.querySelectorAll('.instruction-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const k = btn.dataset.instr;
        const instr = INSTRUCTIONS[k];
        state.set(prev => ({ tactic: { ...prev.tactic, instruction: k, pressing: instr.pressing } }));
        closeModal();
        Toasts.show(instr.label.charAt(0), instr.label, 'success');
      });
    });

    // Marking buttons
    document.querySelectorAll('.marking-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const m = btn.dataset.marking;
        state.set(prev => ({ tactic: { ...prev.tactic, marking: m } }));
        closeModal();
        Toasts.show('🛡️', `Marcação: ${m}`, 'success');
      });
    });

    document.getElementById('settingsExport')?.addEventListener('click', () => {
      const data = state.exportJSON();
      const blob = new Blob([data], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `comando_tatico_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      Toasts.show('💾', 'Backup exportado', 'success');
    });
    document.getElementById('settingsReset')?.addEventListener('click', () => {
      if (confirm('Resetar toda a partida?')) { state.reset(); closeModal(); Toasts.show('🗑', 'Partida resetada', 'warning'); }
    });
  }, 50);
}

// --- Generic Modal System ---

function openModal(title, contentHTML) {
  closeModal();
  const overlay = document.createElement('div');
  overlay.id = 'modalOverlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:300;display:flex;align-items:center;justify-content:center;';

  overlay.innerHTML = `
    <div id="modalBox" style="
      background:#0d1520;border:1px solid #1a2a3a;border-radius:20px;
      padding:24px;width:400px;max-width:90vw;max-height:80vh;overflow-y:auto;
      box-shadow:0 25px 80px rgba(0,0,0,0.8);
      animation:modalIn 0.2s ease;
    ">
      <div style="font-size:10px;font-weight:800;color:#4a6a8a;text-transform:uppercase;letter-spacing:2px;margin-bottom:16px;text-align:center;">${title}</div>
      ${contentHTML}
    </div>
  `;

  overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
  document.body.appendChild(overlay);
}

function closeModal() {
  document.getElementById('modalOverlay')?.remove();
}

export { openModal, closeModal };
