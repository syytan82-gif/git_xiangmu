<template>
  <div class="manager-container">
    <!-- 整合后的头部导航栏（包含Logo、菜单、用户信息） -->
    <div class="manager-header">
      <!-- 左侧Logo区域 -->
      <div class="manager-header-left">
        <img src="@/assets/imgs/mx_logo.png" />
        <div class="titles-wrapper">
          <div class="title">数据智能分析大模型</div>
          <div class="sub-title">重庆美心翼申机械股份有限公司</div>
          <div class="sub-title-en">Chongqing Mexin Yishen Machinery Co.,Ltd</div>
        </div>
      </div>

      <!-- 中间菜单区域（核心：把菜单嵌入头部） -->
      <div class="manager-header-menu">
        <el-menu
            :default-active="activeMenu"
            mode="horizontal"
            @select="handleMenuSelect"
            background-color="#ffffff"
            text-color="#606266"
            active-text-color="#1890ff"
        >
          <el-menu-item index="/home">
            <i class="el-icon-menu"></i>
            <span>首页</span>
          </el-menu-item>

          <el-menu-item index="/dashboard" v-if="user.role !== 'USER'">
            <i class="el-icon-data-line"></i>
            <span>数据大屏</span>
          </el-menu-item>

          <el-menu-item index="/set"  v-if="user.role !== 'USER'">
            <i class="el-icon-setting"></i>
            <span>设置</span>
          </el-menu-item>

        </el-menu>
      </div>

      <!-- 右侧用户信息区域 -->
      <div class="manager-header-right">
        <el-dropdown placement="bottom-end" trigger="hover">
          <div class="user-profile-area">
            <div class="user-avatar-wrapper">
              <ProxyImage :src="avatarSrc" />
            </div>
            <span class="user-name">{{ user.name || '管理员' }}</span>
            <i class="el-icon-arrow-down arrow-icon"></i>
          </div>
          <el-dropdown-menu slot="dropdown" class="custom-dropdown-menu">
            <el-dropdown-item @click.native="goToPerson">
              <i class="el-icon-user"></i> 个人信息
            </el-dropdown-item>
            <el-dropdown-item @click.native="$router.push('/password')">
              <i class="el-icon-lock"></i> 修改密码
            </el-dropdown-item>
            <el-dropdown-item divided @click.native="logout">
              <i class="el-icon-switch-button" style="color: #ff4d4f;"></i> 退出登录
            </el-dropdown-item>
          </el-dropdown-menu>
        </el-dropdown>
      </div>
    </div>

    <!-- 面包屑可放在头部下方（可选） -->
    <div class="manager-breadcrumb">
      <el-breadcrumb separator-class="el-icon-arrow-right">
        <el-breadcrumb-item :to="{ path: '/' }">首页</el-breadcrumb-item>
        <el-breadcrumb-item :to="{ path: $route.path }">{{ $route.meta.name }}</el-breadcrumb-item>
      </el-breadcrumb>
  </div>
    <div class="manager-main-right">
      <router-view @update:user="updateUser" />
    </div>
  </div>
</template>

<script>
import ProxyImage from '@/components/ProxyImage.vue';

export default {
  name: "Manager",
  components: {
    ProxyImage
  },
  data() {
    return {
      user: JSON.parse(localStorage.getItem('xm-user') || '{}'),
    }
  },
  computed: {
    avatarSrc() {
      let avatar = this.user.avatar;
      
      // 默认头像
      const defaultAvatar = 'https://www.keaitupian.cn/cjpic/frombd/2/253/3810755577/3802575188.jpg';
      
      if (!avatar) return defaultAvatar;
      
      // 修复：后端返回的 localhost 地址在公网/ngrok 环境下无法访问
      if (avatar.includes('localhost:9090')) {
        return avatar.replace('http://localhost:9090', this.$baseUrl);
      }
      
      if (avatar.startsWith('http')) {
        return avatar;
      }
      
      let baseUrl = this.$baseUrl || '';
      if (!baseUrl.endsWith('/') && !avatar.startsWith('/')) {
        return baseUrl + '/' + avatar;
      }
      return baseUrl + avatar;
    },
    activeMenu() {
      // 核心修复：如果当前路径属于 /set 开头（设置模块的子页面），手动让菜单保持在 /set 高亮
      if (this.$route.path.startsWith('/set')) {
        return '/set';
      }
      // 数据大屏子路由也保持高亮
      if (this.$route.path.startsWith('/dashboard')) {
        return '/dashboard';
      }
      return this.$route.path;
    }
  },
  created() {
    if (!this.user.id) {
      this.$router.push('/login')
    }
  },
  methods: {
    updateUser() {
      this.user = JSON.parse(localStorage.getItem('xm-user') || '{}')
    },
    goToPerson() {
      if (this.user.role != 'USER') {
        this.$router.push('/adminPerson')
      }
      if(this.user.role==='USER'){
        this.$router.push(('/userPerson'))
      }
    },
    logout() {
      localStorage.removeItem('xm-user')
      this.$router.push('/login')
    },
    // ✅ 直接定义handleMenuSelect，取消嵌套
    handleMenuSelect(index) {
      this.$router.push(index)
    }
  }
}
</script>

<style scoped>
/* 头部容器：Flex布局实现一行排列 */
.manager-header {
  display: flex;
  align-items: center; /* 垂直居中 */
  height: 64px; /* 稍微增加高度以提升通透感 */
  background-color: #ffffff;
  padding: 0 24px;
  /* 使用更柔和的高级阴影，代替硬边框 */
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
  position: relative;
  z-index: 100; /* 确保头部阴影在内容之上 */
}

/* 移除之前的底部线条，用阴影营造高级感 */
.manager-header::after {
  display: none;
}

/* Logo区域：固定宽度，与菜单区分开 */
.manager-header-left {
  display: flex;
  align-items: center;
  width: auto; /* 自适应宽度 */
  margin-right: 40px; /* 给菜单留出间距 */
}
.manager-header-left img {
  width: auto;
  height: 42px; /* 稍微放大Logo */
  margin-right: 12px;
}
.titles-wrapper {
  display: flex;
  flex-direction: column;
  justify-content: center;
  line-height: normal;
}
.manager-header-left .title {
  /* 核心修改：使用渐变文字提升科技感和高级感 */
  background: linear-gradient(120deg, #E60012 0%, #0050B3 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  
  font-size: 18px; /* 略微缩小以平衡布局 */
  font-weight: 700; /* 加粗 */
  letter-spacing: 1px; /* 增加字间距 */
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  margin-bottom: 2px;
}
.sub-title {
  font-size: 10px;
  color: #606266;
  font-weight: 600;
  line-height: 1.2;
}
.sub-title-en {
  font-size: 9px;
  color: #909399;
  font-family: Arial, Helvetica, sans-serif;
  transform: scale(0.95); /* 视觉上更精致 */
  transform-origin: left top;
  line-height: 1.2;
}

/* 菜单区域：占据中间剩余空间 */
.manager-header-menu {
  flex: 1; /* 自动填充剩余宽度 */
}
/* 去掉菜单默认的margin，避免错位 */
.manager-header-menu .el-menu {
  border-bottom: none; /* 去掉Element UI菜单默认的下边框 */
  height: 64px; /* 匹配头部高度 */
  background-color: transparent !important; /* 确保背景透明 */
}
/* 菜单项样式微调 */
/* 菜单项样式微调 - 胶囊式高级感 (轻量化版) */
.manager-header-menu .el-menu-item {
  height: 40px;
  line-height: 40px;
  margin: 12px 6px;
  border-radius: 8px; /* 稍微方一点的圆角，更现代 */
  border-bottom: none !important;
  font-size: 15px;
  font-weight: 600;
  color: #646a73 !important;
  transition: all 0.2s ease;
  padding: 0 12px !important;
}

/* 悬浮状态 */
.manager-header-menu .el-menu-item:hover {
  color: #1f2329 !important;
  background-color: rgba(0, 0, 0, 0.04) !important;
}

/* 激活状态 - 浅蓝风格 (不突兀，更融合) */
.manager-header-menu .el-menu-item.is-active {
  color: #1890ff !important; /* 字体变蓝 */
  background-color: rgba(24, 144, 255, 0.1) !important; /* 背景极淡蓝 */
  font-weight: 700;
}

/* 激活状态下的图标颜色修正 */
.manager-header-menu .el-menu-item.is-active i {
  color: #1890ff !important;
}

/* 用户信息区域：右对齐 - 高级感胶囊样式 */
.manager-header-right {
  min-width: 140px;
  display: flex;
  justify-content: flex-end;
}
.user-profile-area {
  display: flex;
  align-items: center;
  /* 胶囊背景 */
  background-color: #f7f8fa;
  padding: 4px 12px 4px 4px; /* 左边padding小因为头像有空隙 */
  border-radius: 24px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid transparent;
}
.user-profile-area:hover {
  background-color: #fff;
  border-color: #e4e7ed;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}
/* 头像包装 */
.user-avatar-wrapper {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 2px solid #fff;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  margin-right: 10px;
  flex-shrink: 0;
}
.user-avatar-wrapper img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
/* 用户名 */
.user-name {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  margin-right: 8px;
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
/* 箭头图标 */
.arrow-icon {
  font-size: 12px;
  color: #909399;
  transition: transform 0.3s;
}
.el-dropdown:hover .arrow-icon {
  transform: rotate(180deg);
  color: #3370ff;
}

/* 面包屑样式（可选） */
.manager-breadcrumb {
  padding: 12px 24px;
  background-color: #fff; /* 改为白色 */
  border-bottom: 1px solid #f0f2f5; /* 极淡的分隔线 */
  margin-bottom: 2px;
}
/* 针对 el-menu-item 中的图标和文字的容器 */
.el-menu--horizontal > .el-menu-item {
  display: flex; /* 启用 Flex 布局 */
  align-items: center; /* 垂直居中对齐 */
}

/* 调整图标的右侧间距 */
.el-menu--horizontal .el-menu-item i {
  margin-right: 6px; /* 图标和文字间距 */
  font-size: 16px; /* 确保图标大小合适 */
  margin-bottom: 2px;
}

/* 如果你使用了 <span> 包裹文字，确保它正常显示 */
.el-menu--horizontal .el-menu-item span {
  vertical-align: middle;
}
</style>