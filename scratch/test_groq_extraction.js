const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { PDFParse } = require('pdf-parse');

const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
    const envLines = fs.readFileSync(envPath, 'utf8').split('\n');
    envLines.forEach(line => {
        const parts = line.split('=');
        if (parts.length >= 2) {
            const key = parts[0].trim();
            const val = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
            process.env[key] = val;
        }
    });
}

const GROQ_KEY = process.env.GROQ_API_KEY;
if (!GROQ_KEY) {
    console.error('Error: GROQ_API_KEY not found in .env');
    process.exit(1);
}

const PDF_URL = 'https://anns.sgp1.digitaloceanspaces.com/3682068.pdf'; // Stratus prospectus

async function run() {
    console.log('Downloading PDF...');
    const response = await axios.get(PDF_URL, { responseType: 'arraybuffer' });
    const buffer = new Uint8Array(response.data);
    
    console.log('Loading parser...');
    const parser = new PDFParse(buffer);
    
    console.log('Getting text...');
    const result = await parser.getText();
    
    const incomeMatches = [];
    const balanceMatches = [];
    
    result.pages.forEach((p, idx) => {
        const text = p.text || '';
        const pageNum = idx + 1;
        
        const hasRevenue = text.toLowerCase().includes('revenue');
        const hasPAT = text.toLowerCase().includes('profit after tax') || text.toLowerCase().includes('pat');
        const hasAssets = text.toLowerCase().includes('total assets') || text.toLowerCase().includes('liabilities');
        const hasGP = text.toLowerCase().includes('gross profit') || text.toLowerCase().includes('gp');
        
        if (hasRevenue && (hasPAT || hasGP)) {
            incomeMatches.push(pageNum);
        }
        if (hasAssets && text.toLowerCase().includes('equity')) {
            balanceMatches.push(pageNum);
        }
    });

    // Merge pages, keeping unique numbers, sorting
    const selectedPages = Array.from(new Set([...incomeMatches, ...balanceMatches])).sort((a,b)=>a-b);
    
    // Limit to max 25 pages to avoid sending too much text
    const finalPages = selectedPages.slice(0, 25);
    console.log('Selected pages to extract:', finalPages);
    
    const packetText = finalPages.map(pageNum => {
        const p = result.pages[pageNum - 1];
        return `=== Page ${pageNum} ===\n${p.text}`;
    }).join('\n\n');

    console.log(`Sending ${packetText.length} characters of text to Groq...`);

    const systemPrompt = `You are "Prospectus Extractor AI", a professional Malaysian stock analyst.
Your task is to analyze the provided raw prospectus text snippets and extract structured information to produce a JSON object.

Requirements:
1. Identify the 3 most recent historical years plus projections (e.g. FYE 23, FYE 24, FYE 25, Proj FYE F, Proj FYE F+1).
2. Extract or estimate Revenues, Gross Profits (GP), Profit After Tax (PAT), Total Assets, Total Liabilities for all these years.
3. Calculate EPS if total shares outstanding is known.
4. Extract sector details, sponsor/adviser (IB), Offer for Sale (OFS) status, and write a professional 3-4 sentence analystInsight in Malay/English.

Return ONLY a valid JSON object matching this structure:
{
  "totalShares": 571354000,
  "headers": ["FYE 23", "FYE 24", "FYE 25", "Projection (FYE F)", "Projection (FYE F+1)"],
  "rev23": 74000000, "rev24": 89000000, "rev25": 100000000, "revF": 120000000, "revF1": 140000000,
  "gp23": 18000000, "gp24": 21800000, "gp25": 24500000, "gpF": 28800000, "gpF1": 33600000,
  "pat23": 8000000, "pat24": 9256000, "pat25": 13200000, "patF": 11750000, "patF1": 13500000,
  "assets23": 45000000, "assets24": 52000000, "assets25": 65000000, "assetsF": 75000000, "assetsF1": 85000000,
  "liab23": 15000000, "liab24": 18000000, "liab25": 22000000, "liabF": 25000000, "liabF1": 28000000,
  "targetPe": 20,
  "catalysts": [
    "Catalyst 1...",
    "Catalyst 2..."
  ],
  "peers": "Peer comparison details..."
}`;

    const groqResponse = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
        model: 'llama-3.3-70b-versatile',
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: packetText }
        ],
        max_tokens: 1500,
        temperature: 0.1,
        response_format: { type: "json_object" }
    }, {
        headers: {
            'Authorization': `Bearer ${GROQ_KEY}`,
            'Content-Type': 'application/json'
        }
    });

    const parsedJson = JSON.parse(groqResponse.data.choices[0].message.content);
    console.log('\nExtracted JSON:');
    console.log(JSON.stringify(parsedJson, null, 2));
}

run().catch(console.error);
