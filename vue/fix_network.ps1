# 请求管理员权限
if (!([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {   
    Start-Process powershell.exe "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`"" -Verb RunAs; exit
}

Write-Host "=== 开始全自动网络修复 ===" -ForegroundColor Cyan

# 1. 设置端口映射 (即便之前设置过，覆盖一次保平安)
Write-Host "1. 配置端口映射 (127.0.0.1:9090 -> 10.16.16.249:9090)..."
netsh interface portproxy delete v4tov4 listenport=9090 listenaddress=127.0.0.1
netsh interface portproxy add v4tov4 listenport=9090 listenaddress=127.0.0.1 connectport=9090 connectaddress=10.16.16.249

# 2. 配置防火墙允许 Node.js 和 端口
Write-Host "2. 添加防火墙放行规则..."
New-NetFirewallRule -DisplayName "Vue_Backend_Allow_9090" -Direction Outbound -LocalPort 9090 -Protocol TCP -Action Allow -ErrorAction SilentlyContinue
New-NetFirewallRule -DisplayName "Vue_Backend_Allow_9090_In" -Direction Inbound -LocalPort 9090 -Protocol TCP -Action Allow -ErrorAction SilentlyContinue

# 3. 验证连接
Write-Host "3. 验证本地映射..."
try {
    $conn = Test-NetConnection -ComputerName 127.0.0.1 -Port 9090
    if ($conn.TcpTestSucceeded) {
        Write-Host "SUCCESS: 本地映射已打通！" -ForegroundColor Green
        Write-Host "现在前端连接 127.0.0.1:9090 就会自动转发到后端。"
    } else {
        Write-Host "FAILED: 映射失败，请检查是否有杀毒软件拦截。" -ForegroundColor Red
    }
} catch {
    Write-Host "检查出错: $_" -ForegroundColor Red
}

Write-Host "`n按任意键退出..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
