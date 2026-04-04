export function renderMatchDetails(matchState, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
        <div class="match-details-card">
            <h3 class="match-details__title uppercase tracking-widest">${matchState.competition}</h3>
            <div class="match-details__info">
                <span class="match-details__item">
                    <i data-lucide="map-pin"></i> ${matchState.stadium}
                </span>
                <span class="match-details__item">
                    <i data-lucide="calendar"></i> ${matchState.matchDate}
                </span>
                <span class="match-details__item">
                    <i data-lucide="clock"></i> Período: ${matchState.period}
                </span>
            </div>
        </div>
    `;

    if (window.lucide) {
        window.lucide.createIcons();
    }
}
