$json = Get-Content -Path "data.json" -Raw
$js = "const IPO_DATA = " + $json + ";"
[System.IO.File]::WriteAllText("data.js", $js, [System.Text.Encoding]::UTF8)
Write-Host "Synced data.js successfully."
