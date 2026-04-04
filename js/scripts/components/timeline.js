export function renderTimeline(events, getPlayerById, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Sorting without mutating (Phase 18 requirements)
    const sortedEvents = [...events].sort((a, b) => {
        // Assume event has a numeric 'time' property, then period
        return (parseInt(a.time) || 0) - (parseInt(b.time) || 0);
    }).reverse(); // Most recent first for feed style

    container.innerHTML = `
        <div class="timeline-feed">
            <h4 class="timeline-feed__header uppercase tracking-widest">Cronologia</h4>
            ${sortedEvents.length === 0 ? '<p class="timeline-empty">Nenhum evento registrado ainda.</p>' : ''}
            <div class="timeline-items">
                ${sortedEvents.map(event => {
                    const player = event.playerId ? getPlayerById(event.playerId) : null;
                    return `
                        <div class="timeline-item timeline-item--${event.type}">
                            <div class="timeline-item__avatar">
                                ${player ? `
                                    <div class="avatar-circle" style="background-color: ${event.team === 'home' ? 'var(--red-500)' : 'var(--emerald-500)'}">
                                        ${player.shortName || player.name[0]}
                                    </div>
                                ` : '<i data-lucide="activity"></i>'}
                            </div>
                            <div class="timeline-item__content">
                                <div class="timeline-item__header">
                                    <span class="timeline-item__time">${event.period} - ${event.timeStr || ''}</span>
                                    <span class="timeline-item__type uppercase">${event.type}</span>
                                </div>
                                <div class="timeline-item__desc">
                                    ${player ? `<strong>${player.name}</strong>` : ''} ${event.description || ''}
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;

    if (window.lucide) {
        window.lucide.createIcons();
    }
}
