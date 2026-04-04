export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    // API Key resolution (Env > Hardcoded Fallback)
    const apiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || "AIzaSyBr2sApCLzTYMTR0K2FKh-03bOdvvz4p8o";
    
    if (!apiKey) {
        return res.status(500).json({ error: 'API Key ausente.' });
    }

    const { prompt, fileBase64, isOCR } = req.body;
    
    // Lista de modelos e versões para failover máximo
    const configurations = [
        { model: 'gemini-1.5-flash', version: 'v1' },
        { model: 'gemini-2.0-flash', version: 'v1beta' },
        { model: 'gemini-1.5-flash', version: 'v1beta' }
    ];

    for (const config of configurations) {
        try {
            const url = `https://generativelanguage.googleapis.com/${config.version}/models/${config.model}:generateContent?key=${apiKey}`;
            
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
                body: JSON.stringify(payload),
                signal: AbortSignal.timeout(8000) // Timeout de 8s para evitar timeout da Vercel (10s)
            });

            const data = await response.json();

            if (response.ok) {
                return res.status(200).json(data);
            }

            console.error(`Falha em ${config.model} (${config.version}):`, JSON.stringify(data.error));
        } catch (error) {
            console.error(`Erro crítico em ${config.model}:`, error.message);
        }
    }

    return res.status(502).json({ error: 'Todos os modelos de IA falharam ou excederam o tempo limite.' });
}
