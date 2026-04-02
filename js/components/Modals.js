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

    <!-- IA Uploads -->
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 2rem;">
        <div style="padding: 1.25rem; background: rgba(30, 41, 59, 0.5); border-radius: 1.5rem; border: 1px dashed var(--slate-600); text-align: center; display: flex; flex-direction: column; align-items: center;">
            <h3 style="font-size: 0.75rem; font-weight: 900; color: white; margin-bottom: 0.25rem;">Banner do Jogo</h3>
            <p style="font-size: 0.625rem; color: var(--slate-400); margin-bottom: 0.75rem;">Extrair times automaticamente</p>
            <label class="btn-view active" style="padding: 0.5rem 1rem; font-size: 0.625rem; width: auto; cursor: pointer;">
                <i data-lucide="image" style="width: 0.875rem; height: 0.875rem;"></i> LER BANNER
                <input type="file" class="hidden" accept="image/*" onchange="app.handleBannerUpload(event)">
            </label>
        </div>
        <div style="padding: 1.25rem; background: rgba(30, 41, 59, 0.5); border-radius: 1.5rem; border: 1px dashed var(--slate-600); text-align: center; display: flex; flex-direction: column; align-items: center;">
            <h3 style="font-size: 0.75rem; font-weight: 900; color: white; margin-bottom: 0.25rem;">Regulamento</h3>
            <p style="font-size: 0.625rem; color: var(--slate-400); margin-bottom: 0.75rem;">Extrair regras da IA</p>
            <label class="btn-view active" style="padding: 0.5rem 1rem; font-size: 0.625rem; width: auto; background: var(--emerald-600); border-color: var(--emerald-400); cursor: pointer;">
                <i data-lucide="book-open" style="width: 0.875rem; height: 0.875rem;"></i> LER REGRAS
                <input type="file" class="hidden" accept="image/*,application/pdf" onchange="app.handleRegulationUpload(event)">
            </label>
        </div>
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
