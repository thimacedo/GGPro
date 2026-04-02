export const Modal = (content, title) => {
  return `
    <div id="modal-overlay" class="modal-overlay animate-in fade-in duration-300">
      <div class="modal-card">
        <div class="modal-header-accent"></div>
        <button onclick="app.closeModal()" class="btn-close">
          <i data-lucide="x" style="width: 1.5rem; height: 1.5rem;"></i>
        </button>
        <div class="modal-content custom-scrollbar">
          ${title ? `<h2 style="font-size: 1.25rem; font-weight: 950; color: white; text-transform: uppercase; letter-spacing: -0.05em; margin-bottom: 2rem; text-align: center;">${title}</h2>` : ''}
          ${content}
        </div>
      </div>
    </div>
  `;
};

export const PreMatchSetupContent = (state) => {
  return `
    <div style="display: flex; flex-direction: column; align-items: center; margin-bottom: 2rem;">
        <div style="width: 3.5rem; height: 3.5rem; background: rgba(37, 99, 235, 0.2); border-radius: 1.25rem; display: flex; align-items: center; justify-content: center; margin-bottom: 1rem; color: var(--blue-400);">
            <i data-lucide="file-text" style="width: 1.75rem; height: 1.75rem;"></i>
        </div>
        <h1 style="font-size: 1.5rem; font-weight: 950; text-align: center; color: white; text-transform: uppercase; letter-spacing: -0.05em;">Súmula da Partida</h1>
    </div>

    <!-- IA Uploads -->
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 2rem;">
        <div style="padding: 1.25rem; background: rgba(30, 41, 59, 0.5); border-radius: 1.5rem; border: 1px dashed var(--slate-600); text-align: center; display: flex; flex-direction: column; align-items: center;">
            <p style="font-size: 0.625rem; color: var(--slate-400); margin-bottom: 0.75rem; font-weight: 800; text-transform: uppercase;">Banner / Jornal</p>
            <label class="btn-view active" style="padding: 0.5rem 1rem; font-size: 0.625rem; width: auto; cursor: pointer; background: var(--blue-600);">
                <i data-lucide="image" style="width: 0.875rem; height: 0.875rem;"></i> LER BANNER
                <input type="file" class="hidden" accept="image/*" onchange="app.handleBannerUpload(event)">
            </label>
        </div>
        <div style="padding: 1.25rem; background: rgba(30, 41, 59, 0.5); border-radius: 1.5rem; border: 1px dashed var(--slate-600); text-align: center; display: flex; flex-direction: column; align-items: center;">
            <p style="font-size: 0.625rem; color: var(--slate-400); margin-bottom: 0.75rem; font-weight: 800; text-transform: uppercase;">Regulamento PDF</p>
            <label class="btn-view active" style="padding: 0.5rem 1rem; font-size: 0.625rem; width: auto; background: var(--emerald-600); border-color: var(--emerald-400); cursor: pointer;">
                <i data-lucide="book-open" style="width: 0.875rem; height: 0.875rem;"></i> LER REGRAS
                <input type="file" class="hidden" accept="image/*,application/pdf" onchange="app.handleRegulationUpload(event)">
            </label>
        </div>
    </div>
    
    <div style="display: flex; flex-direction: column; gap: 1.25rem;">
        <div class="input-group">
            <label class="input-label">Competição</label>
            <input type="text" id="setup-competition" placeholder="Ex: Premier League" value="${state.competition}" class="text-input">
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem;">
            <div class="input-group">
                <label class="input-label">Estádio</label>
                <input type="text" id="setup-stadium" placeholder="Ex: Anfield" value="${state.stadium}" class="text-input">
            </div>
            <div class="input-group">
                <label class="input-label">Árbitro</label>
                <input type="text" id="setup-referee" placeholder="Ex: Mike Dean" value="${state.referee || ''}" class="text-input">
            </div>
        </div>
        
        <button onclick="app.saveSetup()" class="btn-submit">
            <i data-lucide="check" style="width: 1.125rem; height: 1.125rem; vertical-align: middle; margin-right: 0.5rem;"></i> CONFIRMAR E INICIAR
        </button>
    </div>
  `;
};

export const EditPlayerContent = (player, team) => {
  return `
    <div style="display: flex; flex-direction: column; gap: 1.5rem;">
        <div style="display: grid; grid-template-columns: 1fr 3fr; gap: 1rem;">
            <div class="input-group">
                <label class="input-label">NÚMERO</label>
                <input type="number" id="edit-player-number" value="${player.number}" class="text-input" style="font-family: monospace; text-align: center;">
            </div>
            <div class="input-group">
                <label class="input-label">NOME DO ATLETA</label>
                <input type="text" id="edit-player-name" value="${player.name}" class="text-input">
            </div>
        </div>

        <div style="display: flex; items-center: center; justify-content: space-between; padding: 1rem; background: rgba(0,0,0,0.2); border-radius: 1rem; border: 1px solid rgba(255,255,255,0.05);">
            <span style="font-size: 0.75rem; font-weight: 900; color: var(--slate-400); text-transform: uppercase;">Status em Campo</span>
            <button onclick="document.getElementById('edit-player-starter').click()" id="starter-toggle-btn" class="btn-view ${player.isStarter ? 'active' : ''}" style="width: auto; padding: 0.5rem 1rem;">
                ${player.isStarter ? 'TITULAR' : 'RESERVA'}
                <input type="checkbox" id="edit-player-starter" ${player.isStarter ? 'checked' : ''} class="hidden" onchange="document.getElementById('starter-toggle-btn').classList.toggle('active'); this.parentElement.innerText = this.checked ? 'TITULAR' : 'RESERVA';">
            </button>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
            <button onclick="app.closeModal()" class="btn-submit" style="background: var(--slate-800); box-shadow: none;">CANCELAR</button>
            <button onclick="app.savePlayerEdit('${player.id}', '${player.teamId}')" class="btn-submit">SALVAR</button>
        </div>
    </div>
  `;
};

export const EditTeamContent = (team) => {
  const TEAM_COLORS = ['#ef4444', '#f97316', '#f59e0b', '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#3b82f6', '#4f46e5', '#a855f7', '#1e293b', '#ffffff'];
  
  return `
    <div style="display: flex; flex-direction: column; gap: 1.5rem;">
        <div class="input-group">
            <label class="input-label">NOME COMPLETO</label>
            <input type="text" id="edit-team-name" value="${team.name}" class="text-input">
        </div>
        <div class="input-group">
            <label class="input-label">SIGLA (BANCADA)</label>
            <input type="text" id="edit-team-short" value="${team.shortName}" maxLength="3" class="text-input" style="text-transform: uppercase;">
        </div>

        <div style="background: rgba(0,0,0,0.2); padding: 1.5rem; border-radius: 1.5rem; border: 1px solid rgba(255,255,255,0.05);">
            <label class="input-label" style="text-align: center; margin-bottom: 1rem;">COR DA EQUIPE NO CAMPO</label>
            <div style="display: grid; grid-template-columns: repeat(6, 1fr); gap: 0.75rem;">
                ${TEAM_COLORS.map(c => `
                    <button onclick="app.setEditTeamColor('${c}')" class="color-swatch ${team.color === c ? 'active' : ''}" style="background-color: ${c}; width: 2rem; height: 2rem; border-radius: 50%; border: 3px solid ${team.color === c ? 'white' : 'transparent'}; cursor: pointer; transition: transform 0.2s;"></button>
                `).join('')}
            </div>
            <input type="hidden" id="edit-team-color" value="${team.color}">
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
            <button onclick="app.closeModal()" class="btn-submit" style="background: var(--slate-800); box-shadow: none;">CANCELAR</button>
            <button onclick="app.saveTeamEdit('${team.id}')" class="btn-submit">SALVAR EQUIPE</button>
        </div>
    </div>
  `;
};

export const EndGameOptionsContent = () => {
    return `
        <div style="display: flex; flex-direction: column; gap: 1rem;">
            <button onclick="app.finishMatch()" class="btn-submit" style="background: var(--slate-800); display: flex; align-items: center; justify-content: center; gap: 0.75rem; padding: 1.5rem;">
                <i data-lucide="flag" style="color: var(--red-500);"></i> ENCERRAR JOGO
            </button>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                <button onclick="app.startExtraTime()" class="btn-submit" style="background: var(--blue-600);">
                    PRORROGAÇÃO
                </button>
                <button onclick="app.startPenalties()" class="btn-submit" style="background: var(--indigo-600);">
                    PÊNALTIS
                </button>
            </div>
        </div>
    `;
};

export const PlayerActionContent = (player, team) => {
    const isStarter = player.isStarter;
    const actions = [
        { id: 'GOAL', label: 'GOL', icon: 'circle-dot', color: 'var(--blue-500)' },
        { id: 'YELLOW_CARD', label: 'AMARELO', icon: 'rectangle-vertical', color: 'var(--yellow-500)' },
        { id: 'RED_CARD', label: 'VERMELHO', icon: 'rectangle-vertical', color: 'var(--red-600)' },
        { id: 'SUBSTITUTION', label: isStarter ? 'SUBSTITUÍVEL' : 'ENTRAR', icon: 'repeat', color: 'var(--emerald-500)' },
        { id: 'FOUL', label: 'FALTA', icon: 'alert-triangle', color: 'var(--slate-500)' },
        { id: 'SHOT', label: 'FINALIZAÇÃO', icon: 'target', color: 'var(--slate-200)' }
    ];

    if (player.position === 'GK') {
        actions.push({ id: 'GK_8_SECONDS', label: '8 SEGUNDOS', icon: 'clock', color: 'var(--orange-500)' });
    } else if (isStarter) {
        actions.push({ id: 'SET_GOALKEEPER', label: 'VIRAR GK', icon: 'shield', color: 'var(--indigo-400)' });
    }

    return `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
            ${actions.map(a => `
                <button onclick="app.handlePlayerAction('${a.id}', '${player.id}', '${team.id}')" class="btn-submit" style="background: rgba(255,255,255,0.05); box-shadow: none; display: flex; flex-direction: column; align-items: center; gap: 0.5rem; padding: 1.25rem; border: 1px solid rgba(255,255,255,0.05);">
                    <i data-lucide="${a.icon}" style="color: ${a.color};"></i>
                    <span style="font-size: 0.625rem; font-weight: 900;">${a.label}</span>
                </button>
            `).join('')}
        </div>
        <button onclick="app.selectPlayer('${player.id}', '${team.id}')" class="btn-submit" style="margin-top: 1rem; background: var(--slate-800); font-size: 0.625rem;">EDITAR DADOS DO ATLETA</button>
    `;
};
