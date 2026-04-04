import React from 'react';
import { Target } from 'lucide-react';
import { Team, EventType } from '../types';

interface QuickActionsPanelProps {
  team: Team;
  teamId: 'home' | 'away';
  onAddEvent: (eventData: { type: EventType; teamId: 'home' | 'away'; description: string }) => void;
}

const QuickActionsPanel: React.FC<QuickActionsPanelProps> = ({ team, teamId, onAddEvent }) => {
  return (
    <div className="p-4 bg-slate-900 rounded-3xl border border-white/5 shadow-xl border-t-2" style={{ borderTopColor: team.color }}>
      <button 
        onClick={() => onAddEvent({ type: 'GOAL', teamId, description: `⚽ Gol do ${team.shortName}!` })} 
        className="w-full p-3 bg-emerald-600 rounded-xl font-black text-[10px] mb-2 text-white shadow-lg truncate"
      >
        GOL {team.shortName}
      </button>
      
      <div className="grid grid-cols-2 gap-1.5 mb-1.5">
        <button 
          onClick={() => onAddEvent({ type: 'YELLOW_CARD', teamId, description: `🟨 Cartão Amarelo - ${team.shortName}` })} 
          className="p-2 bg-amber-500 text-black rounded-lg font-black text-[8px] uppercase"
        >
          Amarelo
        </button>
        <button 
          onClick={() => onAddEvent({ type: 'RED_CARD', teamId, description: `🟥 Cartão Vermelho - ${team.shortName}` })} 
          className="p-2 bg-red-600 text-white rounded-lg font-black text-[8px] uppercase"
        >
          Vermelho
        </button>
      </div>
      
      <div className="grid grid-cols-2 gap-1.5">
        <button 
          onClick={() => onAddEvent({ type: 'SHOT', teamId, description: `🎯 Finalização do ${team.shortName}` })} 
          className="p-2 bg-blue-600/30 text-blue-400 hover:bg-blue-600 hover:text-white rounded-lg font-black text-[8px] uppercase transition-colors flex items-center justify-center gap-1"
        >
          <Target size={12}/> Chute
        </button>
        <button 
          onClick={() => onAddEvent({ type: 'CORNER', teamId, description: `🚩 Escanteio para o ${team.shortName}` })} 
          className="p-2 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white rounded-lg font-black text-[8px] uppercase transition-colors"
        >
          Escanteio
        </button>
        <button 
          onClick={() => onAddEvent({ type: 'FOUL', teamId, description: `🛑 Falta cometida pelo ${team.shortName}` })} 
          className="p-2 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white rounded-lg font-black text-[8px] uppercase transition-colors"
        >
          Falta
        </button>
        <button 
          onClick={() => onAddEvent({ type: 'OFFSIDE', teamId, description: `🚩 Impedimento do ${team.shortName}` })} 
          className="p-2 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white rounded-lg font-black text-[8px] uppercase transition-colors"
        >
          Imped.
        </button>
      </div>
    </div>
  );
};

export default QuickActionsPanel;
