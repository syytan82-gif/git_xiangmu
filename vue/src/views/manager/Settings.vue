<template>
  <div class="settings-container">
    <div class="settings-sidebar">
      <el-menu
          :default-active="$route.path"
          class="settings-menu"
          @select="handleMenuSelect"
          background-color="transparent"
          text-color="#556661"
      >
        <div class="settings-title">系统设置</div>

        <el-menu-item index="/set/llm-config">
          <i class="el-icon-cpu"></i>
          <span slot="title">大模型配置</span>
        </el-menu-item>

        <el-menu-item index="/set/db-config">
          <i class="el-icon-coin"></i>
          <span slot="title">业务数据库配置</span>
        </el-menu-item>

        <el-submenu index="file-upload-center">
          <template slot="title">
            <i class="el-icon-folder-add"></i>
            <span>文件上传中心</span>
          </template>
          <el-menu-item index="/set/file-upload">
            <span slot="title">问数文件上传</span>
          </el-menu-item>
          <el-menu-item index="/set/rag-upload">
            <span slot="title">问答文件上传</span>
          </el-menu-item>
        </el-submenu>

        <el-menu-item index="/set/permission-manage">
          <i class="el-icon-lock"></i>
          <span slot="title">用户权限管理</span>
        </el-menu-item>

        <el-submenu index="user-center">
          <template slot="title">
            <i class="el-icon-user"></i>
            <span>用户管理中心</span>
          </template>
          <el-menu-item index="/set/user-management">
            <span slot="title">用户管理</span>
          </el-menu-item>
          <el-menu-item index="/set/query-stats">
            <span slot="title">提问统计</span>
          </el-menu-item>
          <el-menu-item index="/set/query-detail">
            <span slot="title">提问明细</span>
          </el-menu-item>
        </el-submenu>
      </el-menu>
    </div>

    <div class="settings-content">
      <router-view />
    </div>
  </div>
</template>

<script>
export default {
  name: 'Settings',
  methods: {
    handleMenuSelect(index) {
      this.$router.push(index)
    }
  }
}
</script>

<style scoped>
/* 容器布局 */
.settings-container {
  display: flex;
  height: calc(100vh - 110px);
  background-color: #f7f8fa; /* 内容区背景保持浅灰，突出侧边栏 */
}

/* 侧边栏：极淡科技蓝背景 */
.settings-sidebar {
  width: 240px;
  background: #f0f7ff; /* 核心：淡蓝背景 */
  border-right: 1px solid #d6e4ff; /* 边框蓝紫色 */
  box-shadow: none;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* 标题区 */
.settings-title {
  color: #003a8c; /* 标题使用深蓝，增加层次感 */
  font-size: 16px;
  font-weight: 600;
  padding: 20px 24px;
  text-align: left;
  letter-spacing: 0.5px;
}

/* 菜单样式重置 */
.settings-menu {
  border: none;
  background: transparent !important;
  padding: 10px;
}

/* 菜单按钮样式：包括普通菜单项和子菜单标题 */
.settings-menu .el-menu-item,
.settings-menu ::v-deep .el-submenu__title {
  height: 48px;
  line-height: 48px;
  margin: 4px 0;
  border-radius: 6px;
  color: #597ef7; /* 默认文字颜色 */
  font-weight: 500;
  padding-left: 15px !important; /* 一级菜单缩进 */
  transition: all 0.2s ease;
}

/* 移除原来的蓝色左侧条 */
.settings-menu .el-menu-item::before {
  display: none;
}

/* 图标样式 */
.settings-menu .el-menu-item i,
.settings-menu ::v-deep .el-submenu__title i {
  margin-right: 10px;
  font-size: 18px;
  color: #85a5ff;
  transition: color 0.2s;
}

/* --------------------------------------------------- */
/* 核心交互样式：悬停与选中 */
/* --------------------------------------------------- */

/* 悬停状态 */
.settings-menu .el-menu-item:hover,
.settings-menu ::v-deep .el-submenu__title:hover {
  background-color: #e6f7ff !important;
  color: #1890ff;
}

/* 选中状态 */
.settings-menu .el-menu-item.is-active {
  background-color: #1890ff !important;
  color: #ffffff !important;
  font-weight: 600;
  box-shadow: 0 4px 12px rgba(24, 144, 255, 0.3);
}
.settings-menu .el-menu-item.is-active i {
  color: #ffffff !important;
}

/* --------------------------------------------------- */
/* 子菜单特殊样式 (用户需求：右缩进 + 小字体) */
/* --------------------------------------------------- */

/* 子菜单内的菜单项 */
.settings-menu ::v-deep .el-submenu .el-menu-item {
  padding-left: 48px !important; /* 强制体现缩进 (15px + 图标 + 间距) */
  font-size: 13px;               /* 字体小一点 */
  height: 40px;                  /* 高度稍小，更紧凑 */
  line-height: 40px;
  margin: 2px 0;                 /* 间距也稍小 */
}

/* --------------------------------------------------- */
/* 内容区域：核心修复 - 占满剩余宽度 */
/* --------------------------------------------------- */
.settings-content {
  flex: 1;                      /* 占据侧边栏之外的所有空间 */
  min-width: 0;                 /* 允许 flex 子项收缩 */
  overflow-y: auto;
  background-color: transparent;
  padding: 0;                   /* 移除 padding，让子组件自己控制 */
}

/* 确保 router-view 渲染的子组件撑满容器 */
.settings-content > * {
  width: 100%;
  box-sizing: border-box;
}
</style>