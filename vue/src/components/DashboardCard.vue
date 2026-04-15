<template>
  <div class="dashboard-card" :class="{ 'is-loading': loading, 'is-error': hasError }">
    <!-- 卡片头部 -->
    <div class="card-header">
      <span class="card-title" :title="config.title">{{ config.title || '未命名卡片' }}</span>
      <div class="card-actions" v-if="editable">
        <el-tooltip content="刷新" placement="top" :open-delay="300">
          <i class="el-icon-refresh action-icon" @click="$emit('refresh')"></i>
        </el-tooltip>
        <el-tooltip content="编辑" placement="top" :open-delay="300">
          <i class="el-icon-edit action-icon" @click="$emit('edit')"></i>
        </el-tooltip>
        <el-tooltip content="删除" placement="top" :open-delay="300">
          <i class="el-icon-delete action-icon delete-icon" @click="$emit('delete')"></i>
        </el-tooltip>
      </div>
    </div>

    <!-- 加载中 -->
    <div v-if="loading" class="card-loading">
      <i class="el-icon-loading"></i>
      <span>数据加载中...</span>
    </div>

    <!-- 错误状态 -->
    <div v-else-if="hasError" class="card-error">
      <i class="el-icon-warning-outline"></i>
      <span>{{ errorMsg }}</span>
      <el-button size="mini" type="text" @click="$emit('refresh')">重试</el-button>
    </div>

    <!-- 空状态（SQL 未配置） -->
    <div v-else-if="!config.sql" class="card-empty">
      <i class="el-icon-edit-outline"></i>
      <span>请点击编辑按钮配置此卡片</span>
    </div>

    <!-- 表格模式 -->
    <div v-else-if="config.displayMode === 'table'" class="card-content table-mode">
      <el-table
        :data="tableData"
        stripe
        border
        size="mini"
        height="100%"
        style="width: 100%"
        :header-cell-style="{ background: '#f5f7fa', color: '#606266', fontWeight: '600', fontSize: '12px' }"
        :cell-style="{ fontSize: '12px', padding: '4px 0' }"
      >
        <el-table-column
          v-for="col in columns"
          :key="col.name"
          :prop="col.name"
          :label="col.name"
          :min-width="getColumnWidth(col)"
          show-overflow-tooltip
          :align="isNumeric(col) ? 'right' : 'left'"
        >
          <template slot-scope="scope">
            <span :class="{ 'num-cell': isNumeric(col) }">{{ formatCell(scope.row[col.name], col) }}</span>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 图表模式 -->
    <div v-else-if="config.displayMode === 'chart'" class="card-content chart-mode">
      <!-- 用 position:relative 的容器包一层，内部用绝对定位撑满 -->
      <div class="chart-wrapper">
        <div ref="chartRef" class="chart-container"></div>
      </div>
    </div>
  </div>
</template>

<script>
import * as echarts from 'echarts'

export default {
  name: 'DashboardCard',
  props: {
    config: {
      type: Object,
      required: true
    },
    data: {
      type: Array,
      default: () => []
    },
    columns: {
      type: Array,
      default: () => []
    },
    loading: {
      type: Boolean,
      default: false
    },
    hasError: {
      type: Boolean,
      default: false
    },
    errorMsg: {
      type: String,
      default: '数据加载失败'
    },
    editable: {
      type: Boolean,
      default: true
    }
  },
  data() {
    return {
      chartInstance: null,
      resizeObserver: null
    }
  },
  computed: {
    tableData() {
      return this.data || []
    }
  },
  watch: {
    data: {
      handler() {
        if (this.config.displayMode === 'chart') {
          this.$nextTick(() => this.safeRenderChart())
        }
      },
      deep: true
    },
    // 监听整个 config 对象变化（包括 gridW/gridH 变化时重新 resize）
    config: {
      handler(newVal, oldVal) {
        if (newVal.displayMode === 'chart') {
          // 如果尺寸变了（gridW 或 gridH），需要延迟 resize
          const sizeChanged = !oldVal ||
            newVal.gridW !== oldVal.gridW ||
            newVal.gridH !== oldVal.gridH
          if (sizeChanged) {
            // 尺寸变化后，DOM 需要时间重新布局，多次延迟确保 resize 生效
            this.$nextTick(() => {
              setTimeout(() => this.safeRenderChart(), 100)
            })
          } else {
            // chartConfig 等其他属性变化
            this.$nextTick(() => this.safeRenderChart())
          }
        }
      },
      deep: true
    }
  },
  mounted() {
    if (this.config.displayMode === 'chart' && this.data.length > 0) {
      this.$nextTick(() => this.safeRenderChart())
    }
    // 使用 ResizeObserver 监听容器尺寸变化（比 window resize 更精确）
    this.setupResizeObserver()
  },
  beforeDestroy() {
    this.disposeChart()
    this.teardownResizeObserver()
  },
  methods: {
    isNumeric(col) {
      if (!col || !col.type) return false
      const t = col.type.toUpperCase()
      return ['INT', 'INTEGER', 'DECIMAL', 'FLOAT', 'DOUBLE', 'NUMERIC', 'BIGINT', 'NUMBER'].some(k => t.includes(k))
    },

    getColumnWidth(col) {
      const name = col.name || ''
      if (name.length <= 2) return 60
      if (name.length <= 4) return 80
      return 100
    },

    formatCell(value, col) {
      if (value == null || value === '') return '—'
      if (this.isNumeric(col)) {
        const num = Number(value)
        if (isNaN(num)) return value
        if (col.name && (col.name.includes('率') || col.name.includes('%'))) {
          return num.toFixed(1) + '%'
        }
        if (Number.isInteger(num)) return num.toLocaleString()
        return num.toFixed(2)
      }
      return value
    },

    // 设置 ResizeObserver 监听卡片容器尺寸变化
    setupResizeObserver() {
      if (typeof ResizeObserver === 'undefined') {
        // 兜底：用 window resize
        window.addEventListener('resize', this.handleResize)
        return
      }
      this.resizeObserver = new ResizeObserver(() => {
        this.handleResize()
      })
      this.resizeObserver.observe(this.$el)
    },

    teardownResizeObserver() {
      if (this.resizeObserver) {
        this.resizeObserver.disconnect()
        this.resizeObserver = null
      }
      window.removeEventListener('resize', this.handleResize)
    },

    handleResize() {
      if (this.chartInstance && !this.chartInstance.isDisposed()) {
        this.chartInstance.resize()
      }
    },

    disposeChart() {
      if (this.chartInstance) {
        if (!this.chartInstance.isDisposed()) {
          this.chartInstance.dispose()
        }
        this.chartInstance = null
      }
    },

    /**
     * 安全渲染图表：先确保旧实例被正确销毁，再重新初始化
     * 解决编辑卡片后图表不显示的问题
     */
    safeRenderChart() {
      const chartRef = this.$refs.chartRef
      if (!chartRef) return
      if (!this.data || this.data.length === 0) return

      const cc = this.config.chartConfig
      if (!cc || !cc.xAxisField || !cc.yAxisFields || cc.yAxisFields.length === 0) return

      // 检查容器是否有有效尺寸（没有尺寸说明 DOM 还没布局好）
      if (chartRef.offsetWidth === 0 || chartRef.offsetHeight === 0) {
        // 延迟重试
        setTimeout(() => this.safeRenderChart(), 200)
        return
      }

      // 构建 ECharts option
      const option = this.buildChartOption(cc)

      // 销毁旧实例并重新创建（确保容器匹配）
      this.disposeChart()
      this.chartInstance = echarts.init(chartRef)
      this.chartInstance.setOption(option)
    },

    /**
     * 核心方法：构建 ECharts option
     * 支持混合图表（柱状+折线+双Y轴）
     */
    buildChartOption(cc) {
      const data = this.data
      const xAxisField = cc.xAxisField
      const yAxisFields = cc.yAxisFields || []
      const seriesTypes = cc.seriesTypes || {}
      const useSecondaryYAxis = cc.useSecondaryYAxis || {}
      const stacked = cc.stacked || false

      // X 轴数据
      const xData = data.map(row => row[xAxisField] != null ? String(row[xAxisField]) : '')

      // 配色（高对比度，相邻颜色差异明显）
      const colorPalette = [
        '#3B82F6', '#F59E0B', '#8B5CF6', '#10B981',
        '#EF4444', '#06B6D4', '#EC4899', '#84CC16',
        '#6366F1', '#14B8A6'
      ]

      // 判断是否需要副 Y 轴
      const hasSecondaryY = yAxisFields.some(f => useSecondaryYAxis[f])

      // 构建 series
      const series = yAxisFields.map((field, idx) => {
        const type = seriesTypes[field] || 'bar'
        const isSecondary = useSecondaryYAxis[field] || false

        const seriesItem = {
          name: field,
          type: type,
          data: data.map(row => {
            const val = row[field]
            return val != null ? Number(val) : 0
          }),
          yAxisIndex: isSecondary ? 1 : 0,
          itemStyle: { color: colorPalette[idx % colorPalette.length] }
        }

        if (type === 'bar' && stacked) {
          seriesItem.stack = 'total'
        }
        if (type === 'line') {
          seriesItem.smooth = true
          seriesItem.lineStyle = { width: 2.5 }
          seriesItem.symbol = 'circle'
          seriesItem.symbolSize = 6
        }
        if (type === 'bar') {
          seriesItem.barMaxWidth = 40
          seriesItem.itemStyle.borderRadius = [2, 2, 0, 0]
        }

        return seriesItem
      })

      // 构建 Y 轴（深色主题配色）
      const yAxis = [{
        type: 'value',
        splitLine: { lineStyle: { type: 'dashed', color: 'rgba(255,255,255,0.08)' } },
        axisLabel: { fontSize: 11, color: 'rgba(255,255,255,0.5)' },
        axisLine: { show: false },
        axisTick: { show: false }
      }]

      if (hasSecondaryY) {
        const secondaryFields = yAxisFields.filter(f => useSecondaryYAxis[f])
        const isPercent = secondaryFields.some(f => f.includes('率') || f.includes('%'))
        yAxis.push({
          type: 'value',
          splitLine: { show: false },
          axisLabel: {
            fontSize: 11,
            color: 'rgba(255,255,255,0.5)',
            formatter: isPercent ? '{value}%' : '{value}'
          },
          axisLine: { show: false },
          axisTick: { show: false }
        })

        // ===== 双轴零线对齐 =====
        let pMin = Infinity, pMax = -Infinity
        let sMin = Infinity, sMax = -Infinity
        yAxisFields.forEach(field => {
          const vals = data.map(row => {
            const v = row[field]; return v != null ? Number(v) : 0
          })
          const lo = Math.min(...vals)
          const hi = Math.max(...vals)
          if (useSecondaryYAxis[field]) {
            sMin = Math.min(sMin, lo)
            sMax = Math.max(sMax, hi)
          } else {
            pMin = Math.min(pMin, lo)
            pMax = Math.max(pMax, hi)
          }
        })
        // 当至少一个轴有负值时，扩展另一轴使零线位置一致
        if ((pMin < 0 || sMin < 0) && pMax > pMin && sMax > sMin) {
          pMin = Math.min(pMin, 0); pMax = Math.max(pMax, 0)
          sMin = Math.min(sMin, 0); sMax = Math.max(sMax, 0)
          const pZero = -pMin / (pMax - pMin)
          const sZero = -sMin / (sMax - sMin)
          const target = Math.max(pZero, sZero)
          if (pZero < target && target < 1) {
            pMin = -target * pMax / (1 - target)
          }
          if (sZero < target && target < 1) {
            sMin = -target * sMax / (1 - target)
          }
          yAxis[0].min = pMin
          yAxis[0].max = pMax
          yAxis[1].min = sMin
          yAxis[1].max = sMax
        }
      }

      return {
        tooltip: {
          trigger: 'axis',
          axisPointer: { type: 'cross', crossStyle: { color: 'rgba(255,255,255,0.3)' } },
          backgroundColor: 'rgba(20, 40, 72, 0.95)',
          borderColor: 'rgba(64, 158, 255, 0.3)',
          borderWidth: 1,
          textStyle: { color: '#e8f4ff', fontSize: 12 },
          padding: [8, 12]
        },
        legend: {
          data: yAxisFields,
          bottom: 0,
          textStyle: { fontSize: 11, color: 'rgba(255,255,255,0.6)' },
          itemHeight: 10,
          itemWidth: 14,
          itemGap: 16
        },
        grid: {
          top: 12,
          right: hasSecondaryY ? 50 : 20,
          bottom: 36,
          left: 10,
          containLabel: true
        },
        xAxis: {
          type: 'category',
          data: xData,
          axisLabel: {
            fontSize: 11,
            color: 'rgba(255,255,255,0.5)',
            rotate: xData.length > 15 ? 45 : 0,
            interval: xData.length > 30 ? 'auto' : 0
          },
          axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
          axisTick: { alignWithLabel: true, lineStyle: { color: 'rgba(255,255,255,0.1)' } }
        },
        yAxis: yAxis,
        series: series
      }
    }
  }
}
</script>

<style scoped>
/* ===== 深色科技主题卡片 ===== */
.dashboard-card {
  background: rgba(15, 40, 71, 0.6);
  border-radius: 6px;
  border: 1px solid rgba(64, 158, 255, 0.15);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  height: 100%;
  transition: all 0.3s;
  backdrop-filter: blur(8px);
}
.dashboard-card:hover {
  border-color: rgba(64, 158, 255, 0.35);
  box-shadow: 0 0 20px rgba(64, 158, 255, 0.08);
}

/* 头部 */
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 12px;
  background: rgba(64, 158, 255, 0.08);
  border-bottom: 1px solid rgba(64, 158, 255, 0.1);
  flex-shrink: 0;
  min-height: 32px;
}
.card-title {
  font-size: 13px;
  font-weight: 600;
  color: #e8f4ff;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  letter-spacing: 0.5px;
}
.card-actions {
  display: flex;
  gap: 6px;
  opacity: 0;
  transition: opacity 0.2s;
}
.dashboard-card:hover .card-actions {
  opacity: 1;
}
.action-icon {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  padding: 2px;
  border-radius: 4px;
  transition: all 0.2s;
}
.action-icon:hover {
  color: #409EFF;
  background: rgba(64, 158, 255, 0.15);
}
.delete-icon:hover {
  color: #F56C6C;
  background: rgba(245, 108, 108, 0.15);
}

/* 内容区 */
.card-content {
  flex: 1;
  overflow: hidden;
  min-height: 0;
}

/* 表格模式 */
.table-mode {
  padding: 0;
}
.num-cell {
  font-variant-numeric: tabular-nums;
  font-family: 'Consolas', 'Monaco', monospace;
}

/* 图表模式 */
.chart-mode {
  padding: 4px;
}
.chart-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
}
.chart-container {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}

/* 加载/错误/空状态 */
.card-loading, .card-error, .card-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: rgba(255, 255, 255, 0.4);
  font-size: 13px;
}
.card-loading i, .card-error i, .card-empty i {
  font-size: 28px;
}
.card-error {
  color: rgba(245, 108, 108, 0.8);
}
.card-error i {
  color: #F56C6C;
}
.card-empty i {
  color: rgba(64, 158, 255, 0.3);
}

/* ===== 深色主题表格 ===== */
::v-deep .el-table {
  font-size: 12px;
  background-color: transparent !important;
  color: rgba(255, 255, 255, 0.8);
}
::v-deep .el-table tr {
  background-color: transparent !important;
}
::v-deep .el-table--striped .el-table__body tr.el-table__row--striped td {
  background: rgba(64, 158, 255, 0.04) !important;
}
::v-deep .el-table th {
  background-color: rgba(64, 158, 255, 0.1) !important;
  color: rgba(255, 255, 255, 0.85) !important;
  font-weight: 600;
  border-bottom: 1px solid rgba(64, 158, 255, 0.15) !important;
}
::v-deep .el-table th.is-leaf {
  border-right: 1px solid rgba(64, 158, 255, 0.1) !important;
}
::v-deep .el-table td {
  padding: 4px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05) !important;
}
::v-deep .el-table--border td {
  border-right: 1px solid rgba(255, 255, 255, 0.05) !important;
}
::v-deep .el-table--border::after,
::v-deep .el-table--group::after,
::v-deep .el-table::before {
  background-color: rgba(64, 158, 255, 0.1) !important;
}
::v-deep .el-table__body tr:hover > td {
  background-color: rgba(64, 158, 255, 0.1) !important;
}
::v-deep .el-table__empty-block {
  background: transparent;
}
/* 滚动条深色适配 */
::v-deep .el-table__body-wrapper::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
::v-deep .el-table__body-wrapper::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 3px;
}
::v-deep .el-table__body-wrapper::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.1);
}
</style>
