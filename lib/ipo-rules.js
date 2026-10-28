/* Shared IPO lifecycle, Malaysia deadlines and grading for Node and the browser. */
(function (root, factory) {
    const rules = factory();
    if (typeof module === 'object' && module.exports) module.exports = rules;
    else root.IpoRules = rules;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';

    const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const MYT_OFFSET = 8 * 60 * 60 * 1000;

    function dateParts(value, now = Date.now()) {
        if (!value) return null;
        if (value instanceof Date) {
            if (isNaN(value.getTime())) return null;
            const shifted = new Date(value.getTime() + MYT_OFFSET);
            return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth(), day: shifted.getUTCDate() };
        }
        const text = String(value).trim();
        let match = text.match(/^(\d{4})-(\d{2})-(\d{2})(?:$|T|\s)/);
        let year, month, day;
        if (match) {
            year = +match[1]; month = +match[2] - 1; day = +match[3];
        } else {
            match = text.match(/^(\d{1,2})[-\s]+([A-Za-z]{3})[A-Za-z]*[-\s,]+(\d{4})$/);
            if (match) {
                year = +match[3]; month = MONTHS.indexOf(match[2].toLowerCase()); day = +match[1];
            } else {
                match = text.match(/^(\d{1,2})\s+([A-Za-z]{3})[A-Za-z]*$/);
                if (!match) return null;
                year = new Date(Number(now) + MYT_OFFSET).getUTCFullYear();
                month = MONTHS.indexOf(match[2].toLowerCase()); day = +match[1];
            }
        }
        const check = new Date(Date.UTC(year, month, day));
        if (month < 0 || month > 11 || check.getUTCFullYear() !== year || check.getUTCMonth() !== month || check.getUTCDate() !== day) return null;
        return { year, month, day };
    }

    function parseClock(raw) {
        const text = String(raw || '').trim().toLowerCase().replace(/\s+/g, ' ');
        let match = text.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
        if (match) {
            const h = +match[1], m = +match[2], s = +(match[3] || 0);
            if (h > 23 || m > 59 || s > 59) return null;
            return { h, m, s };
        }
        // 12-hour formats: "5:00 p.m.", "9:30 AM", "12 noon" style meridiem suffixes
        match = text.match(/^(\d{1,2})(?::(\d{2}))?(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)$/);
        if (match) {
            let h = +match[1];
            const m = +(match[2] || 0), s = +(match[3] || 0);
            const pm = match[4].startsWith('p');
            if (h < 1 || h > 12 || m > 59 || s > 59) return null;
            if (h === 12) h = 0;
            if (pm) h += 12;
            return { h, m, s };
        }
        return null;
    }

    function atMyt(value, clock = '00:00', now = Date.now()) {
        const parts = dateParts(value, now);
        const time = parseClock(clock);
        if (!parts || !time) return null;
        return new Date(Date.UTC(parts.year, parts.month, parts.day, time.h, time.m, time.s) - MYT_OFFSET);
    }

    function getDeadline(ipo, kind = 'public', now = Date.now()) {
        const miti = kind === 'miti';
        return atMyt(miti ? (ipo.mitiCloseDate || ipo.closingDate) : ipo.closingDate,
            miti ? (ipo.mitiCloseTime || '12:00') : (ipo.closingTime || '17:00'), now);
    }

    function getOpening(ipo, kind = 'public', now = Date.now()) {
        const miti = kind === 'miti';
        return atMyt(miti ? (ipo.mitiOpenDate || ipo.openingDate) : ipo.openingDate,
            miti ? (ipo.mitiOpenTime || '00:00') : (ipo.openingTime || '00:00'), now);
    }

    function isApplicationOpen(ipo, kind = 'public', now = Date.now()) {
        if (ipo.mitiWithdrawn || ipo.stage === 0 || ipo.stage === 5) return false;
        const deadline = getDeadline(ipo, kind, now);
        const opening = getOpening(ipo, kind, now);
        if (opening && Number(now) < opening.getTime()) return false;
        if (deadline) return Number(now) < deadline.getTime();
        return kind === 'miti' ? ipo.stage === 2 && ipo.status === 'MITI Allocation Phase'
            : ipo.stage === 3 && ipo.status === 'Application Open';
    }

    function resolveLifecycle(ipo, now = Date.now()) {
        let stage = ipo.stage;
        let status = ipo.status;
        if (stage === 5 || stage === 0 || ipo.mitiWithdrawn) return { stage, status };
        const time = Number(now);
        const listing = atMyt(ipo.listingDate, '00:00', now);
        if (listing && time >= listing.getTime()) return { stage: 5, status: 'Listed' };

        const mitiClose = getDeadline(ipo, 'miti', now);
        if (stage === 2) {
            if (!mitiClose || time < mitiClose.getTime()) return { stage, status };
            stage = 6; status = 'Awaiting MITI Decision';
        }
        const opening = getOpening(ipo, 'public', now);
        const closing = getDeadline(ipo, 'public', now);
        if (opening && time < opening.getTime()) {
            return { stage: stage === 6 ? 6 : stage, status: 'Public Opening Soon' };
        }
        if (closing && time >= closing.getTime()) return { stage: 4, status: 'Pre-Listing' };
        if (closing || (opening && time >= opening.getTime())) return { stage: 3, status: 'Application Open' };
        return { stage, status };
    }

    function floatEquals(a, b, tolerance = 0.005) {
        return Math.abs(a - b) < tolerance;
    }

    function getIpoGrade(ipo) {
        if (!ipo.market || ipo.market === 'Unknown') return { grade: 'Unrated', reason: 'Market classification unknown.' };
        
        // If it's listed (Stage 5) but does not have an open price yet (still listing morning / data pending),
        // treat its stage as Stage 4 (subscription results in, waiting for debut).
        // Stage 6 (menunggu keputusan MITI) belum buka subscription awam — gred sebagai pre-OS (Stage 3).
        const effectiveStage = (ipo.stage === 5 && !ipo.openPrice) ? 4 : (ipo.stage === 6 ? 3 : ipo.stage);
        
        const os = ipo.os || 0;
        const hasOsData = ipo.os !== undefined && ipo.os !== null && ipo.os > 0; 
        
        // PRIORITY 1: Respect manual Predicted Grade from data.js if it exists (only pre-listing before subscription results)
        if (ipo.predictedGrade && effectiveStage < 4) {
            return { 
                grade: ipo.predictedGrade, 
                reason: ipo.analystInsight || 'Manual rating applied.' 
            };
        }
    
        const perf = ipo.performance || '';
        const ib = (ipo.ib || '').toLowerCase();
        const pe = ipo.pe || 0;
        const sector = (ipo.sector || '').toLowerCase();
        const fundUse = (ipo.fundUse || '').toLowerCase();
    
        const superHeroIBs = ["maybank"];
        const heroIBs = ["public", "kaf", "alliance"];
        const topTierIBs = ["rhb", "aminvestment", "alliance", "affin hwang", "kaf", "public"];
        const momentumIBs = ["m&a", "malacca", "ta securities", "kenanga", "apex", "sj securities"];
        const flatSkews = ["uob", "cimb", "mercury"];
        
        const trendingSectors = ["data centre", "solar", "ai", "technology", "renewable energy", "ev", "semiconductor", "digital", "cybersecurity"];
        const expansionKeywords = ["expansion", "ekspansi", "r&d", "growth", "facility", "kilang", "storage", "working capital", "modal kerja"];
    
        const isSuperHero = superHeroIBs.some(tier => ib.includes(tier));
        const isHero = heroIBs.some(tier => ib.includes(tier)) || isSuperHero;
        const isTopTier = topTierIBs.some(tier => ib.includes(tier)) || isSuperHero;
        const isMomentum = momentumIBs.some(tier => ib.includes(tier));
        const isFlatSkew = flatSkews.some(tier => ib.includes(tier));
        const isTrendingSector = trendingSectors.some(s => sector.includes(s));
        const isExpansionFund = expansionKeywords.some(k => fundUse.includes(k));
        
        const isPositiveOpen = ipo.openPrice && ipo.price && ipo.openPrice > ipo.price;
        const openPremium = (ipo.openPrice && ipo.price) ? ((ipo.openPrice - ipo.price) / ipo.price) * 100 : 0;
        const isStrongGreen = openPremium >= 5.0;
        const isFlat = ipo.openPrice && ipo.price && floatEquals(ipo.openPrice, ipo.price);
        const isHighPE = pe > 18.0;
        const isAttractivePE = pe > 0 && pe < 12.0;
        const isRed = (ipo.openPrice && ipo.price) ? (ipo.openPrice < ipo.price) : false;
    
        const isMainMarket = ipo.market && ipo.market.toLowerCase().includes('main');
        const isAceMarket = !isMainMarket;
    
        if (effectiveStage < 5 && os === 0) {
            // Calculate Pre-OS Grade
            let score = 0;
            if (isSuperHero) score += 50;
            else if (isHero) score += 40;
            else if (isTopTier) score += 30;
            else if (isMomentum) score += 20;
            
            if (isFlatSkew) score -= 15;
            
            if (isTrendingSector) score += 30;
            if (isExpansionFund) score += 20;
            
            if (isMainMarket) score += 10;
            else if (isAceMarket) score += 5;
    
            // Price sweet spot scoring
            if (ipo.price >= 0.30 && ipo.price <= 0.50) {
                score += 15; // Retail sweet spot
            } else if (ipo.price >= 0.75 && ipo.price <= 1.00) {
                score += 15; // Growth sweet spot
            } else if (ipo.price > 0 && ipo.price < 0.20) {
                score -= 15; // Penny stock penalty
            } else if (ipo.price > 1.00) {
                score -= 15; // High-ticket stock penalty
            }
    
            // Geography premium scoring
            const geo = (ipo.geography || '').toLowerCase();
            if (geo === 'penang' && isTrendingSector) {
                score += 20; // Penang Silicon Valley Premium for Tech/Semicon
            } else if (geo === 'johor' || geo === 'melaka') {
                score -= 5; // Dorman geography penalty
            }
    
            // OFS and PE Valuation Adjustments
            if (ipo.ofs === true) {
                score -= 15; // OFS risk penalty
            }
            if (pe > 0 && pe < 13.0) {
                score += 15; // Cheap/Attractive valuation bonus
            } else if (pe > 0 && pe < 18.0) {
                score += 5;  // Reasonable valuation bonus
            } else if (pe > 22.0) {
                score -= 10; // Expensive valuation penalty
            }
    
            let predGrade = 'C';
            if (score >= 70) predGrade = 'A';
            else if (score >= 40) predGrade = 'B';
    
            // Special case for Automation
            if (sector.includes('automation') && predGrade === 'B') {
                return { 
                    grade: `Pred: B`, 
                    reason: `<b>Pre-OS Grade B</b> (Score: ${score})<br>💡 Note: If classified as Tech/Semi, jumps to Grade A.<br>⏳ Waiting for OS data.` 
                };
            }
    
            return { 
                grade: `Pred: ${predGrade}`, 
                reason: `<b>Pre-OS Grade ${predGrade}</b> (Score: ${score}/100)<br>⏳ Waiting for OS data.` 
            };
        }
        
        // Stage 3 & 4 - Subscription Results In
        if ((effectiveStage === 3 || effectiveStage === 4) && os > 0) {
            if (isMainMarket) {
                const isTopIB = isHero;
                if (os >= 20 && isTopIB) return { grade: 'A', reason: '<b>Grade A (The Giants):</b><br>🚀 Institutional interest (OS > 20x)<br>🏛️ Top-tier IB backing' };
                if (os >= 20) return { grade: 'B', reason: '<b>Strong Demand:</b><br>✅ Institutional interest (OS > 20x)' };
                if (os >= 5) return { grade: 'B', reason: '<b>Moderate Interest:</b><br>✅ Main Market stability' };
                return { grade: 'C', reason: '<b>Low Momentum:</b><br>⚠️ Low subscription interest' };
            }
    
            if (isAceMarket) {
                const reasonParts = [];
                if (os >= 50) reasonParts.push(`🚀 Exceptional Demand (${os}x)`);
                else if (os >= 20) reasonParts.push(`✅ High Demand (${os}x)`);
                else reasonParts.push(`⚠️ Low Demand (${os}x)`);
    
                if (isMomentum || isTopTier || isHero) reasonParts.push(`⚡ ${ipo.ib} (Momentum IB)`);
                if (isTrendingSector) reasonParts.push(`🔥 Trending Sector (${ipo.sector})`);
                if (isAttractivePE) reasonParts.push(`💎 Attractive P/E (${pe}x)`);
                if (isExpansionFund) reasonParts.push(`📈 Expansion Fund Use`);
    
                if (os >= 50) return { grade: 'A', reason: reasonParts.join('<br>') };
                if (os >= 20) return { grade: 'B', reason: reasonParts.join('<br>') };
                return { grade: 'C', reason: '<b>Low Momentum:</b><br>⚠️ Low oversubscription (< 20x)' };
            }
        }
    
        if (isMainMarket) {
            if (isHero && (isStrongGreen || isFlat)) return { grade: 'A', reason: '<b>Elite Setup:</b><br>🏛️ Hero IB Support<br>✅ Positive Day 1 Debut' };
            
            if (effectiveStage === 5 && !hasOsData && isStrongGreen) {
                if ((isTopTier || isMomentum) && !isHighPE) return { grade: 'A', reason: '<b>Momentum Setup:</b><br>✅ Strong Open<br>📊 Healthy Valuation' };
                if (pe > 0 && pe < 15 && isStrongGreen) return { grade: 'A', reason: `<b>Value Pick:</b><br>💎 Low PE (${pe}x)<br>🚀 Strong Momentum` };
            }
            
            if (isHighPE && isRed) return { grade: 'C', reason: '<b>High Risk:</b><br>❌ Expensive Valuation<br>📉 Negative Performance' };
            if (isFlat && !isHero) return { grade: 'C', reason: '<b>Lack of Support:</b><br>⚠️ Flat debut without Hero IB' };
            
            if (isStrongGreen && pe > 0 && pe < 15 && (isTopTier || isMomentum)) return { grade: 'A', reason: '<b>Solid Performance:</b><br>🚀 Strong Debut<br>💎 Attractive PE' };
            
            if (isPositiveOpen && pe > 0 && pe < 15 && (isTopTier || isMomentum || isHero)) return { grade: 'B', reason: '<b>Safe Entry:</b><br>📊 Good Valuation<br>🏛️ Reputable IB' };
            
            if (hasOsData && os < 10 && !isHero && !isStrongGreen) return { grade: 'C', reason: '<b>Weak Setup:</b><br>⚠️ Low Demand<br>❌ Poor Opening' };
            if (isHighPE) return { grade: 'C', reason: '<b>Premium Risk:</b><br>⚠️ PE > 18x' };
            if (isRed) return { grade: 'C', reason: '<b>Sentiment Risk:</b><br>📉 Negative Market Reaction' };
            
            if (os >= 20 && (isTopTier || isHero) && isStrongGreen) return { grade: 'A', reason: '<b>High Demand:</b><br>🚀 OS > 20x<br>🏛️ Strong Support' };
            if (isStrongGreen && !isHighPE) return { grade: 'A', reason: '<b>Positive Debut:</b><br>✅ Healthy setup' };
            return { grade: 'C', reason: '<b>Caution:</b><br>⚠️ Moderate demand/valuation' };
        }
    
        if (isAceMarket) {
    
            const reasonParts = [];
            if (os >= 50) reasonParts.push(`🚀 Exceptional Demand (${os}x)`);
            else if (os >= 20) reasonParts.push(`✅ High Demand (${os}x)`);
            
            if (isMomentum || isTopTier || isHero) reasonParts.push(`⚡ ${ipo.ib} Backing`);
            if (isTrendingSector) reasonParts.push(`🔥 Trending Sector`);
            if (isAttractivePE) reasonParts.push(`💎 Attractive P/E (${pe}x)`);
            if (isExpansionFund) reasonParts.push(`📈 Expansion Fund Use`);
            if (isStrongGreen) reasonParts.push(`🚀 Strong Opening`);
    
            if (os >= 50 && isStrongGreen) return { grade: 'A', reason: '<b>Grade A (Exceptional Demand):</b><br>' + reasonParts.join('<br>') };
            if (isHero && isStrongGreen && os >= 3) return { grade: 'B', reason: reasonParts.join('<br>') };
            
            if (effectiveStage === 5 && !hasOsData && isStrongGreen) {
                if ((isMomentum || isTopTier || isHero) && !isHighPE) return { grade: 'B', reason: reasonParts.join('<br>') };
            }
            
            if (isHighPE) {
                if (os >= 50 && (isMomentum || isTopTier || isHero)) return { grade: 'B', reason: '<b>Demand Rescue:</b><br>' + reasonParts.join('<br>') };
                if (pe > 28.0) return { grade: 'C', reason: '<b>Extreme Risk:</b><br>❌ PE > 28x' };
                if (os < 20) return { grade: 'C', reason: '<b>Valuation Risk:</b><br>⚠️ High PE + Low Demand' };
            }
            
            if (os >= 20 && (isMomentum || isTopTier || isHero) && (isStrongGreen || isFlat)) return { grade: 'B', reason: reasonParts.join('<br>') };
            if (os >= 20 && isStrongGreen) return { grade: 'B', reason: reasonParts.join('<br>') };
            
            if (isFlat && os < 20) return { grade: 'C', reason: '<b>No Momentum:</b><br>⚠️ Flat open + Low Demand' };
            if (hasOsData && os < 10 && !isHero) return { grade: 'C', reason: '<b>Weak Appetite:</b><br>⚠️ Low OS' };
            if (!hasOsData && !isStrongGreen) return { grade: 'C', reason: '<b>Unknown Setup:</b><br>⚠️ Missing data' };
            
            if (isStrongGreen && !isHighPE) return { grade: 'B', reason: reasonParts.join('<br>') };
            return { grade: 'C', reason: '<b>Avoid:</b><br>❌ Lack of momentum' };
        }
        return { grade: 'Unrated', reason: 'Insufficient data for grading.' };
    }

    function recalcOsGrade(ipo) {
        if (![4, 5].includes(ipo.stage) || !(ipo.os > 0)) return null;
        const grade = getIpoGrade(ipo).grade;
        return ['A', 'B', 'C'].includes(grade) ? grade : null;
    }

    return { dateParts, atMyt, getDeadline, getOpening, isApplicationOpen, resolveLifecycle, getIpoGrade, recalcOsGrade };
});
