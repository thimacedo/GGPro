# Documentação do Sistema - Fut Pro Dashboard

## 1. Visão Geral
O **Fut Pro Dashboard** é uma aplicação Single Page Application (SPA) desenvolvida para o registro, narração e análise de partidas de futebol em tempo real. O sistema permite o controle do cronômetro, registro de eventos (gols, cartões, substituições, etc.), visualização tática, estatísticas em tempo real e geração de relatórios automatizados via Inteligência Artificial.

## 2. Stack Tecnológica
*   **Frontend:** React 19, TypeScript, Vite.
*   **Estilização:** Tailwind CSS.
*   **Ícones e Gráficos:** Lucide React (ícones), Recharts (visualização de dados).
*   **Backend / BaaS:** Firebase Firestore (Sincronização de estado em tempo real).
*   **Inteligência Artificial:** Google GenAI SDK (Gemini 1.5 Flash / Pro) para processamento de linguagem natural e visão computacional.

## 3. Arquitetura e Gerenciamento de Estado
A aplicação utiliza uma arquitetura baseada em componentes funcionais do React. O estado global da partida é centralizado no componente principal (`App.tsx`) através da interface `MatchState`.

### 3.1. Estrutura do Estado (`MatchState`)
O estado principal contém:
*   `homeTeam` / `awayTeam`: Dados das equipes (nome, cores, lista de jogadores, técnico).
*   `score`: Placar atual.
*   `events`: Array de objetos `MatchEvent` (histórico cronológico de tudo que acontece no jogo).
*   `status` / `period`: Controle da fase do jogo (Pré-jogo, 1º Tempo, Intervalo, etc.).
*   `timeElapsed` / `timerStartedAt`: Controle do cronômetro.

### 3.2. Sincronização e Persistência
*   **Firebase Firestore:** O estado da partida é sincronizado em tempo real utilizando o Firestore (coleção `matches`, documento `current`). Um listener (`onSnapshot`) garante que múltiplos dispositivos (ex: um tablet no campo e um PC na cabine de transmissão) vejam os mesmos dados instantaneamente.
*   **LocalStorage:** Utilizado como fallback para garantir que os dados não sejam perdidos em caso de recarregamento acidental da página antes da sincronização.

## 4. Módulos Principais (Componentes)
*   **`App.tsx`:** O "cérebro" da aplicação. Gerencia o estado, o cronômetro, a renderização condicional das abas e a comunicação com o Firebase.
*   **`Field.tsx`:** Renderiza o campo de futebol e a disposição tática dos jogadores com base nas formações escolhidas.
*   **`MatchStats.tsx`:** Processa o array de `events` para gerar estatísticas derivadas (posse de bola estimada, finalizações, faltas) e as exibe usando a biblioteca `recharts`.
*   **`MatchModals.tsx`:** Centraliza todos os modais de interação (edição de times, jogadores, fim de jogo, etc.), mantendo a UI principal limpa.
*   **`PenaltyShootout.tsx`:** Módulo isolado com a lógica específica e regras de uma disputa de pênaltis.

## 5. Integrações de Inteligência Artificial (`geminiService.ts`)
O sistema possui integrações profundas com a API do Google Gemini para acelerar o trabalho do operador:
1.  **Comandos de Voz/Texto:** O operador pode falar ou digitar "Gol do camisa 9 do mandante". O Gemini faz o parse (NLU) e retorna um JSON estruturado que o sistema converte em um evento real no placar.
2.  **Leitura de Escalação (OCR + IA):** O usuário pode fazer upload da foto de uma súmula. O Gemini Vision extrai os nomes e números dos jogadores e preenche a escalação automaticamente.
3.  **Relatório de Partida:** Ao final do jogo, o Gemini analisa o array de `events` e gera uma crônica esportiva narrativa, destacando os principais momentos da partida.

## 6. Lógica do Cronômetro (Performance)
Para evitar re-renderizações excessivas no React (que causariam lentidão), o cronômetro não atualiza o estado global a cada segundo.
*   O estado guarda apenas o `timeElapsed` (tempo acumulado) e o `timerStartedAt` (timestamp de quando o relógio começou a rodar).
*   Um `useEffect` local calcula o tempo de exibição (`displayTime`) a cada segundo, atualizando apenas a interface visual do relógio, sem mutar o estado global pesado da partida.

## 7. Pontos de Atenção para o Analista (Oportunidades de Melhoria)
Para a partida de hoje, sugerimos que o Analista de Sistemas avalie os seguintes pontos:
1.  **Concorrência no Firebase:** Atualmente, o sistema usa `setDoc` para sobrescrever o estado. Se houver dois operadores editando ao mesmo tempo, pode haver condição de corrida (Race Condition). *Sugestão:* Avaliar o uso de transações do Firestore ou atualizações granulares (`updateDoc` em campos específicos) para operações críticas.
2.  **Tratamento de Erros da IA:** A API do Gemini pode sofrer latência dependendo da conexão do estádio. *Sugestão:* Garantir que os *loading states* (spinners) estejam claros para o operador não enviar o comando duas vezes.
3.  **Responsividade:** O layout foi otimizado para tablets/desktops (landscape). *Sugestão:* Verificar se o operador de campo usará um celular (portrait) e, se sim, testar a usabilidade dos modais.
4.  **Offline-first:** O Firebase lida bem com quedas curtas de internet, mas se a conexão cair por muito tempo, a sincronização pode atrasar. *Sugestão:* Confiar no LocalStorage como fonte primária de backup.
