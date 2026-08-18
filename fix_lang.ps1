$oldDisclaimer = 'Penafian Kewangan (Financial Disclaimer):</strong> Semua maklumat, analisis, gred, unjuran harga, dan pengiraan kalkulator yang dipaparkan di laman web ini adalah bertujuan untuk rujukan pembelajaran dan pendidikan sahaja. Ia tidak boleh dianggap sebagai nasihat pelaburan, syor membeli atau menjual mana-mana sekuriti. Pelaburan pasaran saham terutamanya langganan IPO membawa risiko kerugian modal yang tinggi. Kami tidak menjamin ketepatan maklumat yang dikumpul. Anda dinasihatkan untuk berunding dengan penasihat kewangan berlesen sebelum membuat sebarang keputusan pelaburan.'

$newDisclaimer = 'Financial Disclaimer:</strong> All information, analyses, grades, price projections, and calculator outputs on this website are for educational and research reference purposes only. They do not constitute investment advice or a recommendation to buy or sell any security. Stock market investments, particularly IPO subscriptions, carry a high risk of capital loss. We do not guarantee the accuracy of the information compiled. You are advised to consult a licensed financial advisor before making any investment decisions.'

$htmlFiles = Get-ChildItem -Path '.' -Filter '*.html'

foreach ($file in $htmlFiles) {
    $content = [System.IO.File]::ReadAllText($file.FullName, [System.Text.Encoding]::UTF8)
    if ($content -match 'Penafian Kewangan') {
        $content = $content.Replace($oldDisclaimer, $newDisclaimer)
        [System.IO.File]::WriteAllText($file.FullName, $content, [System.Text.Encoding]::UTF8)
        Write-Host "Updated footer disclaimer: $($file.Name)"
    }
}

Write-Host "`n=== Footer disclaimer done ==="
