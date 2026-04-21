# 🗺️ ROADMAP.md - ggpro

## 📖 Visão Geral
Sistema/Plataforma GG Pro - Dashboard de Analytics e Narração.

## 📌 Status Atual
**Data:** 21 de Abril de 2026
**Fase:** Integração Broadcast (v7.0)
**Resumo:** O sistema agora está integrado ao OBS Studio via WebSocket (v5.0). Capaz de automatizar a troca de cenas baseada em eventos (Gols) e momentos de pressão detectados pela IA.

### ✅ Concluído Recentemente:
- [x] **v7.0:** Integração OBS Studio (WebSocket Service + Config UI).
- [x] **v6.6.1:** Estabilização (Vitest + JSDOM) e Correção de Bugs de Referência.
- [x] **v6.6:** IA: Análise de Momento de Pressão (PressureService + Gauge Component).
- [x] **v6.5:** Skins de Broadcast e Voice HUD reativo.

## 🎯 Próximos Passos
1. [ ] **OBS Advanced:** Adicionar controle de fontes (ex: exibir placar/overlay apenas no Gol).
2. [ ] **Highlights Engine:** Gravação automática de replays no OBS via comando de voz.
3. [ ] **Multi-Stream:** Sincronização de estado entre múltiplos painéis (Narrador + Comentarista).


## 🛠️ Instruções de Execução (Como Deve Ser Feito)
- **Gestor:** Gemini (Arquiteto de Software e PM)
- **Programador:** Qwen Local Coder (1.5B/0.5B via Ollama)
- **Regras:**
  - Todo o código deve ser gerado completo, sem abreviações.
  - Aplicar rigorosamente princípios Clean Code, SOLID e KISS.
  - Este `ROADMAP.md` DEVE ser atualizado automaticamente após cada nova funcionalidade implementada.
