/**
 * @fileoverview Componente de Mapa Tático Interativo (Narrador Pro).
 * Implementado em Vanilla JS puro com suporte a Drag & Drop e sincronização Real-time.
 */

let dragHandler = null;

export function renderTacticalField(homeTeam, awayTeam, containerId, onUpdate) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Renderiza a estrutura básica do campo
    container.innerHTML = `
        <div class="tactical-field-wrapper">
            <div class="tactical-pitch" id="tactical-pitch">
                <div class="pitch-lines">
                    <div class="pitch-center-circle"></div>
                    <div class="pitch-center-line"></div>
                    <div class="pitch-penalty-area home"></div>
                    <div class="pitch-penalty-area away"></div>
                </div>
                
                <div class="players-layer" id="players-layer">
                    ${renderPlayers(homeTeam, 'home')}
                    ${renderPlayers(awayTeam, 'away')}
                </div>

                <div class="field-overlay-instruction">
                    <i data-lucide="mouse-pointer-2"></i>
                    MAPA TÁTICO INTERATIVO • ARRASTE PARA POSICIONAR
                </div>
            </div>
        </div>
    `;

    if (window.lucide) window.lucide.createIcons();

    setupDragListeners(container, onUpdate);
}

function renderPlayers(team, teamSide) {
    const isHome = teamSide === 'home';
    const players = team.players || [];
    
    // Filtra apenas titulares (isStarter) para não poluir o campo
    return players.filter(p => p.isStarter).map(p => {
        const x = isHome ? (p.coordX || 25) : (p.coordX || 75);
        const y = p.coordY || 50;

        return `
            <div class="player-marker" 
                 style="left: ${x}%; top: ${y}%; background: ${team.color || (isHome ? '#ef4444' : '#10b981')}"
                 data-player-id="${p.id}" 
                 data-team-id="${teamSide}">
                <div class="player-marker-number">${p.number}</div>
                <div class="player-marker-name">${p.name.split(' ')[0]}</div>
            </div>
        `;
    }).join('');
}

function setupDragListeners(container, onUpdate) {
    const pitch = container.querySelector('#tactical-pitch');
    const players = container.querySelectorAll('.player-marker');
    let activePlayer = null;

    players.forEach(player => {
        player.addEventListener('mousedown', (e) => {
            activePlayer = player;
            player.classList.add('dragging');
        });
    });

    document.addEventListener('mousemove', (e) => {
        if (!activePlayer || !pitch) return;

        const rect = pitch.getBoundingClientRect();
        let x = ((e.clientX - rect.left) / rect.width) * 100;
        let y = ((e.clientY - rect.top) / rect.height) * 100;

        // Limites (5% a 95%)
        x = Math.max(5, Math.min(95, x));
        y = Math.max(5, Math.min(95, y));

        activePlayer.style.left = `${x}%`;
        activePlayer.style.top = `${y}%`;
    });

    document.addEventListener('mouseup', () => {
        if (!activePlayer) return;

        const playerId = activePlayer.dataset.playerId;
        const teamId = activePlayer.dataset.teamId;
        const x = parseFloat(activePlayer.style.left);
        const y = parseFloat(activePlayer.style.top);

        activePlayer.classList.remove('dragging');
        
        // Callback para sincronizar com o Firebase
        if (onUpdate) onUpdate(teamId, playerId, x, y);
        
        activePlayer = null;
    });

    // Touch Support
    players.forEach(player => {
        player.addEventListener('touchstart', (e) => {
            activePlayer = player;
            player.classList.add('dragging');
        }, { passive: false });
    });

    document.addEventListener('touchmove', (e) => {
        if (!activePlayer || !pitch) return;
        const touch = e.touches[0];
        const rect = pitch.getBoundingClientRect();
        let x = ((touch.clientX - rect.left) / rect.width) * 100;
        let y = ((touch.clientY - rect.top) / rect.height) * 100;
        x = Math.max(5, Math.min(95, x));
        y = Math.max(5, Math.min(95, y));
        activePlayer.style.left = `${x}%`;
        activePlayer.style.top = `${y}%`;
    }, { passive: false });

    document.addEventListener('touchend', () => {
        if (activePlayer && onUpdate) {
            onUpdate(activePlayer.dataset.teamId, activePlayer.dataset.playerId, parseFloat(activePlayer.style.left), parseFloat(activePlayer.style.top));
        }
        if (activePlayer) activePlayer.classList.remove('dragging');
        activePlayer = null;
    });
}

