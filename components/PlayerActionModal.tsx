import React, { useState } from 'react';
import { Player, Team, EventType } from '../types';
import { X, ArrowRightLeft, ArrowUpCircle, ArrowDownCircle, ShieldAlert, Flag, AlertOctagon } from 'lucide-react';

interface PlayerActionModalProps {
  player: Player;
  team: Team;
  onClose: () => void;
  onAction: (type: EventType | 'TOGGLE_STARTER', details: { relatedPlayer?: Player; manualSub?: { name: string; number: number }; customDescription?: string }) => void;
}

const PlayerActionModal: React.FC<PlayerActionModalProps> = ({ player, team, onClose, onAction }) => {
  const [showSubMenu, setShowSubMenu] = useState(false);
  const [manualSubName, setManualSubName] = useState('');
  const [manualSubNum, setManualSubNum] = useState('');

  const availableSubs = team.players.filter(p => !p.isStarter && p.id !== player.id);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-slate-900 border border-white/10 rounded-3xl p-6 max-w-sm w-full shadow-2xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"><X size={20}/></button>
        
        <div className="mb-6 pr-6">
          <h3 className="text-xl font-black text-white flex items-center gap-2">
            <span className="text-slate-500 font-mono">#{player.number}</span> {player.name}
          </h3>
          <p className="text-xs text-slate-400 uppercase tracking-widest">{team.name} • {player.isStarter ? 'Titular' : 'Reserva'}</p>
        </div>

        {!showSubMenu ? (
          <div className="grid grid-cols-1 gap-2">
            
            <button
              onClick={() => onAction('TOGGLE_STARTER', {})}
              className="w-full p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm flex items-center justify-center gap-2 border border-dashed border-slate-600 transition-all"
            >
              <ShieldAlert size={16} className="text-blue-400" />
              Mover para o {player.isStarter ? 'Banco' : 'Campo'} (Correção)
            </button>
            <div className="h-px bg-white/5 my-2"></div>

            {player.isStarter && (
              <button onClick={() => setShowSubMenu(true)} className="w-full p-3 rounded-xl bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white font-bold text-sm flex items-center justify-center gap-2 transition-all">
                <ArrowRightLeft size={16}/> Substituição Oficial
              </button>
            )}
            
            <div className="grid grid-cols-2 gap-2 mt-2">
              <button onClick={() => onAction('FOUL', { customDescription: `🛑 Falta cometida - ${player.name} (${team.shortName})` })} className="p-3 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 font-bold text-sm transition-all flex items-center justify-center gap-2">
                <AlertOctagon size={14}/> Falta
              </button>
              <button onClick={() => onAction('OFFSIDE', { customDescription: `🚩 Impedimento - ${player.name} (${team.shortName})` })} className="p-3 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 font-bold text-sm transition-all flex items-center justify-center gap-2">
                <Flag size={14}/> Impedimento
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-2">
              <button onClick={() => onAction('YELLOW_CARD', { customDescription: `🟨 Amarelo - ${player.name} (${team.shortName})` })} className="p-3 rounded-xl bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500 hover:text-slate-900 font-bold text-sm transition-all">Amarelo</button>
              <button onClick={() => onAction('RED_CARD', { customDescription: `🟥 Vermelho - ${player.name} (${team.shortName})` })} className="p-3 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white font-bold text-sm transition-all">Vermelho</button>
            </div>
            
            <button onClick={() => onAction('GOAL', { customDescription: `⚽ Gol do ${team.shortName} - ${player.name} (${player.number})` })} className="w-full mt-2 p-3 rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 font-bold text-sm transition-all flex items-center justify-center">
              Registrar GOL (Bola Rolando)
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Quem entra no lugar de {player.name}?</h4>
            
            {availableSubs.map(sub => (
              <button key={sub.id} onClick={() => onAction('SUBSTITUTION', { relatedPlayer: sub })} className="w-full p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm flex items-center justify-between transition-all">
                <div className="flex items-center gap-2"><ArrowUpCircle size={16} className="text-emerald-500"/> <span className="text-slate-400 font-mono">#{sub.number}</span> {sub.name}</div>
              </button>
            ))}
            {availableSubs.length === 0 && <p className="text-xs text-slate-500 text-center py-2">Nenhum reserva na lista.</p>}

            <div className="h-px bg-white/5 my-2"></div>
            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Substituição Manual</h4>
            <div className="flex gap-2">
                <input type="number" placeholder="Nº" value={manualSubNum} onChange={e => setManualSubNum(e.target.value)} className="w-16 bg-slate-800 border-none rounded-xl text-white text-sm font-bold text-center placeholder-slate-600 focus:ring-1 focus:ring-blue-500"/>
                <input type="text" placeholder="Nome do jogador" value={manualSubName} onChange={e => setManualSubName(e.target.value)} className="flex-1 bg-slate-800 border-none rounded-xl text-white text-sm font-bold placeholder-slate-600 focus:ring-1 focus:ring-blue-500"/>
            </div>
            <button disabled={!manualSubName || !manualSubNum} onClick={() => onAction('SUBSTITUTION', { manualSub: { name: manualSubName, number: parseInt(manualSubNum) } })} className="w-full p-3 rounded-xl bg-blue-600 text-white font-bold text-sm disabled:opacity-50 transition-all mt-1">Confirmar Entrada</button>
            
            <button onClick={() => setShowSubMenu(false)} className="mt-2 text-xs font-bold text-slate-500 hover:text-white uppercase tracking-widest text-center">Voltar</button>
          </div>
        )}
      </div>
    </div>
  );
};
export default PlayerActionModal;