# 🌐 Guia de Deploy Online - Narrador Pro

Este guia explica como fazer o deploy do **Narrador Pro - Dashboard de Futebol** para acesso online de qualquer lugar.

## 📋 Pré-requisitos

1. Conta no GitHub (para hospedar o código)
2. Chave da API do Google Gemini
3. Conta em uma plataforma de hospedagem (escolha uma):
   - **Vercel** (Recomendado) - https://vercel.com
   - **Netlify** - https://netlify.com
   - **Render** - https://render.com

---

## 🚀 Opção 1: Deploy na Vercel (RECOMENDADO)

A Vercel é a plataforma mais simples e rápida para deploy de aplicações React/Vite.

### Passo 1: Preparar o Repositório Git

```bash
# Se ainda não inicializou o Git
git init

# Adicionar todos os arquivos
git add .

# Fazer o primeiro commit
git commit -m "Preparar para deploy online"

# Criar repositório no GitHub e conectar
git remote add origin https://github.com/seu-usuario/seu-repositorio.git
git branch -M main
git push -u origin main
```

### Passo 2: Deploy na Vercel

1. Acesse https://vercel.com e faça login com GitHub
2. Clique em **"Add New Project"**
3. Selecione seu repositório do GitHub
4. Configure as variáveis de ambiente:
   - Clique em **"Environment Variables"**
   - Adicione: `VITE_GEMINI_API_KEY` = `sua_chave_api_aqui`
5. Clique em **"Deploy"**
6. Aguarde 2-3 minutos e pronto! 🎉

Sua aplicação estará disponível em: `https://seu-projeto.vercel.app`

### Configuração Adicional na Vercel

- **Build Command**: `npm run build` (já configurado automaticamente)
- **Output Directory**: `dist` (já configurado automaticamente)
- **Install Command**: `npm install` (já configurado automaticamente)

---

## 🌟 Opção 2: Deploy na Netlify

### Passo 1: Preparar o Repositório Git (mesmo da Opção 1)

### Passo 2: Deploy na Netlify

1. Acesse https://netlify.com e faça login
2. Clique em **"Add new site"** → **"Import an existing project"**
3. Conecte com GitHub e selecione seu repositório
4. Configure:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
5. Adicione variáveis de ambiente:
   - Vá em **Site settings** → **Environment variables**
   - Adicione: `VITE_GEMINI_API_KEY` = `sua_chave_api_aqui`
6. Clique em **"Deploy site"**

Sua aplicação estará disponível em: `https://seu-projeto.netlify.app`

---

## 🔧 Opção 3: Deploy na Render

### Passo 1: Preparar o Repositório Git (mesmo da Opção 1)

### Passo 2: Deploy na Render

1. Acesse https://render.com e faça login
2. Clique em **"New"** → **"Static Site"**
3. Conecte seu repositório do GitHub
4. Configure:
   - **Build Command**: `npm run build`
   - **Publish Directory**: `dist`
5. Adicione variáveis de ambiente:
   - Clique em **"Environment"**
   - Adicione: `VITE_GEMINI_API_KEY` = `sua_chave_api_aqui`
6. Clique em **"Create Static Site"**

---

## 🔑 Obtendo a Chave da API do Google Gemini

1. Acesse: https://aistudio.google.com/app/apikey
2. Faça login com sua conta Google
3. Clique em **"Create API Key"**
4. Copie a chave gerada
5. Use esta chave nas variáveis de ambiente da plataforma escolhida

---

## ✅ Verificação Pós-Deploy

Após o deploy, verifique:

1. ✅ A aplicação carrega corretamente
2. ✅ Não há erros no console do navegador (F12)
3. ✅ A API do Gemini está funcionando (teste a funcionalidade de IA)
4. ✅ O PWA está funcionando (pode instalar como app)

---

## 🔄 Atualizações Automáticas

Todas as plataformas acima fazem deploy automático quando você faz push para o GitHub:

```bash
# Fazer alterações no código
git add .
git commit -m "Descrição das alterações"
git push

# O deploy será feito automaticamente! 🚀
```

---

## 🌍 Domínio Personalizado (Opcional)

### Na Vercel:
1. Vá em **Settings** → **Domains**
2. Adicione seu domínio personalizado
3. Configure os DNS conforme instruções

### Na Netlify:
1. Vá em **Domain settings**
2. Clique em **"Add custom domain"**
3. Configure os DNS conforme instruções

---

## 🛡️ Segurança

⚠️ **IMPORTANTE**: 
- Nunca commite o arquivo `.env` com suas chaves reais
- Use sempre variáveis de ambiente na plataforma de hospedagem
- O arquivo `.env.example` serve apenas como referência

---

## 📱 PWA (Progressive Web App)

A aplicação já está configurada como PWA! Isso significa:

- ✅ Pode ser instalada no celular/desktop
- ✅ Funciona offline (após primeira visita)
- ✅ Ícone na tela inicial
- ✅ Experiência de app nativo

---

## 🆘 Problemas Comuns

### Erro: "API Key inválida"
- Verifique se a variável `VITE_GEMINI_API_KEY` está configurada corretamente
- Certifique-se de que a chave é válida no Google AI Studio

### Erro: "Build failed"
- Verifique se todas as dependências estão no `package.json`
- Rode `npm install` localmente para verificar

### Página em branco após deploy
- Verifique o console do navegador (F12)
- Confirme que o `dist` está sendo publicado corretamente

---

## 📞 Suporte

Para mais ajuda:
- Documentação Vercel: https://vercel.com/docs
- Documentação Netlify: https://docs.netlify.com
- Documentação Vite: https://vitejs.dev/guide/

---

## 🎉 Pronto!

Agora sua aplicação **Narrador Pro** está online e acessível de qualquer lugar do mundo! 🌍⚽

Compartilhe o link com sua equipe e comece a transmitir partidas profissionalmente!
