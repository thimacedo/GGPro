export const Modal = (content, title) => {
  return `
    <div id="modal-overlay" class="modal-overlay animate-in fade-in duration-300">
      <div class="modal-card">
        <div class="modal-header-accent" id="modal-accent"></div>
        <button onclick="app.closeModal()" class="btn-close">
          <i data-lucide="x" style="width: 1.5rem; height: 1.5rem;"></i>
        </button>
        <div class="modal-content custom-scrollbar">
          ${title ? `<h2 style="font-size: 1.5rem; font-weight: 900; color: white; text-transform: uppercase; letter-spacing: -0.05em; margin-bottom: 2rem; text-align: center;">${title}</h2>` : ''}
          ${content}
        </div>
      </div>
    </div>
  `;
};

export const PreMatchSetupContent = (state) => {
  return `
    <div style="display: flex; flex-direction: column; align-items: center; margin-bottom: 2rem;">
        <div style="width: 4rem; height: 4rem; background: rgba(37, 99, 235, 0.2); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 1.5rem; display: flex; align-items: center; justify-content: center; margin-bottom: 1rem; color: var(--blue-400);">
            <i data-lucide="file-text" style="width: 2rem; height: 2rem;"></i>
        </div>
        <h1 style="font-size: 1.875rem; font-weight: 900; text-align: center; color: white; text-transform: uppercase; letter-spacing: -0.05em;">Súmula da Partida</h1>
    </div>
    
    <div style="display: flex; flex-direction: column; gap: 1.25rem;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem;">
            <div class="input-group">
                <label class="input-label">Competição</label>
                <input type="text" id="setup-competition" placeholder="Ex: Copa Trampolim" value="${state.competition}" class="text-input">
            </div>
            <div class="input-group">
                <label class="input-label">Árbitro</label>
                <input type="text" id="setup-referee" placeholder="Ex: Wilton P. Sampaio" value="${state.referee || ''}" class="text-input">
            </div>
        </div>
        <div class="input-group">
            <label class="input-label">Estádio / Local</label>
            <input type="text" id="setup-stadium" placeholder="Ex: Maracanã" value="${state.stadium}" class="text-input">
        </div>
        <button onclick="app.saveSetup()" class="btn-submit">
            <i data-lucide="save" style="width: 1.125rem; height: 1.125rem; vertical-align: middle; margin-right: 0.5rem;"></i> CONFIRMAR E INICIAR
        </button>
    </div>
  `;
};
