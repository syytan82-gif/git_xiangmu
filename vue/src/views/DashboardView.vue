<template>
  <div class="dashboard-view-container" :class="{ 'is-fullscreen': isFullscreen }">
    <!-- 顶部操作栏 -->
    <div class="dashboard-toolbar">
      <div class="toolbar-left">
        <el-button size="mini" icon="el-icon-arrow-left" @click="goBack" class="back-btn">返回</el-button>
        <div class="dashboard-title-group">
          <h2 class="dashboard-title">{{ dashboardInfo.name || '数据大屏' }}</h2>
          <span class="dashboard-time">{{ currentTime }}</span>
        </div>
      </div>
      <div class="toolbar-right">
        <!-- 自动刷新状态 -->
        <span v-if="autoRefreshLabel" class="refresh-status">
          <i class="el-icon-timer"></i>
          {{ autoRefreshLabel }}
          <span v-if="nextRefreshCountdown > 0" class="countdown">（{{ nextRefreshCountdown }}s）</span>
        </span>
        <el-button size="mini" icon="el-icon-refresh" @click="refreshAll" :loading="refreshingAll">
          刷新全部
        </el-button>
        <template v-if="!isFullscreen">
          <el-button size="mini" type="primary" icon="el-icon-plus" @click="addCard">
            添加卡片
          </el-button>
          <!-- 编辑/预览切换 -->
          <el-button
            size="mini"
            :type="editMode ? 'warning' : 'info'"
            :icon="editMode ? 'el-icon-lock' : 'el-icon-edit'"
            @click="toggleEditMode"
          >
            {{ editMode ? '锁定布局' : '编辑布局' }}
          </el-button>
          <el-button size="mini" type="success" icon="el-icon-upload2" @click="saveConfig" :loading="savingConfig">
            保存配置
          </el-button>
        </template>
        <!-- 全屏按钮 -->
        <el-tooltip :content="isFullscreen ? '退出全屏' : '全屏展示'" placement="bottom">
          <el-button size="mini" :icon="isFullscreen ? 'el-icon-crop' : 'el-icon-full-screen'" @click="toggleFullscreen" class="fullscreen-btn"></el-button>
        </el-tooltip>
      </div>
    </div>

    <!-- 网格布局区域 -->
    <div class="dashboard-grid-wrapper" v-loading="pageLoading" element-loading-text="加载大屏配置...">
      <grid-layout
        v-if="layout.length > 0 || !pageLoading"
        :layout.sync="layout"
        :col-num="12"
        :row-height="rowHeight"
        :is-draggable="editMode"
        :is-resizable="editMode"
        :margin="[8, 8]"
        :use-css-transforms="true"
        :vertical-compact="true"
        :auto-size="true"
        @layout-updated="onLayoutUpdated"
        class="grid-layout-root"
      >
        <grid-item
          v-for="card in cards"
          :key="card.id"
          :x="layoutMap[card.id] ? layoutMap[card.id].x : (card.x || 0)"
          :y="layoutMap[card.id] ? layoutMap[card.id].y : (card.y || 0)"
          :w="layoutMap[card.id] ? layoutMap[card.id].w : (card.w || 2)"
          :h="layoutMap[card.id] ? layoutMap[card.id].h : (card.h || 2)"
          :i="card.id"
          :min-w="1"
          :min-h="1"
          drag-allow-from=".drag-handle"
          @resized="onCardResized(card.id)"
        >
          <DashboardCard
            :config="card"
            :data="cardDataMap[card.id] || []"
            :columns="cardColumnsMap[card.id] || []"
            :loading="cardLoadingMap[card.id] || false"
            :hasError="cardErrorMap[card.id] || false"
            :errorMsg="cardErrorMsgMap[card.id] || ''"
            :editable="editMode"
            @edit="editCard(card)"
            @delete="deleteCard(card)"
            @refresh="refreshCard(card)"
            @copy="copyCard(card)"
          />
        </grid-item>
      </grid-layout>

      <!-- 空状态 -->
      <div v-if="!pageLoading && cards.length === 0" class="empty-grid">
        <div class="empty-particles">
          <span v-for="n in 12" :key="n" class="particle" :style="getParticleStyle(n)"></span>
        </div>
        <i class="el-icon-data-board"></i>
        <p>暂无卡片，点击工具栏「添加卡片」开始配置</p>
        <el-button type="primary" size="small" icon="el-icon-plus" @click="addCard">添加第一个卡片</el-button>
      </div>
    </div>

    <!-- 卡片配置弹窗 -->
    <DashboardConfigDialog
      :visible.sync="configDialogVisible"
      :cardConfig="editingCard"
      :datasourceList="datasourceList"
      :isFullscreen="isFullscreen"
      @confirm="handleCardConfirm"
    />
  </div>
</template>

<script>
import { GridLayout, GridItem } from 'vue-grid-layout'
import DashboardCard from '@/components/DashboardCard.vue'
import DashboardConfigDialog from '@/components/DashboardConfigDialog.vue'

export default {
  name: 'DashboardView',
  components: { GridLayout, GridItem, DashboardCard, DashboardConfigDialog },
  props: {
    id: { type: [String, Number], required: true }
  },
  data() {
    return {
      pageLoading: false,
      savingConfig: false,
      refreshingAll: false,
      dashboardInfo: {},
      cards: [],      // 完整卡片配置数组（含 x, y, w, h）
      layout: [],     // vue-grid-layout 使用的布局数组（仅含 i, x, y, w, h）
      rowHeight: 40,
      // 每个卡片的独立数据和状态
      cardDataMap: {},
      cardColumnsMap: {},
      cardLoadingMap: {},
      cardErrorMap: {},
      cardErrorMsgMap: {},
      // 弹窗状态
      configDialogVisible: false,
      editingCard: null,
      // 数据源
      datasourceList: [],
      // 时间相关
      currentTime: '',
      timeTimer: null,
      // 自动刷新
      autoRefreshTimer: null,
      nextRefreshCountdown: 0,
      countdownTimer: null,
      // 布局模式
      editMode: true,
      // 全屏
      isFullscreen: false,
      fullscreenHandler: null,
      // 卡片 resize 节流
      resizeTimers: {}
    }
  },
  computed: {
    autoRefreshLabel() {
      const info = this.dashboardInfo
      if (info.refreshInterval) return `每 ${info.refreshInterval} 分钟自动刷新`
      if (info.refreshTime) return `每天 ${info.refreshTime} 自动刷新`
      return ''
    },
    // 以 card.id 为 key 的 layout 映射，供 grid-item 绑定使用
    // 这样拖拽/缩放时 layout 更新后，template 能立即取到最新值
    layoutMap() {
      const map = {}
      this.layout.forEach(item => {
        map[item.i] = item
      })
      return map
    }
  },
  created() {
    this.loadDatasourceList()
    this.loadDashboardConfig()
    this.startClock()
  },
  beforeDestroy() {
    this.stopClock()
    this.stopAutoRefresh()
    if (this.fullscreenHandler) {
      document.removeEventListener('fullscreenchange', this.fullscreenHandler)
      document.removeEventListener('webkitfullscreenchange', this.fullscreenHandler)
    }
  },
  methods: {
    // ===== 时钟 =====
    startClock() {
      this.updateTime()
      this.timeTimer = setInterval(() => this.updateTime(), 1000)
    },
    stopClock() {
      if (this.timeTimer) clearInterval(this.timeTimer)
    },
    updateTime() {
      const now = new Date()
      const pad = v => String(v).padStart(2, '0')
      this.currentTime = `${now.getFullYear()}/${pad(now.getMonth()+1)}/${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
    },

    // ===== 加载数据源 =====
    loadDatasourceList() {
      this.$request.get('/dbConfig/list').then(res => {
        if (res.code === '200') this.datasourceList = res.data || []
      }).catch(() => {})
    },

    // ===== 加载大屏配置 =====
    loadDashboardConfig() {
      this.pageLoading = true
      this.$request.get(`/dashboard/detail/${this.id}`).then(res => {
        if (res.code === '200' && res.data) {
          this.dashboardInfo = res.data
          this.parseDashboardConfig(res.data.config)
          this.setupAutoRefresh()
          this.$nextTick(() => this.refreshAll())
        } else {
          this.$message.error(res.msg || '加载大屏配置失败')
        }
      }).catch(() => {
        const saved = localStorage.getItem(`dashboard-config-${this.id}`)
        if (saved) {
          try {
            const data = JSON.parse(saved)
            this.dashboardInfo = data.info || { name: '本地大屏', id: this.id }
            this.parseDashboardConfig(data.config)
            this.setupAutoRefresh()
            this.$nextTick(() => this.refreshAll())
          } catch(e) {
            this.$message.warning('未找到大屏配置')
          }
        } else {
          this.dashboardInfo = { name: '新建大屏', id: this.id }
        }
      }).finally(() => {
        this.pageLoading = false
      })
    },

    parseDashboardConfig(configStr) {
      try {
        const config = typeof configStr === 'string' ? JSON.parse(configStr) : configStr
        const rawCards = config.cards || []
        // 将旧的 gridW/gridH 转换为新的 x/y/w/h 格式
        this.cards = rawCards.map((card, idx) => {
          const w = card.w || card.gridW || 4
          const h = card.h || Math.round((card.gridH || 2) * 2)
          const x = card.x !== undefined ? card.x : (idx * 4) % 12
          const y = card.y !== undefined ? card.y : Math.floor(idx * 4 / 12) * 4
          return { ...card, w, h, x, y }
        })
        this.syncLayout()
      } catch(e) {
        console.warn('[Dashboard] config 解析失败:', e)
        this.cards = []
        this.layout = []
      }
    },

    // 从 cards 同步 layout 数组（vue-grid-layout 格式）
    syncLayout() {
      this.layout = this.cards.map(card => ({
        i: card.id,
        x: card.x || 0,
        y: card.y || 0,
        w: card.w || 4,
        h: card.h || 4
      }))
    },

    // layout 更新时同步回 cards（使用 $set 确保 Vue 响应式）
    onLayoutUpdated(newLayout) {
      newLayout.forEach(item => {
        const idx = this.cards.findIndex(c => c.id === item.i)
        if (idx >= 0) {
          const card = this.cards[idx]
          // 只有值真正变化时才更新，避免无限循环
          if (card.x !== item.x || card.y !== item.y || card.w !== item.w || card.h !== item.h) {
            this.$set(this.cards, idx, { ...card, x: item.x, y: item.y, w: item.w, h: item.h })
          }
        }
      })
    },

    // 卡片 resize 完成时触发图表 resize
    onCardResized(cardId) {
      if (this.resizeTimers[cardId]) clearTimeout(this.resizeTimers[cardId])
      this.resizeTimers[cardId] = setTimeout(() => {
        // 通知对应卡片组件 resize
        this.$emit(`card-resize-${cardId}`)
        window.dispatchEvent(new Event('resize'))
      }, 100)
    },

    // ===== 编辑/全屏模式 =====
    toggleEditMode() {
      this.editMode = !this.editMode
      if (!this.editMode) {
        this.$message.success('已锁定布局，进入预览模式')
      } else {
        this.$message.info('已进入编辑模式，可拖拽调整卡片')
      }
    },

    toggleFullscreen() {
      const el = this.$el
      if (!this.isFullscreen) {
        if (el.requestFullscreen) el.requestFullscreen()
        else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen()
        this.isFullscreen = true
        this.editMode = false  // 全屏时自动锁定布局
        this.fullscreenHandler = () => {
          if (!document.fullscreenElement && !document.webkitFullscreenElement) {
            this.isFullscreen = false
            this.editMode = true  // 退出全屏恢复编辑模式
          }
        }
        document.addEventListener('fullscreenchange', this.fullscreenHandler)
        document.addEventListener('webkitfullscreenchange', this.fullscreenHandler)
      } else {
        if (document.exitFullscreen) document.exitFullscreen()
        else if (document.webkitExitFullscreen) document.webkitExitFullscreen()
        this.isFullscreen = false
        this.editMode = true  // 退出全屏恢复编辑模式
      }
    },

    // ===== 自动刷新 =====
    setupAutoRefresh() {
      this.stopAutoRefresh()
      const info = this.dashboardInfo
      if (info.refreshInterval && info.refreshInterval > 0) {
        const ms = info.refreshInterval * 60 * 1000
        this.nextRefreshCountdown = info.refreshInterval * 60
        this.autoRefreshTimer = setInterval(() => {
          this.refreshAll()
          this.nextRefreshCountdown = info.refreshInterval * 60
        }, ms)
        this.countdownTimer = setInterval(() => {
          if (this.nextRefreshCountdown > 0) this.nextRefreshCountdown--
        }, 1000)
      } else if (info.refreshTime) {
        this.autoRefreshTimer = setInterval(() => {
          const now = new Date()
          const hm = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`
          if (hm === info.refreshTime && now.getSeconds() === 0) this.refreshAll()
        }, 1000)
      }
    },
    stopAutoRefresh() {
      if (this.autoRefreshTimer) clearInterval(this.autoRefreshTimer)
      if (this.countdownTimer) clearInterval(this.countdownTimer)
      this.autoRefreshTimer = null
      this.countdownTimer = null
    },

    // ===== 刷新 =====
    async refreshAll() {
      this.refreshingAll = true
      const promises = this.cards.map(card => this.refreshCard(card))
      await Promise.allSettled(promises)
      this.refreshingAll = false
    },

    async refreshCard(card) {
      if (!card.sql || !card.dbConfigId) return
      this.$set(this.cardLoadingMap, card.id, true)
      this.$set(this.cardErrorMap, card.id, false)
      try {
        const res = await this.$request.post('/dashboard/executeSql', {
          sql: card.sql,
          dbConfigId: card.dbConfigId
        })
        if (res.code === '200') {
          this.$set(this.cardDataMap, card.id, res.data.data || [])
          this.$set(this.cardColumnsMap, card.id, res.data.columns || [])
        } else {
          this.$set(this.cardErrorMap, card.id, true)
          this.$set(this.cardErrorMsgMap, card.id, res.msg || '查询失败')
        }
      } catch(err) {
        this.$set(this.cardErrorMap, card.id, true)
        this.$set(this.cardErrorMsgMap, card.id, (err && err.msg) || '请求失败')
      } finally {
        this.$set(this.cardLoadingMap, card.id, false)
      }
    },

    // ===== 卡片操作 =====
    addCard() {
      this.editingCard = null
      this.configDialogVisible = true
    },

    editCard(card) {
      this.editingCard = JSON.parse(JSON.stringify(card))
      this.configDialogVisible = true
    },

    deleteCard(card) {
      this.$confirm('确定删除此卡片？', '提示', { type: 'warning' }).then(() => {
        this.cards = this.cards.filter(c => c.id !== card.id)
        this.syncLayout()
        this.$delete(this.cardDataMap, card.id)
        this.$delete(this.cardColumnsMap, card.id)
        this.$message.success('已删除')
      }).catch(() => {})
    },

    copyCard(card) {
      const newCard = JSON.parse(JSON.stringify(card))
      newCard.id = 'card_' + Date.now()
      newCard.title = newCard.title + '（副本）'
      // 放在原卡片下方
      newCard.y = (newCard.y || 0) + (newCard.h || 4)
      newCard.x = newCard.x || 0
      this.cards.push(newCard)
      this.syncLayout()
      this.$nextTick(() => this.refreshCard(newCard))
      this.$message.success('卡片已复制')
    },

    handleCardConfirm(cardConfig) {
      const existIdx = this.cards.findIndex(c => c.id === cardConfig.id)
      if (existIdx >= 0) {
        this.$set(this.cards, existIdx, { ...this.cards[existIdx], ...cardConfig })
      } else {
        // 新增：放在最后一行的空白处
        const maxY = this.layout.reduce((max, item) => Math.max(max, item.y + item.h), 0)
        cardConfig.x = 0
        cardConfig.y = maxY
        cardConfig.w = cardConfig.w || 4
        cardConfig.h = cardConfig.h || 4
        this.cards.push(cardConfig)
      }
      this.syncLayout()
      this.$nextTick(() => this.refreshCard(cardConfig))
    },

    // ===== 保存配置 =====
    async saveConfig() {
      this.savingConfig = true
      const config = JSON.stringify({ cards: this.cards })
      try {
        const res = await this.$request.post('/dashboard/save', {
          id: this.dashboardInfo.id || this.id,
          name: this.dashboardInfo.name,
          description: this.dashboardInfo.description,
          refreshInterval: this.dashboardInfo.refreshInterval || null,
          refreshTime: this.dashboardInfo.refreshTime || null,
          config: config
        })
        if (res.code === '200') {
          this.$message.success('保存成功')
        } else {
          this.$message.error(res.msg || '保存失败')
        }
      } catch(err) {
        localStorage.setItem(`dashboard-config-${this.id}`, JSON.stringify({
          info: this.dashboardInfo,
          config: config
        }))
        this.$message.success('保存成功（本地存储）')
      } finally {
        this.savingConfig = false
      }
    },

    async goBack() {
      try {
        await this.saveConfig()
      } finally {
        this.$router.push('/dashboard')
      }
    },

    // 空状态粒子样式
    getParticleStyle(n) {
      const angle = (n / 12) * 360
      const r = 80 + Math.random() * 40
      return {
        left: `calc(50% + ${Math.cos(angle * Math.PI / 180) * r}px)`,
        top: `calc(50% + ${Math.sin(angle * Math.PI / 180) * r}px)`,
        animationDelay: `${(n * 0.3).toFixed(1)}s`,
        width: `${3 + (n % 3)}px`,
        height: `${3 + (n % 3)}px`
      }
    }
  }
}
</script>

<style scoped>
/* ===== 容器 ===== */
.dashboard-view-container {
  background:
    radial-gradient(ellipse at 15% 50%, rgba(64,158,255,0.06) 0%, transparent 55%),
    radial-gradient(ellipse at 85% 20%, rgba(139,92,246,0.06) 0%, transparent 55%),
    linear-gradient(135deg, #060d18 0%, #0d1b2e 50%, #060d18 100%);
  background-image:
    linear-gradient(rgba(64,158,255,0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(64,158,255,0.04) 1px, transparent 1px),
    radial-gradient(ellipse at 15% 50%, rgba(64,158,255,0.06) 0%, transparent 55%),
    radial-gradient(ellipse at 85% 20%, rgba(139,92,246,0.06) 0%, transparent 55%),
    linear-gradient(135deg, #060d18 0%, #0d1b2e 50%, #060d18 100%);
  background-size: 40px 40px, 40px 40px, 100% 100%, 100% 100%, 100% 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.dashboard-view-container.is-fullscreen {
  position: fixed;
  inset: 0;
  z-index: 9999;
}

/* ===== 工具栏 ===== */
.dashboard-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 16px;
  background: linear-gradient(135deg, #0a1e38 0%, #122d50 50%, #0a1e38 100%);
  border-bottom: 1px solid rgba(64, 158, 255, 0.25);
  flex-shrink: 0;
  height: 44px;
}
.toolbar-left {
  display: flex;
  align-items: center;
  gap: 14px;
}
.back-btn {
  border: 1px solid rgba(255, 255, 255, 0.15) !important;
  background: rgba(255, 255, 255, 0.06) !important;
  color: rgba(255, 255, 255, 0.7) !important;
  border-radius: 4px;
  transition: all 0.2s;
}
.back-btn:hover {
  background: rgba(255, 255, 255, 0.12) !important;
  color: #fff !important;
}
.dashboard-title-group {
  display: flex;
  align-items: baseline;
  gap: 14px;
}
.dashboard-title {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  background: linear-gradient(90deg, #e8f4ff, #90caf9, #e8f4ff);
  background-size: 200% auto;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: shine 4s linear infinite;
  letter-spacing: 1px;
}
@keyframes shine {
  0% { background-position: 200% center; }
  100% { background-position: -200% center; }
}
.dashboard-time {
  font-size: 12px;
  color: rgba(144, 202, 249, 0.7);
  font-variant-numeric: tabular-nums;
}
.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}
.toolbar-right .el-button {
  border: 1px solid rgba(255, 255, 255, 0.15) !important;
  background: rgba(255, 255, 255, 0.06) !important;
  color: rgba(255, 255, 255, 0.8) !important;
}
.toolbar-right .el-button:hover {
  background: rgba(255, 255, 255, 0.12) !important;
  color: #fff !important;
}
.toolbar-right .el-button--primary {
  background: rgba(64, 158, 255, 0.25) !important;
  border-color: rgba(64, 158, 255, 0.5) !important;
  color: #8cc8ff !important;
}
.toolbar-right .el-button--primary:hover {
  background: rgba(64, 158, 255, 0.45) !important;
  color: #fff !important;
}
.toolbar-right .el-button--success {
  background: rgba(103, 194, 58, 0.2) !important;
  border-color: rgba(103, 194, 58, 0.4) !important;
  color: #95d475 !important;
}
.toolbar-right .el-button--warning {
  background: rgba(230, 162, 60, 0.2) !important;
  border-color: rgba(230, 162, 60, 0.4) !important;
  color: #f0c060 !important;
}
.fullscreen-btn {
  padding: 7px 8px !important;
}
.refresh-status {
  font-size: 12px;
  color: #67c23a;
  display: flex;
  align-items: center;
  gap: 4px;
  margin-right: 4px;
}
.countdown {
  color: rgba(255, 255, 255, 0.5);
}

/* ===== 网格布局区域 ===== */
.dashboard-grid-wrapper {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
  box-sizing: border-box;
  /* 自定义滚动条 */
  scrollbar-width: thin;
  scrollbar-color: rgba(64,158,255,0.3) transparent;
}
.dashboard-grid-wrapper::-webkit-scrollbar {
  width: 6px;
}
.dashboard-grid-wrapper::-webkit-scrollbar-thumb {
  background: rgba(64,158,255,0.3);
  border-radius: 3px;
}
.dashboard-grid-wrapper::-webkit-scrollbar-track {
  background: transparent;
}

.grid-layout-root {
  min-height: calc(100% - 16px);
}

/* vue-grid-layout 拖拽占位样式 */
::v-deep .vue-grid-item.vue-grid-placeholder {
  background: rgba(64, 158, 255, 0.15) !important;
  border: 2px dashed rgba(64, 158, 255, 0.5) !important;
  border-radius: 6px;
}
/* 确保 grid-item 正确的定位上下文 */
::v-deep .vue-grid-item {
  overflow: visible !important;
}
::v-deep .vue-resizable-handle {
  opacity: 0;
  transition: opacity 0.2s;
  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10'%3E%3Cpath d='M0 10L10 0M5 10L10 5' stroke='%234099ff' stroke-width='1.5'/%3E%3C/svg%3E") no-repeat right bottom;
  bottom: 0;
  right: 0;
  width: 20px !important;
  height: 20px !important;
  z-index: 10;
  cursor: se-resize;
}
::v-deep .vue-grid-item:hover .vue-resizable-handle {
  opacity: 1;
}

/* ===== 空状态 ===== */
.empty-grid {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.3);
  font-size: 14px;
  gap: 16px;
  padding: 120px 0;
  min-height: 400px;
}
.empty-grid i {
  font-size: 56px;
  color: rgba(64, 158, 255, 0.3);
}

/* 动态粒子 */
.empty-particles {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.particle {
  position: absolute;
  border-radius: 50%;
  background: rgba(64, 158, 255, 0.5);
  animation: float 3s ease-in-out infinite alternate;
  transform: translate(-50%, -50%);
}
@keyframes float {
  0% { opacity: 0.3; transform: translate(-50%, -50%) scale(1); }
  100% { opacity: 0.8; transform: translate(-50%, -50%) scale(1.5); }
}

/* ===== Loading 深色主题 ===== */
::v-deep .el-loading-mask {
  background-color: rgba(6, 13, 24, 0.85);
}
::v-deep .el-loading-text {
  color: rgba(255, 255, 255, 0.6);
}
::v-deep .el-loading-spinner .path {
  stroke: #409EFF;
}
</style>
