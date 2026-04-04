import { processMatchDocument } from '../services/gemini.js';

let activeModalController = null;

export function showMatchSettings(homeTeam, awayTeam) {
    if (document.getElementById('match-settings-modal')) return;

    if (activeModalController) {
        activeModalController.abort();
    }
    activeModalController = new AbortController();
    const { signal } = activeModalController;

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'match-settings-modal';
    
    modal.innerHTML = `
        <div class="modal-card">
            <div class="modal-header-accent"></div>
            <button class="btn-close" id="modal-close"><i data-lucide="x"></i></button>
            
            <div class="modal-content">
                <h2 class="uppercase tracking-widest-xl mb-6 text-center" style="font-size: 1.25rem;">Ajustes de Partida</h2>
                
                <div class="dashboard-grid" style="grid-template-columns: 1fr 1fr; margin-bottom: 1.5rem;">
                    <div class="card p-4" style="text-align: center; border-color: ${homeTeam.color || 'var(--red-500)'}">
                        <div class="uppercase tracking-widest mb-3" style="font-size: 0.65rem;">Súmula (Casa)</div>
                        <div class="font-bold mb-4">${homeTeam.shortName || 'Home'}</div>
                        <input type="file" id="roster-home" class="hidden" accept="image/*" style="display:none">
                        <button class="btn-view" id="btn-scan-home" style="width: 100%; justify-content: center; margin-bottom: 8px;">
                            <i data-lucide="camera" style="width: 1rem"></i> SCAN AI
                        </button>
                        <button class="btn-view" id="btn-sub-home" style="width: 100%; justify-content: center; background: var(--bg-main);">
                            <i data-lucide="users" style="width: 1rem"></i> Reservas
                        </button>
                    </div>

                    <div class="card p-4" style="text-align: center; border-color: ${awayTeam.color || 'var(--emerald-500)'}">
                        <div class="uppercase tracking-widest mb-3" style="font-size: 0.65rem;">Súmula (Fora)</div>
                        <div class="font-bold mb-4">${awayTeam.shortName || 'Away'}</div>
                        <input type="file" id="roster-away" class="hidden" accept="image/*" style="display:none">
                        <button class="btn-view" id="btn-scan-away" style="width: 100%; justify-content: center; margin-bottom: 8px;">
                            <i data-lucide="camera" style="width: 1rem"></i> SCAN AI
                        </button>
                        <button class="btn-view" id="btn-sub-away" style="width: 100%; justify-content: center; background: var(--bg-main);">
                            <i data-lucide="users" style="width: 1rem"></i> Reservas
                        </button>
                    </div>
                </div>

                <div class="card p-4 mb-6">
                    <div class="uppercase tracking-widest mb-3" style="font-size: 0.65rem;">Regulamento (PDF/IMG)</div>
                    <input type="file" id="regulation-file" class="hidden" accept="application/pdf,image/*" style="display:none">
                    <button class="btn-view" id="btn-scan-rules" style="width: 100%; justify-content: center">
                        <i data-lucide="file-text" style="width: 1rem"></i> Ler com Gemini
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    if (window.lucide) window.lucide.createIcons();

    const closeModal = () => {
        modal.classList.add('closing');
        setTimeout(() => {
            modal.remove();
            activeModalController.abort();
            activeModalController = null;
        }, 200);
    };

    const handleSubstitutionsCheck = (team) => {
        if (!team.players || team.players.length === 0) {
            alert(`ATENÇÃO: O elenco do ${team.shortName} não foi importado. Escaneie a súmula primeiro.`);
            return;
        }
        
        const subs = team.players.filter(p => p.isStarter === false);
        if (subs.length === 0) {
            alert(`AVISO OPERACIONAL: O time ${team.shortName} não possui jogadores reservas cadastrados no banco de dados no momento.`);
            return;
        }
        
        alert(`O time possui ${subs.length} reservas disponíveis.`);
    };

    modal.addEventListener('click', (e) => {
        if (e.target.closest('#modal-close') || e.target === modal) closeModal();
        if (e.target.closest('#btn-scan-home')) document.getElementById('roster-home').click();
        if (e.target.closest('#btn-scan-away')) document.getElementById('roster-away').click();
        if (e.target.closest('#btn-scan-rules')) document.getElementById('regulation-file').click();
        if (e.target.closest('#btn-sub-home')) handleSubstitutionsCheck(homeTeam);
        if (e.target.closest('#btn-sub-away')) handleSubstitutionsCheck(awayTeam);
    }, { signal });

    modal.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const isHome = e.target.id === 'roster-home';
        const isAway = e.target.id === 'roster-away';
        const isRules = e.target.id === 'regulation-file';

        const btn = document.getElementById(isHome ? 'btn-scan-home' : isAway ? 'btn-scan-away' : 'btn-scan-rules');
        const originalText = btn.innerHTML;
        btn.innerHTML = `<i data-lucide="loader-2" class="animate-spin"></i> Processando...`;
        if (window.lucide) window.lucide.createIcons();

        try {
            if (isHome || isAway) {
                const teamSide = isHome ? 'home' : 'away';
                const result = await processMatchDocument(file, 'sumula');
                
                window.dispatchEvent(new CustomEvent('rosterImported', { 
                    detail: { teamSide, rosterData: result } 
                }));

                alert(`Sucesso! Time: ${result.teamName}. ${result.players?.length} jogadores importados.`);
            }

            if (isRules) {
                const result = await processMatchDocument(file, 'rules');
                alert(`Regulamento Processado!\nTempo: ${result.halfDuration}min\nSubstituições: ${result.maxSubstitutions}`);
            }
        } catch (error) {
            alert(`Erro no Processamento AI: ${error.message}`);
        } finally {
            if (document.body.contains(btn)) {
                btn.innerHTML = originalText;
                if (window.lucide) window.lucide.createIcons();
            }
        }
    }, { signal });
}

/**
 * 📝 MODAL DE RELATÓRIO AI (Crônica)
 */
export function showReportModal(reportMarkdown) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.style.zIndex = '2000';
    
    // Simples parser de Markdown (Título e Negrito)
    const formatted = reportMarkdown
        .replace(/^# (.*$)/gim, '<h2 class="team-name-h2" style="margin-bottom:20px; color:var(--primary)">$1</h1>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br>');

    overlay.innerHTML = `
        <div class="modal-card" style="max-width: 800px;">
            <div class="modal-header-accent"></div>
            <button class="btn-close" id="close-report"><i data-lucide="x"></i></button>
            <div style="padding: 40px; max-height: 80vh; overflow-y: auto;" class="custom-scrollbar">
                <div style="color: var(--text-muted); font-size: 0.8rem; margin-bottom: 8px; font-weight: 800; letter-spacing: 2px;">RELATÓRIO PÓS-JOGO • IA GEMINI</div>
                <div style="line-height: 1.6; font-size: 1.1rem; color: var(--text-main);">
                    ${formatted}
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);
    if (window.lucide) window.lucide.createIcons();

    overlay.querySelector('#close-report').onclick = () => overlay.remove();
    overlay.onclick = (e) => { if(e.target === overlay) overlay.remove(); };
}
