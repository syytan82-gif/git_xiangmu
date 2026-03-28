<template>
  <div class="permission-page">
    <div class="main-container">
      <div class="tabs-container">
        <el-tabs v-model="activeTab" class="modern-tabs">
          <el-tab-pane name="config">
            <span slot="label" class="tab-label">
              <i class="el-icon-setting"></i> 权限配置
            </span>
          </el-tab-pane>
          <el-tab-pane name="user">
            <span slot="label" class="tab-label">
              <i class="el-icon-user"></i> 用户权限详情
            </span>
          </el-tab-pane>
        </el-tabs>
      </div>

      <div class="content-container">
        <transition name="fade-transform" mode="out-in">
          <permission-config v-if="activeTab === 'config'" key="config" />
          <user-permissions v-else-if="activeTab === 'user'" key="user" />
        </transition>
      </div>
    </div>
  </div>
</template>

<script>
import PermissionConfig from './components/PermissionConfig.vue'
import UserPermissions from './components/UserPermissions.vue'

export default {
  name: 'PermissionManage',
  components: {
    PermissionConfig,
    UserPermissions
  },
  data() {
    return {
      activeTab: 'config'
    }
  }
}
</script>

<style scoped>
.permission-page {
  padding: 12px; /* 优化：从 24px 减少到 12px */
  background: #f0f2f5;
  height: calc(100vh - 80px); /* 固定高度，适配视口 */
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.main-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0; /* 关键：允许子元素收缩 */
  overflow: hidden;
}

.tabs-container {
  background: #fff;
  padding: 6px 24px 0;
  border-radius: 8px 8px 0 0;
  box-shadow: 0 1px 4px rgba(0,21,41,0.08);
  margin-bottom: 2px; /* Small gap or connected look */
  flex-shrink: 0; /* 防止被压缩 */
}

/* 覆盖 Element UI Tabs 默认样式，更现代化 */
.modern-tabs >>> .el-tabs__nav-wrap::after {
  height: 1px;
  background-color: #f0f0f0;
}

.modern-tabs >>> .el-tabs__item {
  font-size: 16px;
  height: 54px;
  line-height: 54px;
  color: #606266;
  font-weight: 500;
  transition: all 0.3s;
}

.modern-tabs >>> .el-tabs__item:hover {
  color: #1890ff;
}

.modern-tabs >>> .el-tabs__item.is-active {
  color: #1890ff;
  font-weight: 600;
}

.modern-tabs >>> .el-tabs__active-bar {
  height: 3px;
  border-radius: 3px;
  background-color: #1890ff;
}

.tab-label i {
  margin-right: 6px;
  font-size: 18px;
  vertical-align: -2px;
}

.content-container {
  background: #fff;
  border-radius: 0 0 8px 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
  flex: 1; /* 占据剩余空间 */
  min-height: 0; /* 关键：允许内容滚动 */
  overflow-y: auto; /* 内容溢出时显示滚动条 */
}

/* 修正子组件可能的 padding 叠加问题 */
.content-container >>> .permission-manage,
.content-container >>> .user-permissions {
  box-shadow: none;
  min-height: auto;
  background: transparent;
  padding: 24px;
}

/* 过渡动画 */
.fade-transform-leave-active,
.fade-transform-enter-active {
  transition: all 0.3s;
}

.fade-transform-enter {
  opacity: 0;
  transform: translateX(-30px);
}

.fade-transform-leave-to {
  opacity: 0;
  transform: translateX(30px);
}
</style>
