import Vue from 'vue'
import App from './App.vue'
import router from './router'
import ElementUI from 'element-ui'
import 'element-ui/lib/theme-chalk/index.css'
import '@/assets/css/global.css'
import '@/assets/css/theme/index.css'
import request from "@/utils/request";

Vue.config.productionTip = false

Vue.prototype.$request = request
Vue.prototype.$baseUrl = process.env.VUE_APP_BASEURL

Vue.use(ElementUI, { size: "small" })

// 全局重载 $message，统一设置默认显示时长（单位：毫秒）
const DEFAULT_DURATION = 2000
const _msg = Vue.prototype.$message
Vue.prototype.$message = function (options) {
    if (typeof options === 'string') options = { message: options }
    return _msg({ duration: DEFAULT_DURATION, ...options })
}
    ;['success', 'warning', 'info', 'error'].forEach(type => {
        Vue.prototype.$message[type] = (options) => {
            if (typeof options === 'string') options = { message: options }
            return _msg[type]({ duration: DEFAULT_DURATION, ...options })
        }
    })

new Vue({
    router,
    render: h => h(App)
}).$mount('#app')
