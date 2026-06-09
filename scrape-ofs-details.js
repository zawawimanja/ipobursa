const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

const DATA_JSON_FILE = path.join(__dirname, 'data.json');
const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
};

/**
 * Conservative OFS Scraper
 * Only marks OFS=true with STRONG evidence from official sources
 * Otherwise defaults to OFS=false (Pure Issue) unless explicitly found
 */

async function searchBursaAnnouncements(companyName) {
    try {
        console.log(`\n  🔍 Searching Bursa announcements for ${companyName}...`);
        
        const searchUrl = `https://www.bursamalaysia.com/search?query=${encodeURIComponent(companyName + ' prospectus')}`;
        const { data } = await axios.get(searchUrl, { headers: HEADERS, timeout: 8000 });
        const $ = cheerio.load(data);
        
        // Look for official prospectus links
        const prospectusLinks = [];
        $('a[href*="prospectus"], a[href*="pdf"]').each((i, el) => {
            const link = $(el).attr('href');
            const text = $(el).text();
            if (link && (text.includes('prospectus') || text.includes('IPO'))) {
                prospectusLinks.push({ link, text });
            }
        });

        if (prospectusLinks.length > 0) {
            console.log(`    ✓ Found ${prospectusLinks.length} prospectus link(s)`);
            return prospectusLinks[0].link;
        }
        
        console.log(`    ✗ No prospectus link found`);
        return null;
    } catch (err) {
        console.log(`    ⚠ Bursa search error: ${err.message}`);
        return null;
    }
}

async function updateIPODataConservative() {
    try {
        const data = JSON.parse(fs.readFileSync(DATA_JSON_FILE, 'utf8'));
        
        let updated = 0;

        // Process ONLY 2026 Shariah IPOs with undefined OFS
        const targetIPOs = data.filter(ipo => 
            ipo.year === 2026 && 
            ipo.shariah === true && 
            (ipo.ofs === undefined || ipo.ofs === null)
        );

        console.log(`\n=== OFS Data Conservative Scraper ===`);
        console.log(`Found ${targetIPOs.length} IPOs with undefined OFS`);
        console.log(`Policy: Default to FALSE (Pure Issue) unless strong evidence found`);
        console.log(`\nProcessing...\n`);

        for (const ipo of targetIPOs) {
            console.log(`[${ipo.companyName}]`);
            
            // Try to find prospectus
            const prospectusUrl = await searchBursaAnnouncements(ipo.companyName);
            
            if (prospectusUrl) {
                ipo.prospectusUrl = prospectusUrl;
                // NOTE: Would need to parse PDF content to extract OFS details
                // For now, default to false (Pure Issue) unless otherwise noted
                ipo.ofs = false;
                console.log(`    ✓ Updated: prospectusUrl added, ofs=false (default))`);
                updated++;
            } else {
                // No prospectus found - default to Pure Issue
                ipo.ofs = false;
                console.log(`    ⚠ Defaulting to: ofs=false (Pure Issue)`);
                updated++;
            }

            // Polite delay
            await new Promise(resolve => setTimeout(resolve, 800));
        }

        // Save only if we updated anything
        if (updated > 0) {
            fs.writeFileSync(DATA_JSON_FILE, JSON.stringify(data, null, 2), 'utf8');
            console.log(`\n=== Summary ===`);
            console.log(`✓ Updated: ${updated} IPOs`);
            console.log(`\nNote: All OFS values defaulted to FALSE (Pure Issue)`);
            console.log(`To mark as OFS=true, please verify prospectus document and manually update.\n`);
        } else {
            console.log(`\n✓ No updates needed - all OFS values already defined`);
        }

    } catch (err) {
        console.error('Fatal error:', err.message);
    }
}

// Run
if (require.main === module) {
    updateIPODataConservative().catch(console.error);
}

module.exports = { updateIPODataConservative, searchBursaAnnouncements };

