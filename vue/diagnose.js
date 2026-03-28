const http = require('http');

console.log("=== 开始高级网络诊断 (强制 IPv4) ===");
console.log("目标地址: http://10.16.16.249:9090");

const options = {
    hostname: '10.16.16.249',
    port: 9090,
    path: '/',
    method: 'GET',
    family: 4, // 强制 IPv4
    timeout: 5000
};

const req = http.request(options, (res) => {
    console.log(`[HTTP] 连接成功! 状态码: ${res.statusCode}`);
    res.on('data', () => { });
});

req.on('error', (e) => {
    console.error(`[HTTP] 连接失败: ${e.message}`);
    console.error(`Error Code: ${e.code}`);
});

req.on('timeout', () => {
    console.error('[HTTP] 连接超时');
    req.destroy();
});

console.log("[HTTP] 正在尝试连接...");
req.end();
