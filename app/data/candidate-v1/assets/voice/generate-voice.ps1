$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Speech

$voiceDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$synth.Rate = -1
$synth.Volume = 100

$format = New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo(
    16000,
    [System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen,
    [System.Speech.AudioFormat.AudioChannel]::Mono
)

$samples = @(
    @{ File = "voice-01-approve-yes-send-it.wav"; Text = "Yes, send it." },
    @{ File = "voice-02-refuse-no-hold-it.wav"; Text = "No, hold it." },
    @{ File = "voice-03-cashup-lot2-120gbp.wav"; Text = "Sold six 250 gram bags of lot 2, 120 pounds cash." },
    @{ File = "voice-04-cashup-missing-size.wav"; Text = "Sold six bags of lot 2, 120 pounds cash." }
)

foreach ($sample in $samples) {
    $target = Join-Path $voiceDir $sample.File
    $synth.SetOutputToWaveFile($target, $format)
    $synth.Speak($sample.Text)
    $synth.SetOutputToNull()
}

$synth.Dispose()
Write-Output "Generated 4 synthetic WAV voice samples in $voiceDir"
