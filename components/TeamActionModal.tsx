import React, { useState } from 'react';
import { Team, EventType, Player } from '../types';
import { X, Timer, AlertOctagon, Flag, Check } from 'lucide-react';

interface TeamActionModalProps {
  team: Team;
  teamId: 'home' | 'away';
  initialStep?: 'MENU' | 'SELECT_TAKER';
  onClose: () => void;
  onAction: (type: EventType, details: { playerId?: string; customDescription?: string }) => void;
}

const TeamActionModal: React.FC<TeamActionModalProps> = ({ team, teamId, initialStep = 'MENU', onClose, onAction }) => {
  const [step, setStep] = useState<'MENU' | 'SELECT_TAKER' | 'SELECT_OUTCOME'>(initialStep);
  // Agora aceitamos um objeto genérico para quando o jogador for desconhecido
  const [selectedTaker, setSelectedTaker] = useState<Player | { id: string, name: string, number: string | number } | null>(null);

  // Exibe titulares primeiro, depois reservas
  const sortedPlayers = [...(team.players || [])].sort((a, b) => (a.isStarter === b.isStarter ? 0 : a.isStarter ? -1 : 1));

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-slate-900 border border-white/10 rounded-3xl p-6 max-w-sm w-full shadow-2xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"><X size={20}/></button>
        
        <div className="mb-6 pr-6">
          <h3 className="text-xl font-black text-white flex items-center gap-2">
            Ações: {team.name}
          </h3>
        </div>

        {step === 'MENU' && (
          <div className="flex flex-col gap-3">
            <button 
              onClick={() => setStep('SELECT_TAKER')}
              className="w-full p-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm flex items-center justify-center gap-2 transition-all shadow-lg"
            >
              <Check size={18} /> Pênalti a Favor
            </button>

            <div className="grid grid-cols-2 gap-2 mt-1">
              <button onClick={() => onAction('FOUL', { customDescription: `🛑 Falta a favor do ${team.shortName}` })} className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm flex items-center justify-center gap-2 transition-all">
                <AlertOctagon size={14}/> Falta
              </button>
              <button onClick={() => onAction('CORNER', { customDescription: `🚩 Escanteio para o ${team.shortName}` })} className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm flex items-center justify-center gap-2 transition-all">
                <Flag size={14}/> Escanteio
              </button>
            </div>
            
            <button onClick={() => onAction('OFFSIDE', { customDescription: `🚩 Impedimento marcado do ${team.shortName}` })} className="w-full p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm flex items-center justify-center gap-2 transition-all">
              <Flag size={14}/> Impedimento
            </button>

            <div className="h-px bg-white/5 my-1"></div>

            <button 
              onClick={() => onAction('GENERIC', { customDescription: `⏱️ Parada Técnica - ${team.shortName}` })}
              className="w-full p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm flex items-center justify-center gap-2 transition-all"
            >
              <Timer size={16} /> Registrar Parada Técnica
            </button>
          </div>
        )}

        {step === 'SELECT_TAKER' && (
          <div className="flex flex-col gap-2 max-h-[400px] overflow-hidden">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 text-center">Selecione o Batedor</h4>
            
            {/* BOTÃO SALVA-VIDAS: PARA QUANDO NÃO HÁ LISTA OU NÃO SE SABE O JOGADOR */}
            <button 
              onClick={() => { setSelectedTaker({ id: '', name: 'Batedor Não Identificado', number: '?' }); setStep('SELECT_OUTCOME'); }}
              className="w-full p-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-dashed border-slate-600 flex-shrink-0"
            >
              ❓ Jogador Desconhecido / Sem Lista
            </button>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-2 pb-2 mt-2">
              {sortedPlayers.map(p => (
                <button 
                  key={p.id} 
                  onClick={() => { setSelectedTaker(p); setStep('SELECT_OUTCOME'); }}
                  className={`w-full p-3 rounded-xl text-left font-bold text-sm flex items-center gap-3 transition-all ${p.isStarter ? 'bg-slate-800 hover:bg-slate-700 text-white' : 'bg-slate-800/50 hover:bg-slate-800 text-slate-400'}`}
                >
                  <span className="font-mono text-xs opacity-50 w-6 text-center">#{p.number}</span>
                  <span className="flex-1 truncate">{p.name}</span>
                  {!p.isStarter && <span className="text-[9px] uppercase tracking-widest text-slate-500">Reserva</span>}
                </button>
              ))}
            </div>
            <button onClick={() => initialStep === 'SELECT_TAKER' ? onClose() : setStep('MENU')} className="mt-2 text-xs font-bold text-slate-500 hover:text-white uppercase tracking-widest text-center py-2">
              {initialStep === 'SELECT_TAKER' ? 'Cancelar' : 'Voltar'}
            </button>
          </div>
        )}

        {step === 'SELECT_OUTCOME' && selectedTaker && (
          <div className="flex flex-col gap-3">
            <div className="bg-slate-800/50 p-3 rounded-xl border border-white/5 mb-2">
              <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-1">Batedor Selecionado:</p>
              <p className="text-white font-black text-lg">
                {selectedTaker.number !== '?' ? `#${selectedTaker.number} ` : ''}{selectedTaker.name}
              </p>
            </div>
            
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 text-center">Resultado da Cobrança</h4>
            
            <button onClick={() => onAction('GOAL', { playerId: selectedTaker.id || undefined, customDescription: `⚽ Gol (Pênalti) do ${team.shortName}${selectedTaker.id ? ` - ${selectedTaker.name} (${selectedTaker.number})` : ''}` })} className="w-full p-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm flex items-center justify-center gap-2 transition-all shadow-lg">
              ⚽ Converteu (GOL)
            </button>
            <button onClick={() => onAction('SAVE', { playerId: selectedTaker.id || undefined, customDescription: `🧤 Pênalti Defendido - Cobrança do ${team.shortName}${selectedTaker.id ? ` por ${selectedTaker.name}` : ''}` })} className="w-full p-4 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all">
              🧤 Goleiro Defendeu
            </button>
            <button onClick={() => onAction('WOODWORK', { playerId: selectedTaker.id || undefined, customDescription: `❌ Pênalti Perdido (Fora/Trave) - ${team.shortName}${selectedTaker.id ? ` por ${selectedTaker.name}` : ''}` })} className="w-full p-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm flex items-center justify-center gap-2 transition-all border border-red-500/30">
              ❌ Na Trave / Para Fora
            </button>
            
            <button onClick={() => setStep('SELECT_TAKER')} className="mt-2 text-xs font-bold text-slate-500 hover:text-white uppercase tracking-widest text-center py-2">Mudar Batedor</button>
          </div>
        )}

      </div>
    </div>
  );
};
export default TeamActionModal;