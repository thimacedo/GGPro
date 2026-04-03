import { Field } from './Field.js';

export const Dashboard = (state, viewMode = 'list') => {
  const isList = viewMode === 'list';
  const isField = viewMode === 'field';

  const renderEvent = (e) => {
    const icons = {
      GOAL: { icon: 'circle-dot', color: 'var(--emerald-500)', label: 'GOL' },
      YELLOW_CARD: { icon: 'rectangle-vertical', color: 'var(--yellow-400)', label: 'CARTÃO AMARELO' },
      RED_CARD: { icon: 'rectangle-vertical', color: 'var(--red-500)', label: 'CARTÃO VERMELHO' },
      SUBSTITUTION: { icon: 'repeat', color: 'var(--blue-400)', label: 'SUBSTITUIÇÃO' },
      VAR: { icon: 'tv', color: 'var(--indigo-400)', label: 'VAR' },
      OFFSIDE: { icon: 'flag', color: 'var(--orange-400)', label: 'IMPEDIMENTO' },
      PENALTY: { icon: 'maximize', color: 'var(--red-400)', label: 'PÊNALTI' },
      INJURY: { icon: 'ambulance', color: 'var(--slate-400)', label: 'ATENDIMENTO' },
      CORNER: { icon: 'corner-down-right', color: 'var(--blue-400)', label: 'ESCANTEIO' },
      FOUL: { icon: 'alert-triangle', color: 'var(--slate-400)', label: 'FALTA' },
      SHOT: { icon: 'zap', color: 'var(--orange-400)', label: 'CHUTE / FINALIZAÇÃO' }
    };

    const config = icons[e.type] || { icon: 'info', color: 'var(--slate-400)', label: e.type };
    const teamColor = e.teamId === 'home' ? state.homeTeam.color : (e.teamId === 'away' ? state.awayTeam.color : 'rgba(255,255,255,0.1)');
    
    return `
      <div class="event-item ${e.isAnnulled ? 'is-annulled' : ''}" style="border-left: 3px solid ${teamColor} !important;">
        <div class="event-time-tag">${e.minute}'</div>
        <div class="event-icon-circle" style="background: ${teamColor}15; border: 1px solid ${teamColor}30;">
           <i data-lucide="${config.icon}" style="color: ${config.color};"></i>
        </div>
        <div class="event-content">
           <div class="event-title">${config.label}</div>
           <div class="event-detail">${e.description}</div>
        </div>
      </div>
    `;
  };

  const renderPlayerList = (team) => {
    return `
      <div class="player-list-container" style="display: flex; flex-direction: column; gap: 0.25rem;">
        ${team.players.map(p => `
          <div class="player-item" onclick="app.openPlayerActions('${p.id}', '${team.id}')" style="display: flex; align-items: center; justify-content: space-between; padding: 0.5rem; border-radius: 0.75rem; cursor: pointer; transition: background 0.2s; opacity: ${p.hasLeftGame ? '0.4' : '1'};">
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <span class="num-tag" style="width: 1.5rem; height: 1.5rem; background: var(--slate-800); color: var(--slate-400); border-radius: 0.25rem; display: flex; align-items: center; justify-content: center; font-size: 0.625rem; transition: background 0.2s;">${p.number}</span>
              <span class="player-name" style="font-size: 0.75rem; font-weight: 700; color: var(--slate-100); transition: color 0.2s;">${p.name}</span>
            </div>
            ${p.isStarter ? '<span style="font-size: 0.5rem; color: var(--blue-400); font-weight: 800; text-transform: uppercase;">T</span>' : ''}
          </div>
        `).join('')}
      </div>
    `;
  };

  return `
    <div style="display: grid; grid-template-columns: 1fr 320px; gap: 1.5rem; align-items: start;">
      <div class="glass-card" style="min-height: 500px; padding: 1.5rem;">
        <!-- Tabs -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; padding: 0.25rem; background: rgba(15, 23, 42, 0.4); border-radius: 1rem; margin-bottom: 2rem;">
          <button onclick="app.setDashboardView('list')" class="btn-view ${isList ? 'active' : ''}">
            <i data-lucide="list" style="width: 1rem; height: 1rem;"></i> LISTA
          </button>
          <button onclick="app.setDashboardView('field')" class="btn-view ${isField ? 'active' : ''}">
            <i data-lucide="layout" style="width: 1rem; height: 1rem;"></i> MAPA TÁTICO
          </button>
        </div>

        ${isList ? `
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;">
            <div>
               <h3 style="text-align: center; color: var(--red-500); font-weight: 900; text-transform: uppercase; margin-bottom: 1.5rem; font-size: 0.625rem; letter-spacing: 0.1em;">${state.homeTeam.name}</h3>
               <p style="text-align: center; font-size: 0.5rem; color: var(--slate-500); margin-top: -1rem; margin-bottom: 1.5rem;">TÉC: ${state.homeTeam.coach || 'NÃO DEFINIDO'}</p>
               ${renderPlayerList(state.homeTeam)}
            </div>
            <div>
               <h3 style="text-align: center; color: var(--emerald-500); font-weight: 900; text-transform: uppercase; margin-bottom: 1.5rem; font-size: 0.625rem; letter-spacing: 0.1em;">${state.awayTeam.name}</h3>
               <p style="text-align: center; font-size: 0.5rem; color: var(--slate-500); margin-top: -1rem; margin-bottom: 1.5rem;">TÉC: ${state.awayTeam.coach || 'NÃO DEFINIDO'}</p>
               ${renderPlayerList(state.awayTeam)}
            </div>
          </div>
        ` : `
          ${Field(state)}
        `}
      </div>

      <!-- Chronology -->
      <div class="glass-card" style="padding: 1.25rem; min-height: 500px; display: flex; flex-direction: column;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem;">
           <div style="display: flex; align-items: center; gap: 0.5rem; color: var(--slate-400);">
             <i data-lucide="history" style="width: 1rem; height: 1rem;"></i>
             <span style="font-size: 0.6875rem; font-weight: 950; text-transform: uppercase; letter-spacing: 0.1em;">Cronologia</span>
           </div>
           <div style="display: flex; gap: 0.5rem;">
             <button onclick="app.showVAR()" class="text-btn" style="font-size: 0.5625rem; color: var(--slate-500);"><i data-lucide="tv" style="width: 0.75rem; vertical-align: middle; margin-right: 0.25rem;"></i> VAR</button>
             <button onclick="app.undoLastEvent()" class="text-btn" style="font-size: 0.5625rem; color: var(--slate-500);"><i data-lucide="rotate-ccw" style="width: 0.75rem; vertical-align: middle; margin-right: 0.25rem;"></i> DESFAZER</button>
           </div>
        </div>
        <div class="custom-scrollbar" style="flex: 1; overflow-y: auto; overflow-x: hidden; padding-right: 0.5rem;">
          ${state.events.length === 0 ? `
             <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: var(--slate-600); opacity: 0.5;">
               <i data-lucide="timer" style="width: 2.5rem; height: 2.5rem; margin-bottom: 1rem;"></i>
               <p style="font-size: 0.625rem; font-weight: 800; text-transform: uppercase;">Aguardando lances...</p>
             </div>
          ` : `
             <div style="display: flex; flex-direction: column;">
               ${[...state.events].reverse().map(e => renderEvent(e)).join('')}
             </div>
          `}
        </div>
      </div>
    </div>
  `;
};
