// js/components/pressure-gauge.js - Componente de Visualização de Pressão v1.0
// Renderiza um medidor de pressão reativo baseado no PressureService.

export const renderPressureGauge = (analysis) => {
  if (!analysis) return '';

  const { score, narrative, dominance } = analysis;
  
  // Mapeamento de cores baseado na dominância
  const getDominanceColor = () => {
    if (dominance === 'home') return 'from-blue-500 to-indigo-600';
    if (dominance === 'away') return 'from-red-500 to-orange-600';
    return 'from-slate-500 to-slate-600';
  };

  // Cálculo da posição do ponteiro (0 a 100)
  const needlePos = score;

  return `
    <div class="bg-slate-900/40 backdrop-blur-md border border-white/5 p-4 rounded-3xl shadow-xl flex flex-col gap-3 animate-fade-in max-w-xs mx-auto">
      <div class="flex justify-between items-center mb-1">
        <span class="text-[8px] font-black uppercase tracking-[0.2em] text-slate-500">IA: Momento de Pressão</span>
        <div class="flex items-center gap-1.5">
          <div class="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
          <span class="text-[8px] font-bold text-green-500 uppercase">Live Analysis</span>
        </div>
      </div>

      <!-- Barra de Pressão (Gauge) -->
      <div class="relative w-full h-2 bg-slate-800 rounded-full overflow-hidden flex shadow-inner">
        <!-- Mandante (Lado Esquerdo se Score < 50, ou Central se 50) -->
        <div class="absolute inset-y-0 left-0 transition-all duration-1000 ease-out bg-gradient-to-r from-blue-600 to-indigo-500" 
             style="width: ${score > 50 ? score : 0}%"></div>
        <!-- Visitante (Lado Direito se Score < 50) -->
        <div class="absolute inset-y-0 right-0 transition-all duration-1000 ease-out bg-gradient-to-l from-red-600 to-orange-500" 
             style="width: ${score < 50 ? (100 - score) : 0}%"></div>
        
        <!-- Marcador Central -->
        <div class="absolute left-1/2 top-0 bottom-0 w-0.5 bg-white/20 -translate-x-1/2"></div>
      </div>

      <!-- Narrativa da IA -->
      <div class="flex items-start gap-2.5">
        <div class="mt-1 p-1 bg-white/5 rounded-lg">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <p class="text-[10px] leading-relaxed font-bold text-slate-200 italic">
          "${narrative}"
        </p>
      </div>
    </div>
  `;
};
