<template>
  <img 
    v-if="blobUrl"
    :src="blobUrl" 
    v-bind="$attrs"
    @load="onLoad"
    @error="onError"
  />
  <div v-else-if="loading" class="loading-placeholder">
    <i class="el-icon-loading"></i>
  </div>
  <div v-else-if="error" class="error-placeholder">
    <i class="el-icon-picture-outline"></i>
  </div>
</template>

<script>
export default {
  name: 'ProxyImage',
  inheritAttrs: false,
  props: {
    src: {
      type: String,
      required: true
    }
  },
  data() {
    return {
      blobUrl: null,
      loading: false,
      error: false
    }
  },
  watch: {
    src: {
      immediate: true,
      handler(newSrc) {
        this.loadImage(newSrc);
      }
    }
  },
  beforeDestroy() {
    if (this.blobUrl) {
      URL.revokeObjectURL(this.blobUrl);
    }
  },
  methods: {
    async loadImage(src) {
      console.log('[ProxyImage] 开始加载:', src);
      
      if (!src) {
        this.error = true;
        console.error('[ProxyImage] src 为空');
        return;
      }

      // 清理旧的 Blob URL
      if (this.blobUrl) {
        URL.revokeObjectURL(this.blobUrl);
        this.blobUrl = null;
      }

      // 如果不是 http URL，尝试补全为带后端的完整路径，但在此项目中我们假设上层传入已经是 full path 或需要 fetch 携带 token 的地址
      if (!src.startsWith('http')) {
        console.log('[ProxyImage] 非 HTTP URL:', src);
        // 若业务不需要必须 fetch（如本地相对路径静态资源），可以直接用。但头像等通常是带鉴权的远程地址
        // this.blobUrl = src;
        // return;
      }

      this.loading = true;
      this.error = false;

      try {
        // 使用 fetch 请求图片，可以带自定义 header
        const user = JSON.parse(localStorage.getItem('xm-user') || '{}');
        
        console.log('[ProxyImage] 发起 fetch 请求:', src);
        console.log('[ProxyImage] Headers:', {
          'ngrok-skip-browser-warning': 'true',
          'token': user.token ? '***' : 'empty'
        });
        
        const response = await fetch(src, {
          method: 'GET',
          headers: {
            'ngrok-skip-browser-warning': 'true',
            'token': user.token || ''
          }
        });

        console.log('[ProxyImage] Fetch 响应:', response.status, response.statusText);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        // 检查响应的内容类型
        const contentType = response.headers.get('content-type');
        console.log('[ProxyImage] Content-Type:', contentType);
        
        if (contentType && contentType.includes('text/html')) {
          throw new Error(`请求结果是网页，可能是 404 错误页面。`);
        }
        if (contentType && contentType.includes('application/json')) {
          throw new Error(`请求结果是 JSON，可能是报错信息。`);
        }

        // 获取 Blob
        const blob = await response.blob();
        console.log('[ProxyImage] Blob 大小:', blob.size, 'bytes, 类型:', blob.type);
        
        // 创建 Blob URL
        this.blobUrl = URL.createObjectURL(blob);
        this.loading = false;
        
        console.log('[ProxyImage] ✅ 成功创建 Blob URL:', this.blobUrl);
      } catch (err) {
        console.error('[ProxyImage] ❌ 加载失败:', src);
        console.error('[ProxyImage] 错误详情:', err.message || err);
        this.error = true;
        this.loading = false;
        // 关键修复：一旦失败，清理这无用的 blobUrl，防止原本 <img v-if="blobUrl"> 继续渲染，从而露出原生系统的碎图占位符
        if (this.blobUrl) {
            URL.revokeObjectURL(this.blobUrl);
            this.blobUrl = null;
        }
      }
    },
    onLoad() {
      this.$emit('load');
    },
    onError(e) {
      console.error('[ProxyImage] ❌ 原生图片标签加载 onerror 触发:', this.blobUrl || this.src, e);
      this.error = true;
      this.loading = false;
      // 抹除错误地址，切入 v-else-if 的自制占位符图标
      this.blobUrl = null;
      this.$emit('error', e);
    }
  }
}
</script>

<style scoped>
.loading-placeholder,
.error-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  background-color: #f5f7fa;
  color: #909399;
}

.loading-placeholder i,
.error-placeholder i {
  font-size: 20px;
}
</style>
