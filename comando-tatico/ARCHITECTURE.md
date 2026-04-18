/**
 * COMANDO TÁTICO — Sistema de Comando para Futebol
 * Arquitetura: Vanilla Modular (zero dependências externas)
 *
 * comando-tatico/
 * ├── index.html                 (Shell + Styles)
 * └── scripts/
 *     ├── app.js                 (Orquestrador)
 *     ├── state.js               (Core: State Reativo Redux-like)
 *     ├── constants.js           (Formações, Eventos, Instruções, Marcações)
 *     ├── components/
 *     │   ├── scoreboard.js      (Placar + Cronômetro)
 *     │   ├── field.js           (Campo SVG Drag & Drop)
 *     │   ├── timeline.js        (Cronologia de Eventos)
 *     │   ├── stats.js           (KPIs Comparativos)
 *     │   ├── toasts.js          (Notificações Animadas)
 *     │   ├── modals.js          (Modais de Ação)
 *     │   └── commandBar.js      (Barra de Comando + Voz)
 *     └── services/
 *         ├── clock.js           (Motor do Cronômetro)
 *         ├── commander.js       (Interpretador de Comandos NLP)
 *         └── matchEngine.js     (Regras de Jogo + Eventos)
 */
