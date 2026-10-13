const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const chat = require('../lib/chat-utils');

const fixture = (id, stage, listingDate = '') => ({
    id, companyName: `${id} Berhad`, symbol: id.toUpperCase(), stage, listingDate,
    market: 'ACE Market', price: 0.2, pe: 12, os: 30, sector: 'Technology', predictedGrade: 'B'
});

function mockApi(env = {}, upstreamError) {
    const calls = [];
    const logs = [];
    const context = {
        module: { exports: {} }, URL, Map, Set, Date,
        process: { env: { NODE_ENV: 'production', GROQ_API_KEY: 'test-only-key', ...env } },
        console: { warn: (...args) => logs.push(args), error: (...args) => logs.push(args) },
        require: name => {
            if (name === '../lib/chat-utils') return chat;
            assert.equal(name, 'axios');
            return { post: async (...args) => {
                calls.push(args);
                if (upstreamError) throw upstreamError;
                return { data: { choices: [{ message: { content: 'mock reply' } }] } };
            } };
        }
    };
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../api/chat.js'), 'utf8'), context);
    const send = async ({ method = 'POST', origin = 'https://ipobursa.my', body = { prompt: 'test' }, headers = {} } = {}) => {
        const response = {
            headers: {}, statusCode: 0, body: undefined,
            setHeader(name, value) { this.headers[name] = value; },
            status(code) { this.statusCode = code; return this; },
            json(value) { this.body = value; return this; },
            end() { return this; }
        };
        await context.module.exports({
            method, headers: { ...(origin == null ? {} : { origin }), ...headers },
            socket: { remoteAddress: '192.0.2.1' }, body
        }, response);
        return response;
    };
    return { send, calls, logs };
}

test('Markdown preserves headings/emphasis and escapes active HTML and entities', () => {
    const html = chat.formatMarkdown('### 🌟 AI VERDICT: AVOID\n**bold** and *italic*\n- item\n<img src=x onerror="alert(1)">\n&lt;svg onload=alert(1)&gt;');
    assert.match(html, /<h5 /);
    assert.match(html, /<strong>bold<\/strong>/);
    assert.match(html, /<em>italic<\/em>/);
    assert.match(html, /<li>item<\/li>/);
    assert.ok(!/<(?:img|svg)\b/i.test(html));
    assert.match(html, /&lt;img src=x onerror=&quot;alert\(1\)&quot;&gt;/);
    assert.match(html, /&amp;lt;svg/);
});

test('verdict headings escape HTML inside verdict labels too', () => {
    const html = chat.formatMarkdown('### 🌟 AI VERDICT: MUST BUY <svg/onload=alert(1)>');
    assert.ok(!html.includes('<svg'));
    assert.ok(html.includes('&lt;svg/onload=alert(1)&gt;'));
});

test('utility works as a browser global without Node modules', () => {
    const browser = {};
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../lib/chat-utils.js'), 'utf8'), browser);
    assert.equal(browser.IpoChatUtils.escapeHtml('<b>'), '&lt;b&gt;');
});

test('context includes Post-MITI stage 6 and preserves complete records', () => {
    const ipos = [fixture('active', 3), fixture('MyDCD', 6)];
    const built = chat.buildContext(ipos, 'apa MyDCD?', () => ({ grade: 'A' }));
    assert.equal(built.selected[0].id, 'MyDCD');
    for (const ipo of ipos) assert.ok(built.context.includes(chat.compactRecord(ipo, () => ({ grade: 'A' }))));
    assert.ok(built.context.includes('Stage 6'));
    assert.equal(built.omittedCount, 0);
});

test('question-named historical IPO is retained ahead of a bounded active list', () => {
    const historical = fixture('Oldcounter', 5, '01-Jan-2020');
    const ipos = [...Array.from({ length: 60 }, (_, index) => fixture(`Newcounter${index}`, 1)), historical];
    const built = chat.buildContext(ipos, 'apa gred OLDCOUNTER?', null, { maxChars: 550 });
    assert.equal(built.selected[0].id, 'Oldcounter');
    assert.ok(built.context.length <= 550);
    assert.ok(built.omittedCount > 0);
    assert.match(built.context, /omitted for space/);
    for (const ipo of built.selected) assert.ok(built.context.includes(chat.compactRecord(ipo)));
});

test('short brand prefixes distinguish KK Mart from another Mart counter', () => {
    const unrelated = fixture('Mini-Mart Express', 5, '01-Jan-2020');
    const requested = fixture('KK Mart Retail', 1);
    const built = chat.buildContext([unrelated, requested], 'apa KK Mart?');
    assert.equal(built.selected[0], requested);
});

test('recent listings use explicit supported date formats, invalid dates sort last', () => {
    const ipos = [fixture('invalid', 5, '31-Feb-2026'), fixture('old', 5, '01/01/2025'), fixture('new', 5, '14-Oct-2026')];
    const built = chat.buildContext(ipos, 'senarai ipo', null);
    assert.deepEqual(built.selected.map(ipo => ipo.id), ['new', 'old', 'invalid']);
    assert.equal(chat.dateTimestamp('2026-10-14'), chat.dateTimestamp('14 October 2026'));
    assert.equal(chat.dateTimestamp('31-Feb-2026'), 0);
});

test('context records stay within the API limit on the repository dataset', () => {
    const ipos = JSON.parse(fs.readFileSync(path.join(__dirname, '../data.json'), 'utf8'));
    const built = chat.buildContext(ipos, 'apa MyDCD?');
    assert.ok(built.context.length <= chat.LIMITS.context);
    assert.ok(built.selected.some(ipo => /mydcd/i.test(ipo.companyName)));
    for (const ipo of built.selected) assert.ok(built.context.includes(chat.compactRecord(ipo)));
});

test('API preserves context beyond the previous 3000-character cut', async () => {
    const api = mockApi();
    const context = 'x'.repeat(3500) + '\nMyDCD|Stage 6|Grade A';
    const instruction = 'Keep answers short. Never invent missing data.';
    const response = await api.send({ body: { prompt: 'MyDCD?', systemPrompt: instruction, context } });
    assert.equal(response.statusCode, 200);
    assert.equal(api.calls[0][1].messages[0].content, instruction);
    assert.ok(api.calls[0][1].messages[1].content.endsWith(context));
    assert.equal(api.calls[0][1].messages[2].content, 'MyDCD?');
});

test('API rejects oversized or non-string context/instructions without calling upstream', async () => {
    const api = mockApi();
    for (const body of [
        { prompt: 'test', context: 'x'.repeat(chat.LIMITS.context + 1) },
        { prompt: 'test', systemPrompt: 'x'.repeat(chat.LIMITS.instructions + 1) },
        { prompt: 'x'.repeat(chat.LIMITS.prompt + 1) },
        { prompt: 'test', context: {} }, { prompt: 'test', systemPrompt: [] }
    ]) assert.equal((await api.send({ body })).statusCode, 400);
    assert.equal(api.calls.length, 0);
});

test('API only permits production and explicitly configured deployment origins', async () => {
    const api = mockApi({ VERCEL_URL: 'owned-preview.vercel.app', CHAT_ALLOWED_ORIGINS: 'https://staging.ipobursa.my' });
    for (const origin of ['https://ipobursa.my', 'https://www.ipobursa.my', 'https://owned-preview.vercel.app', 'https://staging.ipobursa.my']) {
        const response = await api.send({ origin, method: 'OPTIONS' });
        assert.equal(response.statusCode, 200);
        assert.equal(response.headers['Access-Control-Allow-Origin'], origin);
        assert.equal(response.headers.Vary, 'Origin');
    }
    for (const origin of ['https://unrelated.vercel.app', 'https://ipobursa.my.attacker.example', 'https://unknown.ipobursa.my', 'http://localhost:3000', null]) {
        const response = await api.send({ origin });
        assert.equal(response.statusCode, 403);
        assert.equal(response.headers['Access-Control-Allow-Origin'], undefined);
    }
    assert.equal(api.calls.length, 0);
});

test('same-site referer and localhost development remain supported', async () => {
    const api = mockApi({ NODE_ENV: 'development' });
    assert.equal((await api.send({ origin: null, headers: { referer: 'https://ipobursa.my/index.html' } })).statusCode, 200);
    assert.equal((await api.send({ origin: 'http://localhost:8765' })).statusCode, 200);
});

test('an invalid optional origin configuration cannot disable production access', async () => {
    const api = mockApi({ CHAT_ALLOWED_ORIGINS: 'invalid,https://staging.ipobursa.my' });
    assert.equal((await api.send()).statusCode, 200);
    assert.equal((await api.send({ origin: 'https://staging.ipobursa.my' })).statusCode, 200);
});

test('model whitelist and output/temperature bounds remain enforced', async () => {
    const api = mockApi();
    assert.equal((await api.send({ body: { prompt: 'test', model: 'expensive-unlisted-model', max_tokens: 50000, temperature: 99 } })).statusCode, 200);
    const body = api.calls[0][1];
    assert.equal(body.model, 'llama-3.1-8b-instant');
    assert.equal(body.max_tokens, 1024);
    assert.equal(body.temperature, 1);
});

test('per-instance rate limiter stops request 16 and supplies a retry delay', async () => {
    const api = mockApi();
    for (let index = 0; index < 15; index++) assert.equal((await api.send()).statusCode, 200);
    const limited = await api.send();
    assert.equal(limited.statusCode, 429);
    assert.equal(limited.headers['Retry-After'], '300');
    assert.equal(api.calls.length, 15);
});

test('upstream errors cannot expose request credentials in logs or responses', async () => {
    const error = Object.assign(new Error('secret request detail'), { code: 'ECONNRESET', config: { headers: { Authorization: 'Bearer secret-key' } } });
    const api = mockApi({}, error);
    const response = await api.send();
    assert.equal(response.statusCode, 500);
    assert.ok(!JSON.stringify({ logs: api.logs, response: response.body }).includes('secret'));
});

test('chat integration sends a separate context and escapes a mocked malicious response', async () => {
    const source = fs.readFileSync(path.join(__dirname, '../main.js'), 'utf8');
    const code = source.slice(source.indexOf('async function sendAIMessage()'), source.indexOf('window.toggleChat = toggleChat;'));
    const input = { value: 'apa MyDCD?' };
    const messages = {
        children: [], scrollHeight: 0,
        appendChild(child) { child.parentNode = this; this.children.push(child); },
        removeChild(child) { this.children = this.children.filter(item => item !== child); child.parentNode = null; }
    };
    let request;
    const browser = {
        IpoChatUtils: chat, ipoData: [fixture('MyDCD', 6)], getIpoGrade: () => ({ grade: 'A' }), console,
        document: { getElementById: id => id === 'ai-input' ? input : messages, createElement: () => ({}) },
        fetch: async (url, options) => {
            request = JSON.parse(options.body);
            return { ok: true, json: async () => ({ text: '<img src=x onerror="alert(1)">' }) };
        }
    };
    vm.runInNewContext(code, browser);
    await browser.sendAIMessage();
    assert.ok(request.context.includes('MyDCD'));
    assert.ok(!request.systemPrompt.includes('MyDCD'));
    assert.ok(request.systemPrompt.includes('Keep answers short'));
    assert.equal(messages.children.length, 2);
    assert.ok(!messages.children[1].innerHTML.includes('<img'));
    assert.match(messages.children[1].innerHTML, /&lt;img/);
});

test('modal AI verdict passes market context and handles 429 rate limit with escaped id', async () => {
    const source = fs.readFileSync(path.join(__dirname, '../main.js'), 'utf8');
    const code = source.slice(
        source.indexOf('window.generateModalAIAnalysis = async function'),
        source.indexOf('function showResearch')
    );
    const box = { style: {}, innerHTML: '' };
    let request;
    const browser = {
        IpoChatUtils: chat,
        ipoData: [fixture('Special"Quote', 6)],
        getIpoGrade: () => ({ grade: 'A' }),
        console: { log: () => {}, warn: () => {}, error: () => {} },
        document: { getElementById: id => id === 'ai-verdict-box' ? box : null },
        fetch: async (url, options) => {
            request = JSON.parse(options.body);
            return {
                ok: false,
                status: 429,
                json: async () => ({ error: 'Too many requests' })
            };
        }
    };
    browser.window = browser;
    vm.runInNewContext(code, browser);
    await browser.generateModalAIAnalysis('Special"Quote');
    assert.ok(request.context.includes('Special'));
    assert.match(box.innerHTML, /Had capaian dicapai/);
    assert.ok(box.innerHTML.includes('&quot;'));
    assert.ok(!box.innerHTML.includes('Special"Quote'));
});
