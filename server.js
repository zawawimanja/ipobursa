const express = require('express');
const path = require('path');
const chatHandler = require('./api/chat');

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '1mb' }));

// Preserve no-cache headers for dynamic IPO data files (matching vercel.json)
const noCacheFiles = new Set(['/data.js', '/data.json', '/data_export.js', '/sync-status.js']);
app.use((req, res, next) => {
    if (noCacheFiles.has(req.path)) {
        res.setHeader('Cache-Control', 'no-cache');
    }
    next();
});

// Mount Vercel Serverless Function /api/chat
app.all('/api/chat', async (req, res) => {
    const origin = req.headers.origin || req.headers.referer;
    if (origin) {
        try {
            const originUrl = new URL(origin).origin;
            const currentAllowed = (process.env.CHAT_ALLOWED_ORIGINS || '')
                .split(',')
                .map(s => s.trim())
                .filter(Boolean);
            if (!currentAllowed.includes(originUrl)) {
                currentAllowed.push(originUrl);
                process.env.CHAT_ALLOWED_ORIGINS = currentAllowed.join(',');
            }
        } catch (_) {
            // Ignore malformed origin header
        }
    }
    return chatHandler(req, res);
});

// Serve static files from repository root
app.use(express.static(__dirname, {
    extensions: ['html']
}));

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Bursa IPO Tracker server listening on http://0.0.0.0:${PORT}`);
});
