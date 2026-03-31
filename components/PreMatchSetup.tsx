import React, { useState } from 'react';
import { MatchState } from '../types';
import { Calendar, Shield, MapPin, Save, X, UserCheck, FileText, Image as ImageIcon, Loader2, BookOpen } from 'lucide-react';
import { parseMatchBannerFromImage, parseRegulationDocument } from '../services/geminiService';

interface PreMatchSetupProps {
    matchState: MatchState;
    setMatchState: React.Dispatch<React.SetStateAction<MatchState>>;
    onSave: () => void;
    onClose?: () => void;
    handleGeminiError: (error: any) => void;
}

const PreMatchSetup: React.FC<PreMatchSetupProps> = ({ matchState, setMatchState, onSave, onClose, handleGeminiError }) => {
    const [isProcessingBanner, setIsProcessingBanner] = useState(false);
    const [isProcessingReg, setIsProcessingReg] = useState(false);

    const handleInputChange = (field: keyof MatchState, value: string) => {
        setMatchState(prev => ({...prev, [field]: value}));
    };

    const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsProcessingBanner(true);
        const reader = new FileReader();
        reader.onload = async (ev) => {
            const base64 = ev.target?.result?.toString().split(',')[1];
            if (base64) {
                try {
                    const data = await parseMatchBannerFromImage(base64);
                    if (data.matches && data.matches.length > 0) {
                        const match = data.matches[0]; // Pega o primeiro confronto automaticamente
                        setMatchState(prev => ({
                            ...prev,
                            competition: match.competition || prev.competition,
                            stadium: match.stadium || prev.stadium,
                            homeTeam: { ...prev.homeTeam, name: match.homeTeam },
                            awayTeam: { ...prev.awayTeam, name: match.awayTeam },
                            observations: `Data/Hora Prevista: ${match.date || ''} ${match.time || ''}`
                        }));
                    }
                } catch (error) { 
                    handleGeminiError(error);
                }
            }
            setIsProcessingBanner(false);
        };
        reader.readAsDataURL(file);
    };

    const handleRegulationUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsProcessingReg(true);
        const reader = new FileReader();
        reader.onload = async (ev) => {
            const base64 = ev.target?.result?.toString().split(',')[1];
            if (base64) {
                try {
                    const data = await parseRegulationDocument(base64, file.type);
                    if (data.halfDuration) {
                        setMatchState(prev => ({
                            ...prev,
                            rules: {
                                halfDuration: data.halfDuration || 45,
                                maxSubstitutions: data.maxSubstitutions || 5,
                                penaltyKicks: data.penaltyKicks || 5,
                                summary: data.summary || ''
                            }
                        }));
                    }
                } catch (error) { 
                    handleGeminiError(error);
                }
            }
            setIsProcessingReg(false);
        };
        reader.readAsDataURL(file);
    };

    return (
        <div className="w-full max-w-2xl max-h-[90vh] flex flex-col bg-slate-900 border border-slate-700 rounded-[2.5rem] shadow-2xl relative ring-1 ring-white/10 overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 via-blue-400 to-blue-600 z-10"></div>
            
            {onClose && (
                <button onClick={onClose} className="absolute top-4 right-4 p-3 text-slate-500 hover:text-white hover:bg-white/10 rounded-full transition-all z-20">
                    <X size={24} />
                </button>
            )}
            
            <div className="p-8 overflow-y-auto custom-scrollbar flex-1">
                <div className="flex flex-col items-center mb-8">
                    <div className="w-16 h-16 bg-blue-600/20 border border-blue-500/30 rounded-3xl flex items-center justify-center mb-4 text-blue-400 shadow-[0_0_30px_rgba(59,130,246,0.15)]">
                        <FileText size={32} />
                    </div>
                    <h1 className="text-3xl font-black text-center text-white uppercase tracking-tighter">Súmula da Partida</h1>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                    {/* Leitor de Banner */}
                    <div className="p-5 bg-slate-800/50 rounded-3xl border border-dashed border-slate-600 flex flex-col items-center text-center">
                        <h3 className="text-white font-bold mb-2 text-sm">Banner do Jogo</h3>
                        <p className="text-[10px] text-slate-400 mb-4">Envie a imagem do jogo para extrair os times.</p>
                        <label className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-xl font-bold cursor-pointer transition-colors flex items-center gap-2 text-xs">
                            {isProcessingBanner ? <Loader2 size={14} className="animate-spin"/> : <ImageIcon size={14} />}
                            {isProcessingBanner ? 'Lendo...' : 'Carregar Imagem'}
                            <input type="file" className="hidden" accept="image/*" onChange={handleBannerUpload} />
                        </label>
                    </div>

                    {/* Leitor de Regulamento */}
                    <div className="p-5 bg-slate-800/50 rounded-3xl border border-dashed border-slate-600 flex flex-col items-center text-center">
                        <h3 className="text-white font-bold mb-2 text-sm">Regulamento Específico</h3>
                        <p className="text-[10px] text-slate-400 mb-4">Envie o PDF do campeonato (ex: Copa Trampolim).</p>
                        <label className="bg-emerald-700 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl font-bold cursor-pointer transition-colors flex items-center gap-2 text-xs">
                            {isProcessingReg ? <Loader2 size={14} className="animate-spin"/> : <BookOpen size={14} />}
                            {isProcessingReg ? 'Lendo...' : 'Carregar PDF'}
                            <input type="file" className="hidden" accept="application/pdf, image/*" onChange={handleRegulationUpload} />
                        </label>
                    </div>
                </div>

                {/* Exibição das Regras Extraídas */}
                {matchState.rules && matchState.rules.halfDuration !== 45 && (
                    <div className="mb-8 p-4 bg-emerald-900/20 border border-emerald-500/30 rounded-2xl text-emerald-100 text-sm">
                        <h4 className="font-black uppercase tracking-widest text-[10px] text-emerald-400 mb-2">Regras Aplicadas pela IA:</h4>
                        <ul className="list-disc pl-4 space-y-1 font-medium">
                            <li>Tempo de Jogo: {matchState.rules.halfDuration} minutos por tempo.</li>
                            <li>Substituições: {matchState.rules.maxSubstitutions} por equipe.</li>
                            <li>Pênaltis (Empate): {matchState.rules.penaltyKicks} cobranças.</li>
                        </ul>
                        {matchState.rules.summary && <p className="text-xs mt-2 text-emerald-300/80 italic">"{matchState.rules.summary}"</p>}
                    </div>
                )}

                <div className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1 block">Competição</label>
                            <input type="text" placeholder="Ex: Copa Trampolim" value={matchState.competition} onChange={(e) => handleInputChange('competition', e.target.value)} className="w-full bg-slate-950/50 border border-white/5 rounded-2xl py-4 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-bold text-sm" />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1 block">Data</label>
                            <input type="date" value={matchState.matchDate} onChange={(e) => handleInputChange('matchDate', e.target.value)} className="w-full bg-slate-950/50 border border-white/5 rounded-2xl py-4 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-bold text-sm" />
                        </div>
                    </div>

                    <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1 block">Estádio / Local</label>
                        <input type="text" placeholder="Ex: Maracanã" value={matchState.stadium} onChange={(e) => handleInputChange('stadium', e.target.value)} className="w-full bg-slate-950/50 border border-white/5 rounded-2xl py-4 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-bold text-sm" />
                    </div>

                    <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1 block">Observações / Rodada</label>
                        <textarea placeholder="Ex: Final - Jogo Único" value={matchState.observations || ''} onChange={(e) => handleInputChange('observations', e.target.value)} className="w-full bg-slate-950/50 border border-white/5 rounded-2xl p-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-bold text-sm min-h-[80px] resize-none" />
                    </div>
                </div>

                <div className="mt-10 mb-2">
                    <button onClick={onSave} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-5 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-95 shadow-xl shadow-blue-900/20 uppercase tracking-[0.2em] text-xs">
                        <Save size={18} /> Confirmar e Iniciar Cabine
                    </button>
                </div>
            </div>
            
            <style>{`.custom-scrollbar::-webkit-scrollbar { width: 6px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }`}</style>
        </div>
    );
};

export default PreMatchSetup;
