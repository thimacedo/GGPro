export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    // API Key (Vercel Dash Settings)
    const apiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'API Key do servidor ausente.' });

    const { prompt, fileBase64 } = req.body;

    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
        const payload = {
            contents: [{
                parts: fileBase64 
                    ? [{ text: prompt }, { inlineData: { mimeType: "image/jpeg", data: fileBase64 } }]
                    : [{ text: prompt }]
            }]
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        return res.status(200).json(data);
    } catch (error) {
        console.error("Erro no proxy serverless:", error.message);
        return res.status(502).json({ error: 'Erro no proxy da IA.' });
    }
}
