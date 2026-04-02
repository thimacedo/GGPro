export const PlayerStatusIcons = (player) => {
  const hasGoal = player.events?.some(e => e.type === 'GOAL' && !e.isAnnulled);
  const yellowCards = player.events?.filter(e => e.type === 'YELLOW_CARD' && !e.isAnnulled).length || 0;
  const hasRedCard = player.events?.some(e => e.type === 'RED_CARD' && !e.isAnnulled);
  
  if (!hasGoal && yellowCards === 0 && !hasRedCard) return '';

  return `
    <div class="marker-status-icons">
      ${hasGoal ? `<i data-lucide="circle-dot" style="width: 0.875rem; height: 0.875rem; color: #fbbf24; fill: #fbbf24;"></i>` : ''}
      ${yellowCards > 0 ? `<i data-lucide="rectangle-vertical" style="width: 0.75rem; height: 0.75rem; color: #facc15; fill: #facc15;"></i>` : ''}
      ${hasRedCard ? `<i data-lucide="rectangle-vertical" style="width: 0.75rem; height: 0.75rem; color: #ef4444; fill: #ef4444;"></i>` : ''}
    </div>
  `;
};

const getContrastColor = (hexcolor) => {
  if (!hexcolor || hexcolor === 'transparent') return 'white';
  const hex = hexcolor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16), g = parseInt(hex.substring(2, 4), 16), b = parseInt(hex.substring(4, 6), 16);
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  return yiq >= 128 ? '#0f172a' : 'white';
};

export const Field = (state) => {
  const renderPlayers = (team, isHome) => {
    const contrast = getContrastColor(team.color);
    
    return team.players.filter(p => p.isStarter).map(player => {
      const displayX = isHome ? player.x : (100 - player.x);
      const displayY = isHome ? player.y : (100 - player.y);

      return `
        <div 
          class="player-marker" 
          style="top: ${displayY}%; left: ${displayX}%;"
          onmousedown="app.handlePlayerDragStart(event, '${team.id}', '${player.id}')"
          ontouchstart="app.handlePlayerDragStart(event, '${team.id}', '${player.id}')"
          onclick="event.stopPropagation(); app.openPlayerActions('${player.id}', '${team.id}')"
        >
          <div class="player-circle" style="background-color: ${team.color}; color: ${contrast};">
            ${player.number}
            ${PlayerStatusIcons(player)}
          </div>
          <div class="player-marker-label">${player.name}</div>
        </div>
      `;
    }).join('');
  };

  return `
    <div class="field-container" id="tactical-field">
      <div class="field-grass"></div>
      <div class="field-lines"></div>
      <div class="field-center-circle"></div>
      <div class="field-midline"></div>
      <div class="field-area home"></div>
      <div class="field-area away"></div>
      
      ${renderPlayers(state.homeTeam, true)}
      ${renderPlayers(state.awayTeam, false)}

      <div style="position: absolute; bottom: 1rem; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.6); backdrop-filter: blur(8px); padding: 0.5rem 1rem; border-radius: 99px; border: 1px solid rgba(255,255,255,0.1); pointer-events: none;">
        <p style="font-size: 0.5rem; font-weight: 900; color: rgba(255,255,255,0.7); text-transform: uppercase; letter-spacing: 0.2em; margin: 0;">Mapa Tático Interativo • Narrador Pro</p>
      </div>
    </div>
  `;
};
