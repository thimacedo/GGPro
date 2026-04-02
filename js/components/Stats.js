export const Stats = (state) => {
  const homeEvents = state.events.filter(e => e.teamId === 'home');
  const awayEvents = state.events.filter(e => e.teamId === 'away');

  const getCount = (teamEvents, type) => teamEvents.filter(e => e.type === type && !e.isAnnulled).length;

  const stats = [
    { label: 'Gols', home: getCount(homeEvents, 'GOAL'), away: getCount(awayEvents, 'GOAL') },
    { label: 'Cartões Amarelos', home: getCount(homeEvents, 'YELLOW_CARD'), away: getCount(awayEvents, 'YELLOW_CARD') },
    { label: 'Cartões Vermelhos', home: getCount(homeEvents, 'RED_CARD'), away: getCount(awayEvents, 'RED_CARD') },
    { label: 'Faltas', home: getCount(homeEvents, 'FOUL'), away: getCount(awayEvents, 'FOUL') },
    { label: 'Finalizações', home: getCount(homeEvents, 'SHOT'), away: getCount(awayEvents, 'SHOT') }
  ];

  const renderStatRow = (stat) => {
    const total = stat.home + stat.away || 1;
    const homePct = (stat.home / total) * 100;
    const awayPct = (stat.away / total) * 100;

    return `
      <div style="margin-bottom: 2rem;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem; font-size: 0.75rem; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em;">
          <span style="color: ${state.homeTeam.color}">${stat.home}</span>
          <span style="color: var(--slate-400)">${stat.label}</span>
          <span style="color: ${state.awayTeam.color}">${stat.away}</span>
        </div>
        <div style="height: 0.5rem; background: var(--slate-800); border-radius: 1rem; display: flex; overflow: hidden;">
          <div style="width: ${homePct}%; background: ${state.homeTeam.color}; transition: width 0.5s;"></div>
          <div style="width: ${awayPct}%; background: ${state.awayTeam.color}; transition: width 0.5s;"></div>
        </div>
      </div>
    `;
  };

  return `
    <div class="card" style="padding: 2.5rem; max-width: 40rem; margin: 0 auto; width: 100%;">
      <h2 style="font-size: 1.5rem; font-weight: 900; color: white; text-transform: uppercase; letter-spacing: -0.05em; margin-bottom: 2.5rem; text-align: center;">Estatísticas da Partida</h2>
      <div style="display: flex; flex-direction: column;">
        ${stats.map(renderStatRow).join('')}
      </div>
      
      <div style="margin-top: 2rem; padding-top: 2rem; border-top: 1px solid var(--border-color); text-align: center;">
        <button onclick="app.setActiveTab('main')" class="btn-submit" style="background: var(--slate-800); box-shadow: none;">VOLTAR AO DASHBOARD</button>
      </div>
    </div>
  `;
};
