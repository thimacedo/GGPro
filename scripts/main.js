import { renderTimeline } from './components/timeline.js';
import { renderMatchDetails } from './components/details.js';
import { showMatchSettings } from './components/modals.js';
import { parseMatchCommand } from './services/geminiService.js';
import { subscribeToMatch, addMatchEvent, updateTeamRoster } from './services/firebaseService.js';

// Estado global reativo (Alimentado estritamente pelo Firebase)
let matchState = {
  period: 'PRE_MATCH',
  competition: '',
  matchDate: '',
  stadium: '',
  homeTeam: { name: '', shortName: '', color: '#ef4444', score: 0, players: [] },
  awayTeam: { name: '', shortName: '', color: '#10b981', score: 0, players: [] },
  events: []
};

// Funções de Busca
const getPlayerById = (id) => {
  const allPlayers = [
    ...(matchState.homeTeam?.players || []),
    ...(matchState.awayTeam?.players || [])
  ];
  return allPlayers.find(p => p.id == id || p.number == id) || { id, name: `Jogador ${id}`, shortName: 'JOG', position: 'N/A' };
};

function buildAppShell() {
  const root = document.getElementById('root');
  if (!root) return;

  root.innerHTML = `
    <div class="app-container">
      <header id="scoreboard-container">
        <div class="app-header">
          <div class="top-bar">
            <div class="team-info home">
              <div class="team-titles home">
                <span class="team-name-h2" id="home-name">--</span>
              </div>
              <div class="score-badge" id="score-home" style="background: var(--red-500)">0</div>
            </div>
            
            <div class="clock-container">
              <span class="period-badge" id="match-period">--</span>
              <span class="timer-text" id="main-timer">00:00</span>
            </div>

            <div class="team-info away">
              <div class="score-badge" id="score-away" style="background: var(--emerald-500)">0</div>
              <div class="team-titles away">
                <span class="team-name-h2" id="away-name">--</span>
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
          <button class="icon-btn" id="btn-var"><i data-lucide="monitor-play"></i> VAR</button>
          <button class="icon-btn" id="btn-undo"><i data-lucide="rotate-ccw"></i> Desfazer</button>
          <button class="icon-btn" id="btn-settings"><i data-lucide="settings"></i> Ajustes</button>
        </div>
      </nav>

      <main class="main-content">
        <div class="dashboard-grid">
          <section id="primary-view-container"></section>
          <aside class="sidebar">
            <div id="details-container" style="margin-bottom: 24px;"></div>
            <div id="timeline-container"></div>
          </aside>
        </div>
      </main>

      <footer class="fixed-footer">
        <div class="footer-content">
          <button class="btn-play-pause" id="btn-main-action"><i data-lucide="play"></i></button>
          <div class="command-bar">
            <input type="text" class="command-input" placeholder="Comando: 'Gol do 10 do Flamengo'..." id="ai-input" />
            <button class="icon-btn" id="ai-submit"><i data-lucide="send"></i></button>
          </div>
        </div>
      </footer>
    </div>
  `;

  if (window.lucide) window.lucide.createIcons();
  setupGlobalDelegation();
}

function setupGlobalDelegation() {
  document.getElementById('view-tabs')?.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-view');
    if (!btn) return;
    document.querySelectorAll('#view-tabs .btn-view').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    switchView(btn.dataset.view);
  });

  document.getElementById('btn-settings')?.addEventListener('click', () => {
    showMatchSettings(matchState.homeTeam, matchState.awayTeam);
  });

  document.getElementById('ai-submit')?.addEventListener('click', processAiCommand);
  document.getElementById('ai-input')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') processAiCommand();
  });

  // Listener para Captura de Dados do OCR (Envia para o Firebase)
  window.addEventListener('rosterImported', async (e) => {
    const { teamSide, rosterData } = e.detail;
    try {
        await updateTeamRoster(teamSide, rosterData);
        console.log(`Dados do OCR enviados ao Firebase para o time: ${teamSide}`);
    } catch (error) {
        alert("Falha ao salvar o elenco sincronizado no banco de dados.");
    }
  });
}

/**
 * Processamento Inteligente do Gemini (Mutações vão direto para o Firestore)
 */
async function processAiCommand() {
  const input = document.getElementById('ai-input');
  if (!input || !input.value.trim()) return;
  
  const text = input.value.trim();
  input.disabled = true;
  input.placeholder = "Processando lance...";

  try {
    const aiEvent = await parseMatchCommand(text, matchState);
    const timeDisplay = document.getElementById('main-timer').innerText;

    const newEvent = {
        ...aiEvent,
        id: crypto.randomUUID(),
        period: matchState.period,
        timeStr: timeDisplay + "'",
        minute: parseInt(timeDisplay.split(':')[0]) || 0,
        timestamp: Date.now(),
        playerId: aiEvent.playerNumber
    };

    // Delega a mutação ao Firebase
    const isGoal = aiEvent.type === 'GOAL';
    await addMatchEvent(newEvent, isGoal, aiEvent.teamId);
    
    input.value = '';
  } catch (err) {
    console.error("Erro no comando:", err);
    alert("Falha ao interpretar comando ou sincronizar. Tente novamente.");
  } finally {
    input.disabled = false;
    input.placeholder = "Comando: 'Gol do 10 do Flamengo'...";
    input.focus();
  }
}

// Reatividade Centralizada
function updateAppUI() {
    // Placar e Nomes
    if (document.getElementById('home-name')) {
        document.getElementById('home-name').innerText = matchState.homeTeam?.shortName || '--';
    }
    if (document.getElementById('away-name')) {
        document.getElementById('away-name').innerText = matchState.awayTeam?.shortName || '--';
    }
    
    const scoreHome = document.getElementById('score-home');
    const scoreAway = document.getElementById('score-away');
    
    if (scoreHome) {
        scoreHome.innerText = matchState.homeTeam?.score || 0;
        scoreHome.style.background = matchState.homeTeam?.color || '#ef4444';
    }
    
    if (scoreAway) {
        scoreAway.innerText = matchState.awayTeam?.score || 0;
        scoreAway.style.background = matchState.awayTeam?.color || '#10b981';
    }

    if (document.getElementById('match-period')) {
        document.getElementById('match-period').innerText = matchState.period || '1T';
    }

    // Componentes Modulares
    renderMatchDetails(matchState, 'details-container');
    renderTimeline(matchState.events || [], getPlayerById, 'timeline-container');
    
    // Atualiza a view ativa
    const activeView = document.querySelector('.btn-view.active')?.dataset.view || 'lista';
    switchView(activeView);
}

function switchView(viewName) {
  const container = document.getElementById('primary-view-container');
  if (!container) return;

  if (viewName === 'lista') {
    container.innerHTML = `
      <div class="card p-6">
        <h3 class="uppercase tracking-widest mb-4">Elencos</h3>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <p class="font-bold mb-2">${matchState.homeTeam?.name || 'Mandante'}</p>
            ${matchState.homeTeam?.players?.map(p => `<div class="player-item"><span class="num-tag">${p.number}</span> ${p.name}</div>`).join('') || '<p class="text-sm text-slate-500">Nenhum jogador carregado.</p>'}
          </div>
          <div>
            <p class="font-bold mb-2">${matchState.awayTeam?.name || 'Visitante'}</p>
             ${matchState.awayTeam?.players?.map(p => `<div class="player-item"><span class="num-tag">${p.number}</span> ${p.name}</div>`).join('') || '<p class="text-sm text-slate-500">Nenhum jogador carregado.</p>'}
          </div>
        </div>
      </div>
    `;
  } else if (viewName === 'mapa') {
    container.innerHTML = `<div class="field-container"><div class="field-grass"></div><div class="field-lines"></div></div>`;
  }
}

function initApp() {
  buildAppShell();
  
  // Inicia a escuta do banco de dados
  subscribeToMatch((newState) => {
      matchState = newState; // Atualiza o estado local
      updateAppUI();         // Força re-renderização baseada no banco
  });
}

document.addEventListener('DOMContentLoaded', initApp);
