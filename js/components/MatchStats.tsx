import React, { useMemo } from 'react';
import { MatchState } from '../types';

interface MatchStatsProps {
  state: MatchState;
}

const StatBar = ({ 
  label, homeValue, awayValue, homeColor, awayColor, isPercentage = false, homeSubtitle, awaySubtitle
}: { 
  label: string, homeValue: number, awayValue: number, homeColor: string, awayColor: string, isPercentage?: boolean, homeSubtitle?: string, awaySubtitle?: string
}) => {
  const total = homeValue + awayValue;
  const homeWidth = total === 0 ? 0 : (homeValue / total) * 100;
  const awayWidth = total === 0 ? 0 : (awayValue / total) * 100;

  const displayHome = isPercentage ? `${homeValue}%` : homeValue;
  const displayAway = isPercentage ? `${awayValue}%` : awayValue;

  return (
    <div className="mb-5 group">
      <div className="flex justify-between items-end mb-1.5 relative px-1">
        <div className="flex flex-col items-start w-20">
            <span className="text-sm font-black text-white">{displayHome}</span>
            {homeSubtitle && <span className="text-[9px] text-slate-500 font-bold tracking-widest">{homeSubtitle}</span>}
        </div>
        
        <span className="absolute left-1/2 -translate-x-1/2 bottom-1 text-[10px] sm:text-xs font-bold text-slate-300 uppercase tracking-wider whitespace-nowrap text-center">
          {label}
        </span>
        
        <div className="flex flex-col items-end w-20">
            <span className="text-sm font-black text-white">{displayAway}</span>
            {awaySubtitle && <span className="text-[9px] text-slate-500 font-bold tracking-widest">{awaySubtitle}</span>}
        </div>
      </div>
      
      <div className="flex w-full h-1.5 gap-1">
        <div className="w-1/2 flex justify-end bg-slate-800/50 rounded-l-full overflow-hidden">
          <div className="h-full rounded-l-full transition-all duration-700 ease-out" style={{ width: `${homeWidth}%`, backgroundColor: homeColor }}></div>
        </div>
        <div className="w-1/2 flex justify-start bg-slate-800/50 rounded-r-full overflow-hidden">
          <div className="h-full rounded-r-full transition-all duration-700 ease-out" style={{ width: `${awayWidth}%`, backgroundColor: awayColor }}></div>
        </div>
      </div>
    </div>
  );
};

const MatchStats: React.FC<MatchStatsProps> = ({ state }) => {
  const currentMin = useMemo(() => {
    const now = Date.now();
    const elapsed = state.timeElapsed + (state.timerStartedAt && !state.isPaused ? now - state.timerStartedAt : 0);
    return Math.floor(elapsed / 60000);
  }, [state.timeElapsed, state.timerStartedAt, state.isPaused]);

  const stats = useMemo(() => {
    const safeEvents = state.events || [];
    const getCount = (teamId: 'home'|'away', types: string[]) =>
      safeEvents.filter(e => e.teamId === teamId && types.includes(e.type) && !e.isAnnulled).length;

    const homeGoals = getCount('home', ['GOAL']);
    const awayGoals = getCount('away', ['GOAL']);

    const awaySaves = getCount('away', ['SAVE']); 
    const homeSaves = getCount('home', ['SAVE']); 

    const homeMissedShots = getCount('home', ['SHOT', 'WOODWORK']);
    const awayMissedShots = getCount('away', ['SHOT', 'WOODWORK']);

    const homeShotsOnTarget = homeGoals + awaySaves;
    const awayShotsOnTarget = awayGoals + homeSaves;

    const homeTotalShots = homeShotsOnTarget + homeMissedShots;
    const awayTotalShots = awayShotsOnTarget + awayMissedShots;

    const homeCorners = getCount('home', ['CORNER']);
    const awayCorners = getCount('away', ['CORNER']);

    const homeFouls = getCount('home', ['FOUL']);
    const awayFouls = getCount('away', ['FOUL']);

    const homeOffsides = getCount('home', ['OFFSIDE']);
    const awayOffsides = getCount('away', ['OFFSIDE']);

    const homeYellows = getCount('home', ['YELLOW_CARD']);
    const awayYellows = getCount('away', ['YELLOW_CARD']);

    const homeReds = getCount('home', ['RED_CARD']);
    const awayReds = getCount('away', ['RED_CARD']);

    const homeActionPoints = 50 + (homeTotalShots * 3) + (homeCorners * 2) + awayFouls + (homeGoals * 5);
    const awayActionPoints = 50 + (awayTotalShots * 3) + (awayCorners * 2) + homeFouls + (awayGoals * 5);
    const totalActionPoints = Math.max(homeActionPoints + awayActionPoints, 1);

    const homePossession = Math.round((homeActionPoints / totalActionPoints) * 100);
    const awayPossession = 100 - homePossession;

    const minutesPlayed = currentMin > 0 ? currentMin : 1;
    const generateFakePasses = (possession: number) => {
      const baseVolume = minutesPlayed * 4.5;
      const possessionMultiplier = possession / 50; 
      const totalPasses = Math.floor(baseVolume * possessionMultiplier) + 15; 
      const accuracy = Math.min(94, Math.floor(75 + ((possession - 40) / 2)));
      const completed = Math.floor((totalPasses * accuracy) / 100);
      return { total: totalPasses, completed, accuracy };
    };

    return {
      homeGoals, awayGoals, homeTotalShots, awayTotalShots, homeShotsOnTarget, awayShotsOnTarget,
      homeCorners, awayCorners, homeFouls, awayFouls, homeOffsides, awayOffsides,
      homeSaves, awaySaves, homeYellows, awayYellows, homeReds, awayReds,
      homePossession, awayPossession, homePasses: generateFakePasses(homePossession), awayPasses: generateFakePasses(awayPossession)
    };
  }, [state.events, currentMin]);

  const hColor = state.homeTeam?.color || '#3b82f6';
  const aColor = state.awayTeam?.color || '#ef4444';

  return (
    <div className="bg-[#0a0f1c] p-6 sm:p-8 md:p-12 rounded-[2rem] border border-white/5 shadow-2xl relative w-full max-w-4xl mx-auto animate-in fade-in">
      <div className="flex items-center justify-between mb-10 pb-6 border-b border-white/5">
        <div className="flex flex-col items-center gap-3 w-1/3">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black shadow-xl text-white" style={{ backgroundColor: hColor }}>
            {state.homeTeam?.shortName?.substring(0, 1) || 'C'}
          </div>
          <span className="text-white font-black uppercase text-xs text-center">{state.homeTeam?.name || 'Casa'}</span>
        </div>
        
        <div className="flex flex-col items-center w-1/3">
          <span className="text-4xl md:text-5xl font-black text-white tabular-nums tracking-tighter">
            {stats.homeGoals} <span className="text-slate-700 text-3xl">-</span> {stats.awayGoals}
          </span>
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-2 bg-slate-900 px-3 py-1 rounded-full border border-white/5">
            {state.period === 'FINISHED' ? 'Encerrado' : `Tempo: ${currentMin}'`}
          </span>
        </div>
        
        <div className="flex flex-col items-center gap-3 w-1/3">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black shadow-xl text-white" style={{ backgroundColor: aColor }}>
            {state.awayTeam?.shortName?.substring(0, 1) || 'V'}
          </div>
          <span className="text-white font-black uppercase text-xs text-center">{state.awayTeam?.name || 'Visita'}</span>
        </div>
      </div>

      <div className="text-center mb-6"><span className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em]">Principais</span></div>

      <StatBar label="Posse de bola" homeValue={stats.homePossession} awayValue={stats.awayPossession} homeColor={hColor} awayColor={aColor} isPercentage />
      <StatBar label="Total de finalizações" homeValue={stats.homeTotalShots} awayValue={stats.awayTotalShots} homeColor={hColor} awayColor={aColor} />
      <StatBar label="Finalizações no gol" homeValue={stats.homeShotsOnTarget} awayValue={stats.awayShotsOnTarget} homeColor={hColor} awayColor={aColor} />
      <StatBar label="Passes Trocados" homeValue={stats.homePasses.accuracy} awayValue={stats.awayPasses.accuracy} homeColor={hColor} awayColor={aColor} isPercentage homeSubtitle={`(${stats.homePasses.completed}/${stats.homePasses.total})`} awaySubtitle={`(${stats.awayPasses.completed}/${stats.awayPasses.total})`} />
      <StatBar label="Escanteios" homeValue={stats.homeCorners} awayValue={stats.awayCorners} homeColor={hColor} awayColor={aColor} />

      <div className="text-center mt-10 mb-6"><span className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em]">Detalhes da Partida</span></div>

      <StatBar label="Defesas do Goleiro" homeValue={stats.homeSaves} awayValue={stats.awaySaves} homeColor={hColor} awayColor={aColor} />
      <StatBar label="Faltas Cometidas" homeValue={stats.homeFouls} awayValue={stats.awayFouls} homeColor={hColor} awayColor={aColor} />
      <StatBar label="Impedimentos" homeValue={stats.homeOffsides} awayValue={stats.awayOffsides} homeColor={hColor} awayColor={aColor} />

      <div className="text-center mt-10 mb-6"><span className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em]">Disciplina</span></div>

      <StatBar label="Cartões Amarelos" homeValue={stats.homeYellows} awayValue={stats.awayYellows} homeColor={'#eab308'} awayColor={'#eab308'} />
      <StatBar label="Cartões Vermelhos" homeValue={stats.homeReds} awayValue={stats.awayReds} homeColor={'#ef4444'} awayColor={'#ef4444'} />
    </div>
  );
}

export default MatchStats;