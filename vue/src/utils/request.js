import axios from 'axios'
import router from "@/router";

// 创建可一个新的axios对象
const request = axios.create({
    baseURL: process.env.VUE_APP_BASEURL,   // 后端的接口地址  ip:port
    timeout: 300000                          // 30s请求超时
})

// request 拦截器
// 可以自请求发送前对请求做一些处理
// 比如统一加token，对请求参数统一加密
request.interceptors.request.use(config => {
    config.headers['Content-Type'] = 'application/json;charset=utf-8';


    // 获取缓存的用户信息，如果没有则为空对象
    let userString = localStorage.getItem("xm-user");
    if (userString) {
        let user = JSON.parse(userString);
        if (user.token) {
            config.headers['token'] = user.token;
        }
    }

    return config
}, error => {
    console.error('Request setup error:', error)
    return Promise.reject(error)
});

// response 拦截器
// 可以在接口响应后统一处理结果
request.interceptors.response.use(
    response => {
        let res = response.data;

        // 兼容服务端返回的字符串数据
        if (typeof res === 'string') {
            res = res ? JSON.parse(res) : res
        }
        if (res.code === '401') {
            localStorage.removeItem('xm-user'); // 清除过期 token
            router.push('/login')
            return new Promise(() => { })
        }
        return res;
    },
    error => {
        console.error('API请求失败:', error)

        // 提取错误信息
        let errorMsg = '服务器连接失败'
        if (error.response) {
            // 服务器返回了错误状态码
            const status = error.response.status
            const data = error.response.data

            if (status === 500) {
                errorMsg = '服务器内部错误，请联系管理员'
            } else if (status === 404) {
                errorMsg = '请求的资源不存在'
            } else if (status === 403) {
                errorMsg = '没有访问权限'
            } else if (data && data.msg) {
                errorMsg = data.msg
            }
        } else if (error.request) {
            // 请求已发出但没有收到响应
            errorMsg = '网络连接失败，请检查网络'
        }

        // 返回一个格式化的错误对象,让组件可以正常处理
        return Promise.reject({
            code: error.response ? String(error.response.status) : '500',
            msg: errorMsg,
            error: error
        })
    }
)


export default request