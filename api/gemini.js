export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    const apiKey = process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'API Key do servidor ausente. Configure GROQ_API_KEY.' });

    try {
        const { prompt, fileBase64, isOCR } = req.body;

        // Montar mensagem com imagem (se fornecida)
        let content = [{ type: "text", text: prompt || "Analise" }];

        if (fileBase64 && typeof fileBase64 === 'string') {
            let cleanBase64 = fileBase64;
            let mimeType = "image/jpeg";

            if (fileBase64.includes('base64,')) {
                const matches = fileBase64.match(/^data:(.+);base64,(.+)$/);
                if (matches && matches.length === 3) {
                    mimeType = matches[1];
                    cleanBase64 = matches[2];
                } else {
                    cleanBase64 = fileBase64.split('base64,')[1];
                }
            }

            content = [
                { type: "text", text: prompt || "Analise a imagem" },
                {
                    type: "image_url",
                    image_url: { url: `data:${mimeType};base64,${cleanBase64}` }
                }
            ];
        }

        // Modelo: vision para imagens, llama-3.3-70b para texto
        const model = fileBase64
            ? "llama-3.2-90b-vision-preview"
            : "llama-3.3-70b-versatile";

        const url = "https://api.groq.com/openai/v1/chat/completions";

        const payload = {
            model,
            messages: [{ role: "user", content }],
            temperature: 0.3,
            max_tokens: 4096
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("Erro rejeitado pelo Groq:", JSON.stringify(data));
            return res.status(response.status).json({
                error: `Groq API Error: ${data.error?.message || 'Erro desconhecido'}`,
                details: data
            });
        }

        // Compatibilidade com formato esperado pelo frontend (mimetiza resposta Gemini-like)
        return res.status(200).json({
            candidates: [{
                content: {
                    parts: [{ text: data.choices?.[0]?.message?.content || '' }]
                }
            }]
        });

    } catch (error) {
        console.error("Erro interno no Serverless Function:", error);
        return res.status(502).json({ error: `Falha interna no Proxy: ${error.message}` });
    }
}
