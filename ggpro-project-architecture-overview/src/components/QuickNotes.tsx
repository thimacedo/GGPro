import { useState } from 'react';
import type { QuickNote, Period } from '../types';

interface Props {
  notes: QuickNote[];
  period: Period;
  onAdd: (text: string) => void;
  onRemove: (id: string) => void;
}

const PERIOD_LABELS: Record<Period, string> = {
  PRE_MATCH: 'Pré', '1T': '1ºT', INTERVAL: 'Int', '2T': '2ºT',
  '1ET': '1ºTE', '2ET': '2ºTE', PENALTIES: 'Pên', FINISHED: 'Fim'
};

export function QuickNotes({ notes, period, onAdd, onRemove }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      onAdd(input.trim());
      setInput('');
    }
  };

  const currentNotes = notes.filter(n => n.period === period);

  return (
    <div className="relative">
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2 rounded-lg transition-all ${
          isOpen ? 'bg-amber-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
        }`}
      >
        📝
        {currentNotes.length > 0 && !isOpen && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-white text-xs rounded-full flex items-center justify-center">
            {currentNotes.length}
          </span>
        )}
      </button>

      {/* Panel */}
      {isOpen && (
        <div className="absolute bottom-12 right-0 w-72 bg-slate-800 rounded-lg shadow-xl border border-slate-700 overflow-hidden z-50">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 bg-slate-700/50 border-b border-slate-600">
            <span className="text-sm font-medium text-slate-200">Anotações</span>
            <span className="text-xs text-slate-400">{PERIOD_LABELS[period]}</span>
          </div>

          {/* Notes List */}
          <div className="max-h-48 overflow-y-auto">
            {currentNotes.length === 0 ? (
              <div className="p-4 text-center text-slate-500 text-sm">
                Sem anotações neste período
              </div>
            ) : (
              <div className="divide-y divide-slate-700">
                {currentNotes.map(note => (
                  <div key={note.id} className="p-2 group hover:bg-slate-700/50">
                    <div className="flex items-start gap-2">
                      <span className="text-xs text-slate-400 mt-0.5">{note.minute}'</span>
                      <p className="flex-1 text-sm text-slate-200">{note.text}</p>
                      <button
                        onClick={() => onRemove(note.id)}
                        className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-400 text-xs"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="p-2 border-t border-slate-700">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Nova anotação..."
                className="flex-1 bg-slate-700 rounded px-3 py-2 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
                autoFocus
              />
              <button
                type="submit"
                disabled={!input.trim()}
                className="px-3 py-2 bg-amber-500 text-white rounded text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                +
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
