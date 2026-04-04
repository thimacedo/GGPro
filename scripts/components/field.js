/**
 * @fileoverview Renderização do Mapa Tático e plotagem de jogadores.
 */

export function renderTacticalField(homeTeam, awayTeam, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Função auxiliar para plotar jogadores com base na posição e time
    const renderPlayers = (team, isHome) => {
        if (!team || !team.players) return '';
        
        // No momento usamos alocação baseada em quadrantes para demonstração
        return team.players.filter(p => p.isStarter !== false).map((player, index) => {
            // Lado Esquerdo (Casa) vs Lado Direito (Fora)
            const x = isHome ? 15 + (Math.random() * 30) : 85 - (Math.random() * 30);
            const y = 10 + (Math.random() * 80);
            
            return `
                <div class="tactical-player" style="left: ${x}%; top: ${y}%; background-color: ${isHome ? team.color : '#ffffff'}; color: ${isHome ? '#ffffff' : team.color}; border: 2px solid ${team.color};">
                    <span class="tactical-player__number">${player.number || '-'}</span>
                    <span class="tactical-player__name">${player.name?.split(' ')[0] || 'JOG'}</span>
                </div>
            `;
        }).join('');
    };

    container.innerHTML = `
        <div class="field-wrapper">
            <div class="soccer-field">
                <div class="field-line field-center-line"></div>
                <div class="field-circle field-center-circle"></div>
                <div class="field-box field-penalty-box-left"></div>
                <div class="field-box field-goal-box-left"></div>
                <div class="field-box field-penalty-box-right"></div>
                <div class="field-box field-goal-box-right"></div>
                
                ${renderPlayers(homeTeam, true)}
                ${renderPlayers(awayTeam, false)}
            </div>
        </div>
    `;
}
