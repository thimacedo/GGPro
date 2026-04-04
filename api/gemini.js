export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    // A Vercel vai ler a chave configurada no painel
    const apiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'API Key ausente no servidor da Vercel.' });

    const { prompt, fileBase64, isOCR } = req.body;
    
    // Fallback: tenta o Flash (mais rápido/barato)
    const models = ['gemini-2.0-flash', 'gemini-1.5-flash'];

    for (const model of models) {
        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
            
            const payload = {
                contents: [{
                    parts: fileBase64 
                        ? [{ text: prompt }, { inlineData: { mimeType: "image/jpeg", data: fileBase64 } }]
                        : [{ text: prompt }]
                }],
                generationConfig: { temperature: 0.1 }
            };

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                const data = await response.json();
                return res.status(200).json(data);
            }
        } catch (error) {
            console.warn(`Tentativa com ${model} falhou, tentando próximo...`);
        }
    }

    return res.status(502).json({ error: 'Serviço de IA indisponível.' });
}
