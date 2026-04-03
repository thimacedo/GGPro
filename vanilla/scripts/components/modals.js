// Componente de Modais - Narrador Pro
// Gerencia todos os diálogos do sistema

import matchState from '../state.js';

class ModalManager {
  constructor() {
    this.activeModal = null;
    this.init();
  }

  init() {
    // Escuchar fechamento por tecla ESC
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.close();
    });
  }

  open(content, title = '') {
    this.close(); // Fechar qualquer modal aberto

    const overlay = document.createElement('div');
    overlay.id = 'modalOverlay';
    overlay.className = 'fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-fade-in';
    
    const card = document.createElement('div');
    card.className = 'bg-slate-900 border border-white/10 rounded-[2.5rem] shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden animate-slide-up';
    
    card.innerHTML = `
      <div class="px-8 py-6 border-b border-white/5 bg-white/5 flex justify-between items-center shrink-0">
        <h3 class="text-xs font-black uppercase tracking-[0.3em] text-slate-400">${title}</h3>
        <button id="closeModalBtn" class="p-2 text-slate-500 hover:text-white transition-colors text-xl">✕</button>
      </div>
      <div class="flex-1 overflow-y-auto custom-scrollbar p-8">
        ${content}
      </div>
    `;

    overlay.appendChild(card);
    document.body.appendChild(overlay);
    this.activeModal = overlay;

    // Event listeners
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this.close();
    });
    
    overlay.querySelector('#closeModalBtn').addEventListener('click', () => this.close());
    
    // Auto-focus no primeiro input se houver
    const firstInput = card.querySelector('input, textarea');
    if (firstInput) setTimeout(() => firstInput.focus(), 100);
  }

  close() {
    if (this.activeModal) {
      this.activeModal.remove();
      this.activeModal = null;
    }
  }

  // --- Templates específicos ---

  showPlayerActions(player, team, teamId) {
    const isStarter = player.isStarter;
    const content = `
      <div class="flex flex-col gap-6">
        <div class="flex items-center gap-4">
          <div class="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black shadow-xl text-white" style="background-color: ${team.color}">
            ${player.number}
          </div>
          <div>
            <h4 class="text-xl font-black text-white">${player.name}</h4>
            <p class="text-[10px] text-slate-500 font-black uppercase tracking-widest">${team.name} • ${player.position}</p>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <button class="flex flex-col items-center justify-center p-4 bg-emerald-600/10 border border-emerald-500/20 rounded-2xl group hover:bg-emerald-600 transition-all" onclick="handleAction('GOAL')">
            <span class="text-2xl mb-1">⚽</span>
            <span class="text-[10px] font-black uppercase text-emerald-400 group-hover:text-white">GOL</span>
          </button>
          <button class="flex flex-col items-center justify-center p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl group hover:bg-amber-500 transition-all" onclick="handleAction('YELLOW_CARD')">
            <span class="text-2xl mb-1">🟨</span>
            <span class="text-[10px] font-black uppercase text-amber-500 group-hover:text-slate-900">Cartão Amarelo</span>
          </button>
          <button class="flex flex-col items-center justify-center p-4 bg-red-600/10 border border-red-500/20 rounded-2xl group hover:bg-red-600 transition-all" onclick="handleAction('RED_CARD')">
            <span class="text-2xl mb-1">🟥</span>
            <span class="text-[10px] font-black uppercase text-red-500 group-hover:text-white">Cartão Vermelho</span>
          </button>
          <button class="flex flex-col items-center justify-center p-4 bg-blue-600/10 border border-blue-500/20 rounded-2xl group hover:bg-blue-600 transition-all" onclick="handleAction('SHOT')">
            <span class="text-2xl mb-1">🎯</span>
            <span class="text-[10px] font-black uppercase text-blue-400 group-hover:text-white">Finalização</span>
          </button>
          <button class="flex flex-col items-center justify-center p-4 bg-slate-800 border border-white/5 rounded-2xl group hover:bg-slate-700 transition-all" onclick="handleAction('FOUL')">
            <span class="text-2xl mb-1">🛑</span>
            <span class="text-[10px] font-black uppercase text-slate-400 group-hover:text-white">Falta</span>
          </button>
          <button class="flex flex-col items-center justify-center p-4 bg-slate-800 border border-white/5 rounded-2xl group hover:bg-slate-700 transition-all" onclick="handleAction('OFFSIDE')">
            <span class="text-2xl mb-1">🚩</span>
            <span class="text-[10px] font-black uppercase text-slate-400 group-hover:text-white">Impedimento</span>
          </button>
        </div>

        <div class="grid grid-cols-2 gap-3 mt-2">
          <button class="p-4 bg-slate-800 border border-white/5 rounded-2xl text-[10px] font-black uppercase text-slate-300 hover:bg-slate-700 transition-all flex items-center justify-center gap-2" onclick="handleAction('SUBSTITUTION')">
            🔄 ${isStarter ? 'Substituir' : 'Colocar em Jogo'}
          </button>
          <button class="p-4 bg-slate-800 border border-white/5 rounded-2xl text-[10px] font-black uppercase text-slate-300 hover:bg-slate-700 transition-all flex items-center justify-center gap-2" onclick="handleAction('EDIT')">
            ⚙️ Editar Atleta
          </button>
        </div>
      </div>
    `;

    // Handler temporário global para os botões do modal
    window.handleAction = (action) => {
      if (action === 'SUBSTITUTION') {
        this.showSubstitution(player, team, teamId);
      } else if (action === 'EDIT') {
        this.showEditPlayer(player, team, teamId);
      } else {
        matchState.addEvent({
          type: action,
          teamId,
          playerId: player.id,
          description: `${matchState.formatEventType(action)}: ${player.name} (${team.shortName})`
        });
        window.addToast('Evento Registrado', `${matchState.formatEventType(action)} - ${player.name}`, 'info');
        this.close();
        window.render();
      }
    };

    this.open(content, 'Ações do Jogador');
  }

  showSubstitution(playerOut, team, teamId) {
    const availableSubs = team.players.filter(p => !p.isStarter && !p.hasLeftGame);
    
    const content = `
      <div class="flex flex-col gap-6">
        <div class="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
          <p class="text-[10px] font-black text-red-500 uppercase mb-1">Saindo</p>
          <p class="text-white font-bold">${playerOut.number} - ${playerOut.name}</p>
        </div>
        
        <div class="flex flex-col gap-3">
          <p class="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Selecionar Substituto (Entrando)</p>
          ${availableSubs.map(p => `
            <button class="w-full p-4 bg-slate-800 hover:bg-emerald-600 border border-white/5 rounded-2xl text-left transition-all group" onclick="confirmSub('${p.id}')">
              <div class="flex items-center justify-between">
                <span class="text-white font-bold group-hover:text-white">${p.number} - ${p.name}</span>
                <span class="text-[10px] font-black text-slate-500 group-hover:text-emerald-200 uppercase">${p.position}</span>
              </div>
            </button>
          `).join('')}
          ${availableSubs.length === 0 ? '<p class="text-center text-slate-500 text-xs py-4">Sem reservas disponíveis.</p>' : ''}
        </div>
        
        <div class="pt-4 border-t border-white/5">
          <button class="w-full p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-[10px] font-black uppercase text-amber-500 hover:bg-amber-500 hover:text-slate-900 transition-all" onclick="concussionSub()">
            🧠 Substituição p/ Concussão (Extra)
          </button>
        </div>
      </div>
    `;

    window.confirmSub = (playerIdIn) => {
      try {
        matchState.addEvent({
          type: 'SUBSTITUTION',
          teamId,
          playerId: playerOut.id,
          relatedPlayerId: playerIdIn
        });
        window.addToast('Substituição Realizada', 'Evento registrado com sucesso.', 'success');
        this.close();
        window.render();
      } catch (e) {
        window.addToast('Erro', e.message, 'error');
      }
    };

    window.concussionSub = () => {
      // Abre modal de seleção para concussão
      this.open(`
        <div class="flex flex-col gap-4">
          <p class="text-xs text-slate-400">Selecione o jogador para substituir por motivo de concussão (não conta no limite normal).</p>
          ${availableSubs.map(p => `
            <button class="w-full p-4 bg-slate-800 hover:bg-blue-600 border border-white/5 rounded-2xl text-left transition-all" onclick="executeConcussion('${p.id}')">
              <span class="text-white font-bold">${p.number} - ${p.name}</span>
            </button>
          `).join('')}
        </div>
      `, 'Substituição por Concussão');
      
      window.executeConcussion = (pIdIn) => {
        matchState.addEvent({
          type: 'CONCUSSION_SUBSTITUTION',
          teamId,
          playerId: playerOut.id,
          relatedPlayerId: pIdIn
        });
        window.addToast('Concussão Atendida', 'Substituição realizada.', 'success');
        this.close();
        window.render();
      };
    };

    this.open(content, 'Substituição - ' + team.shortName);
  }

  showEditPlayer(player, team, teamId) {
    const content = `
      <div class="flex flex-col gap-6">
        <div class="grid grid-cols-3 gap-4">
          <div class="col-span-2">
            <label class="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Nome do Atleta</label>
            <input type="text" id="edit_p_name" value="${player.name}" class="w-full bg-slate-800 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-blue-500 font-bold">
          </div>
          <div>
            <label class="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Número</label>
            <input type="number" id="edit_p_num" value="${player.number}" class="w-full bg-slate-800 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-blue-500 font-bold text-center">
          </div>
        </div>

        <div>
          <label class="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Posição</label>
          <div class="grid grid-cols-4 gap-2">
            ${['GK', 'DF', 'MF', 'FW'].map(pos => `
              <button class="p-3 rounded-xl border font-black text-[10px] ${player.position === pos ? 'bg-blue-600 border-blue-400 text-white' : 'bg-slate-800 border-white/5 text-slate-500'}" onclick="setPos('${pos}')" id="pos_${pos}">${pos}</button>
            `).join('')}
          </div>
          <input type="hidden" id="edit_p_pos" value="${player.position}">
        </div>

        <button class="w-full p-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl shadow-lg shadow-emerald-900/20 transition-all mt-4" onclick="savePlayerSelf()">
          SALVAR ALTERAÇÕES
        </button>
      </div>
    `;

    window.setPos = (pos) => {
      document.getElementById('edit_p_pos').value = pos;
      document.querySelectorAll('[id^="pos_"]').forEach(btn => {
        btn.classList.remove('bg-blue-600', 'border-blue-400', 'text-white');
        btn.classList.add('bg-slate-800', 'border-white/5', 'text-slate-500');
      });
      document.getElementById('pos_' + pos).classList.add('bg-blue-600', 'border-blue-400', 'text-white');
    };

    window.savePlayerSelf = () => {
      const name = document.getElementById('edit_p_name').value;
      const number = parseInt(document.getElementById('edit_p_num').value);
      const position = document.getElementById('edit_p_pos').value;

      matchState.setState(prev => {
        const teamKey = teamId === 'home' ? 'homeTeam' : 'awayTeam';
        const updatedPlayers = prev[teamKey].players.map(p => {
          if (p.id === player.id) return { ...p, name, number, position };
          return p;
        });
        return { ...prev, [teamKey]: { ...prev[teamKey], players: updatedPlayers } };
      });

      window.addToast('Salvo', 'Dados do atleta atualizados.', 'success');
      this.close();
      window.render();
    };

    this.open(content, 'Editar Atleta');
  }

  showSumula() {
    const state = matchState.getState();
    const content = `
      <div class="flex flex-col gap-6">
        <!-- IA Upload -->
        <div class="grid grid-cols-2 gap-3">
          <div class="relative group">
            <input type="file" id="sumula_ia" class="absolute inset-0 opacity-0 cursor-pointer" accept="image/*">
            <div class="p-4 bg-blue-600/10 border border-blue-500/20 rounded-2xl text-center group-hover:bg-blue-600 transition-all pointer-events-none">
              <span class="text-2xl mb-1 block">📸</span>
              <span class="text-[9px] font-black uppercase text-blue-400 group-hover:text-white">Ler Súmula (IA)</span>
            </div>
          </div>
          <div class="relative group">
            <input type="file" id="regulas_ia" class="absolute inset-0 opacity-0 cursor-pointer" accept="application/pdf,image/*">
            <div class="p-4 bg-emerald-600/10 border border-emerald-500/20 rounded-2xl text-center group-hover:bg-emerald-600 transition-all pointer-events-none">
              <span class="text-2xl mb-1 block">📄</span>
              <span class="text-[9px] font-black uppercase text-emerald-400 group-hover:text-white">Regulamento (IA)</span>
            </div>
          </div>
        </div>

        <div class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Competição</label>
              <input type="text" id="setup_comp" value="${state.competition}" class="w-full bg-slate-800 border border-white/10 rounded-xl p-3 text-white text-xs font-bold">
            </div>
            <div>
              <label class="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Estádio</label>
              <input type="text" id="setup_stadium" value="${state.stadium}" class="w-full bg-slate-800 border border-white/10 rounded-xl p-3 text-white text-xs font-bold">
            </div>
          </div>
          
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Árbitro</label>
              <input type="text" id="setup_ref" value="${state.referee}" class="w-full bg-slate-800 border border-white/10 rounded-xl p-3 text-white text-xs font-bold">
            </div>
            <div>
              <label class="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Data</label>
              <input type="date" id="setup_date" value="${state.matchDate}" class="w-full bg-slate-800 border border-white/10 rounded-xl p-3 text-white text-xs font-bold">
            </div>
          </div>
        </div>

        <button class="w-full p-4 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl shadow-lg transition-all mt-2" onclick="saveSumulaSelf()">
          ATUALIZAR SÚMULA
        </button>
      </div>
    `;

    window.saveSumulaSelf = () => {
      matchState.setState({
        competition: document.getElementById('setup_comp').value,
        stadium: document.getElementById('setup_stadium').value,
        referee: document.getElementById('setup_ref').value,
        matchDate: document.getElementById('setup_date').value
      });
      window.addToast('Sucesso', 'Súmula atualizada.', 'success');
      this.close();
      window.render();
    };

    // Placeholder para os inputs de IA que o app.js vai ouvir
    this.open(content, 'Editar Súmula');
    
    // Adicionar listener específico para IA dentro do modal se necessário
    document.getElementById('sumula_ia')?.addEventListener('change', (e) => window.handleImageUpload(e, 'players'));
  }
}

export const modalManager = new ModalManager();
