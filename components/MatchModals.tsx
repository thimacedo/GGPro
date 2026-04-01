import React, { useState, useEffect } from 'react';
import { X, Flag, Plus, AlertOctagon, Target, Hand, Check, Loader2, Users } from 'lucide-react';
import { Team, Player } from '../types';
import { generateDistinctShortName } from '../utils/teamUtils';

export const EditTeamModal: React.FC<{ isOpen: boolean; team?: Team; onSave: (name: string, shortName: string, color: string) => void; onClose: () => void; }> = ({ isOpen, team, onSave, onClose }) => {
    const [name, setName] = useState('');
    const [shortName, setShortName] = useState('');
    const [color, setColor] = useState('');

    const TEAM_COLORS = ['#ef4444', '#f97316', '#f59e0b', '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#3b82f6', '#4f46e5', '#a855f7', '#1e293b', '#ffffff'];
    
    useEffect(() => { 
        if (team && isOpen) { setName(team.name); setShortName(team.shortName); setColor(team.color || '#3b82f6'); } 
    }, [team, isOpen]);
    
    if (!isOpen || !team) return null;

    return (
        <div className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-4">
            <div className="bg-slate-800 p-6 rounded-[2rem] max-w-sm w-full text-center shadow-2xl text-white">
                <h3 className="text-sm font-black uppercase mb-4">Editar Equipe</h3>
                <input className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white focus:outline-none mb-3" value={name} onChange={e => { setName(e.target.value); if (!shortName || generateDistinctShortName(name) === shortName) setShortName(generateDistinctShortName(e.target.value)); }} placeholder="Nome Completo" />
                <input className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white focus:outline-none mb-4 uppercase" value={shortName} maxLength={3} onChange={e => setShortName(e.target.value.toUpperCase())} placeholder="SIGLA (3 letras)" />
                
                <div className="mb-6 bg-slate-900/50 p-4 rounded-2xl border border-slate-700">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-3 text-center">Cor no Mapa Tático</span>
                    <div className="grid grid-cols-6 gap-3 justify-items-center">
                        {TEAM_COLORS.map(c => (
                            <button type="button" key={c} onClick={() => setColor(c)} className={`w-8 h-8 rounded-full transition-all border-4 ${color === c ? 'border-white scale-125 shadow-xl' : 'border-transparent hover:scale-110'}`} style={{ backgroundColor: c }} />
                        ))}
                    </div>
                </div>

                <div className="flex gap-2">
                    <button type="button" onClick={() => onSave(name, shortName, color)} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-black text-xs uppercase">Salvar</button>
                    <button type="button" onClick={onClose} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-xl font-black text-xs uppercase">Cancelar</button>
                </div>
            </div>
        </div>
    );
};

export const EditPlayerModal: React.FC<{ isOpen: boolean; player: Player | null; onSave: (name: string, number: number, isStarter: boolean) => void; onClose: () => void; }> = ({ isOpen, player, onSave, onClose }) => {
    const [name, setName] = useState('');
    const [num, setNum] = useState('');
    const [isStarter, setIsStarter] = useState(false);
    useEffect(() => { 
        if (player && isOpen) { setName(player.name); setNum(player.number.toString()); setIsStarter(player.isStarter); } 
    }, [player, isOpen]);
    if (!isOpen || !player) return null;

    return (
        <div className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-4">
            <div className="bg-slate-800 p-6 rounded-[2rem] max-w-sm w-full text-center shadow-2xl text-white">
                <h3 className="text-sm font-black uppercase mb-4">Editar Jogador</h3>
                <input type="number" className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white focus:outline-none mb-3 font-mono" value={num} onChange={e => setNum(e.target.value)} placeholder="Número" />
                <input className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white focus:outline-none mb-4" value={name} onChange={e => setName(e.target.value)} placeholder="Nome" />
                <div className="flex items-center justify-between bg-slate-900 border border-slate-700 rounded-xl p-3 mb-6">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Escalação</span>
                    <button onClick={() => setIsStarter(!isStarter)} className={`px-4 py-2 rounded-lg text-xs font-black uppercase transition-all ${isStarter ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-400 hover:text-white'}`}>{isStarter ? 'Titular' : 'Reserva'}</button>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => onSave(name, parseInt(num) || player.number, isStarter)} className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-black text-xs uppercase">Salvar</button>
                    <button onClick={onClose} className="flex-1 bg-slate-700 text-white py-3 rounded-xl font-black text-xs uppercase">Cancelar</button>
                </div>
            </div>
        </div>
    );
};

export const EditCoachModal: React.FC<{ isOpen: boolean; initialName: string; onSave: (name: string) => void; onClose: () => void; }> = ({ isOpen, initialName, onSave, onClose }) => {
    const [name, setName] = useState('');
    useEffect(() => { if (isOpen) setName(initialName); }, [initialName, isOpen]);
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-4">
            <div className="bg-slate-800 p-6 rounded-[2rem] max-w-sm w-full text-center shadow-2xl text-white">
                <h3 className="text-sm font-black uppercase mb-4">Editar Técnico</h3>
                <input className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white focus:outline-none mb-4" value={name} onChange={e => setName(e.target.value)} placeholder="Nome do Técnico" />
                <div className="flex gap-2">
                    <button onClick={() => onSave(name)} className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-black text-xs uppercase">Salvar</button>
                    <button onClick={onClose} className="flex-1 bg-slate-700 text-white py-3 rounded-xl font-black text-xs uppercase">Cancelar</button>
                </div>
            </div>
        </div>
    );
};

export const EndGameOptionsModal: React.FC<{ isOpen: boolean; onFinish: () => void; onExtraTime: () => void; onPenalties: () => void; onClose: () => void; }> = ({ isOpen, onFinish, onExtraTime, onPenalties, onClose }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-4">
            <div className="bg-slate-800 p-6 rounded-[2rem] max-w-sm w-full text-center shadow-2xl text-white animate-in zoom-in-95">
                <h3 className="text-lg font-black mb-1 uppercase text-white">Próximo Passo</h3>
                <p className="text-xs text-slate-400 mb-6">Tempo regulamentar acabou.</p>
                <div className="flex flex-col gap-3">
                    <button onClick={onFinish} className="w-full bg-slate-700 py-4 rounded-xl font-black text-xs flex items-center justify-center gap-2 uppercase tracking-widest"><Flag size={16} /> Encerrar Jogo</button>
                    <div className="flex gap-3">
                        <button onClick={onExtraTime} className="flex-1 bg-blue-600 py-4 rounded-xl font-black text-xs flex items-center justify-center gap-2 uppercase tracking-widest"><Plus size={16} /> Prorrogação</button>
                        <button onClick={onPenalties} className="flex-1 bg-indigo-600 py-4 rounded-xl font-black text-xs flex items-center justify-center gap-2 uppercase tracking-widest"><AlertOctagon size={16} /> Pênaltis</button>
                    </div>
                    <button onClick={onClose} className="mt-2 text-slate-500 text-xs font-bold underline">Cancelar</button>
                </div>
            </div>
        </div>
    );
};

export const PenaltyStarterModal: React.FC<{ isOpen: boolean; homeTeam: Team; awayTeam: Team; onSelect: (teamId: 'home' | 'away') => void; onClose: () => void; }> = ({ isOpen, homeTeam, awayTeam, onSelect, onClose }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-4">
            <div className="bg-slate-800 p-8 rounded-[2rem] max-w-sm w-full text-center shadow-2xl text-white animate-in zoom-in-95">
                <div className="w-16 h-16 bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-6 text-indigo-400"><AlertOctagon size={32} /></div>
                <h3 className="text-xl font-black mb-2 uppercase">Sorteio das Cobranças</h3>
                <p className="text-slate-400 text-sm mb-8">Quem inicia batendo?</p>
                <div className="flex flex-col gap-3">
                    <button onClick={() => onSelect('home')} className="w-full bg-blue-600 py-4 rounded-xl font-black text-sm uppercase" style={{backgroundColor: homeTeam.color}}>{homeTeam.shortName}</button>
                    <button onClick={() => onSelect('away')} className="w-full bg-red-600 py-4 rounded-xl font-black text-sm uppercase" style={{backgroundColor: awayTeam.color}}>{awayTeam.shortName}</button>
                    <button onClick={onClose} className="mt-2 text-slate-500 text-xs font-bold underline">Cancelar</button>
                </div>
            </div>
        </div>
    );
};

export const ImportListModal: React.FC<{ isOpen: boolean; onProcess: (text: string) => Promise<void>; onClose: () => void; }> = ({ isOpen, onProcess, onClose }) => {
    const [text, setText] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    useEffect(() => { if (isOpen) { setText(''); setIsProcessing(false); } }, [isOpen]);
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-4">
            <div className="bg-slate-800 p-6 rounded-[2rem] max-w-2xl w-full text-white">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-sm font-black uppercase">Importar Lista (Texto Bruto)</h3>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full"><X size={20} /></button>
                </div>
                <textarea className="w-full h-64 bg-slate-950 border border-white/10 rounded-2xl p-6 font-mono text-xs text-blue-100 mb-6 focus:outline-none" placeholder="Cole a lista completa aqui..." value={text} onChange={(e) => setText(e.target.value)} />
                <button onClick={async () => { if (!text.trim()) return; setIsProcessing(true); await onProcess(text); setIsProcessing(false); }} disabled={isProcessing} className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 py-4 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2">
                    {isProcessing && <Loader2 size={18} className="animate-spin" />}
                    {isProcessing ? 'Analisando com IA...' : 'Processar Lista'}
                </button>
            </div>
        </div>
    );
};

export const ResetConfirmModal: React.FC<{ isOpen: boolean; onConfirm: () => void; onClose: () => void; }> = ({ isOpen, onConfirm, onClose }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-6 backdrop-blur-xl animate-in zoom-in-95 duration-300">
            <div className="bg-slate-900 p-10 rounded-[2.5rem] border border-white/10 text-center">
                <h3 className="text-2xl font-black mb-2 uppercase text-white">Nova Partida?</h3>
                <p className="text-slate-400 text-sm mb-6">Todos os dados não salvos serão apagados.</p>
                <div className="flex gap-4">
                    <button onClick={onConfirm} className="flex-1 bg-red-600 text-white py-4 rounded-2xl font-black text-xs uppercase">Confirmar (Zerar)</button>
                    <button onClick={onClose} className="flex-1 bg-slate-800 text-white py-4 rounded-2xl font-black text-xs uppercase">Cancelar</button>
                </div>
            </div>
        </div>
    );
};

export const InGamePenaltyModal: React.FC<{ isOpen: boolean; team?: Team; onSave: (playerId: string, outcome: 'goal' | 'saved' | 'missed') => void; onClose: () => void; }> = ({ isOpen, team, onSave, onClose }) => {
    const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
    useEffect(() => { if (isOpen) setSelectedPlayer(null); }, [isOpen]);
    if (!isOpen || !team) return null;

    const eligiblePlayers = team.players.filter(p => p.isStarter);

    return (
        <div className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-4">
            <div className="bg-slate-800 p-6 rounded-[2rem] max-w-sm w-full text-center shadow-2xl text-white animate-in zoom-in-95">
                <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-400"><Target size={32} /></div>
                <h3 className="text-xl font-black mb-1 uppercase tracking-tight">Pênalti para {team.shortName}</h3>
                <p className="text-xs text-slate-400 mb-6 font-medium">{!selectedPlayer ? "Selecione o batedor:" : `Batedor: ${selectedPlayer.name}`}</p>
                {!selectedPlayer ? (
                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 max-h-[300px] space-y-2">
                        {eligiblePlayers.map(p => (<button key={p.id} onClick={() => setSelectedPlayer(p)} className="w-full flex items-center gap-3 p-3 bg-slate-900/50 hover:bg-slate-700 rounded-xl border border-white/5 transition-all text-left group"><span className="font-mono font-bold text-slate-500 group-hover:text-white">#{String(p.number).padStart(2, '0')}</span><span className="text-sm font-bold text-slate-200 group-hover:text-white">{p.name}</span></button>))}
                        <button onClick={onClose} className="w-full mt-4 text-slate-500 text-xs font-bold underline">Cancelar</button>
                    </div>
                ) : (
                    <div className="flex flex-col gap-3">
                        <button onClick={() => onSave(selectedPlayer.id, 'goal')} className="w-full bg-emerald-600 hover:bg-emerald-500 py-4 rounded-xl font-black text-sm flex items-center justify-center gap-2 uppercase tracking-widest transition-all"><Check size={18} /> Gol</button>
                        <button onClick={() => onSave(selectedPlayer.id, 'saved')} className="w-full bg-blue-600 hover:bg-blue-500 py-4 rounded-xl font-black text-sm flex items-center justify-center gap-2 uppercase tracking-widest transition-all"><Hand size={18} /> Defesa</button>
                        <button onClick={() => onSave(selectedPlayer.id, 'missed')} className="w-full bg-rose-600 hover:bg-rose-500 py-4 rounded-xl font-black text-sm flex items-center justify-center gap-2 uppercase tracking-widest transition-all"><X size={18} /> Erro/Trave</button>
                        <button onClick={() => setSelectedPlayer(null)} className="mt-2 text-slate-500 text-xs font-bold underline">Trocar Batedor</button>
                    </div>
                )}
            </div>
        </div>
    );
};

export const AISelectionModal: React.FC<{ 
    isOpen: boolean; 
    result: any; 
    onSelect: (mode: 'home_only' | 'away_only' | 'both') => void; 
    onClose: () => void; 
}> = ({ isOpen, result, onSelect, onClose }) => {
    if (!isOpen || !result) return null;

    const team1Name = result.teams?.[0]?.teamName || "Time 1";
    const team2Name = result.teams?.[1]?.teamName || "Time 2";

    return (
        <div className="fixed inset-0 bg-black/95 z-[110] flex items-center justify-center p-4 backdrop-blur-md">
            <div className="bg-slate-900 border border-white/10 p-8 rounded-[3rem] max-w-md w-full shadow-2xl animate-in zoom-in-95">
                <div className="w-16 h-16 bg-blue-600/20 rounded-full flex items-center justify-center mx-auto mb-6 text-blue-500">
                    <Users size={32} />
                </div>
                <h3 className="text-xl font-black text-center text-white uppercase tracking-tight mb-2">Súmula Identificada</h3>
                <p className="text-slate-400 text-center text-sm mb-8 px-4">Detectamos duas equipes. Como deseja carregar os dados?</p>
                
                <div className="flex flex-col gap-3">
                    <button 
                        onClick={() => onSelect('both')}
                        className="w-full p-5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl flex flex-col items-center gap-1 transition-all group"
                    >
                        <span className="font-black text-xs uppercase tracking-widest">Carregar Ambas</span>
                        <span className="text-[10px] opacity-70 group-hover:opacity-100 font-bold">{team1Name} vs {team2Name}</span>
                    </button>

                    <div className="grid grid-cols-2 gap-3">
                        <button 
                            onClick={() => onSelect('home_only')}
                            className="p-4 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl flex flex-col items-center gap-1 border border-white/5"
                        >
                            <span className="font-black text-[10px] uppercase">Apenas Mandante</span>
                            <span className="text-[9px] opacity-60 truncate w-full text-center">{team1Name}</span>
                        </button>
                        <button 
                            onClick={() => onSelect('away_only')}
                            className="p-4 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl flex flex-col items-center gap-1 border border-white/5"
                        >
                            <span className="font-black text-[10px] uppercase">Apenas Visitante</span>
                            <span className="text-[9px] opacity-60 truncate w-full text-center">{team2Name}</span>
                        </button>
                    </div>

                    <button 
                        onClick={onClose}
                        className="mt-4 text-slate-500 hover:text-white text-xs font-bold uppercase transition-colors"
                    >
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
    );
};
