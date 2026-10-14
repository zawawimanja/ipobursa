const { execFileSync } = require('node:child_process');
const path = require('node:path');

function runWorkflow(args = process.argv.slice(2), options = {}) {
    const root = options.root || __dirname;
    const run = options.execFileSync || execFileSync;
    const logger = options.logger || console;
    const quickMode = args.some(arg => ['--quick', '-q', 'quick'].includes(arg));
    let failed = false;

    function step(label, script, scriptArgs = []) {
        logger.log(`\n${label}`);
        try {
            run(process.execPath, [path.join(root, script), ...scriptArgs], {
                stdio: 'inherit', cwd: root, shell: false
            });
        } catch (error) {
            failed = true;
            logger.error(`❌ ${label}: ${error.message}`);
        }
    }

    function sync(label, source, script, managed = false) {
        step(label, 'scripts/run-sync-step.js', [source, ...(managed ? ['--managed-status'] : []), script]);
    }

    logger.log('💼 SYSTEM UTAMA — BURSA IPO TRACKER (AUTOMATIC WORKFLOW)');

    if (!quickMode) {
        // Sumber awam dipilih pengguna; iSaham kekal utiliti manual sahaja.
        step('Sumber iSaham tidak digunakan.', 'scripts/run-sync-step.js', [
            'isaham-api', '--skip',
            'Not used by choice; IPO data comes from KLSE Screener, i3investor and MITI.'
        ]);
        sync('🔄 Menyelaraskan prospektus dan tarikh IPO...', 'klse', 'sync-public-ipos.js');
        sync('🔄 Menyelaraskan harga semasa...', 'i3investor', 'scrape-i3.js', true);
        sync('🔄 Menyelaraskan keputusan balloting...', 'balloting', 'sync-balloting.js', true);
        sync('🔄 Menyelaraskan tawaran awam MITI...', 'miti-portal', 'scratch/sync-miti-portal-dates.js', true);
        step('⚡ Mengemas kini puncak tertinggi sejarah (ATH)...', 'scratch/fix-high-anomalies.js');
        sync('📊 Mengira target daripada data terkini...', 'target-calculation', 'scratch/calc_sifu_targets.js');
        sync('📄 Menjana profil IPO daripada data terkini...', 'ipo-pages', 'generate-ipo-pages.js');
    } else {
        logger.log('\n⚡ Mod Pantas (Quick Mode): Membaca database sedia ada sahaja...');
    }

    // Sumber yang gagal tidak menghalang laporan daripada data terakhir yang ada.
    step('📈 Menjana Laporan Harian (Morning Brief & Watchlist)...', 'morning-brief.js');
    return failed ? 1 : 0;
}

module.exports = { runWorkflow };
if (require.main === module) process.exitCode = runWorkflow();
