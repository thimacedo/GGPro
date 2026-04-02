export const Modal = (content, title, onClose) => {
  return `
    <div id="modal-overlay" class="fixed inset-0 bg-black/90 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div class="w-full max-w-2xl max-h-[90vh] flex flex-col bg-slate-900 border border-slate-700 rounded-[2.5rem] shadow-2xl relative ring-1 ring-white/10 overflow-hidden">
        <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 via-blue-400 to-blue-600 z-10"></div>
        <button onclick="app.closeModal()" class="absolute top-4 right-4 p-3 text-slate-500 hover:text-white hover:bg-white/10 rounded-full transition-all z-20">
          <i data-lucide="x" class="w-6 h-6"></i>
        </button>
        <div class="p-8 overflow-y-auto custom-scrollbar flex-1">
          ${title ? `<h2 class="text-2xl font-black text-white uppercase tracking-tighter mb-6 text-center">${title}</h2>` : ''}
          ${content}
        </div>
      </div>
    </div>
  `;
};

export const PreMatchSetupContent = (state) => {
  return `
    <div class="flex flex-col items-center mb-8">
        <div class="w-16 h-16 bg-blue-600/20 border border-blue-500/30 rounded-3xl flex items-center justify-center mb-4 text-blue-400">
            <i data-lucide="file-text" class="w-8 h-8"></i>
        </div>
        <h1 class="text-3xl font-black text-center text-white uppercase tracking-tighter">Súmula da Partida</h1>
    </div>
    
    <div class="space-y-5">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
                <label class="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1 block">Competição</label>
                <input type="text" id="setup-competition" placeholder="Ex: Copa Trampolim" value="${state.competition}" class="w-full bg-slate-950/50 border border-white/5 rounded-2xl py-4 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-bold text-sm">
            </div>
            <div>
                <label class="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1 block">Árbitro</label>
                <input type="text" id="setup-referee" placeholder="Ex: Wilton P. Sampaio" value="${state.referee || ''}" class="w-full bg-slate-950/50 border border-white/5 rounded-2xl py-4 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-bold text-sm">
            </div>
        </div>
        <div>
            <label class="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1 block">Estádio / Local</label>
            <input type="text" id="setup-stadium" placeholder="Ex: Maracanã" value="${state.stadium}" class="w-full bg-slate-950/50 border border-white/5 rounded-2xl py-4 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-bold text-sm">
        </div>
        <button onclick="app.saveSetup()" class="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-5 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-95 shadow-xl shadow-blue-900/20 uppercase tracking-[0.2em] text-xs mt-6">
            <i data-lucide="save" class="w-4.5 h-4.5"></i> Confirmar e Iniciar
        </button>
    </div>
  `;
};
