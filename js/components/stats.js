// Componente de Estatísticas - Narrador Pro
// Renderiza o painel de KPIs e desempenho das equipes

import matchState from '../state.js';

class StatsManager {
  render(state) {
    const safeEvents = state.events || [];
    const getCount = (teamId, types) => safeEvents.filter(e => e.teamId === teamId && types.includes(e.type) && !e.isAnnulled).length;

    const homeGoals = getCount('home', ['GOAL', 'SHOOTOUT_GOAL']);
    const awayGoals = getCount('away', ['GOAL', 'SHOOTOUT_GOAL']);
    
    // Finalizações totais = Gols + Chutos + Na Trave
    const homeTotalShots = getCount('home', ['SHOT', 'WOODWORK', 'GOAL']);
    const awayTotalShots = getCount('away', ['SHOT', 'WOODWORK', 'GOAL']);
    
    // Finalizações no alvo (Gols + Chutes no Alvo se tivermos esse tipo, ou aproximado)
    const homeShotsOnTarget = getCount('home', ['GOAL', 'SAVE']);
    const awayShotsOnTarget = getCount('away', ['GOAL', 'SAVE']);

    const homeCorners = getCount('home', ['CORNER']);
    const awayCorners = getCount('away', ['CORNER']);
    const homeFouls = getCount('home', ['FOUL']);
    const awayFouls = getCount('away', ['FOUL']);
    const homeYellows = getCount('home', ['YELLOW_CARD']);
    const awayYellows = getCount('away', ['YELLOW_CARD']);
    const homeReds = getCount('home', ['RED_CARD']);
    const awayReds = getCount('away', ['RED_CARD']);

    // Cálculo de posse de bola (baseado em volume de eventos como proxy)
    const totalEvents = homeTotalShots + awayTotalShots + homeCorners + awayCorners + homeFouls + awayFouls;
    const homeWeight = (homeTotalShots * 2) + homeCorners + (awayFouls * 0.5);
    const awayWeight = (awayTotalShots * 2) + awayCorners + (homeFouls * 0.5);
    const totalWeight = homeWeight + awayWeight;
    
    const homePossession = totalWeight === 0 ? 50 : Math.round((homeWeight / totalWeight) * 60 + 20); // Range 20-80%
    const awayPossession = 100 - homePossession;

    return `
      <div class="flex flex-col gap-6 animate-fade-in">
        <!-- Main Scoreboard Stats -->
        <div class="bg-[#0a0f1c] p-8 md:p-12 rounded-[3rem] border border-white/5 shadow-2xl relative overflow-hidden">
          <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50"></div>
          
          <div class="flex items-center justify-between mb-12 pb-8 border-b border-white/5">
            <div class="flex flex-col items-center gap-4 w-1/3">
              <div class="w-16 h-16 md:w-20 md:h-20 rounded-[2rem] flex items-center justify-center text-2xl md:text-3xl font-black shadow-2xl text-white border-2 border-white/10" style="background-color: ${state.homeTeam.color}">
                ${(state.homeTeam.shortName || 'M').substring(0, 1)}
              </div>
              <span class="text-white font-black uppercase text-[10px] md:text-xs text-center tracking-widest">${state.homeTeam.name}</span>
            </div>
            
            <div class="flex flex-col items-center w-1/3">
              <span class="text-5xl md:text-7xl font-black text-white tabular-nums tracking-tighter drop-shadow-2xl">
                ${homeGoals}<span class="text-slate-800 mx-2 text-4xl">:</span>${awayGoals}
              </span>
              <div class="mt-4 flex flex-col items-center gap-2">
                <span class="text-[9px] text-slate-500 font-black uppercase tracking-[0.4em] bg-slate-900/50 px-4 py-1.5 rounded-full border border-white/5">
                  ${this.getMatchStatus(state)}
                </span>
                ${state.period === 'PENALTIES' ? `
                  <span class="text-indigo-400 font-black text-[10px] uppercase tracking-widest animate-pulse">Disputa de Pênaltis</span>
                ` : ''}
              </div>
            </div>
            
            <div class="flex flex-col items-center gap-4 w-1/3">
              <div class="w-16 h-16 md:w-20 md:h-20 rounded-[2rem] flex items-center justify-center text-2xl md:text-3xl font-black shadow-2xl text-white border-2 border-white/10" style="background-color: ${state.awayTeam.color}">
                ${(state.awayTeam.shortName || 'V').substring(0, 1)}
              </div>
              <span class="text-white font-black uppercase text-[10px] md:text-xs text-center tracking-widest">${state.awayTeam.name}</span>
            </div>
          </div>

          <!-- Progress Bars -->
          <div class="space-y-8 max-w-2xl mx-auto">
            ${this.renderStatBar('Posse de bola', homePossession, awayPossession, state.homeTeam.color, state.awayTeam.color, true)}
            ${this.renderStatBar('Finalizações Totais', homeTotalShots, awayTotalShots, state.homeTeam.color, state.awayTeam.color)}
            ${this.renderStatBar('Chutes no Alvo', homeShotsOnTarget, awayShotsOnTarget, state.homeTeam.color, state.awayTeam.color)}
            ${this.renderStatBar('Escanteios', homeCorners, awayCorners, state.homeTeam.color, state.awayTeam.color)}
            
            <div class="grid grid-cols-2 gap-8 pt-4">
              <div class="flex flex-col gap-4">
                <p class="text-[9px] font-black text-slate-600 uppercase tracking-widest text-center mb-2">Disciplina Mandante</p>
                <div class="flex justify-center gap-6">
                  <div class="flex flex-col items-center">
                    <span class="text-2xl font-black text-white">${homeYellows}</span>
                    <div class="w-4 h-6 bg-yellow-500 rounded-sm mt-1 shadow-lg shadow-yellow-500/20"></div>
                  </div>
                  <div class="flex flex-col items-center">
                    <span class="text-2xl font-black text-white">${homeReds}</span>
                    <div class="w-4 h-6 bg-red-600 rounded-sm mt-1 shadow-lg shadow-red-600/20"></div>
                  </div>
                </div>
              </div>
              <div class="flex flex-col gap-4">
                <p class="text-[9px] font-black text-slate-600 uppercase tracking-widest text-center mb-2">Disciplina Visitante</p>
                <div class="flex justify-center gap-6">
                  <div class="flex flex-col items-center">
                    <span class="text-2xl font-black text-white">${awayYellows}</span>
                    <div class="w-4 h-6 bg-yellow-500 rounded-sm mt-1 shadow-lg shadow-yellow-500/20"></div>
                  </div>
                  <div class="flex flex-col items-center">
                    <span class="text-2xl font-black text-white">${awayReds}</span>
                    <div class="w-4 h-6 bg-red-600 rounded-sm mt-1 shadow-lg shadow-red-600/20"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Export Action -->
        <div class="flex justify-center gap-4">
          <button class="px-8 py-4 bg-slate-900 border border-white/5 rounded-2xl text-[10px] font-black uppercase text-slate-400 hover:text-white hover:bg-slate-800 transition-all flex items-center gap-3" onclick="window.generateReport()">
            ✍️ Gerar Crônica com IA
          </button>
          <button class="px-8 py-4 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase hover:bg-blue-500 transition-all shadow-xl shadow-blue-900/20" onclick="window.exportToClipboard()">
            📋 Copiar Relatório
          </button>
        </div>
      </div>
    `;
  }

  getMatchStatus(state) {
    if (state.period === 'FINISHED') return 'Encerrado';
    if (state.period === 'PRE_MATCH') return 'Não Iniciado';
    if (state.period === 'INTERVAL') return 'Intervalo';
    
    const now = Date.now();
    const elapsed = state.timeElapsed + (state.timerStartedAt && !state.isPaused ? now - state.timerStartedAt : 0);
    const mins = Math.floor(elapsed / 60000);
    return `Em Jogo: ${mins}'`;
  }

  renderStatBar(label, homeValue, awayValue, homeColor, awayColor, isPercentage = false) {
    const total = homeValue + awayValue;
    const homeWidth = total === 0 ? 50 : (homeValue / total) * 100;
    const displayHome = isPercentage ? `${homeValue}%` : homeValue;
    const displayAway = isPercentage ? `${awayValue}%` : awayValue;

    return `
      <div class="group">
        <div class="flex justify-between items-end mb-2 relative px-1">
          <span class="text-xs font-black text-white w-12">${displayHome}</span>
          <span class="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-0.5">${label}</span>
          <span class="text-xs font-black text-white w-12 text-right">${displayAway}</span>
        </div>
        <div class="flex w-full h-1.5 gap-1.5">
          <div class="flex-1 flex justify-end bg-slate-900/50 rounded-full overflow-hidden">
            <div class="h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(0,0,0,0.5)]" style="width: ${homeWidth}%; background-color: ${homeColor}"></div>
          </div>
          <div class="flex-1 flex justify-start bg-slate-900/50 rounded-full overflow-hidden">
            <div class="h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(0,0,0,0.5)]" style="width: ${100 - homeWidth}%; background-color: ${awayColor}"></div>
          </div>
        </div>
      </div>
    `;
  }
}

export const statsManager = new StatsManager();
