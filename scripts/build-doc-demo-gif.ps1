param(
  [string]$OutputPath = "docs/assets/platform-demo.gif"
)

$ErrorActionPreference = "Stop"

Add-Type -AssemblyName PresentationCore

$root = Split-Path -Parent $PSScriptRoot
$outputTarget = if ([System.IO.Path]::IsPathRooted($OutputPath)) {
  $OutputPath
} else {
  Join-Path $root $OutputPath
}
$resolvedOutput = [System.IO.Path]::GetFullPath($outputTarget)
$assetDir = Split-Path -Parent $resolvedOutput

[System.IO.Directory]::CreateDirectory($assetDir) | Out-Null

$inputPaths = @(
  (Join-Path $root "docs/assets/admin-login.png"),
  (Join-Path $root "docs/assets/admin-dashboard.png"),
  (Join-Path $root "docs/assets/player-landing.png"),
  (Join-Path $root "docs/assets/player-showcase.png")
)

$encoder = New-Object System.Windows.Media.Imaging.GifBitmapEncoder

foreach ($inputPath in $inputPaths) {
  if (-not (Test-Path $inputPath)) {
    throw "Missing evidence frame: $inputPath"
  }
  $stream = [System.IO.File]::OpenRead($inputPath)
  try {
    $decoder = New-Object System.Windows.Media.Imaging.PngBitmapDecoder(
      $stream,
      [System.Windows.Media.Imaging.BitmapCreateOptions]::PreservePixelFormat,
      [System.Windows.Media.Imaging.BitmapCacheOption]::OnLoad
    )
    $frame = $decoder.Frames[0]
    $encoder.Frames.Add($frame)
  } finally {
    $stream.Dispose()
  }
}

$outStream = [System.IO.File]::Open($resolvedOutput, [System.IO.FileMode]::Create)
try {
  $encoder.Save($outStream)
} finally {
  $outStream.Dispose()
}

Write-Output $resolvedOutput
