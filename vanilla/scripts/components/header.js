// Componente Header - Narrador Pro

import matchState from '../state.js';

const getContrastColor = (hexcolor) => {
  if (!hexcolor || hexcolor === 'transparent') return 'text-white';
  const hex = hexcolor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  return yiq >= 128 ? 'text-slate-900' : 'text-white';
};

export function renderHeader(container, callbacks) {
  const state = matchState.getState();
  const { onPlayPauseToggle, onNextPeriodClick, onUpdateTeamName, isFullscreen } = callbacks;
  
  const homeContrast = getContrastColor(state.homeTeam?.color || '#000');
  const awayContrast = getContrastColor(state.awayTeam?.color || '#FFF');
  const safeEventsCountHome = (state.events || []).filter(e => e.teamId === 'home' && e.type === 'GOAL' && !e.isAnnulled).length;
  const safeEventsCountAway = (state.events || []).filter(e => e.teamId === 'away' && e.type === 'GOAL' && !e.isAnnulled).length;

  container.innerHTML = `
    <header class="bg-slate-900 border-b border-white/10 shadow-2xl relative z-50 transition-all duration-500">
      <div class="max-w-7xl mx-auto px-2 md:px-4 py-2 md:py-4 flex justify-between items-center transition-all">
        <!-- HOME TEAM -->
        <div class="flex flex-1 items-center justify-end gap-1 md:gap-4 min-w-0">
          <div class="flex flex-col items-end min-w-0 group">
            <h2 
              class="text-[10px] md:text-xl font-black truncate text-white uppercase tracking-tighter cursor-pointer hover:text-blue-400 transition-colors flex items-center gap-1 md:gap-2"
              data-team="home"
            >
              <svg class="w-2 h-2 md:w-3 md:h-3 opacity-100 md:opacity-0 md:group-hover:opacity-100 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              ${state.homeTeam.shortName}
            </h2>
            <span class="text-[7px] md:text-[8px] font-black text-slate-500 uppercase tracking-widest">${state.homeTeam.formation}</span>
          </div>
          
          <div class="flex flex-col items-center">
            <div class="rounded-lg md:rounded-2xl flex items-center justify-center font-black shadow-xl transition-all w-8 h-8 md:w-14 md:h-14 text-sm md:text-3xl ${homeContrast}" style="background-color: ${state.homeTeam.color}">
              ${safeEventsCountHome}
            </div>
          </div>
        </div>

        <!-- CLOCK -->
        <div class="flex flex-col items-center justify-center min-w-[80px] md:min-w-[180px] transition-all">
           <div class="flex items-center gap-1 md:gap-2 mb-0.5 md:mb-1">
              <div class="text-[7px] md:text-[9px] font-black text-blue-500 uppercase tracking-[0.2em] md:tracking-[0.3em]">${state.period}</div>
              <button id="playPauseBtn" class="p-0.5 md:p-1 rounded-md ${state.isPaused ? 'text-emerald-500' : 'text-yellow-500'}">
                ${state.isPaused ? 
                  '<svg class="w-3 h-3 md:w-4 md:h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>' : 
                  '<svg class="w-3 h-3 md:w-4 md:h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>'
                }
              </button>
           </div>
           <div id="timerDisplay" class="text-sm md:text-3xl font-mono font-black tracking-tighter flex items-center text-white bg-slate-800/50 px-2 md:px-3 py-0.5 md:py-1 rounded-lg md:rounded-xl border border-white/5 shadow-inner transition-all">
              <span id="timerMinutes">00</span>
              <span id="timerSeparator" class="${!state.isPaused ? 'animate-pulse text-blue-500' : 'text-slate-700'}">:</span>
              <span id="timerSeconds">00</span>
           </div>
           <button id="nextPeriodBtn" class="mt-0.5 md:mt-1 text-[6px] md:text-[7px] font-black text-slate-500 hover:text-white uppercase tracking-widest flex items-center gap-1">
              Próximo <svg class="w-2 h-2 md:w-3 md:h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
           </button>
        </div>

        <!-- AWAY TEAM -->
        <div class="flex flex-1 items-center justify-start gap-1 md:gap-4 min-w-0">
          <div class="flex flex-col items-center">
            <div class="rounded-lg md:rounded-2xl flex items-center justify-center font-black shadow-xl transition-all w-8 h-8 md:w-14 md:h-14 text-sm md:text-3xl ${awayContrast}" style="background-color: ${state.awayTeam.color}">
              ${safeEventsCountAway}
            </div>
          </div>
          
          <div class="flex flex-col items-start min-w-0 group">
            <h2 
              class="text-[10px] md:text-xl font-black truncate text-white uppercase tracking-tighter cursor-pointer hover:text-blue-400 transition-colors flex items-center gap-1 md:gap-2"
              data-team="away"
            >
              ${state.awayTeam.shortName}
              <svg class="w-2 h-2 md:w-3 md:h-3 opacity-100 md:opacity-0 md:group-hover:opacity-100 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </h2>
            <span class="text-[7px] md:text-[8px] font-black text-slate-500 uppercase tracking-widest">${state.awayTeam.formation}</span>
          </div>
        </div>
      </div>
      
      ${!isFullscreen ? `
      <div class="w-full bg-slate-950/50 border-t border-white/5 py-1 px-4 flex justify-center items-center gap-4 md:gap-8 text-[8px] md:text-[10px] text-slate-400 uppercase tracking-widest font-bold">
          <span class="flex items-center gap-1">
            <svg class="w-3 h-3 text-yellow-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
            ${state.competition || "Camp. Não Definido"}
          </span>
          <span class="hidden sm:flex items-center gap-1">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
            ${state.stadium || "Local"}
          </span>
          <span class="hidden sm:flex items-center gap-1">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
            ${state.referee || "Árbitro"}
          </span>
      </div>
      `}
    </header>
  `;

  // Event listeners
  const playPauseBtn = container.querySelector('#playPauseBtn');
  const nextPeriodBtn = container.querySelector('#nextPeriodBtn');
  const homeNameEl = container.querySelector('[data-team="home"]');
  const awayNameEl = container.querySelector('[data-team="away"]');

  if (playPauseBtn) {
    playPauseBtn.addEventListener('click', () => {
      matchState.handlePlayPauseToggle();
      if (onPlayPauseToggle) onPlayPauseToggle();
    });
  }

  if (nextPeriodBtn) {
    nextPeriodBtn.addEventListener('click', () => {
      if (onNextPeriodClick) onNextPeriodClick();
    });
  }

  if (homeNameEl) {
    homeNameEl.addEventListener('click', () => {
      const newName = prompt('Nome do time mandante:', state.homeTeam.name);
      if (newName && newName.trim()) {
        if (onUpdateTeamName) onUpdateTeamName('home', newName.trim());
      }
    });
  }

  if (awayNameEl) {
    awayNameEl.addEventListener('click', () => {
      const newName = prompt('Nome do time visitante:', state.awayTeam.name);
      if (newName && newName.trim()) {
        if (onUpdateTeamName) onUpdateTeamName('away', newName.trim());
      }
    });
  }
}

export function updateTimer() {
  const state = matchState.getState();
  const now = Date.now();
  const totalMs = state.timeElapsed + (state.timerStartedAt && !state.isPaused ? now - state.timerStartedAt : 0);
  const totalSecs = Math.floor(totalMs / 1000);
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;

  const minutesEl = document.getElementById('timerMinutes');
  const secondsEl = document.getElementById('timerSeconds');
  const separatorEl = document.getElementById('timerSeparator');

  if (minutesEl) minutesEl.textContent = String(mins).padStart(2, '0');
  if (secondsEl) secondsEl.textContent = String(secs).padStart(2, '0');
  if (separatorEl) {
    separatorEl.className = !state.isPaused ? 'animate-pulse text-blue-500' : 'text-slate-700';
  }
}