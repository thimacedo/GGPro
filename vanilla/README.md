# Narrador Pro - Versão Vanilla JS

Dashboard de Futebol profissional reescrito em HTML, CSS e JavaScript puro, sem frameworks.

## 🚀 Início Rápido

### Executar Localmente

1. **Navegue até a pasta vanilla:**
   ```bash
   cd vanilla
   ```

2. **Inicie um servidor local:**
   ```bash
   # Usando Python
   python -m http.server 8000
   
   # Ou usando Node.js
   npx serve .
   
   # Ou usando PHP
   php -S localhost:8000
   ```

3. **Acesse:** http://localhost:8000

### Configurar API Key do Gemini

1. Obtenha sua chave em: https://aistudio.google.com/app/apikey
2. No navegador, abra o console (F12) e execute:
   ```javascript
   localStorage.setItem('GEMINI_API_KEY', 'sua_chave_aqui');
   ```
3. Recarregue a página

## 📁 Estrutura do Projeto

```
vanilla/
├── index.html          # Página principal
├── styles.css          # Estilos CSS (baseado no Tailwind)
└── scripts/
    ├── app.js          # Ponto de entrada principal
    ├── state.js        # Gerenciamento de estado
    ├── constants.js    # Constantes e configurações
    ├── components/
    │   └── header.js   # Componente Header
    └── services/
        ├── config.js   # Configuração de API
        └── gemini.js   # Serviço de IA Gemini
```

## 🎯 Funcionalidades

- ✅ Cronômetro de partida com play/pause
- ✅ Registro de eventos (gols, cartões, faltas, etc.)
- ✅ Mapa tático interativo
- ✅ Lista de jogadores
- ✅ Estatísticas da partida
- ✅ Sistema de toasts/notificações
- ✅ Persistência no localStorage
- ✅ Exportação de backup JSON
- ✅ Comandos de texto para registro rápido
- ✅ Integração com API Gemini (opcional)
- ✅ Modo claro/escuro
- ✅ Tela cheia
- ✅ Design responsivo

## 🛠️ Tecnologias

- **HTML5** - Semântico e acessível
- **CSS3** - Estilos modernos com variáveis CSS
- **JavaScript ES6+** - Módulos, classes, async/await
- **LocalStorage** - Persistência de dados
- **Fetch API** - Comunicação com serviços externos

## 📊 Comparação com Versão React

| Aspecto | React | Vanilla JS |
|---------|-------|------------|
| Bundle Size | ~150KB (React + ReactDOM) | 0KB (nativo) |
| Dependências | 15+ pacotes npm | 0 dependências |
| Build Step | Obrigatório (Vite/Webpack) | Não necessário |
| Tempo de Load | ~2-3s | <1s |
| Complexidade | Alta (hooks, JSX, etc.) | Baixa (DOM direto) |

## 🔄 Migração de Dados

Se você tem dados da versão React, eles são automaticamente compatíveis! O localStorage usa a mesma chave (`narrador_pro_v3_state`) e o mesmo formato JSON.

## 📝 Notas

- Esta versão foi convertida automaticamente do projeto React
- Todas as funcionalidades principais foram mantidas
- A integração com Firebase foi removida (opcional)
- A integração com Gemini foi mantida via fetch API
- O design é idêntico à versão React (Tailwind CSS convertido para CSS puro)

## 🚀 Deploy

Para fazer deploy online, simplesmente faça upload da pasta `vanilla/` para qualquer serviço de hospedagem estática:

- **Netlify**: Arraste a pasta para o Netlify Drop
- **Vercel**: `vercel vanilla/`
- **GitHub Pages**: Faça push para um repositório e ative Pages
- **Qualquer servidor web**: Copie os arquivos para o diretório público

## 📄 Licença

Mesma licença do projeto original Narrador Pro.