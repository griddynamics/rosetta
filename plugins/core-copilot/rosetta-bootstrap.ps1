$Input = [Console]::In.ReadToEnd()
$SessionId = if ($Input -match '"session_id":"([^"]*)"') { $Matches[1] } else { "unknown" }
$LockFile = "$env:TEMP\rosetta-bootstrap-$SessionId.lock"
Get-ChildItem "$env:TEMP\rosetta-bootstrap-*.lock" -ErrorAction SilentlyContinue |
    Where-Object { $_.LastWriteTime -lt (Get-Date).AddMinutes(-1) } |
    Remove-Item -Force -ErrorAction SilentlyContinue
if (Test-Path $LockFile) { exit 0 }
New-Item -Path $LockFile -ItemType File -Force | Out-Null
$PluginRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$Content = Get-Content -Raw -Path "$PluginRoot\rules\bootstrap-core-policy.md",
    "$PluginRoot\rules\bootstrap-execution-policy.md",
    "$PluginRoot\rules\bootstrap-guardrails.md",
    "$PluginRoot\rules\bootstrap-hitl-questioning.md",
    "$PluginRoot\rules\bootstrap-rosetta-files.md",
    "$PluginRoot\rules\plugin-files-mode.md",
    "$PluginRoot\rules\INDEX.md",
    "$PluginRoot\workflows\INDEX.md"
$Content = "$Content`n`nRosetta Core Plugin Path: $PluginRoot"
$Escaped = $Content.Replace('\', '\\').Replace('"', '\"').Replace("`r`n", '\n').Replace("`n", '\n')
[Console]::Write("{`"hookSpecificOutput`":{`"hookEventName`":`"SessionStart`",`"additionalContext`":`"$Escaped`"}}")
