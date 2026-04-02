export const Dashboard = (state, viewMode = 'list') => {
  const isList = viewMode === 'list';
  const isField = viewMode === 'field';

  const renderEvent = (e) => {
    return `
      <div class="flex gap-3 py-3 border-l-4 mb-1 pl-3 transition-colors rounded-r shadow-lg ${e.isAnnulled ? 'opacity-50 grayscale' : ''}" 
           style="border-color: ${e.isAnnulled ? '#64748b' : (e.teamId === 'home' ? state.homeTeam.color : e.teamId === 'away' ? state.awayTeam.color : '#475569')}; 
                  background-color: ${e.isAnnulled ? 'transparent' : (e.teamId === 'home' ? state.homeTeam.color : e.teamId === 'away' ? state.awayTeam.color : '#ffffff')}08;">
        <span class="font-mono font-black text-[10px] pt-1 min-w-[28px] ${e.isAnnulled ? 'line-through text-slate-600' : 'text-slate-400'}">
          ${e.minute}'
        </span>
        <div class="flex-1">
          <div class="text-[10px] font-black uppercase text-white">${e.description}</div>
        </div>
      </div>
    `;
  };

  const renderPlayerList = (team) => {
    return `
      <div class="flex flex-col gap-1">
        ${team.players.map(p => `
          <div class="flex items-center justify-between p-2 rounded-xl hover:bg-white/5 transition-colors cursor-pointer" onclick="app.selectPlayer('${p.id}', '${team.id}')">
            <div class="flex items-center gap-3">
              <span class="w-6 h-6 rounded bg-slate-800 flex items-center justify-center text-[10px] font-black text-slate-400">${p.number}</span>
              <span class="text-xs font-bold text-slate-200">${p.name}</span>
            </div>
            ${p.isStarter ? '<span class="text-[8px] font-black text-blue-500 uppercase">T</span>' : ''}
          </div>
        `).join('')}
      </div>
    `;
  };

  return `
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div class="lg:col-span-8 flex flex-col">
            <div class="flex items-center gap-2 mb-1">
                <button onclick="app.setViewMode('list')" class="flex-1 py-3 rounded-2xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest border transition-all ${isList ? 'bg-blue-600 border-blue-400 text-white' : 'bg-slate-900 border-white/5 text-slate-500'}">
                    <i data-lucide="list-filter" class="w-3.5 h-3.5"></i> Lista
                </button>
                <button onclick="app.setViewMode('field')" class="flex-1 py-3 rounded-2xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest border transition-all ${isField ? 'bg-blue-600 border-blue-400 text-white' : 'bg-slate-900 border-white/5 text-slate-500'}">
                    <i data-lucide="layout-dashboard" class="w-3.5 h-3.5"></i> Mapa Tático
                </button>
            </div>
            
            <div class="relative flex flex-col">
                ${isField ? `
                    <div class="aspect-[4/3] bg-emerald-900/20 rounded-[2.5rem] border border-emerald-500/10 flex items-center justify-center">
                        <p class="text-emerald-500/50 font-black uppercase tracking-widest text-xs">Campo Tático em Breve</p>
                    </div>
                ` : `
                    <div class="bg-slate-900/50 rounded-[2.5rem] border border-white/5 p-6 flex flex-col shadow-2xl">
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <div class="bg-slate-900/90 z-10 py-2 border-b border-white/10 mb-2">
                                    <h4 class="text-[10px] font-black uppercase text-center" style="color: ${state.homeTeam.color}">${state.homeTeam.shortName}</h4>
                                </div>
                                ${renderPlayerList(state.homeTeam)}
                            </div>
                            <div>
                                <div class="bg-slate-900/90 z-10 py-2 border-b border-white/10 mb-2">
                                    <h4 class="text-[10px] font-black uppercase text-center" style="color: ${state.awayTeam.color}">${state.awayTeam.shortName}</h4>
                                </div>
                                ${renderPlayerList(state.awayTeam)}
                            </div>
                        </div>
                    </div>
                `}
            </div>
        </div>
        
        <div class="lg:col-span-4 flex flex-col h-full min-h-0">
            <div class="bg-slate-900/50 rounded-[2rem] border border-white/5 flex flex-col overflow-hidden shadow-2xl flex-1 min-h-[400px]">
                <div class="p-6 border-b border-white/5 bg-white/5 flex justify-between items-center">
                    <h3 class="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400 flex items-center gap-2"><i data-lucide="history" class="w-4 h-4"></i> Cronologia</h3>
                    ${state.events.length > 0 ? `
                        <button onclick="app.undoLastEvent()" class="text-[9px] font-black text-slate-500 hover:text-red-400 uppercase">Desfazer Último</button>
                    ` : ''}
                </div>
                <div class="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-3">
                    ${state.events.map(renderEvent).join('')}
                    ${state.events.length === 0 ? '<div class="text-center text-slate-500 text-xs py-10 uppercase font-black tracking-widest opacity-30">Sem Eventos</div>' : ''}
                </div>
            </div>
        </div>
    </div>
  `;
};
