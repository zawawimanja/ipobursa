$ipos = Get-Content 'data.json' -Raw | ConvertFrom-Json
$ushape = @()
foreach ($ipo in $ipos) {
    if ($ipo.openPrice -and $ipo.price -and ($ipo.openPrice -lt $ipo.price)) {
        if (($ipo.highPrice -and $ipo.highPrice -gt $ipo.price) -or ($ipo.currentPrice -and $ipo.currentPrice -gt $ipo.price)) {
            $ushape += [PSCustomObject]@{
                Year = $ipo.year
                Symbol = $ipo.symbol
                Company = $ipo.companyName
                IPO_Price = $ipo.price
                Open_Price = $ipo.openPrice
                High_Price = $ipo.highPrice
                Current_Price = $ipo.currentPrice
                Sector = $ipo.sector
            }
        }
    }
}
$ushape | Format-Table -AutoSize
