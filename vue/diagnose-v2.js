const http = require('http');

console.log("=== 全真模拟请求诊断 ===");

const payload = JSON.stringify({
    username: "test",
    password: "test_password",
    clientType: "WEB"
});

const options = {
    hostname: '10.16.16.249',
    port: 9090,
    path: '/login',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        'Host': '10.16.16.249:9090', // 显式指定 Host
        'Connection': 'keep-alive',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    },
    timeout: 5000
};

console.log("正在发送请求...");
const req = http.request(options, (res) => {
    console.log(`[HTTP] 连接成功! 状态码: ${res.statusCode}`);
    console.log(`[HTTP] 响应头:`, res.headers);

    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        console.log(`[HTTP] 响应内容: ${data}`);
    });
});

req.on('error', (e) => {
    console.error(`[HTTP] 失败: ${e.message} (代码: ${e.code})`);
});

req.write(payload);
req.end();
