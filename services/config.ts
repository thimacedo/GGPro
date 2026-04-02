/**
 * 🔒 Central de Configuração do GGPro
 * Gerencia a detecção da API Key com resiliência máxima para ambientes Vite e Produção (Vercel).
 */

export const getApiKey = (): string => {
  // @ts-ignore
  const viteKey = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_GEMINI_API_KEY : undefined;
  // @ts-ignore
  const processKey = typeof process !== 'undefined' && process.env 
    ? (process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || process.env.API_KEY) 
    : undefined;
  const localKey = typeof localStorage !== 'undefined' 
    ? (localStorage.getItem('VITE_GEMINI_API_KEY') || localStorage.getItem('GEMINI_API_KEY')) 
    : undefined;

  let key = '';
  let source = 'NENHUMA';

  if (viteKey) { key = viteKey; source = 'VITE (meta.env)'; }
  else if (processKey) { key = processKey; source = 'PROCESS (env)'; }
  else if (localKey) { key = localKey; source = 'LOCALSTORAGE'; }

  const cleanKey = key.toString().trim().replace(/^["']|["']$/g, '');

  console.log(`%c🔑 Detecção de IA: Origem=${source} | Valor=${cleanKey.substring(0, 4)}...`, "color: #3b82f6; font-weight: bold;");

  const placeholders = ['sua_chave_api_aqui', 'YOUR_API_KEY', 'undefined', 'null', ''];
  if (placeholders.includes(cleanKey.toLowerCase())) {
    console.error("❌ ERRO CRÍTICO: Chave de API é um placeholder ou está vazia!");
    throw new Error("INVALID_API_KEY");
  }
  
  return cleanKey;
};
