const fs = require('fs');
const path = require('path');

const dataFilePath = path.join(__dirname, 'data.json');
const ipoDir = path.join(__dirname, 'ipo');

if (!fs.existsSync(ipoDir)) {
    fs.mkdirSync(ipoDir, { recursive: true });
}

const rawData = fs.readFileSync(dataFilePath, 'utf8');
const ipos = JSON.parse(rawData);

console.log(`Loaded ${ipos.length} IPO entries from data.json`);

function sanitizeSlug(str) {
    if (!str) return 'ipo-counter';
    return str
        .toLowerCase()
        .replace(/&/g, 'and')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function formatCurrency(val) {
    if (val === null || val === undefined || isNaN(val)) return '-';
    return 'RM ' + Number(val).toFixed(2);
}

function formatLargeNumber(val) {
    if (val === null || val === undefined || isNaN(val)) return '-';
    const num = Number(val);
    if (num >= 1e9) return (num / 1e9).toFixed(2) + ' B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + ' M';
    if (num >= 1e3) return (num / 1e3).toFixed(2) + ' K';
    return num.toLocaleString();
}

const slugMap = new Map();
const generatedPages = [];

ipos.forEach((ipo, index) => {
    let baseSlug = sanitizeSlug(ipo.id || ipo.symbol || ipo.companyName || `ipo-${index}`);
    if (!baseSlug) baseSlug = `ipo-${index + 1}`;
    
    let uniqueSlug = baseSlug;
    let counter = 1;
    while (slugMap.has(uniqueSlug)) {
        uniqueSlug = `${baseSlug}-${counter}`;
        counter++;
    }
    slugMap.set(uniqueSlug, ipo);
    ipo._slug = uniqueSlug;
});

const megaFooterHtml = `
    <!-- MEGA FOOTER -->
    <footer class="glass-footer" style="background: rgba(15, 23, 42, 0.95); border-top: 1px solid rgba(255,255,255,0.08); padding: 3.5rem 0 2rem 0; margin-top: 4rem;">
        <div class="container">
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 2rem; margin-bottom: 2.5rem; text-align: left;">
                <div>
                    <h4 style="color: white; font-size: 0.95rem; margin-bottom: 1rem; font-weight: 700;">Core IPO Tools</h4>
                    <ul style="list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.5rem; font-size: 0.85rem;">
                        <li><a href="../index.html" style="color: var(--text-dim); text-decoration: none;">Dashboard & Live Radar</a></li>
                        <li><a href="../sifu-sheets.html" style="color: var(--text-dim); text-decoration: none;">Sifu's Projection Sheets</a></li>
                        <li><a href="../cincai-analysis.html" style="color: var(--text-dim); text-decoration: none;">Cincai2 Kira (60 IPOs)</a></li>
                        <li><a href="../ipo-decision.html" style="color: var(--text-dim); text-decoration: none;">Decision Engine: Sub / Skip</a></li>
                        <li><a href="../morning-brief.html" style="color: var(--text-dim); text-decoration: none;">Daily Morning Briefing</a></li>
                        <li><a href="../miti-journal.html" style="color: var(--text-dim); text-decoration: none;">MITI Investment Journal</a></li>
                        <li><a href="../sifu-picks.html" style="color: var(--text-dim); text-decoration: none;">Sifu Target Picks</a></li>
                        <li><a href="../alerts.html" style="color: var(--text-dim); text-decoration: none;">IPO Alerts Tracker</a></li>
                        <li><a href="./index.html" style="color: #38bdf8; font-weight: 600; text-decoration: none;">📂 Complete IPO Directory</a></li>
                    </ul>
                </div>
                <div>
                    <h4 style="color: white; font-size: 0.95rem; margin-bottom: 1rem; font-weight: 700;">Strategy & Education</h4>
                    <ul style="list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.5rem; font-size: 0.85rem;">
                        <li><a href="../strategy.html" style="color: var(--text-dim); text-decoration: none;">IPO Strategy Playbook</a></li>
                        <li><a href="../tips.html" style="color: var(--text-dim); text-decoration: none;">Pro Tips & Balloting Guide</a></li>
                        <li><a href="../scalping-sop.html" style="color: var(--text-dim); text-decoration: none;">Day 1 Scalping SOP</a></li>
                        <li><a href="../scalping-charts.html" style="color: var(--text-dim); text-decoration: none;">Scalping Chart Setups</a></li>
                        <li><a href="../backtest-results.html" style="color: var(--text-dim); text-decoration: none;">Historical Backtest Results</a></li>
                        <li><a href="https://www.jerungbursa.my/" target="_blank" style="color: #a78bfa; text-decoration: none;">JerungBursa Smart Money ↗</a></li>
                    </ul>
                </div>
                <div>
                    <h4 style="color: white; font-size: 0.95rem; margin-bottom: 1rem; font-weight: 700;">Recent IPO Deep Dives</h4>
                    <ul style="list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.5rem; font-size: 0.85rem;">
                        <li><a href="../blog.html" style="color: var(--text-dim); text-decoration: none;">All IPO Commentary</a></li>
                        <li><a href="../blog-mydcd.html" style="color: var(--text-dim); text-decoration: none;">MyDCD Berhad Analysis</a></li>
                        <li><a href="../blog-gta-holdings.html" style="color: var(--text-dim); text-decoration: none;">GTA Holdings Berhad</a></li>
                        <li><a href="../blog-butterfield-fb.html" style="color: var(--text-dim); text-decoration: none;">Butterfield FB Berhad</a></li>
                        <li><a href="../blog-srkk-ai.html" style="color: var(--text-dim); text-decoration: none;">SRKK AI Berhad (312x OS)</a></li>
                        <li><a href="../blog-stratus-global.html" style="color: var(--text-dim); text-decoration: none;">Stratus Global Holdings</a></li>
                        <li><a href="../blog-skyechip.html" style="color: var(--text-dim); text-decoration: none;">SkyeChip (+297% Debut)</a></li>
                    </ul>
                </div>
                <div>
                    <h4 style="color: white; font-size: 0.95rem; margin-bottom: 1rem; font-weight: 700;">Legal & Transparency</h4>
                    <ul style="list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.5rem; font-size: 0.85rem;">
                        <li><a href="../about.html" style="color: var(--text-dim); text-decoration: none;">About Bursa IPO Tracker</a></li>
                        <li><a href="../contact.html" style="color: var(--text-dim); text-decoration: none;">Contact Us & Inquiries</a></li>
                        <li><a href="../privacy-policy.html" style="color: var(--text-dim); text-decoration: none;">Privacy & Cookie Policy</a></li>
                        <li><a href="../terms.html" style="color: var(--text-dim); text-decoration: none;">Terms of Service</a></li>
                        <li><a href="../sitemap.xml" style="color: var(--text-dim); text-decoration: none;">XML Sitemap</a></li>
                    </ul>
                </div>
            </div>

            <div style="max-width: 850px; margin: 0 auto 1.5rem auto; font-size: 0.75rem; color: var(--text-dim); line-height: 1.6; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 1.5rem; text-align: center;">
                <p>⚠️ <strong>Financial Disclaimer:</strong> All information, analyses, grades, price projections, and calculator outputs on this website are for educational and research reference purposes only. They do not constitute investment advice or a recommendation to buy or sell any security. Stock market investments, particularly IPO subscriptions, carry a high risk of capital loss. We do not guarantee the accuracy of the information compiled. You are advised to consult a licensed financial advisor before making any investment decisions.</p>
            </div>
            <div style="text-align: center; font-size: 0.82rem; color: var(--text-dim);">
                <p>&copy; 2026 Bursa IPO Tracker (www.ipobursa.my). All rights reserved.</p>
            </div>
        </div>
    </footer>
`;

ipos.forEach((ipo) => {
    const slug = ipo._slug;
    const companyName = ipo.companyName || 'Bursa IPO Candidate';
    const symbol = ipo.symbol || '-';
    const sector = ipo.sector || 'General Equities';
    const market = ipo.market || 'ACE / Main Market';
    const priceStr = ipo.price ? `RM ${Number(ipo.price).toFixed(2)}` : 'TBA';
    const sifuTpStr = ipo.sifuTargetPrice ? `RM ${Number(ipo.sifuTargetPrice).toFixed(2)}` : (ipo.fairValue ? `RM ${Number(ipo.fairValue).toFixed(2)}` : '-');
    const grade = ipo.predictedGrade || 'B';
    const shariahText = ipo.shariah === true ? 'Shariah Compliant' : (ipo.shariah === false ? 'Non-Shariah' : 'Status Pending');
    const shariahColor = ipo.shariah === true ? '#10b981' : (ipo.shariah === false ? '#ef4444' : '#f59e0b');
    const osMultiple = (ipo.os !== undefined && ipo.os !== null && !isNaN(ipo.os) && Number(ipo.os) > 0) ? `${Number(ipo.os).toFixed(1)}x` : '-';
    const underwriter = ipo.ib || 'To Be Appointed';
    const closingDate = ipo.closingDate || 'TBA';
    const listingDate = ipo.listingDate || 'TBA';

    let upsideHtml = '';
    if (ipo.price && (ipo.sifuTargetPrice || ipo.fairValue)) {
        const tp = Number(ipo.sifuTargetPrice || ipo.fairValue);
        const p = Number(ipo.price);
        if (p > 0) {
            const diffPct = (((tp - p) / p) * 100).toFixed(1);
            const isPos = diffPct >= 0;
            upsideHtml = `<span style="font-size: 0.85rem; font-weight: 700; color: ${isPos ? '#34d399' : '#f87171'};">(${isPos ? '+' : ''}${diffPct}%)</span>`;
        }
    }

    const titleTag = `${escapeHtml(companyName)} (${escapeHtml(symbol)}) IPO Prospectus, Valuation & Target Price | Bursa IPO Tracker`;
    const metaDesc = `Bursa Malaysia IPO analysis for ${companyName} (${symbol}). Offer Price: ${priceStr}, Sector: ${sector}, Market: ${market}, Target Price: ${sifuTpStr}, Underwriter: ${underwriter}. Read full prospectus review and valuation model.`;
    const pageUrl = `https://www.ipobursa.my/ipo/${slug}.html`;

    let catalystsHtml = '';
    if (Array.isArray(ipo.catalysts) && ipo.catalysts.length > 0) {
        catalystsHtml = `
            <div class="glass-card" style="padding: 1.75rem; margin-top: 1.5rem; border-radius: 12px;">
                <h3 style="color: white; font-size: 1.15rem; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
                    <i data-lucide="zap" style="color: #f59e0b; width: 20px;"></i> Growth Catalysts & Strategic Moats
                </h3>
                <ul style="padding-left: 1.25rem; color: var(--text-main); font-size: 0.92rem; line-height: 1.7;">
                    ${ipo.catalysts.map(c => `<li style="margin-bottom: 0.5rem;">${c}</li>`).join('')}
                </ul>
            </div>
        `;
    }

    let financialTableHtml = '';
    if (ipo.rev23 || ipo.rev24 || ipo.rev25 || ipo.revF || ipo.pat23 || ipo.pat24 || ipo.pat25 || ipo.patF) {
        financialTableHtml = `
            <div class="glass-card" style="padding: 1.75rem; margin-top: 1.5rem; border-radius: 12px;">
                <h3 style="color: white; font-size: 1.15rem; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
                    <i data-lucide="table" style="color: #38bdf8; width: 20px;"></i> Financial Performance Summary
                </h3>
                <div style="overflow-x: auto;">
                    <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem; text-align: left;">
                        <thead>
                            <tr style="border-bottom: 1px solid rgba(255,255,255,0.1); color: var(--text-dim);">
                                <th style="padding: 0.75rem 0.5rem;">Financial Metric</th>
                                <th style="padding: 0.75rem 0.5rem; text-align: right;">FY23</th>
                                <th style="padding: 0.75rem 0.5rem; text-align: right;">FY24</th>
                                <th style="padding: 0.75rem 0.5rem; text-align: right;">FY25</th>
                                <th style="padding: 0.75rem 0.5rem; text-align: right;">Projected (FY F)</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                                <td style="padding: 0.75rem 0.5rem; font-weight: 600; color: white;">Revenue (RM)</td>
                                <td style="padding: 0.75rem 0.5rem; text-align: right; color: var(--text-dim);">${formatLargeNumber(ipo.rev23)}</td>
                                <td style="padding: 0.75rem 0.5rem; text-align: right; color: var(--text-dim);">${formatLargeNumber(ipo.rev24)}</td>
                                <td style="padding: 0.75rem 0.5rem; text-align: right; color: var(--text-dim);">${formatLargeNumber(ipo.rev25)}</td>
                                <td style="padding: 0.75rem 0.5rem; text-align: right; color: #34d399; font-weight: 600;">${formatLargeNumber(ipo.revF)}</td>
                            </tr>
                            <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                                <td style="padding: 0.75rem 0.5rem; font-weight: 600; color: white;">Profit After Tax (PAT)</td>
                                <td style="padding: 0.75rem 0.5rem; text-align: right; color: var(--text-dim);">${formatLargeNumber(ipo.pat23)}</td>
                                <td style="padding: 0.75rem 0.5rem; text-align: right; color: var(--text-dim);">${formatLargeNumber(ipo.pat24)}</td>
                                <td style="padding: 0.75rem 0.5rem; text-align: right; color: var(--text-dim);">${formatLargeNumber(ipo.pat25)}</td>
                                <td style="padding: 0.75rem 0.5rem; text-align: right; color: #34d399; font-weight: 600;">${formatLargeNumber(ipo.patF)}</td>
                            </tr>
                            <tr>
                                <td style="padding: 0.75rem 0.5rem; font-weight: 600; color: white;">EPS (sen)</td>
                                <td style="padding: 0.75rem 0.5rem; text-align: right; color: var(--text-dim);">${ipo.eps23 !== null && ipo.eps23 !== undefined ? Number(ipo.eps23).toFixed(2) : '-'}</td>
                                <td style="padding: 0.75rem 0.5rem; text-align: right; color: var(--text-dim);">${ipo.eps24 !== null && ipo.eps24 !== undefined ? Number(ipo.eps24).toFixed(2) : '-'}</td>
                                <td style="padding: 0.75rem 0.5rem; text-align: right; color: var(--text-dim);">${ipo.eps25 !== null && ipo.eps25 !== undefined ? Number(ipo.eps25).toFixed(2) : '-'}</td>
                                <td style="padding: 0.75rem 0.5rem; text-align: right; color: #34d399; font-weight: 600;">${ipo.epsGrowthF !== null && ipo.epsGrowthF !== undefined ? '+' + Number(ipo.epsGrowthF).toFixed(1) + '%' : '-'}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${titleTag}</title>
    <meta name="description" content="${escapeHtml(metaDesc)}">
    <meta name="robots" content="index, follow">
    <link rel="canonical" href="${pageUrl}">
    <meta property="og:title" content="${escapeHtml(titleTag)}">
    <meta property="og:description" content="${escapeHtml(metaDesc)}">
    <meta property="og:type" content="article">
    <meta property="og:url" content="${pageUrl}">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Outfit:wght@600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="../style.css">
    <script src="https://unpkg.com/lucide@latest"></script>
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "FinancialProduct",
      "name": "${escapeHtml(companyName)} IPO",
      "description": "${escapeHtml(metaDesc)}",
      "category": "Equities IPO",
      "provider": {
        "@type": "Organization",
        "name": "Bursa Malaysia"
      },
      "url": "${pageUrl}"
    }
    </script>
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Home",
          "item": "https://www.ipobursa.my/"
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "IPO Directory",
          "item": "https://www.ipobursa.my/ipo/"
        },
        {
          "@type": "ListItem",
          "position": 3,
          "name": "${escapeHtml(companyName)}",
          "item": "${pageUrl}"
        }
      ]
    }
    </script>
</head>
<body>
    <div class="background-blobs">
        <div class="blob blob-1"></div>
        <div class="blob blob-2" style="background: rgba(99, 102, 241, 0.2);"></div>
        <div class="blob blob-3" style="background: rgba(16, 185, 129, 0.15);"></div>
    </div>

    <!-- Navigation Header -->
    <nav class="glass-header">
        <div class="container" style="display: flex; justify-content: space-between; align-items: center;">
            <a href="../index.html" class="logo" style="text-decoration: none; cursor: pointer;">
                <i data-lucide="trending-up"></i>
                <span class="logo-text"><span>Bursa</span>IPO</span>
            </a>
            <div class="nav-links">
                <a href="../index.html" class="btn-moomoo">
                    <i data-lucide="layout-dashboard"></i> <span class="nav-text">Dashboard</span>
                </a>
                <a href="./index.html" class="btn-moomoo" style="background: rgba(99, 102, 241, 0.25); border-color: rgba(99, 102, 241, 0.5);">
                    <i data-lucide="folder"></i> <span class="nav-text">All IPOs</span>
                </a>
                <a href="../morning-brief.html" class="btn-moomoo">
                    <i data-lucide="sun"></i> <span class="nav-text">Morning Brief</span>
                </a>
                <a href="../sifu-sheets.html" class="btn-moomoo">
                    <i data-lucide="table"></i> <span class="nav-text">Sifu Sheets</span>
                </a>
                <a href="../blog.html" class="btn-moomoo">
                    <i data-lucide="book-open"></i> <span class="nav-text">Analysis Blog</span>
                </a>
            </div>
        </div>
    </nav>

    <main class="container" style="margin-top: 2rem; margin-bottom: 5rem; max-width: 900px;">
        <!-- Breadcrumbs -->
        <div style="font-size: 0.8rem; color: var(--text-dim); margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.5rem;">
            <a href="../index.html" style="color: var(--text-dim); text-decoration: none;">Home</a>
            <span>/</span>
            <a href="./index.html" style="color: var(--text-dim); text-decoration: none;">IPO Directory</a>
            <span>/</span>
            <span style="color: var(--primary-light); font-weight: 600;">${escapeHtml(companyName)}</span>
        </div>

        <!-- Header Card -->
        <header class="glass-card" style="padding: 2.25rem; border-radius: 16px; margin-bottom: 2rem;">
            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 1rem;">
                <span style="background: rgba(99, 102, 241, 0.15); border: 1px solid rgba(99, 102, 241, 0.3); color: #a5b4fc; font-size: 0.75rem; font-weight: 700; padding: 0.25rem 0.75rem; border-radius: 20px;">
                    ${escapeHtml(market)}
                </span>
                <span style="background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); color: var(--text-main); font-size: 0.75rem; font-weight: 600; padding: 0.25rem 0.75rem; border-radius: 20px;">
                    ${escapeHtml(sector)}
                </span>
                <span style="background: rgba(16, 185, 129, 0.15); border: 1px solid ${shariahColor}; color: ${shariahColor}; font-size: 0.75rem; font-weight: 700; padding: 0.25rem 0.75rem; border-radius: 20px;">
                    ${escapeHtml(shariahText)}
                </span>
                <span style="background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.3); color: #fbbf24; font-size: 0.75rem; font-weight: 700; padding: 0.25rem 0.75rem; border-radius: 20px;">
                    Grade: ${escapeHtml(grade)}
                </span>
            </div>

            <h1 style="font-size: 2.2rem; font-weight: 800; color: white; margin-bottom: 0.5rem; line-height: 1.2;">
                ${escapeHtml(companyName)}
            </h1>
            <p style="color: var(--text-dim); font-size: 1rem; margin-bottom: 1.5rem;">
                Bursa Ticker: <strong style="color: white;">${escapeHtml(symbol)}</strong> | Listing Year: <strong style="color: white;">${escapeHtml(ipo.year || '2026')}</strong>
            </p>

            <!-- Key Figures Strip -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 1rem; padding-top: 1.5rem; border-top: 1px solid rgba(255,255,255,0.08);">
                <div>
                    <span style="font-size: 0.75rem; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.05em;">Offer Price</span>
                    <div style="font-size: 1.4rem; font-weight: 800; color: white; font-family: 'Outfit', sans-serif;">
                        ${priceStr}
                    </div>
                </div>
                <div>
                    <span style="font-size: 0.75rem; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.05em;">Sifu Target Price</span>
                    <div style="font-size: 1.4rem; font-weight: 800; color: #a5b4fc; font-family: 'Outfit', sans-serif;">
                        ${sifuTpStr} ${upsideHtml}
                    </div>
                </div>
                <div>
                    <span style="font-size: 0.75rem; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.05em;">Retail Oversubscription</span>
                    <div style="font-size: 1.4rem; font-weight: 800; color: #34d399; font-family: 'Outfit', sans-serif;">
                        ${osMultiple}
                    </div>
                </div>
                <div>
                    <span style="font-size: 0.75rem; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.05em;">Underwriter (IB)</span>
                    <div style="font-size: 0.95rem; font-weight: 700; color: white; margin-top: 0.35rem;">
                        ${escapeHtml(underwriter)}
                    </div>
                </div>
            </div>
        </header>

        <!-- IPO Timeline & Key Details -->
        <div class="glass-card" style="padding: 1.75rem; border-radius: 12px; margin-bottom: 1.5rem;">
            <h3 style="color: white; font-size: 1.15rem; margin-bottom: 1.25rem; display: flex; align-items: center; gap: 0.5rem;">
                <i data-lucide="calendar" style="color: #38bdf8; width: 20px;"></i> Key Dates & Offering Details
            </h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.25rem; font-size: 0.9rem;">
                <div>
                    <span style="color: var(--text-dim); display: block; font-size: 0.75rem;">Application Closing</span>
                    <strong style="color: white;">${escapeHtml(closingDate)}</strong>
                </div>
                <div>
                    <span style="color: var(--text-dim); display: block; font-size: 0.75rem;">Listing Date</span>
                    <strong style="color: white;">${escapeHtml(listingDate)}</strong>
                </div>
                <div>
                    <span style="color: var(--text-dim); display: block; font-size: 0.75rem;">Target P/E Ratio</span>
                    <strong style="color: white;">${ipo.targetPe ? ipo.targetPe + 'x' : (ipo.pe ? ipo.pe + 'x' : '-')}</strong>
                </div>
                <div>
                    <span style="color: var(--text-dim); display: block; font-size: 0.75rem;">Total Enlarged Shares</span>
                    <strong style="color: white;">${formatLargeNumber(ipo.totalShares)}</strong>
                </div>
                <div>
                    <span style="color: var(--text-dim); display: block; font-size: 0.75rem;">Free Float</span>
                    <strong style="color: white;">${ipo.freeFloat ? (Number(ipo.freeFloat) * 100).toFixed(1) + '%' : '-'}</strong>
                </div>
                <div>
                    <span style="color: var(--text-dim); display: block; font-size: 0.75rem;">MITI Special Allocation</span>
                    <strong style="color: white;">${ipo.hasMitiTranche ? 'Yes (Bumiputera Reserved)' : 'No Tranche'}</strong>
                </div>
            </div>
        </div>

        <!-- Analyst Commentary & Executive Summary -->
        ${ipo.analystInsight ? `
        <div class="glass-card" style="padding: 1.75rem; border-radius: 12px; margin-bottom: 1.5rem; line-height: 1.7;">
            <h3 style="color: white; font-size: 1.15rem; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
                <i data-lucide="sparkles" style="color: #a78bfa; width: 20px;"></i> Analyst Commentary & Hunter Insight
            </h3>
            <div style="color: var(--text-main); font-size: 0.95rem;">
                ${ipo.analystInsight}
            </div>
        </div>
        ` : ''}

        <!-- Catalysts -->
        ${catalystsHtml}

        <!-- Financial Table -->
        ${financialTableHtml}

        <!-- Fund Utilization -->
        ${ipo.fundUse ? `
        <div class="glass-card" style="padding: 1.75rem; border-radius: 12px; margin-top: 1.5rem; line-height: 1.7;">
            <h3 style="color: white; font-size: 1.15rem; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
                <i data-lucide="pie-chart" style="color: #10b981; width: 20px;"></i> Utilization of Proceeds
            </h3>
            <p style="color: var(--text-main); font-size: 0.95rem;">
                ${escapeHtml(ipo.fundUse)}
            </p>
        </div>
        ` : ''}

        <!-- Peer Comparison -->
        ${ipo.peers ? `
        <div class="glass-card" style="padding: 1.75rem; border-radius: 12px; margin-top: 1.5rem; line-height: 1.7;">
            <h3 style="color: white; font-size: 1.15rem; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
                <i data-lucide="users" style="color: #f43f5e; width: 20px;"></i> Peer Comparison & Valuation Context
            </h3>
            <div style="color: var(--text-main); font-size: 0.92rem;">
                ${ipo.peers}
            </div>
        </div>
        ` : ''}

        <!-- Action Box -->
        <div class="glass-card" style="padding: 2rem; border-radius: 16px; margin-top: 2.5rem; text-align: center; background: linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(16, 185, 129, 0.08)); border: 1px solid rgba(99, 102, 241, 0.3);">
            <h3 style="color: white; font-size: 1.3rem; margin-bottom: 0.5rem;">Evaluate ${escapeHtml(companyName)} with Our Tools</h3>
            <p style="color: var(--text-dim); font-size: 0.9rem; max-width: 600px; margin: 0 auto 1.5rem auto;">
                Use the Decision Engine to test whether to subscribe or skip, calculate your optimal balloting tier, or cross-check with Sifu projection sheets.
            </p>
            <div style="display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap;">
                <a href="../ipo-decision.html" class="btn-moomoo" style="background: var(--primary); color: white; font-weight: 700; text-decoration: none;">
                    <i data-lucide="zap"></i> Decision Engine: Sub or Skip?
                </a>
                <a href="../sifu-sheets.html" class="btn-moomoo" style="text-decoration: none;">
                    <i data-lucide="table"></i> View Sifu Sheets
                </a>
                ${ipo.prospectusUrl ? `
                <a href="${escapeHtml(ipo.prospectusUrl)}" target="_blank" rel="noopener noreferrer" class="btn-moomoo" style="text-decoration: none;">
                    <i data-lucide="external-link"></i> Official Prospectus ↗
                </a>
                ` : ''}
            </div>
        </div>
    </main>

    ${megaFooterHtml}

    <script>
        lucide.createIcons();
    </script>
</body>
</html>
`;

    const filePath = path.join(ipoDir, `${slug}.html`);
    fs.writeFileSync(filePath, htmlContent, 'utf8');
    generatedPages.push({
        slug,
        companyName,
        symbol,
        year: ipo.year || 2026,
        market,
        sector,
        priceStr,
        sifuTpStr,
        grade,
        shariah: ipo.shariah
    });
});

console.log(`Generated ${generatedPages.length} individual static IPO pages in ./ipo/`);

// Generate /ipo/index.html (The Directory)
const directoryHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bursa Malaysia IPO Directory | Complete Archive 2019-2026</title>
    <meta name="description" content="Explore the comprehensive Bursa Malaysia IPO directory: Prospectuses, offer prices, Sifu target prices, and performance for over 300 Malaysian IPO listings.">
    <meta name="robots" content="index, follow">
    <link rel="canonical" href="https://www.ipobursa.my/ipo/">
    <meta property="og:title" content="Bursa Malaysia IPO Directory | Complete Archive">
    <meta property="og:description" content="Explore over 300 Bursa Malaysia IPO listings with fair values, target prices, and financial breakdowns.">
    <meta property="og:url" content="https://www.ipobursa.my/ipo/">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Outfit:wght@600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="../style.css">
    <script src="https://unpkg.com/lucide@latest"></script>
    <style>
        .ipo-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
            gap: 1.25rem;
            margin-top: 2rem;
        }
        .ipo-card {
            padding: 1.25rem;
            border-radius: 12px;
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
            text-decoration: none;
            color: inherit;
            transition: transform 0.2s ease, border-color 0.2s ease;
        }
        .ipo-card:hover {
            transform: translateY(-3px);
            border-color: rgba(99, 102, 241, 0.4);
        }
    </style>
</head>
<body>
    <div class="background-blobs">
        <div class="blob blob-1"></div>
        <div class="blob blob-2" style="background: rgba(99, 102, 241, 0.2);"></div>
        <div class="blob blob-3" style="background: rgba(16, 185, 129, 0.15);"></div>
    </div>

    <!-- Navigation Header -->
    <nav class="glass-header">
        <div class="container" style="display: flex; justify-content: space-between; align-items: center;">
            <a href="../index.html" class="logo" style="text-decoration: none; cursor: pointer;">
                <i data-lucide="trending-up"></i>
                <span class="logo-text"><span>Bursa</span>IPO</span>
            </a>
            <div class="nav-links">
                <a href="../index.html" class="btn-moomoo">
                    <i data-lucide="layout-dashboard"></i> <span class="nav-text">Dashboard</span>
                </a>
                <a href="../morning-brief.html" class="btn-moomoo">
                    <i data-lucide="sun"></i> <span class="nav-text">Morning Brief</span>
                </a>
                <a href="../sifu-sheets.html" class="btn-moomoo">
                    <i data-lucide="table"></i> <span class="nav-text">Sifu Sheets</span>
                </a>
                <a href="../strategy.html" class="btn-moomoo">
                    <i data-lucide="line-chart"></i> <span class="nav-text">Strategy</span>
                </a>
                <a href="../blog.html" class="btn-moomoo">
                    <i data-lucide="book-open"></i> <span class="nav-text">Analysis Blog</span>
                </a>
            </div>
        </div>
    </nav>

    <main class="container" style="margin-top: 3rem; margin-bottom: 5rem;">
        <header class="hero" style="text-align: center; margin-bottom: 2.5rem;">
            <div style="display: flex; align-items: center; justify-content: center; gap: 0.75rem; margin-bottom: 1rem;">
                <i data-lucide="folder" style="color: var(--primary-light);"></i>
                <span style="font-weight: 800; font-size: 0.8rem; color: var(--primary-light); text-transform: uppercase; letter-spacing: 0.15em;">Complete Archive &amp; Database</span>
            </div>
            <h1>Bursa Malaysia <span>IPO Directory</span></h1>
            <p>Comprehensive research profiles, prospectuses, valuations, and target prices for all 300+ tracked Malaysian IPOs.</p>
            
            <div style="margin-top: 1.5rem; max-width: 500px; margin-left: auto; margin-right: auto;">
                <input type="text" id="ipo-search" placeholder="Search by company name, ticker or sector..." oninput="filterIpos()" style="width: 100%; padding: 0.75rem 1.25rem; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: 2rem; color: white; font-size: 0.9rem; outline: none;">
            </div>
        </header>

        <div class="ipo-grid" id="ipo-grid-container">
            ${generatedPages.map(p => `
            <a href="${p.slug}.html" class="glass-card ipo-card" data-name="${escapeHtml(p.companyName.toLowerCase())}" data-symbol="${escapeHtml(p.symbol.toLowerCase())}" data-sector="${escapeHtml(p.sector.toLowerCase())}">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-size: 0.72rem; color: var(--text-dim); font-weight: 600;">${escapeHtml(p.market)} • ${escapeHtml(p.year)}</span>
                    <span style="font-size: 0.7rem; font-weight: 700; color: ${p.shariah === true ? '#10b981' : (p.shariah === false ? '#ef4444' : '#f59e0b')};">
                        ${p.shariah === true ? 'Shariah' : (p.shariah === false ? 'Non-Shariah' : '')}
                    </span>
                </div>
                <h3 style="font-size: 1.05rem; font-weight: 700; color: white; line-height: 1.3;">
                    ${escapeHtml(p.companyName)}
                </h3>
                <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: auto; padding-top: 0.75rem; border-top: 1px solid rgba(255,255,255,0.05); font-size: 0.85rem;">
                    <div>
                        <span style="display: block; font-size: 0.7rem; color: var(--text-dim);">Offer</span>
                        <strong style="color: white;">${p.priceStr}</strong>
                    </div>
                    <div style="text-align: right;">
                        <span style="display: block; font-size: 0.7rem; color: var(--text-dim);">Target</span>
                        <strong style="color: #a5b4fc;">${p.sifuTpStr}</strong>
                    </div>
                </div>
            </a>
            `).join('')}
        </div>
    </main>

    ${megaFooterHtml}

    <script>
        lucide.createIcons();

        function filterIpos() {
            const query = document.getElementById('ipo-search').value.toLowerCase().trim();
            const cards = document.querySelectorAll('.ipo-card');
            cards.forEach(card => {
                const name = card.getAttribute('data-name') || '';
                const symbol = card.getAttribute('data-symbol') || '';
                const sector = card.getAttribute('data-sector') || '';
                if (!query || name.includes(query) || symbol.includes(query) || sector.includes(query)) {
                    card.style.display = 'flex';
                } else {
                    card.style.display = 'none';
                }
            });
        }
    </script>
</body>
</html>
`;

fs.writeFileSync(path.join(ipoDir, 'index.html'), directoryHtml, 'utf8');
console.log('Generated /ipo/index.html directory successfully');

// Regenerate sitemap.xml
const sitemapFilePath = path.join(__dirname, 'sitemap.xml');
const today = new Date().toISOString().split('T')[0];

const staticUrls = [
    { url: 'https://www.ipobursa.my/', priority: '1.0', changefreq: 'daily' },
    { url: 'https://www.ipobursa.my/ipo/', priority: '0.9', changefreq: 'daily' },
    { url: 'https://www.ipobursa.my/sifu-sheets.html', priority: '0.9', changefreq: 'daily' },
    { url: 'https://www.ipobursa.my/morning-brief.html', priority: '0.9', changefreq: 'daily' },
    { url: 'https://www.ipobursa.my/miti-journal.html', priority: '0.8', changefreq: 'weekly' },
    { url: 'https://www.ipobursa.my/sifu-picks.html', priority: '0.8', changefreq: 'weekly' },
    { url: 'https://www.ipobursa.my/cincai-analysis.html', priority: '0.8', changefreq: 'weekly' },
    { url: 'https://www.ipobursa.my/ipo-decision.html', priority: '0.8', changefreq: 'weekly' },
    { url: 'https://www.ipobursa.my/strategy.html', priority: '0.7', changefreq: 'monthly' },
    { url: 'https://www.ipobursa.my/tips.html', priority: '0.7', changefreq: 'monthly' },
    { url: 'https://www.ipobursa.my/alerts.html', priority: '0.7', changefreq: 'weekly' },
    { url: 'https://www.ipobursa.my/backtest-results.html', priority: '0.7', changefreq: 'monthly' },
    { url: 'https://www.ipobursa.my/scalping-sop.html', priority: '0.7', changefreq: 'monthly' },
    { url: 'https://www.ipobursa.my/scalping-charts.html', priority: '0.6', changefreq: 'monthly' },
    { url: 'https://www.ipobursa.my/scalping-images.html', priority: '0.6', changefreq: 'monthly' },
    { url: 'https://www.ipobursa.my/blog.html', priority: '0.8', changefreq: 'weekly' },
    { url: 'https://www.ipobursa.my/blog-aerodyne.html', priority: '0.7', changefreq: 'monthly' },
    { url: 'https://www.ipobursa.my/blog-butterfield-fb.html', priority: '0.7', changefreq: 'monthly' },
    { url: 'https://www.ipobursa.my/blog-gta-holdings.html', priority: '0.7', changefreq: 'monthly' },
    { url: 'https://www.ipobursa.my/blog-mydcd.html', priority: '0.7', changefreq: 'monthly' },
    { url: 'https://www.ipobursa.my/blog-skyechip.html', priority: '0.7', changefreq: 'monthly' },
    { url: 'https://www.ipobursa.my/blog-srkk-ai.html', priority: '0.7', changefreq: 'monthly' },
    { url: 'https://www.ipobursa.my/blog-stratus-global.html', priority: '0.7', changefreq: 'monthly' },
    { url: 'https://www.ipobursa.my/blog-sum-tech.html', priority: '0.7', changefreq: 'monthly' },
    { url: 'https://www.ipobursa.my/about.html', priority: '0.5', changefreq: 'yearly' },
    { url: 'https://www.ipobursa.my/contact.html', priority: '0.5', changefreq: 'yearly' },
    { url: 'https://www.ipobursa.my/privacy-policy.html', priority: '0.4', changefreq: 'yearly' },
    { url: 'https://www.ipobursa.my/terms.html', priority: '0.4', changefreq: 'yearly' },
];

let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

staticUrls.forEach(item => {
    xml += `  <url>\n    <loc>${item.url}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${item.changefreq}</changefreq>\n    <priority>${item.priority}</priority>\n  </url>\n`;
});

generatedPages.forEach(item => {
    xml += `  <url>\n    <loc>https://www.ipobursa.my/ipo/${item.slug}.html</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>\n`;
});

xml += `</urlset>\n`;

fs.writeFileSync(sitemapFilePath, xml, 'utf8');
console.log(`Updated sitemap.xml with ${staticUrls.length + generatedPages.length} total URLs.`);
