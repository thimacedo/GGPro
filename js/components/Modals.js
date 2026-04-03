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
    
    <div style="display: flex; flex-direction: column; gap: 1.5rem;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;">
            <div class="card" style="padding: 1.25rem; background: rgba(255,255,255,0.03);">
                <h4 style="font-size: 0.625rem; font-weight: 900; color: ${state.homeTeam.color}; margin-bottom: 1rem; text-transform: uppercase;">MANDANTE</h4>
                <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                    <button onclick="app.editTeam('home')" class="btn-submit" style="padding: 0.625rem; font-size: 0.5625rem; background: var(--slate-800); color: var(--slate-300);">EDITAR TIME</button>
                    <button onclick="app.openImportModal('home')" class="btn-submit" style="padding: 0.625rem; font-size: 0.5625rem; background: var(--blue-600);">IMPORTAR ATLETAS</button>
                </div>
            </div>
            <div class="card" style="padding: 1.25rem; background: rgba(255,255,255,0.03);">
                <h4 style="font-size: 0.625rem; font-weight: 900; color: ${state.awayTeam.color}; margin-bottom: 1rem; text-transform: uppercase;">VISITANTE</h4>
                <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                    <button onclick="app.editTeam('away')" class="btn-submit" style="padding: 0.625rem; font-size: 0.5625rem; background: var(--slate-800); color: var(--slate-300);">EDITAR TIME</button>
                    <button onclick="app.openImportModal('away')" class="btn-submit" style="padding: 0.625rem; font-size: 0.5625rem; background: var(--blue-600);">IMPORTAR ATLETAS</button>
                </div>
            </div>
        </div>
        
        <div class="card" style="padding: 1.5rem; background: rgba(255,255,255,0.03);">
            <h4 style="font-size: 0.625rem; font-weight: 900; color: var(--slate-400); margin-bottom: 1rem; text-transform: uppercase;">DETALHES DO JOGO</h4>
            <div style="display: flex; flex-direction: column; gap: 1rem;">
                <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 1rem;">
                    <div class="input-group">
                        <label class="input-label">Competição</label>
                        <input type="text" id="setup-competition" value="${state.competition}" class="text-input" placeholder="Ex: Premier League">
                    </div>
                    <div class="input-group">
                        <label class="input-label">Data</label>
                        <input type="date" id="setup-date" value="${state.matchDate}" class="text-input">
                    </div>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                    <div class="input-group">
                        <label class="input-label">Estádio</label>
                        <input type="text" id="setup-stadium" value="${state.stadium}" class="text-input" placeholder="Ex: Anfield">
                    </div>
                    <div class="input-group">
                        <label class="input-label">Árbitro</label>
                        <input type="text" id="setup-referee" value="${state.referee || ''}" class="text-input" placeholder="Ex: Mike Dean">
                    </div>
                </div>
                <div class="input-group">
                    <label class="input-label">Observações</label>
                    <textarea id="setup-observations" class="text-input" style="height: 60px; font-size: 0.75rem; resize: none;">${state.observations || ''}</textarea>
                </div>
            </div>
        </div>

        <div class="card" style="padding: 1.5rem; background: rgba(255,255,255,0.03);">
            <h4 style="font-size: 0.625rem; font-weight: 900; color: var(--slate-400); margin-bottom: 1rem; text-transform: uppercase;">REGRAS DA PARTIDA</h4>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                <div class="input-group">
                    <label class="input-label">Tempo (min)</label>
                    <input type="number" id="rules-duration" value="${state.rules.halfDuration}" class="text-input">
                </div>
                <div class="input-group">
                    <label class="input-label">Limite de Subs</label>
                    <input type="number" id="rules-subs" value="${state.rules.maxSubstitutions}" class="text-input">
                </div>
            </div>
        </div>

        <button onclick="app.saveSetup()" class="btn-submit" style="padding: 1.25rem; font-size: 0.875rem; background: var(--emerald-600);">
            <i data-lucide="check" style="width: 1rem; height: 1rem; vertical-align: middle; margin-right: 0.5rem;"></i> CONFIRMAR E INICIAR JOGO
        </button>
    </div>
  `;
};

export const EditPlayerContent = (player, teamId) => {
    return `
        <div style="display: flex; flex-direction: column; gap: 1.25rem;">
            <div class="input-group">
                <label class="input-label">NOME DO ATLETA</label>
                <input type="text" id="edit-player-name" value="${player.name}" class="text-input">
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                <div class="input-group">
                    <label class="input-label">NÚMERO</label>
                    <input type="number" id="edit-player-number" value="${player.number}" class="text-input" style="font-family: monospace;">
                </div>
                <div class="input-group">
                    <label class="input-label">POSIÇÃO</label>
                    <select id="edit-player-position" class="text-input" style="background: var(--slate-800); border: 1px solid var(--border-color); color: white; padding: 0.5rem; border-radius: 0.5rem;">
                        <option value="GK" ${player.position === 'GK' ? 'selected' : ''}>GOLEIRO (GK)</option>
                        <option value="DF" ${player.position === 'DF' ? 'selected' : ''}>DEFENSOR (DF)</option>
                        <option value="MF" ${player.position === 'MF' ? 'selected' : ''}>MEIA (MF)</option>
                        <option value="FW" ${player.position === 'FW' ? 'selected' : ''}>ATACANTE (FW)</option>
                    </select>
                </div>
            </div>
            <div class="input-group" style="display: flex; align-items: center; gap: 0.75rem; background: rgba(0,0,0,0.2); padding: 1.25rem; border-radius: 1rem; border: 1px solid rgba(255,255,255,0.05);">
                <input type="checkbox" id="edit-player-starter" ${player.isStarter ? 'checked' : ''} style="width: 1.25rem; height: 1.25rem; accent-color: var(--blue-500);">
                <label for="edit-player-starter" style="font-size: 0.75rem; font-weight: 900; color: var(--slate-200); cursor: pointer; text-transform: uppercase;">Titular em Campo</label>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 1rem;">
                <button onclick="app.closeModal()" class="btn-submit" style="background: var(--slate-800); box-shadow: none;">CANCELAR</button>
                <button onclick="app.savePlayerEdit('${player.id}', '${teamId}')" class="btn-submit">SALVAR ALTERAÇÕES</button>
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
        <div class="input-group">
            <label class="input-label">TREINADOR</label>
            <input type="text" id="edit-team-coach" value="${team.coach || ''}" class="text-input">
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

export const ImportListContent = (teamId) => {
    return `
        <div style="display: flex; flex-direction: column; gap: 1.25rem;">
            <p style="font-size: 0.75rem; color: var(--slate-400); line-height: 1.5;">Cole a lista de jogadores no formato: <br> <strong>1 - Rossi (GK)<br>2 - Varela</strong> etc.</p>
            <textarea id="import-text" class="text-input" style="height: 200px; font-family: monospace; font-size: 0.75rem; resize: none;" placeholder="Cole aqui a súmula/lista de jogadores..."></textarea>
            
            <div style="display: flex; gap: 1rem;">
                <button onclick="app.closeModal()" class="btn-submit" style="background: var(--slate-800); flex: 1;">CANCELAR</button>
                <button onclick="app.processImport('${teamId}', document.getElementById('import-text').value)" class="btn-submit" style="flex: 2;">PROCESSAR COM IA</button>
            </div>
            
            <div style="border-top: 1px solid var(--border-color); padding-top: 1.25rem; text-align: center;">
                <p style="font-size: 0.625rem; font-weight: 900; color: var(--slate-500); text-transform: uppercase; margin-bottom: 0.75rem;">Ou selecione uma foto da súmula</p>
                <input type="file" id="import-image" onchange="app.handlePlayerImageUpload(event, '${teamId}')" style="display: none;">
                <button onclick="document.getElementById('import-image').click()" class="btn-submit" style="background: var(--slate-800); border: 2px dashed var(--border-color); color: var(--slate-300);">
                    <i data-lucide="camera" style="width: 1rem; height: 1rem; vertical-align: middle; margin-right: 0.5rem;"></i> TIRAR FOTO / SUBIR IMAGEM
                </button>
            </div>
        </div>
    `;
};


export const PlayerActionContent = (player, team) => {
    const isStarter = player.isStarter;
    const actions = [
        { id: 'GOAL', label: 'GOL', icon: 'circle-dot', color: 'var(--blue-500)' },
        { id: 'SHOT', label: 'CHUTE', icon: 'target', color: 'var(--slate-200)' },
        { id: 'YELLOW_CARD', label: 'AMARELO', icon: 'rectangle-vertical', color: 'var(--yellow-500)' },
        { id: 'RED_CARD', label: 'VERMELHO', icon: 'rectangle-vertical', color: 'var(--red-600)' },
        { id: 'OFFSIDE', label: 'IMPEDIM.', icon: 'flag', color: 'var(--orange-400)' },
        { id: 'FOUL', label: 'FALTA', icon: 'alert-triangle', color: 'var(--slate-500)' },
        { id: 'CORNER', label: 'ESCANTEIO', icon: 'corner-down-right', color: 'var(--blue-400)' },
        { id: 'PENALTY', label: 'PÊNALTI', icon: 'maximize', color: 'var(--red-400)' }
    ];

    if (player.position === 'GK') {
        actions.push({ id: 'GK_8_SECONDS', label: '8 SEG', icon: 'clock', color: 'var(--yellow-500)' });
    }
    
    actions.push({ id: 'SUBSTITUTION', label: isStarter ? 'SAIR' : 'ENTRAR', icon: 'repeat', color: 'var(--emerald-500)' });

    return `
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.625rem;">
            ${actions.map(a => `
                <button onclick="app.handlePlayerAction('${a.id}', '${player.id}', '${team.id}')" class="btn-submit" style="background: rgba(255,255,255,0.05); box-shadow: none; display: flex; flex-direction: column; align-items: center; gap: 0.25rem; padding: 1rem 0.5rem; border: 1px solid rgba(255,255,255,0.05); border-radius: 1rem;">
                    <i data-lucide="${a.icon}" style="width: 1rem; height: 1rem; color: ${a.color};"></i>
                    <span style="font-size: 0.5625rem; font-weight: 900; letter-spacing: 0.05em;">${a.label}</span>
                </button>
            `).join('')}
        </div>
        <button onclick="app.openEditPlayer('${player.id}', '${team.id}')" class="btn-submit" style="margin-top: 1rem; background: var(--slate-800); font-size: 0.625rem; letter-spacing: 0.1em; padding: 1rem;">
            <i data-lucide="edit-3" style="width: 0.75rem; height: 0.75rem; vertical-align: middle; margin-right: 0.5rem;"></i> EDITAR DADOS DO ATLETA
        </button>
    `;
};

export const TeamActionContent = (teamId, team) => {
    const actions = [
        { id: 'CORNER', label: 'ESCANTEIO', icon: 'corner-down-right', color: 'var(--blue-400)' },
        { id: 'OFFSIDE', label: 'IMPEDIMENTO', icon: 'flag', color: 'var(--orange-400)' },
        { id: 'FOUL', label: 'FALTA COLETIVA', icon: 'alert-triangle', color: 'var(--slate-500)' },
        { id: 'PENALTY', label: 'PÊNALTI', icon: 'maximize', color: 'var(--red-400)' },
        { id: 'VAR', label: 'DECISÃO VAR', icon: 'tv', color: 'var(--indigo-500)' },
        { id: 'INJURY', label: 'ATENDIMENTO', icon: 'ambulance', color: 'var(--red-500)' }
    ];

    return `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
            ${actions.map(a => `
                <button onclick="app.handleTeamAction('${a.id}', '${teamId}')" class="btn-submit" style="background: rgba(255,255,255,0.05); box-shadow: none; display: flex; align-items: center; gap: 0.75rem; padding: 1.25rem; border: 1px solid rgba(255,255,255,0.05); border-radius: 1.25rem;">
                    <i data-lucide="${a.icon}" style="color: ${a.color};"></i>
                    <span style="font-size: 0.6875rem; font-weight: 900;">${a.label}</span>
                </button>
            `).join('')}
        </div>
    `;
};
