// Vercel Serverless Function — Groq API Proxy
// Key lives in Vercel Environment Variables, NEVER in the browser.

const ipRequests = new Map(); // Store: IP -> { count, resetTime }

function isRateLimited(ip) {
    const now = Date.now();
    const limitPeriod = 5 * 60 * 1000; // 5 minutes
    const maxRequests = 10; // max 10 requests per 5 minutes

    // Prune old entries to prevent memory growth
    for (const [key, val] of ipRequests.entries()) {
        if (now > val.resetTime) {
            ipRequests.delete(key);
        }
    }

    if (!ipRequests.has(ip)) {
        ipRequests.set(ip, {
            count: 1,
            resetTime: now + limitPeriod
        });
        return false;
    }

    const clientData = ipRequests.get(ip);
    if (now > clientData.resetTime) {
        // Reset window
        clientData.count = 1;
        clientData.resetTime = now + limitPeriod;
        return false;
    }

    if (clientData.count >= maxRequests) {
        return true;
    }

    clientData.count++;
    return false;
}

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const GROQ_KEY = process.env.GROQ_API_KEY;
    if (!GROQ_KEY) {
        return res.status(500).json({ error: 'API key not configured on server.' });
    }

    // IP-based Rate Limiter (Max 10 requests per 5 minutes)
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'anonymous';
    if (isRateLimited(ip)) {
        console.warn(`Rate limit triggered for IP: ${ip}`);
        return res.status(429).json({ error: 'Too many requests. Please wait 5 minutes.' });
    }

    try {
        const { prompt, systemPrompt, model, temperature, max_tokens } = req.body;
        if (!prompt) return res.status(400).json({ error: 'No prompt provided.' });

        const selectedModel = model || 'llama-3.3-70b-versatile';
        const systemInstruction = systemPrompt || 'You are Hunter AI, a professional Malaysian IPO assistant.';
        const maxTokens = max_tokens || 1024;
        const temp = typeof temperature === 'number' ? temperature : 0.7;

        const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: selectedModel,
                messages: [
                    { role: 'system', content: systemInstruction },
                    { role: 'user', content: prompt }
                ],
                max_tokens: maxTokens,
                temperature: temp
            })
        });

        const data = await groqRes.json();
        
        if (!groqRes.ok) {
            console.error('Groq API Error details:', data);
            return res.status(groqRes.status).json({ error: data?.error?.message || 'Groq API returned an error.' });
        }

        const text = data?.choices?.[0]?.message?.content || '';
        return res.status(200).json({ text });

    } catch (err) {
        console.error('Proxy error:', err);
        return res.status(500).json({ error: 'Internal server error.' });
    }
};
