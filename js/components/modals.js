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
 * Exibe a narrativa gerada pela IA com tipografia premium e suporte a Markdown.
 */
export function showReportModal(reportMarkdown) {
    if (activeModalController) activeModalController.abort();
    activeModalController = new AbortController();
    const { signal } = activeModalController;

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'report-modal-overlay';
    overlay.style.zIndex = '3000';
    
    // Parser de Markdown Resiliente (Suporte a H1, H2, Negrito, Listas e Quebras)
    const formatted = reportMarkdown
        .replace(/^# (.*$)/gim, '<h1 class="report-title">$1</h1>')
        .replace(/^## (.*$)/gim, '<h2 class="report-subtitle">$1</h2>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/^\- (.*$)/gim, '<li class="report-item">$1</li>')
        .replace(/\n/g, '<br>');

    overlay.innerHTML = `
        <div class="modal-card report-card">
            <div class="modal-header-accent ai-accent"></div>
            <button class="btn-close" id="close-report"><i data-lucide="x"></i></button>
            
            <div class="report-container custom-scrollbar">
                <div class="report-badge">
                    <i data-lucide="sparkles"></i>
                    INTELIGÊNCIA PÓS-JOGO • GEMINI ULTRA
                </div>
                
                <article class="report-body">
                    ${formatted}
                </article>

                <div class="report-footer">
                    <button class="btn-view" id="btn-copy-report">
                        <i data-lucide="copy"></i> Copiar Crônica
                    </button>
                    <button class="btn-view" id="btn-share-report" style="background: var(--primary); color: white;">
                        <i data-lucide="share-2"></i> Compartilhar
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);
    if (window.lucide) window.lucide.createIcons();

    const closeReport = () => {
        overlay.classList.add('closing');
        setTimeout(() => overlay.remove(), 200);
    };

    overlay.addEventListener('click', (e) => {
        if (e.target.id === 'close-report' || e.target.closest('#close-report') || e.target === overlay) {
            closeReport();
        }
        
        if (e.target.closest('#btn-copy-report')) {
            navigator.clipboard.writeText(reportMarkdown);
            const btn = e.target.closest('#btn-copy-report');
            const original = btn.innerHTML;
            btn.innerHTML = `<i data-lucide="check"></i> Copiado!`;
            if (window.lucide) window.lucide.createIcons();
            setTimeout(() => {
                btn.innerHTML = original;
                if (window.lucide) window.lucide.createIcons();
            }, 2000);
        }

        if (e.target.closest('#btn-share-report')) {
            if (navigator.share) {
                navigator.share({
                    title: 'Crônica da Partida - Narrador Pro',
                    text: reportMarkdown
                }).catch(() => {});
            } else {
                alert("Compartilhamento não suportado neste navegador.");
            }
        }
    }, { signal });
}
