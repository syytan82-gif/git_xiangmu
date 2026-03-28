<template>
  <div class="home-container">
    <div class="welcome-header">
      <h1 class="hero-title">这里是大模型智能平台</h1>
      <p class="hero-subtitle">✨ 您可以根据您的需求选择对应的智能体，开启高效工作之旅</p>
    </div>

    <div class="agent-list">
      <div
          class="agent-card"
          v-for="(item, index) in agentList"
          :key="index"
          @click="navigateTo(item.path)"
      >
        <div class="card-header">
          <div class="icon-wrapper" :style="{ backgroundColor: item.color }">
            <i :class="item.icon" style="color: #fff; font-size: 24px;"></i>
          </div>
          <div class="card-title-group">
            <h3>{{ item.title }}</h3>
            <span class="tag">官方</span>
          </div>
        </div>

        <div class="card-content">
          <p>{{ item.description }}</p>
        </div>

      </div>
    </div>

    <!-- 底部版权信息 -->
    <div class="home-footer">
      <span>Powered by</span>
      <span class="company-name">重庆山之南大数据科技有限公司</span>
    </div>
  </div>
</template>

<script>
export default {
  name: "Home",
  data() {
    return {
      // 定义三个智能体的数据
      agentList: [
        {
          title: "智能问数 ",
          description: "通过自然语言对话查询数据库，自动生成 SQL 并返回数据结果，支持多轮对话与历史记录。",
          icon: "el-icon-s-data",
          color: "#409EFF",
          path: "/text2sql"
        },
        {
          title: "智能填表",
          description: "根据您的指令自动识别信息并填充到指定的表格中，大幅提升数据录入效率。",
          icon: "el-icon-edit-outline",
          color: "#67C23A",
          path: "/smart-form"
        },
        {
          title: "智能问答",
          description: "基于企业私有知识库的问答助手，上传文档即可精准回答专业问题。",
          icon: "el-icon-reading",
          color: "#E6A23C",
          path: "/rag"
        }
      ]
    };
  },
  methods: {
    navigateTo(path) {
      this.$router.push(path);
    }
  }
};
</script>

<style scoped>
/* 容器样式 */
.home-container {
  padding: 40px 20px 20px; /* 左右 padding 减小，主要靠 align-items 居中 */
  background-color: #f8f8ff;
  min-height: calc(100vh - 64px);
  display: flex;
  flex-direction: column;
  align-items: center; /* 水平居中所有子元素 */
  box-sizing: border-box;
}

/* 欢迎标题样式 - 新版 */
.welcome-header {
  text-align: center;
  margin-bottom: 40px; /* 减小间距，使大屏显示更紧凑 */
  margin-top: 50px;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  z-index: 1;
  width: 100%;
}

/* 背景光晕装饰 */
.welcome-header::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 600px;
  height: 200px;
  background: radial-gradient(circle, rgba(51, 112, 255, 0.08) 0%, rgba(51, 112, 255, 0) 70%);
  z-index: -1;
  pointer-events: none;
}

.hero-title {
  font-size: 36px; /* 字体加大 */
  font-weight: 800;
  margin-bottom: 24px;
  /* 更鲜艳的渐变 */
  background: linear-gradient(135deg, #0052D4 0%, #4364F7 50%, #6FB1FC 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  width: fit-content;
  letter-spacing: -0.5px;
  /* 阴影增加立体感 */
  filter: drop-shadow(0 2px 4px rgba(0, 82, 212, 0.1));
  
  /* 入场动画 */
  opacity: 0;
  animation: fadeInUp 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
}

.hero-subtitle {
  font-size: 15px;
  color: #505050;
  background-color: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px); /* 毛玻璃质感 */
  padding: 12px 30px;
  border-radius: 50px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05); /* 更柔和的阴影 */
  display: inline-block;
  font-weight: 500;
  letter-spacing: 0.5px;
  border: 1px solid rgba(255, 255, 255, 0.8);
  transition: all 0.3s ease;
  
  /* 入场动画，带延迟 */
  opacity: 0;
  animation: fadeInUp 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) 0.2s forwards;
}

.hero-subtitle:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(51, 112, 255, 0.12); /* 悬浮时带一点色彩阴影 */
  color: #3370ff;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}


/* 卡片列表容器：Flex 布局 */
.agent-list {
  display: flex;
  justify-content: center;
  align-items: center; /* 垂直居中 - 单行 */
  align-content: center; /* 垂直居中 - 多行 */
  gap: 30px;
  flex-wrap: wrap;
  flex: 1; /* 撑开中间区域 */
  width: 100%;
  max-width: 1200px; /* 限制最大宽度，防止超大屏太散 */
  margin-bottom: 40px;
}

/* 单个卡片样式 */
.agent-card {
  background: #fff;
  width: 320px;
  /* 如果去掉按钮后觉得卡片太高，可以适当减小 height，例如改为 180px */
  height: 200px;
  border-radius: 12px;
  padding: 20px;
  /* 关键：鼠标悬浮显示为手型，提示用户可点击 */
  cursor: pointer;
  border: 1px solid #ebeef5;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);

  /* 核心：过渡动画实现立体效果 */
  transition: all 0.3s ease;
}

/* 悬浮效果：上浮 + 阴影加深 */
.agent-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.12);
  border-color: #dcdfe6;
}

/* 卡片头部 */
.card-header {
  display: flex;
  align-items: center;
  margin-bottom: 15px;
}

.icon-wrapper {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 15px;
}

.card-title-group h3 {
  margin: 0;
  font-size: 18px;
  color: #303133;
  margin-bottom: 5px;
}

.tag {
  background-color: #ecf5ff;
  color: #409EFF;
  font-size: 12px;
  padding: 2px 6px;
  border-radius: 4px;
}

/* 卡片描述 */
.card-content p {
  color: #909399;
  font-size: 14px;
  line-height: 1.6;
  margin: 0;
  /* 限制文本显示3行，多余省略 */
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  overflow: hidden;
}

/* 首页底部版权 */
.home-footer {
  text-align: center;
  padding: 24px 0;
  width: 100%;
  color: #909399; /* 稍微浅一点的灰色 */
  font-size: 12px; /* 字体小一点，更精致 */
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 6px;
  margin-top: auto;
  opacity: 0.8; /* 增加一点透明度，不抢眼 */
}
.home-footer .company-name {
  color: #606266; /* 公司名用深灰色，不用纯黑 */
  font-weight: 500;
  font-family: "PingFang SC", "Microsoft YaHei", sans-serif; /* 优化中文字体 */
}
</style>