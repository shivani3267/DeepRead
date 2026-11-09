param(
    [string]$PdfPath,
    [string]$OutputDir,
    [int]$MaxPages = 0
)

Add-Type -AssemblyName System.Runtime.WindowsRuntime
Add-Type -AssemblyName System.Drawing

[Windows.Storage.StorageFile, Windows.Storage, ContentType = WindowsRuntime] | Out-Null
[Windows.Graphics.Imaging.BitmapDecoder, Windows.Graphics.Imaging, ContentType = WindowsRuntime] | Out-Null
[Windows.Media.Ocr.OcrEngine, Windows.Foundation.UniversalApiContract, ContentType = WindowsRuntime] | Out-Null

$asTask = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { 
    $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' 
})[0]

$engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()
if (-not $engine) {
    Write-Error "No Windows OCR Engine available."
    exit 1
}

$imageFiles = Get-ChildItem -Path $OutputDir -Filter "*.png" | Sort-Object { [int]($_.BaseName -replace '\D','') }

$results = @{}

foreach ($fileItem in $imageFiles) {
    $pageNum = [int]($fileItem.BaseName -replace '\D','')
    $fullPath = $fileItem.FullName

    try {
        $fileOp = [Windows.Storage.StorageFile]::GetFileFromPathAsync($fullPath)
        $fileTask = $asTask.MakeGenericMethod([Windows.Storage.StorageFile]).Invoke($null, @($fileOp))
        $file = $fileTask.GetAwaiter().GetResult()

        $streamOp = $file.OpenAsync([Windows.Storage.FileAccessMode]::Read)
        $streamTask = $asTask.MakeGenericMethod([Windows.Storage.Streams.IRandomAccessStream]).Invoke($null, @($streamOp))
        $stream = $streamTask.GetAwaiter().GetResult()

        $decoderOp = [Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream)
        $decoderTask = $asTask.MakeGenericMethod([Windows.Graphics.Imaging.BitmapDecoder]).Invoke($null, @($decoderOp))
        $decoder = $decoderTask.GetAwaiter().GetResult()

        $bitmapOp = $decoder.GetSoftwareBitmapAsync()
        $bitmapTask = $asTask.MakeGenericMethod([Windows.Graphics.Imaging.SoftwareBitmap]).Invoke($null, @($bitmapOp))
        $bitmap = $bitmapTask.GetAwaiter().GetResult()

        $ocrOp = $engine.RecognizeAsync($bitmap)
        $ocrTask = $asTask.MakeGenericMethod([Windows.Media.Ocr.OcrResult]).Invoke($null, @($ocrOp))
        $res = $ocrTask.GetAwaiter().GetResult()

        $results["$pageNum"] = $res.Text
    } catch {
        $results["$pageNum"] = ""
    }
}

$results | ConvertTo-Json -Depth 2
