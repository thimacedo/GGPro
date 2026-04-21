/**
 * @fileoverview Componente Voice HUD (Narrador Pro)
 * Feedback visual de alta fidelidade para comandos de voz.
 */

export const renderVoiceHud = (state) => {
  const { isRecording, isProcessing } = state;
  
  if (!isRecording && !isProcessing) return '';

  return `
    <div class="fixed inset-0 z-[200] pointer-events-none flex flex-col items-center justify-end pb-32 animate-fade-in">
      <!-- Overlay de Fundo -->
      <div class="absolute inset-0 bg-gradient-to-t from-blue-900/40 via-transparent to-transparent opacity-60"></div>
      
      <!-- Container Central -->
      <div class="relative flex flex-col items-center gap-6">
        <!-- Onda de Voz -->
        <div class="flex items-center gap-1.5 h-12">
          ${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => `
            <div class="voice-bar" style="animation-delay: ${i * 0.1}s; height: ${10 + Math.random() * 30}px"></div>
          `).join('')}
        </div>

        <!-- Texto de Status -->
        <div class="bg-slate-900/80 backdrop-blur-xl border border-white/10 px-6 py-2 rounded-full shadow-2xl">
          <span class="text-[10px] font-black uppercase tracking-[0.3em] text-white animate-pulse">
            ${isProcessing ? 'IA: Processando Narração...' : 'IA: Ouvindo Comandos...'}
          </span>
        </div>
      </div>

      <!-- Partículas de Processamento (Aparecem apenas no isProcessing) -->
      ${isProcessing ? `
        <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border border-blue-500/20 rounded-full animate-spin-slow"></div>
        <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border border-white/10 rounded-full animate-reverse-spin"></div>
      ` : ''}
    </div>
  `;
};

// Adicionar classes extras ao style.css via injeção dinâmica ou certificar que existam
const style = document.createElement('style');
style.textContent = `
  @keyframes spin-slow { from { transform: translate(-50%, -50%) rotate(0deg); } to { transform: translate(-50%, -50%) rotate(360deg); } }
  @keyframes reverse-spin { from { transform: translate(-50%, -50%) rotate(360deg); } to { transform: translate(-50%, -50%) rotate(0deg); } }
  .animate-spin-slow { animation: spin-slow 8s linear infinite; }
  .animate-reverse-spin { animation: reverse-spin 4s linear infinite; }
`;
document.head.appendChild(style);
