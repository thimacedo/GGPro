export const Header = (state) => {
  const homeGoals = state.events.filter(e => e.teamId === 'home' && e.type === 'GOAL' && !e.isAnnulled).length;
  const awayGoals = state.events.filter(e => e.teamId === 'away' && e.type === 'GOAL' && !e.isAnnulled).length;

  const getContrastColor = (hexcolor) => {
    if (!hexcolor || hexcolor === 'transparent') return 'text-white';
    const hex = hexcolor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16), g = parseInt(hex.substring(2, 4), 16), b = parseInt(hex.substring(4, 6), 16);
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return yiq >= 128 ? 'text-slate-900' : 'text-white';
  };

  const homeContrast = getContrastColor(state.homeTeam.color);
  const awayContrast = getContrastColor(state.awayTeam.color);

  return `
    <header class="app-header">
      <div style="position: absolute; left: 1rem; top: 0.5rem; z-index: 60;">
        <button onclick="app.toggleTheme()" style="background: rgba(255,255,255,0.05); border: 1px solid var(--border-color); border-radius: 0.75rem; padding: 0.4rem; cursor: pointer; color: var(--slate-400);">
          <i data-lucide="${app.isLightMode ? 'moon' : 'sun'}" style="width: 1rem; height: 1rem;"></i>
        </button>
      </div>
      <div class="top-bar">
        <!-- HOME TEAM -->
        <div class="team-info home">
          <div class="team-titles home">
            <h2 class="team-name-h2 font-black uppercase tracking-tighter" onclick="app.editTeamName('home')">
              <i data-lucide="pencil" style="width: 0.75rem; height: 0.75rem;"></i>
              ${state.homeTeam.shortName}
            </h2>
            <span class="formation-badge font-black uppercase tracking-widest">${state.homeTeam.formation}</span>
          </div>
          <div class="score-badge ${homeContrast}" style="background-color: ${state.homeTeam.color}">
            ${homeGoals}
          </div>
        </div>

        <!-- CLOCK -->
        <div class="clock-container">
           <div class="header-controls" style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
              <div class="period-badge font-black uppercase tracking-widest-xl">${state.period}</div>
              <button onclick="app.togglePlayPause()" style="background: transparent; border: none; cursor: pointer; color: ${state.isPaused ? 'var(--emerald-500)' : 'var(--yellow-500)'}">
                <i data-lucide="${state.isPaused ? 'play' : 'pause'}" style="width: 0.75rem; height: 0.75rem;" fill="currentColor"></i>
              </button>
           </div>
           <div id="timer-display" class="timer-text font-black tracking-tighter">00:00</div>
            <button onclick="${state.period === '2T' ? 'app.openEndGameOptions()' : 'app.nextPeriod()'}" style="background: transparent; border: none; cursor: pointer; color: var(--slate-500); font-size: 0.5rem; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; display: flex; align-items: center; gap: 0.25rem; margin-top: 0.25rem;">
               ${state.period === '2T' ? 'FIM REGL.' : state.period === 'FINISHED' ? 'REINICIAR' : 'PRÓXIMO'} 
               <i data-lucide="${state.period === 'FINISHED' ? 'rotate-ccw' : 'chevron-right'}" style="width: 0.5rem; height: 0.5rem;"></i>
            </button>
        </div>

        <!-- AWAY TEAM -->
        <div class="team-info away">
          <div class="score-badge ${awayContrast}" style="background-color: ${state.awayTeam.color}">
            ${awayGoals}
          </div>
          <div class="team-titles">
            <h2 class="team-name-h2 font-black uppercase tracking-tighter" onclick="app.editTeamName('away')">
              ${state.awayTeam.shortName}
              <i data-lucide="pencil" style="width: 0.75rem; height: 0.75rem;"></i>
            </h2>
            <span class="formation-badge font-black uppercase tracking-widest">${state.awayTeam.formation}</span>
          </div>
        </div>
      </div>
      
      <div class="match-info-bar" style="width: 100%; background: rgba(0,0,0,0.2); border-top: 1px solid var(--border-color); padding: 0.25rem 1rem; display: flex; justify-content: center; gap: 2rem; font-size: 0.625rem; color: var(--slate-400); font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em;">
          <span style="display: flex; align-items: center; gap: 0.25rem;"><i data-lucide="trophy" style="width: 0.75rem; height: 0.75rem; color: var(--yellow-500);"></i> ${state.competition || "Camp. Não Definido"}</span>
          <span style="display: flex; align-items: center; gap: 0.25rem;"><i data-lucide="map-pin" style="width: 0.75rem; height: 0.75rem;"></i> ${state.stadium || "Local"}</span>
          <span style="display: flex; align-items: center; gap: 0.25rem; cursor: pointer; color: var(--blue-400);" onclick="app.setActiveTab(app.activeTab === 'main' ? 'stats' : 'main')">
            <i data-lucide="bar-chart-2" style="width: 0.75rem; height: 0.75rem;"></i> 
            ${app.activeTab === 'main' ? 'VER ESTATÍSTICAS' : 'VOLTAR AO JOGO'}
          </span>
      </div>
    </header>
  `;
};
