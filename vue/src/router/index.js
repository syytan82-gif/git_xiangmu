import Vue from 'vue'
import VueRouter from 'vue-router'

Vue.use(VueRouter)

// 解决导航栏或者底部导航tabBar中的vue-router在3.0版本以上频繁点击菜单报错的问题。
const originalPush = VueRouter.prototype.push
VueRouter.prototype.push = function push(location) {
  return originalPush.call(this, location).catch(err => err)
}

const routes = [
  {
    path: '/',
    name: 'Manager',
    component: () => import('../views/Manager.vue'),
    redirect: '/home',  // 重定向到主页
    children: [
      { path: '403', name: 'NoAuth', meta: { name: '无权限' }, component: () => import('../views/manager/403') },
      { path: 'user', name: 'User', meta: { name: '用户信息' }, component: () => import('../views/manager/User') },
      { path: 'userPerson', name: 'UserPerson', meta: { name: '个人信息' }, component: () => import('../views/manager/UserPerson') },
      { path: 'admin', name: 'Admin', meta: { name: '管理员信息' }, component: () => import('../views/manager/Admin') },
      { path: 'adminPerson', name: 'AdminPerson', meta: { name: '个人信息' }, component: () => import('../views/manager/AdminPerson') },
      { path: 'password', name: 'Password', meta: { name: '修改密码' }, component: () => import('../views/manager/Password') },
      { path: 'home', name: 'Home', meta: { name: '' }, component: () => import('../views/Home.vue') },
      { path: 'text2sql', name: 'Text2sql', meta: { name: '智能问数' }, component: () => import('../views/Text2sql.vue') },
      { path: 'rag', name: 'RAG', meta: { name: '智能问答' }, component: () => import('../views/RAG.vue') },
      { path: 'smart-form', name: 'Former', meta: { name: '智能填表' }, component: () => import('../views/Former.vue') },

      // --- 系统设置页面及其子路由 (修改部分) ---
      {
        path: 'set',
        name: 'Settings',
        meta: { name: '系统设置' },
        component: () => import('../views/manager/Settings.vue'),
        redirect: '/set/llm-config', // 1. 修改默认重定向到新的大模型配置页面
        children: [
          // 2. 新增：大模型配置
          {
            path: 'llm-config', name: 'LlmConfig', meta: { name: '大模型配置' }, component: () => import('../views/manager/LlmConfig.vue')
          },
          // 3. 新增：业务数据库配置
          {
            path: 'db-config', name: 'DbConfig', meta: { name: '业务数据库配置' }, component: () => import('../views/manager/DbConfig.vue')
          },
          // 原有的：用户管理
          {
            path: 'user-management', name: 'UserManagement', meta: { name: '用户管理' }, component: () => import('../views/manager/User.vue')
          },
          // 原有的：文件上传 (问数)
          {
            path: 'file-upload', name: 'FileUpload', meta: { name: '问数文件上传' }, component: () => import('../views/manager/FileUpload.vue')
          },
          // 新增：问答文件上传
          {
            path: 'rag-upload', name: 'RagUpload', meta: { name: '问答文件上传' }, component: () => import('../views/manager/RagUpload.vue')
          },
          //权限管理
          {
            path: 'permission-manage', name: 'PermissionManage', meta: { name: '权限管理' }, component: () => import('../views/manager/PermissionManage.vue')
          },
        ]
      }
    ]
  },
  { path: '/login', name: 'Login', meta: { name: '登录' }, component: () => import('../views/Login.vue') },
  { path: '/register', name: 'Register', meta: { name: '注册' }, component: () => import('../views/Register.vue') },
  { path: '*', name: 'NotFound', meta: { name: '无法访问' }, component: () => import('../views/404.vue') },

]

const router = new VueRouter({
  mode: 'history',
  base: process.env.BASE_URL,
  routes
})

export default router