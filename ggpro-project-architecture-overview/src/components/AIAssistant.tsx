import { useState, useRef, useEffect } from 'react';
import type { MatchState } from '../types';
import { 
  isAIAvailable, 
  generateChronicle, 
  generateMatchAnalysis, 
  chatWithAI, 
  buildMatchContext,
  type AIMessage 
} from '../services/aiService';

interface AIAssistantProps {
  state: MatchState;
  homeGoals: number;
  awayGoals: number;
}

export function AIAssistant({ state, homeGoals, awayGoals }: AIAssistantProps) {
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chronicle, setChronicle] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const matchContext = buildMatchContext({
    ...state,
    score: { home: homeGoals, away: awayGoals },
  });

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    
    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const history: AIMessage[] = messages.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        text: m.content,
      }));

      const response = await chatWithAI(userMessage, matchContext, history);
      
      if (response.error) {
        setMessages(prev => [...prev, { role: 'assistant', content: `❌ ${response.error}` }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: response.text }]);
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: '❌ Erro ao conectar com a IA.' }]);
    }

    setIsLoading(false);
  };

  const handleChronicle = async () => {
    setIsLoading(true);
    try {
      const result = await generateChronicle(matchContext);
      setChronicle(result.error ? `❌ ${result.error}` : result.text);
    } catch {
      setChronicle('❌ Erro ao gerar crônica.');
    }
    setIsLoading(false);
  };

  const handleAnalysis = async () => {
    setIsLoading(true);
    try {
      const result = await generateMatchAnalysis(matchContext);
      setAnalysis(result.error ? `❌ ${result.error}` : result.text);
    } catch {
      setAnalysis('❌ Erro ao analisar partida.');
    }
    setIsLoading(false);
  };

  if (!isAIAvailable()) {
    return (
      <div className="bg-neutral-900/50 rounded-2xl p-6 text-center">
        <div className="text-4xl mb-4">🤖</div>
        <h3 className="text-lg font-bold mb-2">IA Indisponível</h3>
        <p className="text-sm text-neutral-500 mb-4">
          Verifique sua conexão com a internet ou tente recarregar a página.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-sm"
        >
          Recarregar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={handleChronicle}
          disabled={isLoading}
          className="py-3 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold text-sm uppercase tracking-wider disabled:opacity-50 active:scale-[0.98] transition-transform"
        >
          📝 Gerar Crônica
        </button>
        <button
          onClick={handleAnalysis}
          disabled={isLoading}
          className="py-3 rounded-xl bg-gradient-to-r from-green-600 to-teal-600 text-white font-bold text-sm uppercase tracking-wider disabled:opacity-50 active:scale-[0.98] transition-transform"
        >
          📊 Analisar Partida
        </button>
      </div>

      {/* Chronicle Output */}
      {chronicle && (
        <div className="bg-neutral-900/50 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500">📝 Crônica</h3>
            <button
              onClick={() => navigator.clipboard.writeText(chronicle)}
              className="text-[10px] text-neutral-500 hover:text-white"
            >
              📋 Copiar
            </button>
          </div>
          <div className="text-sm text-neutral-300 whitespace-pre-wrap">{chronicle}</div>
        </div>
      )}

      {/* Analysis Output */}
      {analysis && (
        <div className="bg-neutral-900/50 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500">📊 Análise</h3>
            <button
              onClick={() => navigator.clipboard.writeText(analysis)}
              className="text-[10px] text-neutral-500 hover:text-white"
            >
              📋 Copiar
            </button>
          </div>
          <div className="text-sm text-neutral-300 whitespace-pre-wrap">{analysis}</div>
        </div>
      )}

      {/* Chat */}
      <div className="bg-neutral-900/50 rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-white/5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500">💬 Chat com IA</h3>
        </div>
        
        <div className="h-48 overflow-y-auto p-4 space-y-2 thin-scrollbar">
          {messages.length === 0 && (
            <div className="text-center text-neutral-600 text-sm py-8">
              Pergunte sobre a partida, jogadores, estatísticas...
            </div>
          )}
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] px-3 py-2 rounded-xl text-sm ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-neutral-800 text-neutral-200'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-neutral-800 px-3 py-2 rounded-xl text-sm text-neutral-400">
                Pensando...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-2 border-t border-white/5 flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="Pergunte algo..."
            className="flex-1 bg-neutral-800 rounded-xl px-3 py-2 text-sm text-white placeholder-neutral-500 outline-none"
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-sm disabled:opacity-50"
          >
            Enviar
          </button>
        </div>
      </div>
    </div>
  );
}
