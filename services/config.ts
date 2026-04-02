/**
 * 🔒 Central de Configuração do GGPro
 * Gerencia a detecção da API Key com resiliência máxima para ambientes Vite e Produção (Vercel).
 */

export const getApiKey = (): string => {
  // 1. Tenta o padrão nativo do Vite (VITE_ prefix)
  // @ts-ignore
  const viteKey = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_GEMINI_API_KEY : undefined;
  
  // 2. Tenta injeção via define do Vite ou environment global (process.env)
  // @ts-ignore
  const processKey = typeof process !== 'undefined' && process.env 
    ? (process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || process.env.API_KEY) 
    : undefined;
  
  // 3. Tenta persistência local em caso de fallback (LocalStorage)
  const localKey = typeof localStorage !== 'undefined' 
    ? (localStorage.getItem('VITE_GEMINI_API_KEY') || localStorage.getItem('GEMINI_API_KEY')) 
    : undefined;
  
  // 4. Consolidação com limpeza de aspas residuais (comum em builds de CI/CD)
  const rawKey = viteKey || processKey || localKey || '';
  const cleanKey = rawKey.toString().trim().replace(/^["']|["']$/g, '');

  // 5. Validação de segurança: Bloqueia placeholders de exemplo que causam erro 400
  const placeholders = ['sua_chave_api_aqui', 'YOUR_API_KEY_HERE', 'YOUR_API_KEY', 'undefined', 'null'];
  if (!cleanKey || placeholders.includes(cleanKey)) {
    console.warn("⚠ Gemini API Key não configurada ou inválida. Detectado:", cleanKey);
    throw new Error("INVALID_API_KEY");
  }
  
  return cleanKey;
};
