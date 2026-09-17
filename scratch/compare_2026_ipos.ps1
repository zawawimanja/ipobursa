$ipos = Get-Content 'data.json' -Raw | ConvertFrom-Json
$listed = $ipos | Where-Object { $_.year -eq 2026 -and ($_.stage -eq 5 -or $_.status -eq 'Listed') }
foreach ($ipo in $listed) {
    [PSCustomObject]@{
        Symbol = $ipo.symbol
        Company = $ipo.companyName
        IPO_Price = $ipo.price
        Open_Price = $ipo.openPrice
        OS_Rate = $ipo.os
        IB = $ipo.ib
        Sector = $ipo.sector
    } | Format-Table -AutoSize
}
