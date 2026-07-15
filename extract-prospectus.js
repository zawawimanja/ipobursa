const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Load .env manually if exists to protect credentials
const envPath = path.join(__dirname, '.env');
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
    console.error('Error: Sila tetapkan GROQ_API_KEY di dalam environment variable OS, atau cipta fail .env dengan isi: GROQ_API_KEY=gsk_xxx');
    process.exit(1);
}

const inputPath = path.join(__dirname, 'scratch', 'prospectus.txt');
if (!fs.existsSync(inputPath)) {
    // Create an empty input file for the user if it doesn't exist
    fs.mkdirSync(path.dirname(inputPath), { recursive: true });
    fs.writeFileSync(inputPath, 'Tampal teks kasar draf prospektus di sini...', 'utf8');
    console.log(`\n📄 Sila tampal teks prospektus kasar ke dalam fail: ${inputPath}`);
    console.log(`Seterusnya jalankan skrip ini semula: node extract-prospectus.js\n`);
    process.exit(0);
}

const prospectusText = fs.readFileSync(inputPath, 'utf8').trim();
if (prospectusText.startsWith('Tampal teks kasar draf prospektus di sini...') || prospectusText.length < 50) {
    console.warn('⚠️ Fail scratch/prospectus.txt kosong atau belum ditampal dengan teks prospektus sebenar.');
    process.exit(1);
}

console.log('Sending raw prospectus text to Groq for structured information extraction...');

// Instruct Groq Llama model to extract the info and return JSON
const systemPrompt = `You are "Prospectus Extractor AI", a professional Malaysian stock analyst.
Your task is to analyze the provided raw prospectus draft text and extract structured information to produce a JSON object conforming exactly to the following schema.

Requirements:
1. Sektor: Classify into modern themes (e.g. "Data Centre", "EV", "Renewable Energy", "Technology (Semiconductor)", "Consumer Products") if the prospectus indicates the company operates in these spaces.
2. Kegunaan Dana (fundUse): Calculate actual percentages for expansion/R&D vs debt payment or working capital, and summarize clearly.
3. OFS (Offer for Sale): Check if there is an existing shareholder selling shares (ofs = true/false).
4. Analyst Insight (analystInsight): Write a 3-4 sentence professional summary in Malay/English mix (Manglish) formatted with HTML tags (<b>, <br>, •) including a recommendation verdict based on valuation and IB sponsor quality.

Return ONLY a valid JSON object matching this structure:
{
  "id": "slugified-company-name-in-lowercase",
  "companyName": "Official Company Name Berhad",
  "symbol": "TBA",
  "market": "ACE Market" or "Main Market",
  "price": 0.35,
  "closingDate": "TBA",
  "listingDate": "",
  "shariah": true,
  "stage": 2,
  "status": "Prospectus Exposure",
  "year": 2026,
  "sifuTargetPrice": 0.0,
  "sector": "Sector Name",
  "os": 0,
  "ib": "Sponsor / Adviser Name",
  "fundUse": "Summary with percentage allocations (e.g., 60% expansion, 20% R&D, 20% repayment)",
  "ofs": true or false,
  "analystInsight": "✅ <b>VERDICT</b><br>Summary of sector growth.<br>• <b>Valuation:</b> Detail PE ratio if available.<br>• <b>Sponsor:</b> Sponsor quality.",
  "prospectusUrl": "https://www.bursamalaysia.com/"
}`;

async function main() {
    try {
        const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
            model: 'llama-3.3-70b-versatile',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: `Extract data from this prospectus text:\n\n${prospectusText}` }
            ],
            max_tokens: 1500,
            temperature: 0.2,
            response_format: { type: "json_object" }
        }, {
            headers: {
                'Authorization': `Bearer ${GROQ_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        const extractedText = response.data.choices[0].message.content;
        const newIpo = JSON.parse(extractedText);

        console.log('\n✅ Successfully extracted structured IPO data from Groq!');
        console.log(JSON.stringify(newIpo, null, 2));

        // Read and append to data.json
        const dataPath = path.join(__dirname, 'data.json');
        let ipoData = [];
        if (fs.existsSync(dataPath)) {
            ipoData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
        }

        const duplicateIndex = ipoData.findIndex(ipo => ipo.id === newIpo.id || ipo.companyName.toLowerCase() === newIpo.companyName.toLowerCase());
        if (duplicateIndex !== -1) {
            console.log(`⚠️ IPO "${newIpo.companyName}" already exists. Overwriting existing entry...`);
            ipoData[duplicateIndex] = { ...ipoData[duplicateIndex], ...newIpo };
        } else {
            console.log(`➕ Appending new IPO "${newIpo.companyName}" to data.json...`);
            ipoData.push(newIpo);
        }

        fs.writeFileSync(dataPath, JSON.stringify(ipoData, null, 4), 'utf8');
        console.log('💾 Successfully saved to data.json!');

        // Run grade prediction
        console.log('\n=== PREDICTING GRADE FOR NEW IPO ===');
        const { score, grade, reasons } = calculatePredictedGrade(newIpo);
        console.log(`Score: ${score}/100`);
        console.log(`Predicted Grade: [${grade}]`);
        console.log(`Reasons: ${reasons.join(', ')}`);

    } catch (error) {
        console.error('Error during extraction:', error.response ? error.response.data : error.message);
    }
}

// Logic copied from predict_grades.js for immediate grading feedback
function calculatePredictedGrade(ipo) {
    const heroIBs = ["maybank", "public", "kaf", "alliance", "cimb"];
    const topTierIBs = ["maybank", "cimb", "rhb", "public", "aminvestment", "alliance", "affin hwang", "kaf"];
    const momentumIBs = ["m&a", "malacca", "kenanga", "ta securities", "uob kay hian", "mercury", "apex", "sj securities"];
    
    const highMomentumSectors = ["data centre", "solar", "ai", "semiconductor", "cleanroom", "hardware", "renewable energy", "ev", "cybersecurity"];
    const lowMomentumSectors = ["it services", "software", "infrastructure", "services", "digital"];
    const expansionKeywords = ["expansion", "ekspansi", "r&d", "growth", "facility", "kilang", "storage", "working capital", "modal kerja"];

    const ib = (ipo.ib || '').toLowerCase();
    const sector = (ipo.sector || '').toLowerCase();
    const fundUse = (ipo.fundUse || '').toLowerCase();
    const market = ipo.market;
    const hasOFS = ipo.ofs === true;

    const isHero = heroIBs.some(tier => ib.includes(tier));
    const isTopTier = topTierIBs.some(tier => ib.includes(tier));
    const isMomentum = momentumIBs.some(tier => ib.includes(tier));
    
    const isHighMomentum = highMomentumSectors.some(s => sector.includes(s));
    const isLowMomentum = lowMomentumSectors.some(s => sector.includes(s));
    const isGeneralTech = sector.includes("technology") || sector.includes("tech");
    
    const isExpansionFund = expansionKeywords.some(k => fundUse.includes(k));

    let score = 0;
    let reasons = [];
    
    if (isHero) { score += 40; reasons.push("Hero IB (+40)"); }
    else if (isTopTier) { score += 30; reasons.push("Top Tier IB (+30)"); }
    else if (isMomentum) { score += 20; reasons.push("Momentum IB (+20)"); }
    
    if (isHighMomentum) { score += 30; reasons.push("High Momentum Tech Sector (+30)"); }
    else if (isLowMomentum) { score += 10; reasons.push("Low Momentum IT/Tech Services Sector (+10)"); }
    else if (isGeneralTech) { score += 15; reasons.push("General Technology Sector (+15)"); }
    
    if (isExpansionFund) { score += 20; reasons.push("Expansion/R&D Fund Use (+20)"); }
    
    if (market === 'Main Market') { score += 10; reasons.push("Main Market (+10)"); }
    else if (market === 'ACE Market') { score += 5; reasons.push("ACE Market (+5)"); }

    if (hasOFS) { score -= 15; reasons.push("Offer for Sale (OFS) component (-15)"); }

    const pe = ipo.pe || 0;
    if (pe > 0 && pe < 13.0) { score += 15; reasons.push("Cheap/Attractive Valuation PE < 13x (+15)"); }
    else if (pe > 0 && pe < 18.0) { score += 5; reasons.push("Reasonable Valuation PE < 18x (+5)"); }
    else if (pe > 22.0) { score -= 10; reasons.push("Expensive Valuation PE > 22x (-10)"); }

    let grade = 'C';
    if (score >= 70) grade = 'A';
    else if (score >= 40) grade = 'B';
    
    return { grade, score, reasons };
}

main();
