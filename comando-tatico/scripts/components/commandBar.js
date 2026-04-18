/**
 * commandBar.js — Componente: Barra de Comando + Integração com Voz
 */

import state from '../state.js';
import Clock from '../services/clock.js';
import Commander from '../services/commander.js';
import Engine from '../services/matchEngine.js';
import Toasts from './toasts.js';

export function render() {
  const s = state.get();

  return `
    <div id="commandBar" style="
      position:fixed;bottom:0;left:0;right:0;
      padding:12px 16px;
      background:linear-gradient(0deg,#070b14 60%,transparent);
      z-index:100;
    ">
      <div style="max-width:600px;margin:0 auto;display:flex;align-items:center;gap:8px;">
        <!-- Play/Pause -->
        <button id="playPauseBottom" style="
          width:50px;height:50px;border-radius:14px;border:none;
          font-size:22px;cursor:pointer;display:flex;align-items:center;justify-content:center;
          background:${s.match.isPaused ? '#22c55e' : '#f59e0b'};
          color:${s.match.isPaused ? '#fff' : '#000'};font-weight:900;flex-shrink:0;
          transition:background 0.2s;
        ">${s.match.isPaused ? '▶' : '⏸'}</button>

        <!-- Input Area -->
        <div style="
          flex:1;display:flex;align-items:center;
          background:#0d1520;border:1px solid #1a2a3a;border-radius:16px;
          padding:4px 8px;gap:8px;
        ">
          <button id="micBtn" style="
            padding:8px;border-radius:10px;border:none;
            background:transparent;font-size:20px;cursor:pointer;
          " title="Comando por voz">🎙️</button>
          <input id="cmdInput" type="text" placeholder='Narre: "Gol do time casa número 10"...' style="
            flex:1;background:transparent;border:none;color:#e0e0e0;
            font-size:13px;font-weight:600;outline:none;padding:8px 0;
          " />
          <button id="sendBtn" style="
            padding:8px 14px;border-radius:10px;border:none;
            background:#1e90ff;color:#fff;font-size:16px;cursor:pointer;
          ">➤</button>
        </div>

        <!-- Settings -->
        <button id="settingsBtn" style="
          width:50px;height:50px;border-radius:14px;
          border:1px solid #1a2a3a;background:#0d1520;
          color:#4a6a8a;font-size:18px;cursor:pointer;flex-shrink:0;
        ">⚙️</button>
      </div>
    </div>
  `;
}

export function attachEvents() {
  document.getElementById('cmdInput')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') submitCommand();
  });
  document.getElementById('sendBtn')?.addEventListener('click', submitCommand);
  document.getElementById('playPauseBottom')?.addEventListener('click', () => {
    Clock.togglePause();
  });
  document.getElementById('micBtn')?.addEventListener('click', toggleVoice);
}

function submitCommand() {
  const input = document.getElementById('cmdInput');
  if (!input) return;
  const text = input.value.trim();
  input.value = '';
  if (!text) return;

  const result = Commander.execute(text);
  if (result) {
    const typeMap = { celebration: 'celebration', warning: 'warning', danger: 'error', success: 'success', info: 'info', error: 'error' };
    Toasts.show(result.ok ? '✅' : '❌', result.msg, typeMap[result.type] || 'info');
  }
}

function toggleVoice() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    Toasts.show('🎙️', 'Reconhecimento de voz não disponível', 'warning');
    return;
  }

  Toasts.show('🎙️', 'Fale o comando...', 'info');
  const recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = 'pt-BR';

  recognition.onresult = (e) => {
    const text = e.results[0][0].transcript;
    const input = document.getElementById('cmdInput');
    if (input) input.value = text;
    Toasts.show('🎙️', `"${text}"`, 'info');
    setTimeout(submitCommand, 500);
  };

  recognition.onerror = () => {
    Toasts.show('🎙️', 'Não entendi, tente novamente', 'warning');
  };

  recognition.start();
}
