export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    const apiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'API Key do servidor ausente. Configure GEMINI_API_KEY.' });

    try {
        const { prompt, fileBase64 } = req.body;

        // Tratamento estrito de imagem: o Google rejeita prefixos data:image...
        let cleanBase64 = fileBase64;
        let mimeType = "image/jpeg";
        
        if (fileBase64 && typeof fileBase64 === 'string' && fileBase64.includes('base64,')) {
            const matches = fileBase64.match(/^data:(.+);base64,(.+)$/);
            if (matches && matches.length === 3) {
                mimeType = matches[1];
                cleanBase64 = matches[2];
            } else {
                cleanBase64 = fileBase64.split('base64,')[1];
            }
        }

        const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

        const payload = {
            contents: [{
                parts: cleanBase64
                    ? [{ text: prompt || "Analise a imagem" }, { inlineData: { mimeType: mimeType, data: cleanBase64 } }]
                    : [{ text: prompt || "Responda" }]
            }]
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        // Se o Google rejeitar (ex: erro 400 por chave inválida ou payload quebrado), repassa o erro exato
        if (!response.ok) {
            console.error("Erro rejeitado pelo Google:", JSON.stringify(data));
            return res.status(response.status).json({ 
                error: `Google API Error: ${data.error?.message || 'Erro desconhecido'}`,
                details: data 
            });
        }

        return res.status(200).json(data);

    } catch (error) {
        console.error("Erro interno no Serverless Function:", error);
        return res.status(502).json({ error: `Falha interna no Proxy: ${error.message}` });
    }
}
