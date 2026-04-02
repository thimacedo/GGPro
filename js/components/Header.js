import { formatDuration } from '../utils.js';

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
    <header class="bg-slate-900 border-b border-white/10 shadow-2xl relative z-50 py-2 md:py-4">
      <div class="max-w-7xl mx-auto px-2 md:px-4 flex justify-between items-center">
        <!-- HOME TEAM -->
        <div class="flex flex-1 items-center justify-end gap-1 md:gap-4 min-w-0">
          <div class="flex flex-col items-end min-w-0 group">
            <h2 class="text-[10px] md:text-xl font-black truncate text-white uppercase tracking-tighter cursor-pointer hover:text-blue-400 transition-colors flex items-center gap-1 md:gap-2" onclick="app.editTeamName('home')">
              <i data-lucide="pencil" class="w-2.5 h-2.5 md:w-3 md:h-3 opacity-100 md:opacity-0 md:group-hover:opacity-100 shrink-0"></i>
              ${state.homeTeam.shortName}
            </h2>
            <span class="text-[7px] md:text-[8px] font-black text-slate-500 uppercase tracking-widest">${state.homeTeam.formation}</span>
          </div>
          <div class="flex flex-col items-center">
            <div class="rounded-lg md:rounded-2xl flex items-center justify-center font-black shadow-xl transition-all w-8 h-8 md:w-14 md:h-14 text-sm md:text-3xl ${homeContrast}" style="background-color: ${state.homeTeam.color}">
              ${homeGoals}
            </div>
          </div>
        </div>

        <!-- CLOCK -->
        <div class="flex flex-col items-center justify-center min-w-[80px] md:min-w-[180px]">
           <div class="flex items-center gap-1 md:gap-2 mb-0.5 md:mb-1">
              <div class="text-[7px] md:text-[9px] font-black text-blue-500 uppercase tracking-[0.2em] md:tracking-[0.3em]">${state.period}</div>
              <button onclick="app.togglePlayPause()" class="p-0.5 md:p-1 rounded-md ${state.isPaused ? 'text-emerald-500' : 'text-yellow-500'}">
                <i data-lucide="${state.isPaused ? 'play' : 'pause'}" class="w-2.5 h-2.5 md:w-3 md:h-3" fill="currentColor"></i>
              </button>
           </div>
           <div id="timer-display" class="text-xl md:text-5xl font-black tabular-nums tracking-tighter text-white">
              00:00
           </div>
           <button onclick="app.nextPeriod()" class="mt-0.5 md:mt-1 text-[6px] md:text-[7px] font-black text-slate-500 hover:text-white uppercase tracking-widest flex items-center gap-1">
              Próximo <i data-lucide="chevron-right" class="w-1.5 h-1.5 md:w-2 md:h-2"></i>
           </button>
        </div>

        <!-- AWAY TEAM -->
        <div class="flex flex-1 items-center justify-start gap-1 md:gap-4 min-w-0">
          <div class="flex flex-col items-center">
            <div class="rounded-lg md:rounded-2xl flex items-center justify-center font-black shadow-xl transition-all w-8 h-8 md:w-14 md:h-14 text-sm md:text-3xl ${awayContrast}" style="background-color: ${state.awayTeam.color}">
              ${awayGoals}
            </div>
          </div>
          <div class="flex flex-col items-start min-w-0 group">
            <h2 class="text-[10px] md:text-xl font-black truncate text-white uppercase tracking-tighter cursor-pointer hover:text-blue-400 transition-colors flex items-center gap-1 md:gap-2" onclick="app.editTeamName('away')">
              ${state.awayTeam.shortName}
              <i data-lucide="pencil" class="w-2.5 h-2.5 md:w-3 md:h-3 opacity-100 md:opacity-0 md:group-hover:opacity-100 shrink-0"></i>
            </h2>
            <span class="text-[7px] md:text-[8px] font-black text-slate-500 uppercase tracking-widest">${state.awayTeam.formation}</span>
          </div>
        </div>
      </div>
      
      <div class="w-full bg-slate-950/50 border-t border-white/5 py-1 px-4 flex justify-center items-center gap-4 md:gap-8 text-[8px] md:text-[10px] text-slate-400 uppercase tracking-widest font-bold">
          <span class="flex items-center gap-1"><i data-lucide="trophy" class="w-2.5 h-2.5 md:w-3 md:h-3 text-yellow-500"></i> ${state.competition || "Camp. Não Definido"}</span>
          <span class="hidden sm:flex items-center gap-1"><i data-lucide="map-pin" class="w-2.5 h-2.5 md:w-3 md:h-3"></i> ${state.stadium || "Local"}</span>
          <span class="hidden sm:flex items-center gap-1"><i data-lucide="user" class="w-2.5 h-2.5 md:w-3 md:h-3"></i> ${state.referee || "Árbitro"}</span>
      </div>
    </header>
  `;
};
