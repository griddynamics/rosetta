<#
.SYNOPSIS
    codemap.ps1 — Generate CODEMAP.md for every git repo under a workspace root.

.DESCRIPTION
    Walks git repositories, uses `git ls-files` to enumerate tracked files,
    filters to recognised source/asset/doc extensions, and writes a structured
    Markdown map with headers, recursive counts, and short descriptions.

.PARAMETER WorkspaceRoot
    Directory to scan. Defaults to the current directory.

.PARAMETER MaxDepth
    How many directory levels to recurse (1-based). Default: 4.

.EXAMPLE
    .\codemap.ps1
    .\codemap.ps1 -WorkspaceRoot "C:\Projects\myapp" -MaxDepth 3
#>
[CmdletBinding()]
param(
    [string]$WorkspaceRoot = ".",
    [int]$MaxDepth = 4
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$WorkspaceRoot = (Resolve-Path $WorkspaceRoot).Path
$OutFile       = Join-Path $WorkspaceRoot "CODEMAP.md"

# ── Recognised extensions ────────────────────────────────────────────────────

$SourceExt   = @("ts","tsx","js","jsx","mjs","cjs","vue","svelte","astro","py","pyx","pyi","rb","erb","rs","go","java","kt","kts","scala","groovy","cs","fs","swift","m","mm","c","h","cpp","hpp","cc","hh","zig","asm","s","pl","pm","lua","r","jl","ex","exs","erl","hrl","clj","cljs","cljc","hs","lhs","elm","dart","php")
$ConfigExt   = @("json","jsonc","json5","yaml","yml","toml","ini","cfg","conf","env","properties","plist","xml","xsl","xslt","graphql","gql","proto","thrift","tf","tfvars","hcl","nix","flake")
$DocExt      = @("md","mdx","rst","txt","adoc","org","tex","bib")
$StyleExt    = @("css","scss","sass","less","styl","pcss")
$TemplateExt = @("html","htm","ejs","hbs","pug","njk","liquid","jinja","jinja2","j2","mustache","twig","blade")
$DataExt     = @("csv","tsv","sql","prisma")
$AssetExt    = @("svg","png","jpg","jpeg","gif","webp","ico","bmp","tiff","avif","mp3","wav","ogg","mp4","webm","woff","woff2","ttf","otf","eot")
$ScriptExt   = @("sh","bash","zsh","fish","ps1","psm1","bat","cmd")

$AllExt = $SourceExt + $ConfigExt + $DocExt + $StyleExt + $TemplateExt + $DataExt + $AssetExt + $ScriptExt | Sort-Object -Unique

$ExactNames = @(
    "Dockerfile","Containerfile","Makefile","Justfile","Rakefile","Gemfile",
    "Procfile","Vagrantfile","Caddyfile","CMakeLists.txt","SConstruct",
    "SConscript","BUILD","WORKSPACE","go.mod","go.sum","Cargo.toml",
    "Cargo.lock","package.json","package-lock.json","yarn.lock",
    "pnpm-lock.yaml","bun.lockb","composer.json","composer.lock",
    "Pipfile","Pipfile.lock","pyproject.toml","setup.py","setup.cfg",
    "requirements.txt",".editorconfig",".prettierrc",".eslintrc",
    ".stylelintrc",".babelrc","tsconfig.json","vite.config.ts",
    "webpack.config.js","rollup.config.js","next.config.js",
    "nuxt.config.ts","tailwind.config.js","postcss.config.js",
    "jest.config.ts","vitest.config.ts"
)

# ── Helpers ──────────────────────────────────────────────────────────────────

function Test-MatchExtension {
    param([string]$FileName)
    $base = [System.IO.Path]::GetFileName($FileName)

    # Exact name match
    if ($ExactNames -contains $base) { return $true }

    # Dotfile configs
    if ($base -like ".env*")          { return $true }
    if ($base -eq ".gitignore")       { return $true }
    if ($base -eq ".gitattributes")   { return $true }
    if ($base -eq ".dockerignore")    { return $true }

    # Extension match
    $ext = [System.IO.Path]::GetExtension($base).TrimStart(".").ToLower()
    if ($ext -and ($AllExt -contains $ext)) { return $true }

    return $false
}

function Get-DirDescription {
    param(
        [string]$DirName,
        [string[]]$Files
    )
    switch -Wildcard ($DirName) {
        "src"           { return "Primary application source code" }
        "lib"           { return "Library and shared source code" }
        "core"          { return "Core application logic" }
        "app"           { return "Application entry and route definitions" }
        {$_ -in "pages","routes"} { return "Page-level route components" }
        {$_ -in "components","comps"} { return "Reusable UI components" }
        "hooks"         { return "Custom React or framework hooks" }
        {$_ -in "utils","helpers","util"} { return "Shared utility and helper functions" }
        {$_ -in "services","service"} { return "External service integrations and API clients" }
        "api"           { return "API route handlers and endpoints" }
        {$_ -in "models","model","entities"} { return "Data models and entity definitions" }
        {$_ -in "types","typings"} { return "Type declarations and interfaces" }
        {$_ -in "config","cfg","conf"} { return "Configuration files and constants" }
        {$_ -in "public","static","assets"} { return "Static assets served directly" }
        {$_ -in "styles","css"} { return "Stylesheets and design tokens" }
        {$_ -in "images","img","icons"} { return "Image and icon assets" }
        "fonts"         { return "Font files" }
        {$_ -in "tests","test","__tests__","spec","specs"} { return "Test suites and fixtures" }
        {$_ -in "e2e","cypress","playwright"} { return "End-to-end test definitions" }
        {$_ -in "docs","doc","documentation"} { return "Project documentation" }
        {$_ -in "scripts","bin","tools"} { return "Build, deploy, and maintenance scripts" }
        {$_ -in "migrations","migrate"} { return "Database migration files" }
        {$_ -in "seeds","seeders","fixtures"} { return "Seed data and test fixtures" }
        {$_ -in "middleware","middlewares"} { return "Request middleware handlers" }
        {$_ -in "controllers","controller"} { return "Request controllers and handlers" }
        {$_ -in "views","templates"} { return "Server-rendered view templates" }
        {$_ -in "layouts","layout"} { return "Page layout components" }
        {$_ -in "store","stores","state"} { return "State management modules" }
        {$_ -in "actions","reducers","slices"} { return "State actions and reducers" }
        {$_ -in "context","contexts"} { return "Context providers and consumers" }
        {$_ -in "i18n","locales","lang","translations"} { return "Internationalization and locale files" }
        "prisma"        { return "Prisma schema and migrations" }
        {$_ -in "graphql","gql"} { return "GraphQL schema and resolvers" }
        {$_ -in "proto","protos"} { return "Protocol buffer definitions" }
        ".github"       { return "GitHub workflows and repo configuration" }
        ".vscode"       { return "VS Code workspace settings" }
        {$_ -in "docker","containers"} { return "Container definitions and compose files" }
        {$_ -in "infra","infrastructure","deploy","deployment"} { return "Infrastructure and deployment configuration" }
        {$_ -in "ci",".circleci"} { return "CI pipeline configuration" }
        {$_ -in "packages","modules"} { return "Monorepo workspace packages" }
        default {
            $joined = $Files -join "`n"
            if ($joined -match '\.(test|spec)\.(ts|tsx|js|jsx|py|rb)$') { return "Tests and specs" }
            if ($joined -match '\.(css|scss|sass|less)$')               { return "Stylesheets" }
            if ($joined -match '\.(svg|png|jpg|jpeg|gif|webp)$')        { return "Image assets" }
            if ($joined -match '\.(md|mdx|rst|txt|adoc)$')              { return "Documentation files" }
            if ($joined -match '\.(sql|prisma)$')                       { return "Database schemas and queries" }
            if ($joined -match '\.(yaml|yml|toml|json)$')               { return "Configuration and data files" }
            return "Project files"
        }
    }
}

# ── Core: process one directory ──────────────────────────────────────────────

function Process-Directory {
    param(
        [string]$RepoRoot,
        [string]$RelDir,         # relative to repo root, empty = root
        [int]$Depth,
        [string]$WsRelRepo,
        [string[]]$TrackedFiles
    )

    if ($Depth -gt $MaxDepth) { return }

    # Gather immediate children
    if ([string]::IsNullOrEmpty($RelDir)) {
        $childFiles = $TrackedFiles | Where-Object { $_ -notmatch "/" }
        $childDirs  = $TrackedFiles | Where-Object { $_ -match "/" } |
                      ForEach-Object { ($_ -split "/")[0] } | Sort-Object -Unique
    } else {
        $prefix = "$RelDir/"
        $sub = $TrackedFiles | Where-Object { $_.StartsWith($prefix) } |
               ForEach-Object { $_.Substring($prefix.Length) }
        $childFiles = $sub | Where-Object { $_ -notmatch "/" }
        $childDirs  = $sub | Where-Object { $_ -match "/" } |
                      ForEach-Object { ($_ -split "/")[0] } | Sort-Object -Unique
    }

    # Filter children files
    $filteredFiles = @($childFiles | Where-Object { $_ -and (Test-MatchExtension $_) })

    # Recursive file count
    if ([string]::IsNullOrEmpty($RelDir)) {
        $recursiveCount = $TrackedFiles.Count
    } else {
        $recursiveCount = @($TrackedFiles | Where-Object { $_.StartsWith("$RelDir/") }).Count
    }

    # Display path
    if ([string]::IsNullOrEmpty($RelDir)) {
        $displayPath = $WsRelRepo
    } else {
        $displayPath = "$WsRelRepo/$RelDir"
    }

    # Heading
    $hashes = "#" * $Depth
    $dirBasename = if ([string]::IsNullOrEmpty($RelDir)) {
        Split-Path $WsRelRepo -Leaf
    } else {
        Split-Path $RelDir -Leaf
    }

    $allSubFiles = if ([string]::IsNullOrEmpty($RelDir)) {
        $TrackedFiles
    } else {
        @($TrackedFiles | Where-Object { $_.StartsWith("$RelDir/") })
    }
    $description = Get-DirDescription -DirName $dirBasename -Files $allSubFiles

    # Write
    Add-Content -Path $OutFile -Value ""
    Add-Content -Path $OutFile -Value "$hashes $displayPath ($recursiveCount files) — $description"
    Add-Content -Path $OutFile -Value ""

    if ($filteredFiles.Count -gt 0) {
        foreach ($f in $filteredFiles) {
            Add-Content -Path $OutFile -Value "- $f"
        }
        Add-Content -Path $OutFile -Value ""
    }

    # Recurse
    foreach ($d in $childDirs) {
        if (-not $d) { continue }
        $childRel = if ([string]::IsNullOrEmpty($RelDir)) { $d } else { "$RelDir/$d" }
        Process-Directory -RepoRoot $RepoRoot -RelDir $childRel `
                          -Depth ($Depth + 1) -WsRelRepo $WsRelRepo `
                          -TrackedFiles $TrackedFiles
    }
}

# ── Main ─────────────────────────────────────────────────────────────────────

Write-Host "Scanning workspace: $WorkspaceRoot (depth: $MaxDepth)"

# Write header
@"
# CODEMAP

> Auto-generated source map. Do not edit manually.
> Regenerate with ``.\codemap.ps1``
"@ | Set-Content -Path $OutFile -Encoding UTF8

# Find git repos
$gitDirs = Get-ChildItem -Path $WorkspaceRoot -Recurse -Directory -Filter ".git" `
           -Depth $MaxDepth -ErrorAction SilentlyContinue |
           Sort-Object FullName

foreach ($gitDir in $gitDirs) {
    $repoRoot = $gitDir.Parent.FullName
    $wsRel    = [System.IO.Path]::GetRelativePath($WorkspaceRoot, $repoRoot) -replace "\\","/"

    if ($wsRel -eq ".") { $wsRel = Split-Path $WorkspaceRoot -Leaf }

    Write-Host "  -> repo: $wsRel"

    # Get tracked files via git ls-files
    Push-Location $repoRoot
    try {
        $raw = & git ls-files --cached --others --exclude-standard 2>$null
    } catch {
        $raw = @()
    }
    Pop-Location

    if (-not $raw -or $raw.Count -eq 0) {
        Add-Content -Path $OutFile -Value ""
        Add-Content -Path $OutFile -Value "## $wsRel (0 files) — Empty or uninitialized repository"
        continue
    }

    # Normalise to forward slashes and filter extensions
    $tracked = @($raw | ForEach-Object { $_ -replace "\\","/" } |
                 Where-Object { Test-MatchExtension $_ })

    if ($tracked.Count -eq 0) { continue }

    Process-Directory -RepoRoot $repoRoot -RelDir "" -Depth 1 `
                      -WsRelRepo $wsRel -TrackedFiles $tracked
}

Write-Host ""
Write-Host "Done -> $OutFile"
