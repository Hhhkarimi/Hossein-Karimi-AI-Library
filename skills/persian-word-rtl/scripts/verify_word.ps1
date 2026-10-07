<#
Verify physical alignment in installed desktop Word using a new hidden COM instance.
Input is opened read-only, never repaired or saved. PDF is a QA intermediate.
Run with a bounded external execution timeout (60 seconds for startup).
Requires an interactive Windows user session with functioning Word COM activation.
#>
param(
    [Parameter(Mandatory=$true)][string]$InputPath,
    [Parameter(Mandatory=$true)][string]$ReportPath,
    [string]$PdfPath,
    [switch]$AllowCenteredOrJustified
)
$ErrorActionPreference = 'Stop'
$nativeInput = (Resolve-Path -LiteralPath $InputPath).Path
$nativeReport = [IO.Path]::GetFullPath($ReportPath)
if ($nativeInput -eq $nativeReport) { throw 'Report must not overwrite input.' }
if ($PdfPath) {
    $nativePdf = [IO.Path]::GetFullPath($PdfPath)
    if ($nativePdf -eq $nativeInput -or $nativePdf -eq $nativeReport) { throw 'PDF, report and input must have separate paths.' }
}
$nativeWord = $null
$nativeDoc = $null
$nativeRows = [Collections.Generic.List[object]]::new()
try {
    $nativeWord = New-Object -ComObject Word.Application
    $nativeWord.Visible = $false
    $nativeWord.DisplayAlerts = 0
    $nativeWord.AutomationSecurity = 3
    $nativeDoc = $nativeWord.Documents.Open($nativeInput, $false, $true, $false)
    foreach ($firstStory in $nativeDoc.StoryRanges) {
        $currentStory = $firstStory
        while ($null -ne $currentStory) {
            $paragraphIndex = 0
            foreach ($nativeParagraph in $currentStory.Paragraphs) {
                $paragraphIndex++
                $paragraphText = [string]$nativeParagraph.Range.Text
                # Strong Arabic-script letters, excluding digits and punctuation.
                $hasPersianLetters = $false
                foreach ($letter in $paragraphText.ToCharArray()) {
                    if ([int]$letter -ge 0x0600 -and [int]$letter -le 0x08ff -and [char]::IsLetter($letter)) {
                        $hasPersianLetters = $true; break
                    }
                }
                if (-not $hasPersianLetters) { continue }
                $actualAlignment = [int]$nativeParagraph.Alignment
                $actualDirection = [int]$nativeParagraph.ReadingOrder
                $explicitException = $AllowCenteredOrJustified -and $actualAlignment -in @(1,3,4,5,7,8,9)
                $nativeRows.Add([pscustomobject]@{
                    story=[int]$currentStory.StoryType; paragraph=$paragraphIndex
                    alignment=$actualAlignment; reading_order=$actualDirection
                    physical_right=($actualAlignment -eq 2)
                    rtl=($actualDirection -eq 0)
                    exception=[bool]$explicitException
                    pass=($actualDirection -eq 0 -and ($actualAlignment -eq 2 -or $explicitException))
                })
            }
            $currentStory = $currentStory.NextStoryRange
        }
    }
    $nativeResult = [pscustomobject]@{
        native_word_verification='performed'
        word_version=[string]$nativeWord.Version
        compatibility_mode=[int]$nativeDoc.CompatibilityMode
        inspected_persian_paragraphs=$nativeRows.Count
        passed=($nativeRows.Count -gt 0 -and @($nativeRows | Where-Object { -not $_.pass }).Count -eq 0)
        visual_validation='requires_page_image_inspection'
        paragraphs=$nativeRows.ToArray()
    }
    if ($PdfPath) {
        New-Item -ItemType Directory -Path (Split-Path -Parent $nativePdf) -Force | Out-Null
        $nativeDoc.ExportAsFixedFormat($nativePdf, 17)
    }
    New-Item -ItemType Directory -Path (Split-Path -Parent $nativeReport) -Force | Out-Null
    $nativeResult | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $nativeReport -Encoding utf8
    if (-not $nativeResult.passed) { throw 'Native Word alignment verification failed; inspect the report.' }
    Write-Output "Native Word: $($nativeRows.Count) Persian paragraphs passed physical Alignment=2 and ReadingOrder=0."
} finally {
    if ($null -ne $nativeDoc) { $nativeDoc.Close(0) }
    if ($null -ne $nativeWord) { $nativeWord.Quit(0); [Runtime.InteropServices.Marshal]::FinalReleaseComObject($nativeWord) | Out-Null }
}
