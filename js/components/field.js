// Componente Campo Tático - Narrador Pro
// Renderiza o campo e gerencia oposicionamento dos jogadores (Drag & Drop)

import matchState from '../state.js';

class FieldManager {
  constructor() {
    this.isDragging = false;
    this.draggedPlayer = null;
    this.draggedTeam = null;
    this.container = null;
    this.rect = null;
  }

  render(state, isFullscreen) {
    const heightClass = isFullscreen ? 'h-full w-full' : 'w-full aspect-[4/3]';
    
    setTimeout(() => this.initDragAndDrop(), 100);

    return `
      <div class="flex flex-col gap-2 ${heightClass}" id="fieldContainer">
        <div class="relative bg-emerald-700 rounded-[2.5rem] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] border-4 border-emerald-800/50 select-none h-full w-full touch-none">
          <!-- Gramado -->
          <div class="absolute inset-0 opacity-20 pointer-events-none" style="background-image: repeating-linear-gradient(90deg, transparent, transparent 10%, rgba(0,0,0,0.2) 10%, rgba(0,0,0,0.2) 20%)"></div>
          
          <!-- Linhas do Campo -->
          <div class="absolute inset-0 border-2 border-white/30 m-6 rounded-sm pointer-events-none"></div>
          <div class="absolute inset-y-0 left-1/2 w-0.5 bg-white/30 pointer-events-none"></div>
          <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 border-2 border-white/30 rounded-full pointer-events-none"></div>
          
          <!-- Áreas -->
          <div class="absolute top-1/2 left-0 -translate-y-1/2 w-28 h-56 border-2 border-white/30 border-l-0 rounded-r-lg pointer-events-none"></div>
          <div class="absolute top-1/2 right-0 -translate-y-1/2 w-28 h-56 border-2 border-white/30 border-r-0 rounded-l-lg pointer-events-none"></div>
          
          <!-- Jogadores -->
          ${this.renderPlayers(state.homeTeam, 'home')}
          ${this.renderPlayers(state.awayTeam, 'away')}

          <div class="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md px-5 py-2 rounded-full border border-white/10 pointer-events-none">
            <p class="text-[8px] font-black text-white/80 uppercase tracking-[0.2em] flex items-center gap-2">
              <span class="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
              Mapa Tático Interativo • Arraste para posicionar
            </p>
          </div>
        </div>
      </div>
    `;
  }

  renderPlayers(team, teamId) {
    const isHome = teamId === 'home';
    return team.players.filter(p => p.isStarter).map(player => {
      // Cálculo de espelhamento para o time visitante
      const displayX = isHome ? player.x : (100 - player.x);
      const displayY = isHome ? player.y : (100 - player.y);
      
      return `
        <div 
          class="absolute -translate-x-1/2 -translate-y-1/2 transition-shadow cursor-grab active:cursor-grabbing select-none z-10 player-marker" 
          style="top: ${displayY}%; left: ${displayX}%"
          data-player-id="${player.id}"
          data-team-id="${teamId}"
          id="marker_${player.id}"
        >
          <div class="group relative flex flex-col items-center">
            <div class="relative">
              <button 
                class="w-10 h-10 md:w-14 md:h-14 rounded-full flex items-center justify-center border-[3px] border-white/90 shadow-xl font-black text-sm md:text-xl transition-transform active:scale-90 text-white pointer-events-none" 
                style="background-color: ${team.color}"
              >
                ${player.number}
              </button>
            </div>
            <div class="mt-2 bg-slate-950/80 text-white px-3 py-1 rounded-lg text-[9px] md:text-[11px] font-black whitespace-nowrap drop-shadow-md border border-white/10 opacity-100 group-hover:bg-blue-600 transition-colors">
              ${player.name}
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  initDragAndDrop() {
    const markers = document.querySelectorAll('.player-marker');
    const field = document.getElementById('fieldContainer');
    if (!field) return;

    this.container = field.firstElementChild;

    markers.forEach(marker => {
      marker.onmousedown = (e) => this.startDrag(e, marker);
      marker.ontouchstart = (e) => this.startDrag(e, marker);
    });
  }

  startDrag(e, marker) {
    e.preventDefault();
    this.isDragging = true;
    this.draggedPlayer = marker.dataset.playerId;
    this.draggedTeam = marker.dataset.teamId;
    this.rect = this.container.getBoundingClientRect();

    const move = (moveEvent) => this.drag(moveEvent, marker);
    const stop = () => {
      this.stopDrag();
      document.onmousemove = null;
      document.ontouchmove = null;
      document.onmouseup = null;
      document.ontouchend = null;
    };

    document.onmousemove = move;
    document.ontouchmove = move;
    document.onmouseup = stop;
    document.ontouchend = stop;
  }

  drag(e, marker) {
    if (!this.isDragging) return;

    const clientX = e.clientX || e.touches[0].clientX;
    const clientY = e.clientY || e.touches[0].clientY;

    let x = ((clientX - this.rect.left) / this.rect.width) * 100;
    let y = ((clientY - this.rect.top) / this.rect.height) * 100;

    // Limites
    x = Math.max(5, Math.min(95, x));
    y = Math.max(5, Math.min(95, y));

    marker.style.left = `${x}%`;
    marker.style.top = `${y}%`;
  }

  stopDrag() {
    if (!this.isDragging) return;
    this.isDragging = false;

    const marker = document.getElementById(`marker_${this.draggedPlayer}`);
    if (!marker) return;

    const x = parseFloat(marker.style.left);
    const y = parseFloat(marker.style.top);
    const isHome = this.draggedTeam === 'home';

    // Salvar no estado (invertendo se for visitante)
    matchState.setState(prev => {
      const teamKey = isHome ? 'homeTeam' : 'awayTeam';
      const updatedPlayers = prev[teamKey].players.map(p => {
        if (p.id === this.draggedPlayer) {
          return { 
            ...p, 
            x: isHome ? x : (100 - x), 
            y: isHome ? y : (100 - y) 
          };
        }
        return p;
      });
      return { ...prev, [teamKey]: { ...prev[teamKey], players: updatedPlayers } };
    });

    // Notify UI (render happens via matchState.save notification if subscribed)
    // Em nosso caso, o app.js renderiza ao mudar o estado.
  }
}

export const fieldManager = new FieldManager();
