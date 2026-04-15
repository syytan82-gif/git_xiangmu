<template>
  <div class="dashboard-view-container">
    <!-- 顶部操作栏 -->
    <div class="dashboard-toolbar">
      <div class="toolbar-left">
        <el-button size="mini" icon="el-icon-arrow-left" @click="goBack" class="back-btn">返回</el-button>
        <div class="dashboard-title-group">
          <h2 class="dashboard-title">{{ dashboardInfo.name || '数据大屏' }}</h2>
          <span class="dashboard-time">当前时间 {{ currentTime }}</span>
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
        <el-button size="mini" type="primary" icon="el-icon-plus" @click="addCard">
          添加卡片
        </el-button>
        <el-button size="mini" type="success" icon="el-icon-upload2" @click="saveConfig" :loading="savingConfig">
          保存配置
        </el-button>
      </div>
    </div>

    <!-- 卡片网格区域 -->
    <div class="dashboard-grid" v-loading="pageLoading" element-loading-text="加载大屏配置...">
      <!--
        布局策略：CSS Grid 自动流式排列
        - 4 列等宽网格
        - 每行固定高度 280px
        - 每张卡片只控制「跨几列 / 跨几行」，不指定绝对位置
        - CSS Grid 自动按顺序从左到右、从上到下排列
      -->
      <div
        v-for="card in cards"
        :key="card.id"
        :style="getCardSpanStyle(card)"
        class="grid-cell"
      >
        <DashboardCard
          :config="card"
          :data="cardDataMap[card.id] || []"
          :columns="cardColumnsMap[card.id] || []"
          :loading="cardLoadingMap[card.id] || false"
          :hasError="cardErrorMap[card.id] || false"
          :errorMsg="cardErrorMsgMap[card.id] || ''"
          :editable="true"
          @edit="editCard(card)"
          @delete="deleteCard(card)"
          @refresh="refreshCard(card)"
        />
      </div>

      <!-- 空状态 -->
      <div v-if="!pageLoading && cards.length === 0" class="empty-grid">
        <i class="el-icon-data-board"></i>
        <p>暂无卡片，点击"添加卡片"开始配置</p>
      </div>
    </div>

    <!-- 卡片配置弹窗 -->
    <DashboardConfigDialog
      :visible.sync="configDialogVisible"
      :cardConfig="editingCard"
      :datasourceList="datasourceList"
      @confirm="handleCardConfirm"
    />
  </div>
</template>

<script>
import DashboardCard from '@/components/DashboardCard.vue'
import DashboardConfigDialog from '@/components/DashboardConfigDialog.vue'

export default {
  name: 'DashboardView',
  components: { DashboardCard, DashboardConfigDialog },
  props: {
    id: { type: [String, Number], required: true }
  },
  data() {
    return {
      pageLoading: false,
      savingConfig: false,
      refreshingAll: false,
      dashboardInfo: {},
      cards: [],
      gridColumns: 3,
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
      countdownTimer: null
    }
  },
  computed: {
    autoRefreshLabel() {
      const info = this.dashboardInfo
      if (info.refreshInterval) {
        return `每 ${info.refreshInterval} 分钟自动刷新`
      }
      if (info.refreshTime) {
        return `每天 ${info.refreshTime} 自动刷新`
      }
      return ''
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
      const y = now.getFullYear()
      const m = String(now.getMonth() + 1).padStart(2, '0')
      const d = String(now.getDate()).padStart(2, '0')
      const h = String(now.getHours()).padStart(2, '0')
      const min = String(now.getMinutes()).padStart(2, '0')
      const s = String(now.getSeconds()).padStart(2, '0')
      this.currentTime = `${y}/${m}/${d} ${h}:${min}:${s}`
    },

    // ===== 加载数据源 =====
    loadDatasourceList() {
      this.$request.get('/dbConfig/list').then(res => {
        if (res.code === '200') {
          this.datasourceList = res.data || []
        }
      }).catch(() => { /* silent */ })
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
        this.gridColumns = config.gridColumns || 4
        this.cards = config.cards || []
      } catch(e) {
        console.warn('[Dashboard] config 解析失败:', e)
        this.cards = []
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
          const hm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
          if (hm === info.refreshTime && now.getSeconds() === 0) {
            this.refreshAll()
          }
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
        this.$delete(this.cardDataMap, card.id)
        this.$delete(this.cardColumnsMap, card.id)
        this.$message.success('已删除')
      }).catch(() => {})
    },

    handleCardConfirm(cardConfig) {
      const existIdx = this.cards.findIndex(c => c.id === cardConfig.id)
      if (existIdx >= 0) {
        // 更新已有卡片
        this.$set(this.cards, existIdx, cardConfig)
      } else {
        // 新增卡片（不设置 gridX/gridY，由 CSS Grid 自动排列）
        this.cards.push(cardConfig)
      }
      // 立即执行该卡片的 SQL
      this.$nextTick(() => this.refreshCard(cardConfig))
    },

    // ===== 保存配置 =====
    async saveConfig() {
      this.savingConfig = true
      const config = JSON.stringify({
        gridColumns: this.gridColumns,
        cards: this.cards
      })

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

    // ===== 导航 =====
    goBack() {
      this.$router.push('/dashboard')
    },

    /**
     * 卡片布局：只设置 span（跨几列/跨几行），不设置绝对 gridColumn/gridRow 起始位置
     * CSS Grid 的 auto-flow 会自动按顺序从左到右/从上到下排列
     *
     * 例如：gridW=2, gridH=1 → grid-column: span 2; grid-row: span 1;
     * 这表示该卡片占 2 列宽、1 行高，但具体放在哪一格由浏览器自动计算
     */
    getCardSpanStyle(card) {
      const w = Math.min(card.gridW || 1, this.gridColumns)
      // gridH 支持 0.5 步长，底层网格是 6 行（每个视觉行 = 2 个网格行）
      const h = Math.round((card.gridH || 1) * 2)
      return {
        gridColumn: `span ${w}`,
        gridRow: `span ${h}`
      }
    }
  }
}
</script>

<style scoped>
.dashboard-view-container {
  background: #0d1b2a;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* ===== 顶部工具栏 ===== */
.dashboard-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 16px;
  background: linear-gradient(135deg, #0f2847 0%, #1a3a5c 50%, #0f2847 100%);
  border-bottom: 1px solid rgba(64, 158, 255, 0.2);
  flex-shrink: 0;
  min-height: 36px;
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
  color: #e8f4ff;
  letter-spacing: 1px;
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
  background: rgba(64, 158, 255, 0.3) !important;
  border-color: rgba(64, 158, 255, 0.5) !important;
  color: #8cc8ff !important;
}
.toolbar-right .el-button--primary:hover {
  background: rgba(64, 158, 255, 0.5) !important;
  color: #fff !important;
}
.toolbar-right .el-button--success {
  background: rgba(103, 194, 58, 0.2) !important;
  border-color: rgba(103, 194, 58, 0.4) !important;
  color: #95d475 !important;
}
.toolbar-right .el-button--success:hover {
  background: rgba(103, 194, 58, 0.35) !important;
  color: #fff !important;
}
.refresh-status {
  font-size: 12px;
  color: #67c23a;
  display: flex;
  align-items: center;
  gap: 4px;
  margin-right: 8px;
}
.countdown {
  color: rgba(255, 255, 255, 0.5);
}

/* ===== 网格布局：3列 x 6行（支持0.5行高）铺满视口 ===== */
.dashboard-grid {
  flex: 1;
  overflow-y: auto;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  /* 6 个网格行 = 3 个视觉行，工具栏48px + padding 16px + gap 5*4px=20px */
  grid-auto-rows: calc((100vh - 48px - 16px - 20px) / 6);
  grid-auto-flow: row dense;
  gap: 4px;
  padding: 8px;
  align-content: start;
}

/* 网格单元格 */
.grid-cell {
  min-height: 0;
  min-width: 0;
}

/* 空网格 */
.empty-grid {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.3);
  font-size: 14px;
  gap: 12px;
  padding: 80px 0;
}
.empty-grid i {
  font-size: 48px;
  color: rgba(64, 158, 255, 0.3);
}

/* ===== 深色主题 loading ===== */
::v-deep .el-loading-mask {
  background-color: rgba(13, 27, 42, 0.85);
}
::v-deep .el-loading-text {
  color: rgba(255, 255, 255, 0.6);
}
::v-deep .el-loading-spinner .path {
  stroke: #409EFF;
}
</style>
