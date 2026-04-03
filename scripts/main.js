import { renderTimeline } from './components/timeline.js';
import { renderMatchDetails } from './components/details.js';
import { showMatchSettings } from './components/modals.js';

// Estado global mockado para inicialização
let matchState = {
  period: '1T',
  competition: 'Campeonato Nacional',
  matchDate: new Date().toLocaleDateString('pt-BR'),
  stadium: 'Estádio Principal',
  homeTeam: { shortName: 'FLA', color: '#ef4444' },
  awayTeam: { shortName: 'PAL', color: '#10b981' },
  events: [
    { type: 'GOL', period: '1T', timeStr: "12'", playerId: 10, team: 'home', description: 'Golaço de fora da área!' },
    { type: 'CARTÃO', period: '1T', timeStr: "25'", playerId: 14, team: 'away', description: 'Falta tática no meio campo.' }
  ]
};

// Estrutura Base de Layout (Shell Architecture)
function buildAppShell() {
  const root = document.getElementById('root');
  if (!root) return;

  root.innerHTML = `
    <div class="app-container">
      <header id="scoreboard-container">
        <!-- Scoreboard component will be rendered here -->
        <div class="app-header">
          <div class="top-bar">
            <div class="team-info home">
              <div class="team-titles home">
                <span class="team-name-h2">${matchState.homeTeam.shortName}</span>
              </div>
              <div class="score-badge" style="background: ${matchState.homeTeam.color}">1</div>
            </div>
            
            <div class="clock-container">
              <span class="period-badge">${matchState.period}</span>
              <span class="timer-text">12:45</span>
            </div>

            <div class="team-info away">
              <div class="score-badge" style="background: ${matchState.awayTeam.color}">0</div>
              <div class="team-titles away">
                <span class="team-name-h2">${matchState.awayTeam.shortName}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <nav class="options-menu">
        <div class="tabs" id="view-tabs">
          <button class="btn-view active" data-view="lista" style="padding: 0.5rem 1.5rem; border-radius: 0.75rem;">Lista</button>
          <button class="btn-view" data-view="mapa" style="padding: 0.5rem 1.5rem; border-radius: 0.75rem;">Mapa Tático</button>
        </div>
        
        <div class="options-menu__actions">
          <button class="icon-btn" id="btn-var">
            <i data-lucide="monitor-play"></i> VAR
          </button>
          <button class="icon-btn" id="btn-undo">
            <i data-lucide="rotate-ccw"></i> Desfazer
          </button>
          <button class="icon-btn" id="btn-settings">
            <i data-lucide="settings"></i> Ajustes
          </button>
        </div>
      </nav>

      <main class="main-content">
        <div class="dashboard-grid">
          <section id="primary-view-container">
            <!-- Main content (List or Map) -->
          </section>
          
          <aside class="sidebar">
            <div id="details-container" style="margin-bottom: 24px;"></div>
            <div id="timeline-container"></div>
          </aside>
        </div>
      </main>

      <footer class="fixed-footer">
        <div class="footer-content">
          <button class="btn-play-pause" id="btn-main-action">
            <i data-lucide="play"></i>
          </button>
          <div class="command-bar">
            <input type="text" class="command-input" placeholder="Comando de voz ou texto..." id="ai-input" />
            <button class="icon-btn" id="ai-submit">
              <i data-lucide="send"></i>
            </button>
          </div>
        </div>
      </footer>
    </div>
  `;

  // Reidratação de ícones base
  if (window.lucide) {
    window.lucide.createIcons();
  }

  setupGlobalDelegation();
}

// Controladores de Eventos (Event Delegation)
function setupGlobalDelegation() {
  // Alternância de Abas
  document.getElementById('view-tabs')?.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-view');
    if (!btn) return;

    document.querySelectorAll('#view-tabs .btn-view').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    const view = btn.dataset.view;
    switchView(view);
  });

  // Ações do Menu
  document.getElementById('btn-settings')?.addEventListener('click', () => {
    showMatchSettings(matchState.homeTeam, matchState.awayTeam);
  });

  document.getElementById('btn-var')?.addEventListener('click', () => {
    console.log('VAR Action Triggered');
    // Implementar lógica de VAR
  });

  document.getElementById('btn-undo')?.addEventListener('click', () => {
    console.log('Undo Action Triggered');
    // Implementar lógica de desfazer evento (Pop no array e sync Firebase)
  });

  // Submissão da Command Bar
  document.getElementById('ai-submit')?.addEventListener('click', processCommand);
  document.getElementById('ai-input')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') processCommand();
  });
}

// Roteamento Interno de Views
function switchView(viewName) {
  const container = document.getElementById('primary-view-container');
  if (!container) return;

  if (viewName === 'lista') {
    container.innerHTML = `
      <div class="card p-6">
        <h3 class="uppercase tracking-widest mb-4">Lista de Jogadores</h3>
        <div class="players-list">
          <div class="player-item">
            <span class="num-tag">10</span>
            <span class="font-bold">Gabigol</span>
            <i data-lucide="chevron-right" style="width: 1rem"></i>
          </div>
          <div class="player-item">
            <span class="num-tag">14</span>
            <span class="font-bold">Arrascaeta</span>
            <i data-lucide="chevron-right" style="width: 1rem"></i>
          </div>
        </div>
      </div>
    `;
  } else if (viewName === 'mapa') {
    container.innerHTML = `
      <div class="field-container">
        <div class="field-grass"></div>
        <div class="field-lines"></div>
        <div class="field-midline"></div>
        <div class="field-center-circle"></div>
      </div>
    `;
  }
  
  if (window.lucide) window.lucide.createIcons();
}

function processCommand() {
  const input = document.getElementById('ai-input');
  if (!input || !input.value.trim()) return;
  
  console.log(`Comando enviado para o Gemini: ${input.value}`);
  input.value = '';
  // Integre o geminiService.js aqui
}

// Inicialização da Aplicação
function initApp() {
  buildAppShell();
  
  // Fake Player Fetcher para Timeline
  const getPlayerById = (id) => {
    const players = {
        10: { id: 10, name: 'Gabigol', shortName: 'GAB', position: 'ATQ' },
        14: { id: 14, name: 'Arrascaeta', shortName: 'ARR', position: 'MEI' }
    };
    return players[id] || { id, name: 'Jogador', shortName: 'JOG', position: 'N/A' };
  };
  
  // Renderizações Primárias
  renderMatchDetails(matchState, 'details-container');
  renderTimeline(matchState.events, getPlayerById, 'timeline-container');
  switchView('lista');
}

// Bootstrap
document.addEventListener('DOMContentLoaded', initApp);
