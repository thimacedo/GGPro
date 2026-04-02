import { Field } from './Field.js';

export const Dashboard = (state, viewMode = 'list') => {
  const isList = viewMode === 'list';
  const isField = viewMode === 'field';

  const renderEvent = (e) => {
    return `
      <div class="event-item" 
           style="display: flex; gap: 0.75rem; padding: 0.75rem; border-left: 4px solid ${e.isAnnulled ? '#64748b' : (e.teamId === 'home' ? state.homeTeam.color : e.teamId === 'away' ? state.awayTeam.color : '#475569')}; 
                  background: ${e.isAnnulled ? 'transparent' : (e.teamId === 'home' ? state.homeTeam.color : e.teamId === 'away' ? state.awayTeam.color : '#ffffff')}08;
                  border-radius: 0 0.5rem 0.5rem 0; margin-bottom: 0.5rem; opacity: ${e.isAnnulled ? '0.5' : '1'};">
        <span style="font-family: monospace; font-weight: 900; font-size: 0.625rem; min-width: 1.5rem; color: var(--slate-400); ${e.isAnnulled ? 'text-decoration: line-through;' : ''}">
          ${e.minute}'
        </span>
        <div style="flex: 1;">
          <div style="font-size: 0.625rem; font-weight: 900; text-transform: uppercase; color: white;">${e.description}</div>
        </div>
      </div>
    `;
  };

  const renderPlayerList = (team) => {
    return `
      <div class="player-list-container" style="display: flex; flex-direction: column; gap: 0.25rem;">
        ${team.players.map(p => `
          <div class="player-item" onclick="app.selectPlayer('${p.id}', '${team.id}')" style="display: flex; align-items: center; justify-content: space-between; padding: 0.5rem; border-radius: 0.75rem; cursor: pointer; transition: background 0.2s;">
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <span class="num-tag" style="width: 1.5rem; height: 1.5rem; background: var(--slate-800); color: var(--slate-400); border-radius: 0.25rem; display: flex; align-items: center; justify-content: center; font-size: 0.625rem;">${p.number}</span>
              <span style="font-size: 0.75rem; font-weight: 700; color: var(--slate-200);">${p.name}</span>
            </div>
            ${p.isStarter ? '<span style="font-size: 0.5rem; font-weight: 900; color: var(--blue-500); text-transform: uppercase;">T</span>' : ''}
          </div>
        `).join('')}
      </div>
    `;
  };

  return `
    <div class="dashboard-grid">
        <div class="view-panel">
            <div class="view-selector">
                <button onclick="app.setViewMode('list')" class="btn-view ${isList ? 'active' : ''}">
                    <i data-lucide="list-filter" style="width: 0.875rem; height: 0.875rem;"></i> LISTA
                </button>
                <button onclick="app.setViewMode('field')" class="btn-view ${isField ? 'active' : ''}">
                    <i data-lucide="layout-dashboard" style="width: 0.875rem; height: 0.875rem;"></i> MAPA TÁTICO
                </button>
            </div>
            
            <div class="content-display">
                ${isField ? Field(state) : `
                    <div class="card" style="padding: 1.5rem;">
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                            <div>
                                <div style="padding: 0.5rem 0; border-bottom: 1px solid var(--border-color); margin-bottom: 0.5rem;">
                                    <h4 style="font-size: 0.625rem; font-weight: 900; text-transform: uppercase; text-align: center; color: ${state.homeTeam.color}">${state.homeTeam.shortName}</h4>
                                </div>
                                ${renderPlayerList(state.homeTeam)}
                            </div>
                            <div>
                                <div style="padding: 0.5rem 0; border-bottom: 1px solid var(--border-color); margin-bottom: 0.5rem;">
                                    <h4 style="font-size: 0.625rem; font-weight: 900; text-transform: uppercase; text-align: center; color: ${state.awayTeam.color}">${state.awayTeam.shortName}</h4>
                                </div>
                                ${renderPlayerList(state.awayTeam)}
                            </div>
                        </div>
                    </div>
                `}
            </div>
        </div>
        
        <div class="stats-panel">
            <div class="card" style="height: 100%; min-height: 400px; display: flex; flex-direction: column;">
                <div style="padding: 1.5rem; border-bottom: 1px solid var(--border-color); background: rgba(255,255,255,0.02); display: flex; justify-content: space-between; align-items: center;">
                    <h3 style="font-size: 0.6875rem; font-weight: 900; text-transform: uppercase; letter-spacing: 0.3em; color: var(--slate-400); display: flex; align-items: center; gap: 0.5rem;"><i data-lucide="history" style="width: 1rem; height: 1rem;"></i> CRONOLOGIA</h3>
                    ${state.events.length > 0 ? `
                        <button onclick="app.undoLastEvent()" style="font-size: 0.5625rem; font-weight: 900; color: var(--slate-500); text-transform: uppercase; background: transparent; border: none; cursor: pointer;">DESFAZER ÚLTIMO</button>
                    ` : ''}
                </div>
                <div class="custom-scrollbar" style="flex: 1; overflow-y: auto; padding: 1.5rem;">
                    ${state.events.length === 0 ? '<div style="text-align: center; padding: 2.5rem 0; font-size: 0.75rem; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; color: var(--slate-500); opacity: 0.3;">Sem Eventos</div>' : ''}
                </div>
                ${state.period !== 'FINISHED' && state.events.length > 0 ? `
                  <div style="padding: 1rem; border-top: 1px solid var(--border-color); background: rgba(0,0,0,0.2);">
                      <button onclick="app.finishMatch()" class="btn-submit" style="padding: 0.75rem; font-size: 0.75rem; background: var(--emerald-600); box-shadow: 0 4px 15px -3px rgba(16, 185, 129, 0.4);">
                        <i data-lucide="check-circle" style="width: 1rem; height: 1rem; vertical-align: middle; margin-right: 0.5rem;"></i> FINALIZAR E GERAR CRÔNICA
                      </button>
                  </div>
                ` : ''}
            </div>
        </div>
    </div>
  `;
};
