import { processOCR, readRegulation } from '../services/geminiService.js';

/**
 * Modern Match Settings Modal
 * Integrated with Gemini AI for roster OCR and regulation reading.
 */
export function showMatchSettings(homeTeam, awayTeam) {
    // Check if modal already exists to prevent duplicates
    if (document.getElementById('match-settings-modal')) return;

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'match-settings-modal';
    
    modal.innerHTML = `
        <div class="modal-card">
            <div class="modal-header-accent"></div>
            <button class="btn-close" id="modal-close"><i data-lucide="x"></i></button>
            
            <div class="modal-content">
                <h2 class="uppercase tracking-widest-xl mb-6 text-center" style="font-size: 1.25rem;">Ajustes de Partida</h2>
                
                <div class="input-group">
                    <label class="input-label">Competição</label>
                    <input type="text" class="text-input" placeholder="Ex: Libertadores 2024" value="Campeonato Nacional">
                </div>

                <div class="dashboard-grid" style="grid-template-columns: 1fr 1fr; margin-bottom: 1.5rem;">
                    <div class="card p-4" style="text-align: center; border-color: ${homeTeam.color || 'var(--red-500)'}">
                        <div class="uppercase tracking-widest mb-3" style="font-size: 0.65rem; color: var(--slate-400)">Súmula (Casa)</div>
                        <div class="font-bold mb-4">${homeTeam.shortName || 'Home'}</div>
                        <input type="file" id="roster-home" class="hidden" accept="image/*" style="display:none">
                        <button class="btn-view" style="width: 100%; justify-content: center" onclick="document.getElementById('roster-home').click()">
                            <i data-lucide="camera" style="width: 1rem"></i> SCAN AI
                        </button>
                    </div>

                    <div class="card p-4" style="text-align: center; border-color: ${awayTeam.color || 'var(--emerald-500)'}">
                        <div class="uppercase tracking-widest mb-3" style="font-size: 0.65rem; color: var(--slate-400)">Súmula (Fora)</div>
                        <div class="font-bold mb-4">${awayTeam.shortName || 'Away'}</div>
                        <input type="file" id="roster-away" class="hidden" accept="image/*" style="display:none">
                        <button class="btn-view" style="width: 100%; justify-content: center" onclick="document.getElementById('roster-away').click()">
                            <i data-lucide="camera" style="width: 1rem"></i> SCAN AI
                        </button>
                    </div>
                </div>

                <div class="card p-4 mb-6">
                    <div class="uppercase tracking-widest mb-3" style="font-size: 0.65rem; color: var(--slate-400)">Regulamento (PDF/IMG)</div>
                    <input type="file" id="regulation-file" class="hidden" accept="application/pdf,image/*" style="display:none">
                    <button class="btn-view" style="width: 100%; justify-content: center" onclick="document.getElementById('regulation-file').click()">
                        <i data-lucide="file-text" style="width: 1rem"></i> Ler com Gemini
                    </button>
                </div>

                <button class="btn-submit" id="save-settings">Salvar Configurações</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    
    // Initializing Lucide icons
    if (window.lucide) {
        window.lucide.createIcons();
    }

    // Modal behavior functions
    const closeModal = () => {
        modal.classList.add('closing');
        setTimeout(() => modal.remove(), 200);
    };

    // --- EVENT DELEGATION (Phase 17) ---
    modal.addEventListener('click', (e) => {
        // Close on overlay or button
        if (e.target.closest('#modal-close') || e.target === modal) {
            closeModal();
        }
        
        // Save settings
        if (e.target.closest('#save-settings')) {
            console.log('Match settings saved via modal.');
            closeModal();
        }
    });

    // --- INTEGRATION LISTENERS (Phase 17) ---
    modal.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (e.target.id === 'roster-home' || e.target.id === 'roster-away') {
            const team = e.target.id === 'roster-home' ? 'home' : 'away';
            const result = await processOCR(file, team);
            alert(`Súmula de ${team} processada: ${result.extractedPlayers.length} jogadores detectados.`);
        }

        if (e.target.id === 'regulation-file') {
            const result = await readRegulation(file);
            alert(`Regulamento lido: ${result.rules.length} regras extraídas.`);
        }
    });
}
