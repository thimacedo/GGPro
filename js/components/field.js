/**
 * @fileoverview Componente de Mapa Tático Interativo (Narrador Pro).
 * Implementado em Vanilla JS puro com suporte a Drag & Drop e sincronização Real-time.
 */

import matchState from '../state.js';

class FieldManager {
  constructor() {
    this.activePlayer = null;
  }

  render(state, isFullscreen = false) {
    const homeTeam = state.homeTeam;
    const awayTeam = state.awayTeam;

    return `
      <div class="tactical-field-wrapper ${isFullscreen ? 'h-full' : ''}">
        <div class="tactical-pitch relative bg-emerald-900/40 rounded-[2.5rem] border-4 border-white/10 overflow-hidden shadow-2xl backdrop-blur-sm" id="tactical-pitch" style="aspect-ratio: 16/9; min-height: 300px;">
          <div class="pitch-lines absolute inset-0 pointer-events-none opacity-30">
            <div class="absolute inset-0 border-2 border-white/50 m-4"></div>
            <div class="absolute top-0 bottom-0 left-1/2 w-0.5 bg-white/50"></div>
            <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 border-2 border-white/50 rounded-full"></div>
            <!-- Áreas -->
            <div class="absolute top-1/4 bottom-1/4 left-4 w-24 border-2 border-white/50 border-l-0"></div>
            <div class="absolute top-1/4 bottom-1/4 right-4 w-24 border-2 border-white/50 border-r-0"></div>
          </div>
          
          <div class="players-layer absolute inset-0" id="players-layer">
            ${this.renderPlayers(homeTeam, 'home')}
            ${this.renderPlayers(awayTeam, 'away')}
          </div>

          <div class="absolute bottom-4 left-1/2 -translate-x-1/2 text-[8px] font-black uppercase tracking-[0.3em] text-white/40 flex items-center gap-2">
            <span>🏟️ MAPA TÁTICO INTERATIVO</span>
          </div>
        </div>
      </div>
    `;
  }

  renderPlayers(team, teamSide) {
    const isHome = teamSide === 'home';
    const players = team.players || [];
    
    return players.filter(p => p.isStarter).map(p => {
      const x = isHome ? (p.coordX || 25) : (p.coordX || 75);
      const y = p.coordY || 50;

      return `
        <div class="player-marker absolute -translate-x-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing transition-shadow z-10 hover:z-20 group" 
             style="left: ${x}%; top: ${y}%;"
             data-player-id="${p.id}" 
             data-team-id="${teamSide}">
          <div class="w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center text-[10px] md:text-xs font-black text-white shadow-xl border-2 border-white/20 group-hover:scale-110 transition-transform" 
               style="background-color: ${team.color}">
            ${p.number}
          </div>
          <div class="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap bg-slate-900/80 px-2 py-0.5 rounded text-[8px] font-black text-white uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
            ${p.name.split(' ')[0]}
          </div>
        </div>
      `;
    }).join('');
  }

  // Nota: A lógica de Drag & Drop para o root app será vinculada via delegação de eventos ou após o render no app.js
  // Para manter a pureza do render, deixamos o setup de listeners para o app principal ou um hook de lifecycle.
}

export const fieldManager = new FieldManager();
