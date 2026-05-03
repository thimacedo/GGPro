/**
 * Módulo de Detalhes e Listas de Jogadores
 * Renderiza informações da partida e elencos.
 */

export function renderMatchDetails(state, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const competition = state.competition || "Competição Não Definida";
  const date = state.matchDate || "Data Não Definida";
  const stadium = state.stadium || "Local Não Definido";

  container.innerHTML = `
    <div class="details-card">
      <h2 class="details-card__title">Detalhes</h2>
      <div class="details-list">
        <div class="details-list__item">
          <div class="details-list__icon"><i data-lucide="activity"></i></div>
          <span class="details-list__text">${competition}</span>
        </div>
        <div class="details-list__item">
          <div class="details-list__icon"><i data-lucide="clock"></i></div>
          <span class="details-list__text">${date}</span>
        </div>
        <div class="details-list__item">
          <div class="details-list__icon"><i data-lucide="map-pin"></i></div>
          <span class="details-list__text">${stadium}</span>
        </div>
      </div>
    </div>
  `;

  if (window.lucide) {
    window.lucide.createIcons({
      root: container,
      attrs: { class: "lucide-icon lucide-icon--red", stroke: "#ef4444", "stroke-width": 2.5 }
    });
  }
}

/**
 * Renderiza a lista de jogadores dos dois times.
 */
export function renderPlayerLists(state) {
  const renderTeam = (team, side) => `
    <div class="flex-1 min-w-0">
      <h3 class="text-[10px] font-black uppercase text-slate-500 mb-3 px-2 tracking-widest">${team.name}</h3>
      <div class="flex flex-col gap-1">
        ${(team.players || []).map(p => `
          <div class="player-list-item animate-fade">
            <span class="w-6 text-[10px] font-black text-blue-500">${p.number || '--'}</span>
            <span class="flex-1 truncate text-xs font-bold text-slate-300">${p.name}</span>
            <span class="text-[8px] font-black text-slate-600 uppercase">${p.position || ''}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  return `
    <div class="flex flex-col md:flex-row gap-6 p-4 h-full overflow-y-auto custom-scrollbar">
      ${renderTeam(state.homeTeam, 'home')}
      <div class="hidden md:block w-px bg-white/5"></div>
      ${renderTeam(state.awayTeam, 'away')}
    </div>
  `;
}
