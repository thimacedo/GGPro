export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    try {
        const { prompt, fileBase64 } = req.body;

        // === OCR / VISAO: Rota via Gemini 2.0 Flash (Groq nao suporta mais vision) ===
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

            // OCR via Gemini Flash (gratuito) — se a chave estiver configurada
            const geminiKey = process.env.GEMINI_API_KEY;
            const groqKey = process.env.GROQ_API_KEY;

            if (geminiKey && geminiKey.length > 10) {
                // --- Gemini Flash 2.0 (melhor para OCR) ---
                const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`;
                const payload = {
                    contents: [{
                        parts: [
                            { text: prompt || "Analise a imagem e retorne apenas um JSON com os dados solicitados" },
                            { inline_data: { mime_type: mimeType, data: cleanBase64 } }
                        ]
                    }]
                };
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const data = await response.json();
                if (!response.ok) {
                    console.error("Erro Gemini OCR:", JSON.stringify(data));
                    return res.status(response.status).json({
                        error: `Gemini OCR Error: ${data.error?.message || data.error?.code || 'erro'}`,
                        details: data
                    });
                }
                const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
                return res.status(200).json({
                    candidates: [{ content: { parts: [{ text }] } }]
                });
            }

            // Sem chave Gemini disponivel — informar frontend para usar Tesseract
            return res.status(424).json({
                error: 'GEMINI_API_KEY not configured on server. Use client-side OCR (Tesseract.js) instead.',
                fallback: 'client_ocr'
            });
        }

        // === TEXTO: Groq LLaMA 3.3 70B ===
        const groqKey = process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY;
        if (!groqKey) return res.status(500).json({
            error: 'API Key do servidor ausente. Configure GROQ_API_KEY.'
        });

        const url = "https://api.groq.com/openai/v1/chat/completions";
        const payload = {
            model: "llama-3.3-70b-versatile",
            messages: [{ role: "user", content: prompt || "Responda" }],
            temperature: 0.3,
            max_tokens: 4096
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${groqKey}`
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("Erro Groq:", JSON.stringify(data));
            return res.status(response.status).json({
                error: `Groq API Error: ${data.error?.message || 'Erro desconhecido'}`,
                details: data
            });
        }

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
