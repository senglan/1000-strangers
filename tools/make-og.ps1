# Regenerates og.png (1200x630 social share card) using System.Drawing.
# Run from the repo root:  powershell -ExecutionPolicy Bypass -File tools\make-og.ps1
Add-Type -AssemblyName System.Drawing

$w = 1200; $h = 630
$bmp = New-Object System.Drawing.Bitmap($w, $h)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAlias

$bg    = [System.Drawing.Color]::FromArgb(11, 12, 16)
$amber = [System.Drawing.Color]::FromArgb(255, 178, 36)
$rose  = [System.Drawing.Color]::FromArgb(255, 77, 109)
$ink   = [System.Drawing.Color]::FromArgb(244, 245, 247)
$ink2  = [System.Drawing.Color]::FromArgb(169, 174, 188)
$track = [System.Drawing.Color]::FromArgb(38, 42, 54)

$g.Clear($bg)

function New-RoundedPath([float]$x, [float]$y, [float]$rw, [float]$rh, [float]$r) {
    $p = New-Object System.Drawing.Drawing2D.GraphicsPath
    $d = $r * 2
    $p.AddArc($x, $y, $d, $d, 180, 90)
    $p.AddArc($x + $rw - $d, $y, $d, $d, 270, 90)
    $p.AddArc($x + $rw - $d, $y + $rh - $d, $d, $d, 0, 90)
    $p.AddArc($x, $y + $rh - $d, $d, $d, 90, 90)
    $p.CloseFigure()
    return $p
}

# kicker
$fontK = New-Object System.Drawing.Font("Segoe UI", 24, [System.Drawing.FontStyle]::Bold)
$g.DrawString("A  2 4 - H O U R   E X P E R I M E N T", $fontK, (New-Object System.Drawing.SolidBrush($amber)), 80, 84)

# headline
$fontH = New-Object System.Drawing.Font("Segoe UI", 62, [System.Drawing.FontStyle]::Bold)
$brushInk = New-Object System.Drawing.SolidBrush($ink)
$g.DrawString("Can 1,000 strangers visit", $fontH, $brushInk, 72, 142)
$g.DrawString("this page in one day?", $fontH, $brushInk, 72, 240)

# subline
$fontS = New-Object System.Drawing.Font("Segoe UI", 27)
$g.DrawString("No ads. Nothing for sale. It only moves if someone sends it.", $fontS, (New-Object System.Drawing.SolidBrush($ink2)), 78, 372)

# progress meter (teaser fill)
$mx = 80; $my = 486; $mw = 780; $mh = 22
$g.FillPath((New-Object System.Drawing.SolidBrush($track)), (New-RoundedPath $mx $my $mw $mh 11))
$g.FillPath((New-Object System.Drawing.SolidBrush($amber)), (New-RoundedPath $mx $my ($mw * 0.31) $mh 11))
$fontM = New-Object System.Drawing.Font("Segoe UI", 21)
$g.DrawString("one pixel per visitor - the picture completes at 1,000", $fontM, (New-Object System.Drawing.SolidBrush($ink2)), 78, 528)

# pixel heart, bottom right
$heartRows = @(
    ".XX...XX.",
    "XXXX.XXXX",
    "XXXXXXXXX",
    "XXXXXXXXX",
    ".XXXXXXX.",
    "..XXXXX..",
    "...XXX...",
    "....X...."
)
$cell = 19; $gap = 3
$hx = 950; $hy = 412
$bRose  = New-Object System.Drawing.SolidBrush($rose)
$bAmber = New-Object System.Drawing.SolidBrush($amber)
for ($r = 0; $r -lt $heartRows.Count; $r++) {
    for ($c = 0; $c -lt $heartRows[$r].Length; $c++) {
        if ($heartRows[$r][$c] -eq "X") {
            $brush = if ((($r * 9 + $c) % 5) -eq 0) { $bAmber } else { $bRose }
            $g.FillRectangle($brush, $hx + $c * ($cell + $gap), $hy + $r * ($cell + $gap), $cell, $cell)
        }
    }
}

$out = Join-Path (Split-Path $PSScriptRoot -Parent) "og.png"
$bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $bmp.Dispose()
Write-Output "wrote $out"
