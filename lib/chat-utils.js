(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.IpoChatUtils = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';

    const LIMITS = Object.freeze({ prompt: 8000, instructions: 3000, context: 8000 });
    const ACTIVE_STAGES = new Set([1, 2, 3, 4, 6]);

    function escapeHtml(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    // Only these fixed Markdown elements become markup. Model-provided HTML stays text.
    function formatMarkdown(text) {
        const inline = value => value.replace(/\*\*([^\n]+?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*([^*\n]+?)\*/g, '<em>$1</em>');
        const lines = escapeHtml(text).split(/\r?\n/);
        let inList = false;
        const output = [];
        const closeList = () => {
            if (inList) output.push('</ul>');
            inList = false;
        };
        for (const line of lines) {
            const bullet = line.match(/^\s*[-*]\s+(.+)$/);
            if (bullet) {
                if (!inList) output.push('<ul style="margin:0.35rem 0; padding-left:1.2rem;">');
                inList = true;
                output.push(`<li>${inline(bullet[1])}</li>`);
                continue;
            }
            closeList();
            const heading = line.match(/^#{1,6}\s+(.+)$/);
            if (heading) {
                let content = inline(heading[1]);
                const verdict = heading[1].match(/^🌟 AI VERDICT:\s*(.*)$/i);
                if (verdict) {
                    const label = verdict[1];
                    const upper = label.toUpperCase();
                    const color = upper.includes('AVOID') ? '#f87171' : upper.includes('SCALP') ? '#38bdf8'
                        : upper.includes('WORTH IT') ? '#34d399' : upper.includes('MUST') ? '#c084fc' : '#818cf8';
                    content = `🌟 AI VERDICT: <span style="color:${color}; font-weight:800;">${inline(label)}</span>`;
                }
                output.push(`<h5 style="color:#a78bfa; font-size:0.9rem; margin:0.8rem 0 0.35rem;">${content}</h5>`);
            } else {
                output.push(line ? `${inline(line)}<br>` : '<br>');
            }
        }
        closeList();
        return output.join('');
    }

    function dateTimestamp(value) {
        if (!value || typeof value !== 'string') return 0;
        const date = value.trim();
        let match = date.match(/^(\d{4})-(\d{2})-(\d{2})(?:$|T|\s)/);
        let year, month, day;
        if (match) {
            year = Number(match[1]); month = Number(match[2]) - 1; day = Number(match[3]);
        } else if ((match = date.match(/^(\d{1,2})[-/\s]([A-Za-z]{3,9})[-/\s](\d{4})$/))) {
            month = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
                .indexOf(match[2].slice(0, 3).toLowerCase());
            day = Number(match[1]); year = Number(match[3]);
        } else if ((match = date.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/))) {
            day = Number(match[1]); month = Number(match[2]) - 1; year = Number(match[3]);
        } else return 0;
        if (month < 0 || month > 11) return 0;
        const parsed = new Date(Date.UTC(year, month, day));
        return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month && parsed.getUTCDate() === day
            ? parsed.getTime() : 0;
    }

    const normalize = value => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    const stopWords = new Set(['ipo', 'the', 'for', 'and', 'apa', 'berapa', 'grade', 'gred', 'berhad', 'bhd', 'group', 'holdings', 'resources', 'listing', 'price', 'harga', 'syarikat', 'company', 'market', 'saham']);

    function relevance(ipo, question) {
        if (!question) return 0;
        const aliases = [ipo.symbol, ipo.id, ipo.companyName].map(normalize).filter(Boolean);
        const words = question.split(' ');
        const questionWords = new Set(words);
        let score = aliases.some(alias => alias.length >= 3 && (` ${question} `).includes(` ${alias} `)) ? 100 : 0;
        // Keep short brand prefixes, e.g. "KK Mart", ahead of unrelated counters containing "Mart".
        for (let index = 0; index < words.length - 1; index++) {
            const first = words[index], second = words[index + 1];
            if (stopWords.has(first) || stopWords.has(second) || first.length + second.length < 5) continue;
            if (aliases.some(alias => (` ${alias} `).includes(` ${first} ${second} `))) score += 60;
        }
        for (const word of new Set(aliases.join(' ').split(' '))) {
            if (word.length >= 3 && !stopWords.has(word) && questionWords.has(word)) score += 10;
        }
        return score;
    }

    function compactRecord(ipo, getGrade) {
        const field = (value, max = 60) => String(value == null || value === '' ? 'TBA' : value)
            .replace(/[\r\n|]/g, ' ').slice(0, max);
        const gradeObj = typeof getGrade === 'function' ? getGrade(ipo) : null;
        const grade = gradeObj && gradeObj.grade || ipo.predictedGrade || 'Unrated';
        const price = Number.isFinite(ipo.price) && ipo.price > 0 ? `RM${ipo.price.toFixed(3)}` : 'TBA';
        const market = /main/i.test(ipo.market || '') ? 'Main' : /ace/i.test(ipo.market || '') ? 'ACE' : field(ipo.market, 20);
        const dates = [['Open', ipo.openingDate], ['Close', ipo.closingDate], ['MITI Close', ipo.mitiCloseDate], ['Listing', ipo.listingDate]]
            .filter(([, value]) => value).map(([label, value]) => `${label}:${field(value, 20)}`);
        return `${field(ipo.companyName || ipo.id)} (${field(ipo.symbol || ipo.id, 40)})|${market}|Stage ${ipo.stage}|${price}|OS:${field(ipo.os, 15)}|PE:${field(ipo.pe, 15)}|Grade:${field(grade, 20)}|${field(ipo.sector, 40)}${dates.length ? '|' + dates.join('|') : ''}`;
    }

    function buildContext(ipos, question, getGrade, options = {}) {
        const source = Array.isArray(ipos) ? ipos : [];
        const normalizedQuestion = normalize(question);
        // A named historical IPO takes priority even if it is outside the ten latest listings.
        const relevant = source.map((ipo, index) => ({ ipo, index, score: relevance(ipo, normalizedQuestion) }))
            .filter(item => item.score > 0).sort((a, b) => b.score - a.score || a.index - b.index).map(item => item.ipo);
        const active = source.filter(ipo => ACTIVE_STAGES.has(ipo.stage));
        const listed = source.filter(ipo => ipo.stage === 5)
            .sort((a, b) => dateTimestamp(b.listingDate) - dateTimestamp(a.listingDate)).slice(0, 10);
        const seen = new Set();
        const candidates = [...relevant, ...active, ...listed].filter(ipo => {
            const key = ipo.id || ipo.symbol || ipo.companyName || ipo;
            if (seen.has(key)) return false;
            seen.add(key); return true;
        });
        const maxChars = Number.isFinite(options.maxChars) ? Math.max(0, Math.min(options.maxChars, LIMITS.context)) : LIMITS.context;
        const header = 'IPO reference records (Name (Symbol)|Market|Stage|Price|OS|PE|Grade|Sector|Dates). Stage 6 = waiting after MITI. This is a selected snapshot; missing data is unknown.\n';
        // Reserve space for the explicit omission notice; never cut through a record.
        const reserve = 100;
        const rows = [];
        const selected = [];
        let length = header.length;
        for (const ipo of candidates) {
            const row = compactRecord(ipo, getGrade);
            if (length + row.length + 1 + reserve > maxChars) continue;
            rows.push(row); selected.push(ipo); length += row.length + 1;
        }
        const omittedCount = candidates.length - selected.length;
        const notice = `\nSelected ${selected.length}/${candidates.length} candidate records; ${omittedCount} omitted for space. Do not infer missing facts.`;
        const context = maxChars >= header.length + notice.length ? header + rows.join('\n') + notice : '';
        return { context, selected, omittedCount };
    }

    return { LIMITS, escapeHtml, formatMarkdown, dateTimestamp, compactRecord, buildContext };
}));
