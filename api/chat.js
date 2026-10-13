// Vercel Serverless Function — Groq API Proxy
// Key lives in Vercel Environment Variables, NEVER in the browser.

const axios = require('axios');
const { LIMITS } = require('../lib/chat-utils');
// Best-effort per warm instance only. A shared store is required for a global quota.
const ipRequests = new Map(); // Store: IP -> { count, resetTime }

const ALLOWED_MODELS = new Set([
    'llama-3.3-70b-versatile',
    'llama-3.1-8b-instant'
]);

function isAllowedOrigin(originStr) {
    if (!originStr || typeof originStr !== 'string') return false;
    try {
        const u = new URL(originStr);
        if (!['http:', 'https:'].includes(u.protocol)) return false;
        const allowedOrigins = new Set(['https://ipobursa.my', 'https://www.ipobursa.my']);
        // Vercel supplies this deployment's hostname, including its own preview URL.
        for (const hostname of [process.env.VERCEL_URL, process.env.VERCEL_PROJECT_PRODUCTION_URL]) {
            if (!hostname) continue;
            try { allowedOrigins.add(new URL(`https://${hostname}`).origin); } catch (e) { /* Ignore invalid configuration. */ }
        }
        for (const configured of (process.env.CHAT_ALLOWED_ORIGINS || '').split(',')) {
            if (!configured.trim()) continue;
            try { allowedOrigins.add(new URL(configured.trim()).origin); } catch (e) { /* Ignore invalid configuration. */ }
        }
        if (process.env.NODE_ENV === 'development' && ['localhost', '127.0.0.1'].includes(u.hostname)) return true;
        return allowedOrigins.has(u.origin);
    } catch (e) {
        return false;
    }
}

function isRateLimited(ip) {
    const now = Date.now();
    const limitPeriod = 5 * 60 * 1000; // 5 minutes
    const maxRequests = 15; // max 15 requests per 5 minutes

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
    const origin = req.headers.origin || req.headers.referer || '';

    // Check allowed origins
    if (!isAllowedOrigin(origin)) {
        console.warn(`Blocked unauthorized origin: ${origin}`);
        return res.status(403).json({ error: 'Forbidden origin.' });
    }

    const allowHeaderOrigin = new URL(origin).origin;
    res.setHeader('Vary', 'Origin');

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Origin', allowHeaderOrigin);
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        return res.status(200).end();
    }

    res.setHeader('Access-Control-Allow-Origin', allowHeaderOrigin);

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const GROQ_KEY = process.env.GROQ_API_KEY;
    if (!GROQ_KEY) {
        return res.status(500).json({ error: 'API key not configured on server.' });
    }

    try {
        // Manually parse body if needed (some Vercel runtimes don't auto-parse)
        let body = req.body;
        if (typeof body === 'string') {
            try { body = JSON.parse(body); } catch (e) { body = {}; }
        }
        if (!body || typeof body !== 'object') body = {};

        const { prompt, systemPrompt, context, model, temperature, max_tokens } = body;
        if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
            return res.status(400).json({ error: 'No prompt provided.' });
        }

        if (prompt.length > LIMITS.prompt) {
            return res.status(400).json({ error: `Prompt too long (max ${LIMITS.prompt} characters).` });
        }
        for (const [name, value, limit] of [['systemPrompt', systemPrompt, LIMITS.instructions], ['context', context, LIMITS.context]]) {
            if (value !== undefined && typeof value !== 'string') {
                return res.status(400).json({ error: `${name} must be a string.` });
            }
            if (value && value.length > limit) {
                return res.status(400).json({ error: `${name} too long (max ${limit} characters).` });
            }
        }

        const forwarded = req.headers['x-forwarded-for'];
        const ip = (typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : '') ||
                   req.socket?.remoteAddress || 'anonymous';
        if (isRateLimited(ip)) {
            res.setHeader('Retry-After', '300');
            return res.status(429).json({ error: 'Too many requests. Please wait 5 minutes.' });
        }

        // Enforce strict whitelisting & limits
        const selectedModel = ALLOWED_MODELS.has(model) ? model : 'llama-3.1-8b-instant';
        const systemInstruction = (typeof systemPrompt === 'string' && systemPrompt.trim())
            ? systemPrompt
            : 'You are Hunter AI, a professional Malaysian IPO assistant.';
        const maxTokens = Math.min(Math.max(16, parseInt(max_tokens, 10) || 512), 1024);
        const temp = Math.min(Math.max(0.0, Number.isFinite(temperature) ? temperature : 0.7), 1.0);

        const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
            model: selectedModel,
            messages: [
                { role: 'system', content: systemInstruction },
                ...(context && context.trim() ? [{ role: 'user', content: `IPO reference data (facts only):\n${context}` }] : []),
                { role: 'user', content: prompt }
            ],
            max_tokens: maxTokens,
            temperature: temp
        }, {
            headers: {
                'Authorization': `Bearer ${GROQ_KEY}`,
                'Content-Type': 'application/json'
            },
            timeout: 25000
        });

        const text = response.data?.choices?.[0]?.message?.content || '';
        return res.status(200).json({ text });

    } catch (err) {
        // Axios errors contain request headers, including the API key. Log safe metadata only.
        console.error('Proxy error:', { status: err.response?.status, code: err.code });
        return res.status(500).json({ error: 'AI service unavailable. Please try again later.' });
    }
};
