export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    /**
     * ESTRATÉGIA DE SEGURANÇA E RESILIÊNCIA v4.1
     * 1. Tenta Variáveis de Ambiente da Vercel (Seguro).
     * 2. Fallback para chave compartilhada no prompt (Garante funcionamento imediato).
     */
    const apiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || "AIzaSyBr2sApCLzTYMTR0K2FKh-03bOdvvz4p8o";
    
    if (!apiKey) {
        return res.status(500).json({ error: 'API Key ausente. Configure GEMINI_API_KEY na Vercel.' });
    }

    const { prompt, fileBase64, isOCR } = req.body;
    
    // Tenta modelos em ordem de preferência (Ultra-Flash v2 -> Flash v1.5)
    const models = ['gemini-2.0-flash', 'gemini-1.5-flash'];

    for (const model of models) {
        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
            
            const payload = {
                contents: [{
                    parts: fileBase64 
                        ? [
                            { text: prompt }, 
                            { inlineData: { mimeType: "image/jpeg", data: fileBase64 } }
                          ]
                        : [{ text: prompt }]
                }],
                generationConfig: { 
                    temperature: 0.1,
                    topP: 0.95,
                    maxOutputTokens: 1024
                }
            };

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (response.ok) {
                return res.status(200).json(data);
            }

            console.error(`Erro no modelo ${model}:`, data.error?.message || "Erro desconhecido");
        } catch (error) {
            console.error(`Falha na requisição para ${model}:`, error.message);
        }
    }

    return res.status(502).json({ error: 'Serviço de IA temporariamente indisponível após várias tentativas.' });
}
