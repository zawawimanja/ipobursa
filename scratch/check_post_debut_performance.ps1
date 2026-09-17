$ipos = Get-Content 'data.json' -Raw | ConvertFrom-Json
$targets = @('hss-holdings-berhad', 'hocksoon', 'liftech-group-berhad', 'ogx', 'gold-li-holdings-berhad', 'butterfield-fb-berhad')
foreach ($id in $targets) {
    $item = $ipos | Where-Object { $_.id -eq $id }
    if ($item) {
        [PSCustomObject]@{
            ID = $item.id
            Symbol = $item.symbol
            IPO = $item.price
            Open = $item.openPrice
            High = $item.highPrice
            Close = $item.closePrice
            Current = $item.currentPrice
            TP_Sifu = $item.sifuTargetPrice
            Stage = $item.stage
        } | Format-Table -AutoSize
    }
}
