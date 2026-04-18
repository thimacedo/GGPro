import { useState, useRef, useCallback, useMemo } from 'react';
import type { Player } from '../types';
import { ocrImage, terminateWorker, parseSumulaText, parseSumulaTextAI, type OCRParsedResult, type OCRProgressInfo, type OCRParsedPlayer } from '../services/ocrService';

interface OCRImportProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (data: {
    homeTeamName: string; awayTeamName: string;
    homePlayers: Omit<Player, 'id'>[]; awayPlayers: Omit<Player, 'id'>[];
    competition: string; category: string; stadium: string; referee: string;
    date: string; time: string; homeCoach: string; awayCoach: string;
  }) => void;
}

type SingleTeamAssign = 'home' | 'away' | null;

const emptyResult: OCRParsedResult = {
  rawText: '', engine: '', homeTeam: '', awayTeam: '',
  competition: '', category: '', stadium: '', referee: '',
  date: '', time: '', homeCoach: '', awayCoach: '',
  homePlayers: [], awayPlayers: [],
};

type Step = 'start' | 'processing' | 'review';

export function OCRImport({ isOpen, onClose, onImport }: OCRImportProps) {
  const [step, setStep] = useState<Step>('start');
  const [ocrProgress, setOcrProgress] = useState<OCRProgressInfo>({ percent: 0, engine: '', status: '' });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rawText, setRawText] = useState('');
  const [usedEngine, setUsedEngine] = useState('');
  const [isReAnalyzing, setIsReAnalyzing] = useState(false);
  const [singleTeamAssign, setSingleTeamAssign] = useState<SingleTeamAssign>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [result, setResult] = useState<OCRParsedResult>(emptyResult);
  
  // Detect if only one team has players
  const singleTeamMode = useMemo(() => {
    const hasHome = result.homePlayers.length > 0 || result.homeTeam;
    const hasAway = result.awayPlayers.length > 0 || result.awayTeam;
    if (hasHome && !hasAway) return 'home';
    if (!hasHome && hasAway) return 'away';
    return null;
  }, [result.homePlayers.length, result.awayPlayers.length, result.homeTeam, result.awayTeam]);

  const handleImageUpload = useCallback(async (file: File) => {
    setError(null);
    setStep('processing');
    setOcrProgress({ percent: 0, engine: '', status: 'Preparando...' });

    const reader = new FileReader();
    reader.onload = async () => {
      setImagePreview(reader.result as string);

      const ocrResult = await ocrImage(file, info => setOcrProgress(info));

      if ('error' in ocrResult) {
        setError(ocrResult.error);
        setRawText('');
        setResult(emptyResult);
        setUsedEngine('');
        setStep('review');
        return;
      }

      setResult(ocrResult.result);
      setRawText(ocrResult.result.rawText);
      setUsedEngine(ocrResult.result.engine);
      setStep('review');
    };
    reader.readAsDataURL(file);
  }, []);

  const handleTextParse = useCallback(async () => {
    if (!rawText.trim()) return;
    setError(null);
    setIsReAnalyzing(true);
    try {
      const parsed = await parseSumulaTextAI(rawText);
      setResult(prev => ({ ...prev, ...parsed, rawText, engine: prev.engine || 'Texto colado + IA' }));
    } catch {
      const parsed = parseSumulaText(rawText);
      setResult(prev => ({ ...prev, ...parsed, rawText, engine: prev.engine || 'Texto colado' }));
    }
    setIsReAnalyzing(false);
  }, [rawText]);

  const handleImport = () => {
    const finalResult = rawText.trim() ? { ...result, rawText } : result;

    onImport({
      homeTeamName: finalResult.homeTeam,
      awayTeamName: finalResult.awayTeam,
      homePlayers: finalResult.homePlayers.map(p => ({
        name: p.name, number: p.number, position: p.position,
        isStarter: p.isStarter, hasLeftGame: false,
      })),
      awayPlayers: finalResult.awayPlayers.map(p => ({
        name: p.name, number: p.number, position: p.position,
        isStarter: p.isStarter, hasLeftGame: false,
      })),
      competition: finalResult.competition,
      category: finalResult.category,
      stadium: finalResult.stadium,
      referee: finalResult.referee,
      date: finalResult.date,
      time: finalResult.time,
      homeCoach: finalResult.homeCoach,
      awayCoach: finalResult.awayCoach,
    });
    handleClose();
  };

  const goToManualEntry = () => {
    setResult(emptyResult);
    setRawText('');
    setError(null);
    setUsedEngine('');
    setStep('review');
  };

  const resetState = () => {
    setResult(emptyResult);
    setImagePreview(null);
    setRawText('');
    setError(null);
    setUsedEngine('');
    setIsReAnalyzing(false);
    setOcrProgress({ percent: 0, engine: '', status: '' });
    setSingleTeamAssign(null);
    setStep('start');
  };

  const handleClose = () => {
    onClose();
    setTimeout(resetState, 300);
    terminateWorker();
  };

  const addPlayerTo = (side: 'home' | 'away') => {
    setResult(prev => {
      const key = side === 'home' ? 'homePlayers' : 'awayPlayers';
      const maxNum = prev[key].reduce((max, p) => Math.max(max, p.number), 0);
      return {
        ...prev,
        [key]: [...prev[key], { number: maxNum + 1, name: '', position: 'MC', isStarter: prev[key].length < 11 }],
      };
    });
  };

  const updatePlayerField = (side: 'home' | 'away', index: number, field: string, value: any) => {
    setResult(prev => {
      const key = side === 'home' ? 'homePlayers' : 'awayPlayers';
      return {
        ...prev,
        [key]: prev[key].map((p, i) => i === index ? { ...p, [field]: value } : p),
      };
    });
  };

  const removePlayerAt = (side: 'home' | 'away', index: number) => {
    setResult(prev => {
      const key = side === 'home' ? 'homePlayers' : 'awayPlayers';
      return { ...prev, [key]: prev[key].filter((_, i) => i !== index) };
    });
  };

  if (!isOpen) return null;

  const starters = (players: OCRParsedPlayer[]) => players.filter(p => p.isStarter);
  const reserves = (players: OCRParsedPlayer[]) => players.filter(p => !p.isStarter);

  return (
    <div className="fixed inset-0 z-[60] bg-black/95 backdrop-blur-md flex flex-col" onClick={handleClose}>
      <div
        className="bg-slate-900 flex flex-col flex-1 min-h-0 sm:flex-none sm:max-h-[92vh] sm:max-w-2xl sm:mx-auto sm:my-auto sm:rounded-2xl sm:border sm:border-white/10 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center px-4 py-3 border-b border-white/5 bg-slate-950/50 shrink-0">
          <div>
            <h2 className="text-sm font-black uppercase tracking-widest text-white flex items-center gap-2">
              📸 Importar Súmula
            </h2>
            <p className="text-[10px] text-emerald-500/70 mt-0.5 font-bold">
              Mistral OCR → IA interpreta os dados
            </p>
          </div>
          <button
            onClick={handleClose}
            className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-white transition-colors rounded-xl hover:bg-white/5 text-xl"
          >✕</button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0">

          {/* ===== STEP 1: START ===== */}
          {step === 'start' && (
            <div className="p-4 space-y-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-emerald-500/30 rounded-2xl p-8 text-center cursor-pointer hover:border-emerald-500/60 hover:bg-emerald-500/5 transition-all active:scale-[0.99]"
              >
                <div className="text-6xl mb-3">📷</div>
                <p className="text-lg font-black text-white mb-1">Fotografar Súmula</p>
                <p className="text-sm text-slate-400">Tire foto ou selecione da galeria</p>
                <p className="text-[10px] text-emerald-400/60 mt-2">OCR → IA interpreta times, jogadores, arbitragem, técnicos</p>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) handleImageUpload(file);
                }}
              />

              <div className="flex items-center gap-3 py-1">
                <div className="flex-1 h-px bg-white/10" />
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">ou</span>
                <div className="flex-1 h-px bg-white/10" />
              </div>

              <button
                onClick={() => { setStep('review'); }}
                className="w-full border-2 border-dashed border-blue-500/30 rounded-2xl p-6 text-center cursor-pointer hover:border-blue-500/60 hover:bg-blue-500/5 transition-all active:scale-[0.99]"
              >
                <div className="text-4xl mb-2">📋</div>
                <p className="text-base font-bold text-white mb-1">Colar Texto</p>
                <p className="text-xs text-slate-400">Cole o texto da súmula e a IA interpreta</p>
              </button>

              <button
                onClick={goToManualEntry}
                className="w-full border-2 border-dashed border-amber-500/30 rounded-2xl p-6 text-center cursor-pointer hover:border-amber-500/60 hover:bg-amber-500/5 transition-all active:scale-[0.99]"
              >
                <div className="text-4xl mb-2">✏️</div>
                <p className="text-base font-bold text-white mb-1">Digitação Rápida</p>
                <p className="text-xs text-slate-400">Cadastre times e jogadores manualmente</p>
              </button>

              <div className="bg-slate-800/50 rounded-xl p-3 space-y-1.5">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">💡 Dicas para melhor OCR</p>
                <p className="text-[10px] text-slate-500">• Foto bem iluminada, sem sombras</p>
                <p className="text-[10px] text-slate-500">• Súmula plana e centralizada</p>
                <p className="text-[10px] text-slate-500">• A IA interpreta os dados automaticamente</p>
              </div>
            </div>
          )}

          {/* ===== STEP 2: PROCESSING ===== */}
          {step === 'processing' && (
            <div className="p-4 space-y-4">
              {imagePreview && (
                <div className="relative rounded-xl overflow-hidden border border-white/10">
                  <img src={imagePreview} alt="Súmula" className="w-full max-h-48 object-contain bg-slate-800" />
                </div>
              )}
              <div className="text-center space-y-3 py-8">
                <div className="text-6xl animate-pulse">🔍</div>
                <p className="text-lg font-black text-white">{ocrProgress.status || 'Processando...'}</p>
                <p className="text-sm text-slate-400">
                  Motor: <span className="text-emerald-400 font-bold">{ocrProgress.engine || 'Preparando'}</span>
                </p>
                <div className="max-w-xs mx-auto">
                  <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(5, ocrProgress.percent)}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1.5 font-mono">{ocrProgress.percent}%</p>
                </div>
                <div className="text-[10px] text-slate-600 mt-4 space-y-0.5">
                  <p>1️⃣ OCR extrai o texto (Mistral/Textract/OCR.space)</p>
                  <p>2️⃣ IA interpreta times, jogadores, arbitragem</p>
                </div>
              </div>
            </div>
          )}

          {/* ===== STEP 3: REVIEW ===== */}
          {step === 'review' && (
            <div className="p-4 space-y-4">

              {/* Engine badge / error */}
              {usedEngine && !error && (
                <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-2.5">
                  <span className="text-emerald-400">✅</span>
                  <span className="text-xs text-emerald-300 font-bold">
                    Reconhecido por: <span className="text-emerald-200">{usedEngine}</span>
                  </span>
                </div>
              )}

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-400 text-xs space-y-1">
                  <p className="font-bold">⚠️ {error}</p>
                  <p className="text-red-400/70">Use o campo de texto para colar/digitar os dados</p>
                </div>
              )}

              {/* Photo Reference */}
              {imagePreview && (
                <details open className="group">
                  <summary className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 cursor-pointer hover:text-white transition-colors flex items-center gap-1 py-1">
                    📷 Foto original (referência) <span className="text-slate-600">(clique para expandir/recolher)</span>
                  </summary>
                  <div className="mt-1.5 rounded-xl overflow-hidden border border-white/10 max-h-64 overflow-y-auto">
                    <img src={imagePreview} alt="Súmula" className="w-full object-contain bg-slate-800" />
                  </div>
                </details>
              )}

              {/* Raw Text */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    📝 Texto extraído — edite e corrija
                  </label>
                  <button
                    onClick={handleTextParse}
                    disabled={isReAnalyzing}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:bg-slate-700 disabled:text-slate-500 rounded-lg text-[10px] font-bold text-white uppercase tracking-wider transition-all active:scale-95"
                  >
                    {isReAnalyzing ? '⏳ Analisando...' : '🤖 Re-analisar com IA'}
                  </button>
                </div>
                <textarea
                  value={rawText}
                  onChange={e => setRawText(e.target.value)}
                  className="w-full h-40 bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none transition-colors resize-y font-mono placeholder:text-slate-600 leading-relaxed"
                  placeholder={`Cole o texto da súmula aqui...\n\nOBS: A coluna da esquerda = time da casa\n      A coluna da direita = time visitante`}
                />
              </div>

              {/* Match Info */}
              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">📋 Informações da Partida</h4>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { key: 'homeTeam' as const, label: '🏠 Time Casa' },
                    { key: 'awayTeam' as const, label: '✈️ Time Fora' },
                    { key: 'competition' as const, label: '🏆 Competição' },
                    { key: 'category' as const, label: '🏷️ Categoria' },
                    { key: 'stadium' as const, label: '🏟️ Estádio' },
                    { key: 'referee' as const, label: '⚖️ Árbitro' },
                    { key: 'date' as const, label: '📅 Data' },
                    { key: 'time' as const, label: '🕐 Hora' },
                    { key: 'homeCoach' as const, label: '🧑‍💼 Técnico Casa' },
                    { key: 'awayCoach' as const, label: '🧑‍💼 Técnico Fora' },
                  ]).map(field => (
                    <div key={field.key}>
                      <label className="text-[8px] font-bold uppercase tracking-wider text-slate-600 mb-0.5 block">{field.label}</label>
                      <input
                        type="text"
                        value={result[field.key] || ''}
                        onChange={e => setResult(prev => ({ ...prev, [field.key]: e.target.value }))}
                        className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none"
                        placeholder={field.label.replace(/^[^\s]+\s/, '')}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Single Team Assignment Banner */}
              {singleTeamMode && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3">
                  <p className="text-xs text-amber-300 font-bold mb-2">
                    ⚠️ Apenas um time foi detectado. Para qual equipe?
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        if (singleTeamMode === 'away') {
                          // Move away players to home
                          setResult(prev => ({
                            ...prev,
                            homeTeam: prev.awayTeam,
                            homePlayers: prev.awayPlayers,
                            awayTeam: '',
                            awayPlayers: [],
                          }));
                        }
                        setSingleTeamAssign('home');
                      }}
                      className={`flex-1 py-2.5 rounded-lg font-bold text-sm transition-all ${
                        singleTeamAssign === 'home' 
                          ? 'bg-blue-500 text-white' 
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      🏠 Casa
                    </button>
                    <button
                      onClick={() => {
                        if (singleTeamMode === 'home') {
                          // Move home players to away
                          setResult(prev => ({
                            ...prev,
                            awayTeam: prev.homeTeam,
                            awayPlayers: prev.homePlayers,
                            homeTeam: '',
                            homePlayers: [],
                          }));
                        }
                        setSingleTeamAssign('away');
                      }}
                      className={`flex-1 py-2.5 rounded-lg font-bold text-sm transition-all ${
                        singleTeamAssign === 'away' 
                          ? 'bg-red-500 text-white' 
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      ✈️ Visitante
                    </button>
                  </div>
                </div>
              )}

              {/* Players */}
              <div className={singleTeamMode ? 'grid grid-cols-1 gap-3' : 'grid grid-cols-2 gap-3'}>
                {(!singleTeamMode || singleTeamAssign === 'home' || singleTeamMode === 'away') && (
                  <PlayerListEditable
                    label={result.homeTeam || 'Casa'}
                    color="blue"
                    players={result.homePlayers}
                    onRemove={i => removePlayerAt('home', i)}
                    onUpdate={(i, f, v) => updatePlayerField('home', i, f, v)}
                    onAdd={() => addPlayerTo('home')}
                    starters={starters(result.homePlayers)}
                    reserves={reserves(result.homePlayers)}
                    hidden={singleTeamMode === 'away' && singleTeamAssign !== 'home'}
                  />
                )}
                {(!singleTeamMode || singleTeamAssign === 'away' || singleTeamMode === 'home') && (
                  <PlayerListEditable
                    label={result.awayTeam || 'Visitante'}
                    color="red"
                    players={result.awayPlayers}
                    onRemove={i => removePlayerAt('away', i)}
                    onUpdate={(i, f, v) => updatePlayerField('away', i, f, v)}
                    onAdd={() => addPlayerTo('away')}
                    starters={starters(result.awayPlayers)}
                    reserves={reserves(result.awayPlayers)}
                    hidden={singleTeamMode === 'home' && singleTeamAssign !== 'away'}
                  />
                )}
              </div>

              {/* Import Button */}
              <button
                onClick={handleImport}
                disabled={!result.homeTeam && result.homePlayers.length === 0 && !result.awayTeam && result.awayPlayers.length === 0}
                className="w-full py-4 bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-500 hover:to-blue-500 active:from-emerald-700 active:to-blue-700 disabled:from-slate-700 disabled:to-slate-700 disabled:text-slate-500 rounded-xl font-black text-base uppercase tracking-wider text-white transition-all shadow-lg active:scale-[0.99]"
              >
                ✅ Importar para a Partida
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PlayerListEditable({ label, color, players, onRemove, onUpdate, onAdd, starters, reserves, hidden }: {
  label: string;
  color: 'blue' | 'red';
  players: OCRParsedPlayer[];
  onRemove: (index: number) => void;
  onUpdate: (index: number, field: string, value: any) => void;
  onAdd: () => void;
  starters: OCRParsedPlayer[];
  reserves: OCRParsedPlayer[];
  hidden?: boolean;
}) {
  if (hidden) return null;
  const colorClass = color === 'blue' ? 'text-blue-400' : 'text-red-400';
  const dotClass = color === 'blue' ? 'bg-blue-500' : 'bg-red-500';
  const bgClass = color === 'blue' ? 'bg-blue-500/5' : 'bg-red-500/5';
  const borderClass = color === 'blue' ? 'border-blue-500/20' : 'border-red-500/20';

  return (
    <div className={`rounded-xl border ${borderClass} ${bgClass} p-2.5`}>
      <h4 className={`text-[10px] font-bold uppercase tracking-wider ${colorClass} mb-2 flex items-center gap-1`}>
        <span className={`w-2 h-2 rounded-full ${dotClass}`} />
        {label} ({players.length})
      </h4>

      <div className="space-y-0.5 max-h-72 overflow-y-auto custom-scrollbar">
        {/* Starters */}
        {starters.length > 0 && reserves.length > 0 && (
          <p className="text-[8px] font-bold uppercase tracking-wider text-emerald-500/60 px-1 py-0.5">Titulares ({starters.length})</p>
        )}
        {players.map((p, i) => {
          const isReserve = !p.isStarter;
          const showReserveHeader = isReserve && i > 0 && players[i - 1]?.isStarter;

          return (
            <div key={i}>
              {showReserveHeader && (
                <p className="text-[8px] font-bold uppercase tracking-wider text-amber-500/60 px-1 py-0.5 mt-1">
                  Reservas ({reserves.length})
                </p>
              )}
              <div className={`flex items-center gap-1 p-1.5 rounded-lg text-xs group ${isReserve ? 'bg-slate-900/40' : 'bg-slate-900/60'}`}>
                <span className={`${colorClass} font-black min-w-[20px] text-[11px]`}>#{p.number}</span>
                <input
                  type="text"
                  value={p.name}
                  onChange={e => onUpdate(i, 'name', e.target.value)}
                  className="flex-1 bg-transparent text-white text-[11px] border-none outline-none min-w-0"
                  placeholder="Nome"
                />
                <select
                  value={p.position}
                  onChange={e => onUpdate(i, 'position', e.target.value)}
                  className="bg-transparent text-slate-400 text-[9px] border-none outline-none cursor-pointer w-10"
                >
                  {['GK','ZAG','LD','LE','VOL','MC','MD','ME','MEI','ATA','PD','PE'].map(pos => (
                    <option key={pos} value={pos} className="bg-slate-800">{pos}</option>
                  ))}
                </select>
                <button
                  onClick={() => onUpdate(i, 'isStarter', !p.isStarter)}
                  className={`text-[9px] px-1 py-0.5 rounded ${p.isStarter ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'} transition-colors`}
                  title={p.isStarter ? 'Titular' : 'Reserva'}
                >
                  {p.isStarter ? 'T' : 'R'}
                </button>
                <button
                  onClick={() => onRemove(i)}
                  className="text-slate-700 hover:text-red-400 text-sm ml-0.5 opacity-60 group-hover:opacity-100 transition-opacity"
                >✕</button>
              </div>
            </div>
          );
        })}
        {players.length === 0 && (
          <p className="text-slate-600 text-[10px] text-center py-4">Nenhum jogador</p>
        )}
      </div>

      {/* Quick add */}
      <button
        onClick={onAdd}
        className="mt-2 w-full py-1.5 bg-slate-900/80 hover:bg-slate-800 active:bg-slate-950 border border-white/5 rounded-lg text-[10px] font-bold text-slate-400 hover:text-white transition-all active:scale-95"
      >
        + Jogador
      </button>
    </div>
  );
}
