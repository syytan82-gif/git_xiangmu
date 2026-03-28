const { defineConfig } = require('@vue/cli-service')
module.exports = defineConfig({
    transpileDependencies: true,
    devServer: {
        port: 8085,
        allowedHosts: 'all',
        historyApiFallback: true, // 支持 HTML5 History 模式
        client: {
            webSocketURL: 'auto://0.0.0.0:0/ws',
        },
        // 配置代理以解决内网访问时的跨域和地址问题
        // 前端请求 /api -> 代理到 http://localhost:9090
        proxy: {
            '/api': {
                target: 'http://localhost:9090',
                changeOrigin: true,
                pathRewrite: {
                    '^/api': ''  // 去掉路径中的 /api
                }
            },
            '/ragapi': {
                target: 'http://localhost:9091',
                changeOrigin: true,
                pathRewrite: {
                    '^/ragapi': ''
                }
            }
        }
    },
    chainWebpack: config => {
        config.plugin('html')
            .tap(args => {
                args[0].title = "美心翼申数据智能分析大模型";
                return args;
            })
        config.plugin('copy').tap(args => {
            args[0].patterns[0].globOptions.ignore.push('**/index.html');
            return args
        })
    }
})
