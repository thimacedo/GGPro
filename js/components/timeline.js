/**
 * Módulo de Cronologia (Feed Style)
 * Implementa a lógica Feed, Bouncer e Avatares Dinâmicos.
 */

export function renderTimeline(events, getPlayerById, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // Imutabilidade: cria cópia antes de ordenar (Mais recentes no topo)
  const sortedEvents = [...events].sort((a, b) => b.timestamp - a.timestamp);

  const html = sortedEvents.map((event) => {
    // Bouncer para delimitadores
    if (event.type === 'PERIOD_START' || event.type === 'PERIOD_END') {
      return `
        <div class="timeline__marker">
          <span class="timeline__marker-label">${event.description}</span>
        </div>
      `;
    }

    const player = event.playerId ? getPlayerById(event.playerId) : null;
    const periodText = event.minute > 45 ? '2T' : '1T'; // Ajuste conforme lógica de tempo extra
    
    let playerHtml = '';
    if (player) {
      const initial = player.name.charAt(0).toUpperCase();
      playerHtml = `
        <div class="feed-card__player">
          <div class="feed-card__avatar">
            ${initial}
          </div>
          <div class="feed-card__player-info">
            <span class="feed-card__player-name">${player.name}</span>
            <span class="feed-card__player-role">${player.position}</span>
          </div>
        </div>
      `;
    }

    return `
      <div class="feed-card">
        <div class="feed-card__header">
          <span class="feed-card__time">${event.minute}'</span>
          <span class="feed-card__period">${periodText}</span>
        </div>
        ${playerHtml}
        <p class="feed-card__desc">${event.description}</p>
      </div>
    `;
  }).join('');

  container.innerHTML = `<div class="timeline-feed">${html}</div>`;
}
