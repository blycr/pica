<#
.SYNOPSIS
    Pica Manga Production Build & Start Script
    优雅地构建并启动生产环境：清理 -> 构建 -> 托管

.DESCRIPTION
    此脚本用于模拟/运行 Pica Manga 的生产环境。
    它会自动执行以下操作：
    1. 强制清理端口 3000。
    2. 设置 NODE_ENV=production。
    3. 执行前端构建 (pnpm build)。
    4. 启动后端服务器 (负责 API + 静态资源托管)。

.EXAMPLE
    ./scripts/prod.ps1
#>

$ErrorActionPreference = "Stop"

Write-Host "`n🚀 正在准备生产环境..." -ForegroundColor Cyan

# ---------------------------------------------------------
# 1. 进程清理
# ---------------------------------------------------------
function Stop-PortProcess {
    param ([int]$Port)
    $process = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
    if ($process) {
        Write-Host "🧹 正在释放端口 $Port..." -ForegroundColor Yellow
        Stop-Process -Id $process -Force -ErrorAction SilentlyContinue
    }
}

Stop-PortProcess -Port 3000

# ---------------------------------------------------------
# 2. 构建前端
# ---------------------------------------------------------
Set-Location -Path (Join-Path $PSScriptRoot "..")

Write-Host "🔨 正在构建前端 (Vite Build)..." -ForegroundColor Green
# 设置生产环境变量用于构建 (Windows PowerShell syntax)
$env:NODE_ENV = "production"
pnpm build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 构建失败，请检查错误日志。" -ForegroundColor Red
    exit 1
}

# ---------------------------------------------------------
# 3. 启动生产服务器
# ---------------------------------------------------------
# 获取 IP 用于展示
$IP = Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias "Wi-Fi","Ethernet","WLAN" -ErrorAction SilentlyContinue | 
      Where-Object { $_.IPAddress -like "192.168.*" -or $_.IPAddress -like "10.*" } | 
      Select-Object -ExpandProperty IPAddress -First 1

Write-Host "`n✨ 构建完成! 正在启动生产服务器..." -ForegroundColor Green
Write-Host "   🌍 服务地址: http://$($IP):3000" -ForegroundColor Cyan
Write-Host "   (包含前端静态资源托管 + API)" -ForegroundColor Gray

# 启动 Node 服务器
# 这里不使用 nodemon，因为是生产环境
node server/index.js
