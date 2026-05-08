<template>
  <div class="dashboard-card" :class="{ 'is-loading': loading, 'is-error': hasError }" :style="cardBgStyle">
    <!-- 卡片头部（含拖拽手柄） -->
    <div class="card-header">
      <!-- 拖拽手柄：只抓住这里才触发拖拽，防止与图表操作冲突 -->
      <span v-if="editable" class="drag-handle" title="拖拽移动">
        <i class="el-icon-rank"></i>
      </span>
      <span class="card-title" :title="config.title">{{ config.title || '未命名卡片' }}</span>
      <div class="card-actions" v-if="editable">
        <el-tooltip content="复制卡片" placement="top" :open-delay="300">
          <i class="el-icon-copy-document action-icon" @click="$emit('copy')"></i>
        </el-tooltip>
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
      <div class="loading-spinner"></div>
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

    <!-- KPI 大数字模式 -->
    <div v-else-if="config.displayMode === 'number'" class="card-content kpi-mode">
      <div class="kpi-wrapper">
        <div class="kpi-value" :style="{ color: kpiColor }">
          <span class="kpi-number">{{ kpiFormattedValue }}</span>
          <span class="kpi-unit" v-if="kpiUnit">{{ kpiUnit }}</span>
        </div>
        <div class="kpi-label">{{ kpiFieldName }}</div>
        <div class="kpi-glow" :style="{ background: kpiColor }"></div>
      </div>
    </div>

    <!-- 表格模式 -->
    <div v-else-if="config.displayMode === 'table'" class="card-content table-mode">
      <!-- 自动滚动模式：表头固定，仅 tbody 滚动 -->
      <template v-if="config.autoScroll">
        <!-- 固定表头 -->
        <div class="scroll-thead-wrapper">
          <table class="auto-scroll-table">
            <thead>
              <tr>
                <th
                  v-for="col in columns"
                  :key="col.name"
                  :style="{ textAlign: isNumeric(col) ? 'right' : 'left' }"
                >{{ col.name }}</th>
              </tr>
            </thead>
          </table>
        </div>
        <!-- 滚动 tbody 区域 -->
        <div class="table-scroll-wrapper" ref="tableScrollWrapper">
          <div ref="scrollContent" class="scroll-content">
            <table class="auto-scroll-table no-header">
              <tbody>
                <tr v-for="(row, idx) in tableData.concat(tableData)" :key="idx">
                  <td
                    v-for="col in columns"
                    :key="col.name"
                    :style="{ textAlign: isNumeric(col) ? 'right' : 'left' }"
                  >
                    <span :class="{ 'num-cell': isNumeric(col) }">{{ formatCell(row[col.name], col) }}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </template>
      <!-- 普通静态表格 -->
      <div v-else class="table-scroll-wrapper static-scroll">
        <el-table
          :data="tableData"
          stripe
          border
          size="mini"
          height="100%"
          style="width: 100%"
          :header-cell-style="{ background: 'rgba(64,158,255,0.12)', color: 'rgba(255,255,255,0.85)', fontWeight: '600', fontSize: '12px', borderBottom: '1px solid rgba(64,158,255,0.2)' }"
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
    </div>

    <!-- 图表模式 -->
    <div v-else-if="config.displayMode === 'chart'" class="card-content chart-mode">
      <div class="chart-wrapper">
        <div ref="chartRef" class="chart-container"></div>
      </div>
    </div>
  </div>
</template>

<script>
import * as echarts from 'echarts'

// 默认科技感色板
const DEFAULT_PALETTE = [
  '#3B82F6', '#06B6D4', '#8B5CF6', '#F59E0B',
  '#10B981', '#6366F1', '#EC4899', '#14B8A6',
  '#EF4444', '#84CC16'
]

export default {
  name: 'DashboardCard',
  props: {
    config: { type: Object, required: true },
    data: { type: Array, default: () => [] },
    columns: { type: Array, default: () => [] },
    loading: { type: Boolean, default: false },
    hasError: { type: Boolean, default: false },
    errorMsg: { type: String, default: '数据加载失败' },
    editable: { type: Boolean, default: true }
  },
  data() {
    return {
      chartInstance: null,
      resizeObserver: null,
      scrollTimer: null,
      scrollPos: 0
    }
  },
  computed: {
    tableData() { return this.data || [] },
    cardBgStyle() {
      const bg = this.config.cardBackground
      if (!bg) return {}
      return { background: bg }
    },

    // KPI 模式相关
    kpiFieldName() {
      const cc = this.config.chartConfig || {}
      if (cc.yAxisFields && cc.yAxisFields.length > 0) return cc.yAxisFields[0]
      return '数值'
    },
    kpiRawValue() {
      if (!this.data || this.data.length === 0) return 0
      const field = this.kpiFieldName
      const val = this.data[0][field]
      return val != null ? Number(val) : 0
    },
    kpiFormattedValue() {
      return this.formatNumber(this.kpiRawValue, this.config.chartConfig || {})
    },
    kpiUnit() {
      const cc = this.config.chartConfig || {}
      if (cc.numberFormat === 'percent') return '%'
      if (cc.numberFormat === 'wan') return '万'
      if (cc.numberFormat === 'yi') return '亿'
      return ''
    },
    kpiColor() {
      const cc = this.config.chartConfig || {}
      if (cc.seriesColors && cc.yAxisFields && cc.yAxisFields.length > 0) {
        return cc.seriesColors[cc.yAxisFields[0]] || DEFAULT_PALETTE[0]
      }
      return DEFAULT_PALETTE[0]
    }
  },
  watch: {
    data: {
      handler() {
        if (this.config.displayMode === 'chart') {
          this.$nextTick(() => this.safeRenderChart())
        } else if (this.config.displayMode === 'table' && this.config.autoScroll) {
          this.$nextTick(() => this.startAutoScroll())
        }
      },
      deep: true
    },
    config: {
      handler(newVal, oldVal) {
        if (newVal.displayMode === 'chart') {
          const sizeChanged = !oldVal || newVal.w !== oldVal.w || newVal.h !== oldVal.h
          if (sizeChanged) {
            this.$nextTick(() => setTimeout(() => this.safeRenderChart(), 150))
          } else {
            this.$nextTick(() => this.safeRenderChart())
          }
        } else if (newVal.displayMode === 'table') {
          if (newVal.autoScroll) {
            this.$nextTick(() => this.startAutoScroll())
          } else {
            this.stopAutoScroll()
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
    if (this.config.displayMode === 'table' && this.config.autoScroll && this.data.length > 0) {
      this.$nextTick(() => this.startAutoScroll())
    }
    this.setupResizeObserver()
    window.addEventListener('resize', this.handleResize)
  },
  beforeDestroy() {
    this.disposeChart()
    this.stopAutoScroll()
    this.teardownResizeObserver()
    window.removeEventListener('resize', this.handleResize)
  },
  methods: {
    // ===== 自动滚动 =====
    startAutoScroll() {
      this.stopAutoScroll()
      const wrapper = this.$refs.tableScrollWrapper
      const content = this.$refs.scrollContent
      if (!wrapper || !content) return
      // 等内容渲染完再开始
      this.$nextTick(() => {
        const totalHeight = content.scrollHeight / 2  // 因为数据复制了两份
        if (totalHeight <= wrapper.clientHeight) return  // 内容不够滚就不滚
        // scrollSpeed: 1-5 (slider) => 0.1-0.72 px/frame (~6-43 px/s @60fps)
        const speedLevel = (this.config.scrollSpeed != null ? this.config.scrollSpeed : 2)
        const speed = 0.1 + (speedLevel - 1) * (0.62 / 4)
        const step = () => {
          this.scrollPos += speed
          if (this.scrollPos >= totalHeight) {
            this.scrollPos = 0
          }
          if (wrapper) wrapper.scrollTop = this.scrollPos
          this.scrollTimer = requestAnimationFrame(step)
        }
        this.scrollTimer = requestAnimationFrame(step)
      })
    },
    stopAutoScroll() {
      if (this.scrollTimer) {
        cancelAnimationFrame(this.scrollTimer)
        this.scrollTimer = null
      }
      this.scrollPos = 0
    },
    // ===== 工具方法 =====
    isNumeric(col) {
      if (!col || !col.type) return false
      const t = col.type.toUpperCase()
      return ['INT', 'INTEGER', 'DECIMAL', 'FLOAT', 'DOUBLE', 'NUMERIC', 'BIGINT', 'NUMBER'].some(k => t.includes(k))
    },
    getColumnWidth(col) {
      const name = col.name || ''
      if (name.length <= 2) return 60
      if (name.length <= 6) return 90
      return 110
    },
    formatNumber(num, cc = {}) {
      if (isNaN(num)) return '—'
      const fmt = cc.numberFormat || 'default'
      if (fmt === 'percent') return num.toFixed(cc.decimalPlaces != null ? cc.decimalPlaces : 1)
      if (fmt === 'wan') return (num / 10000).toFixed(cc.decimalPlaces != null ? cc.decimalPlaces : 2)
      if (fmt === 'yi') return (num / 100000000).toFixed(cc.decimalPlaces != null ? cc.decimalPlaces : 2)
      if (fmt === 'thousand' || cc.thousandSep) {
        const dp = cc.decimalPlaces != null ? cc.decimalPlaces : 0
        return num.toLocaleString('zh-CN', { minimumFractionDigits: dp, maximumFractionDigits: dp })
      }
      if (cc.decimalPlaces != null) return num.toFixed(cc.decimalPlaces)
      if (Number.isInteger(num)) return num.toLocaleString()
      return parseFloat(num.toFixed(2)).toString()
    },
    formatCell(value, col) {
      if (value == null || value === '') return '—'
      if (this.isNumeric(col)) {
        const num = Number(value)
        if (isNaN(num)) return value
        const cc = this.config.chartConfig || {}
        return this.formatNumber(num, cc)
      }
      return value
    },

    // ===== ResizeObserver =====
    setupResizeObserver() {
      if (typeof ResizeObserver === 'undefined') return
      this.resizeObserver = new ResizeObserver(() => this.handleResize())
      this.resizeObserver.observe(this.$el)
    },
    teardownResizeObserver() {
      if (this.resizeObserver) {
        this.resizeObserver.disconnect()
        this.resizeObserver = null
      }
    },
    handleResize() {
      if (this.chartInstance && !this.chartInstance.isDisposed()) {
        this.chartInstance.resize()
      }
    },

    // ===== 图表实例管理 =====
    disposeChart() {
      if (this.chartInstance) {
        if (!this.chartInstance.isDisposed()) this.chartInstance.dispose()
        this.chartInstance = null
      }
    },

    safeRenderChart() {
      const chartRef = this.$refs.chartRef
      if (!chartRef) return
      if (!this.data || this.data.length === 0) return
      const cc = this.config.chartConfig || {}
      if (!cc.chartType) return
      // 仪表盘/KPI 不需要 xAxis
      const needsXY = !['gauge', 'pie', 'donut', 'radar'].includes(cc.chartType)
      if (needsXY && (!cc.xAxisField || !cc.yAxisFields || cc.yAxisFields.length === 0)) return

      if (chartRef.offsetWidth === 0 || chartRef.offsetHeight === 0) {
        setTimeout(() => this.safeRenderChart(), 200)
        return
      }

      const option = this.buildChartOption(cc)
      if (!option) return

      this.disposeChart()
      this.chartInstance = echarts.init(chartRef, 'dark')
      this.chartInstance.setOption(option)
    },

    // ===== 核心：构建图表 Option =====
    buildChartOption(cc) {
      switch (cc.chartType) {
        case 'bar':
        case 'line':
        case 'area':
        case 'scatter':
          return this.buildCartesianOption(cc)
        case 'pie':
          return this.buildPieOption(cc, false)
        case 'donut':
          return this.buildPieOption(cc, true)
        case 'radar':
          return this.buildRadarOption(cc)
        case 'gauge':
          return this.buildGaugeOption(cc)
        default:
          return this.buildCartesianOption(cc)
      }
    },

    // 获取系列颜色（优先用户自定义，否则用默认色板）
    getSeriesColor(field, idx, cc) {
      return (cc.seriesColors && cc.seriesColors[field]) || DEFAULT_PALETTE[idx % DEFAULT_PALETTE.length]
    },

    // 图例配置
    buildLegend(cc, fields) {
      const pos = cc.legendPosition || 'bottom'
      if (pos === 'hidden') return { show: false }
      const base = {
        show: true,
        data: fields,
        textStyle: { fontSize: 11, color: 'rgba(255,255,255,0.6)' },
        itemHeight: 10, itemWidth: 14, itemGap: 16
      }
      if (pos === 'right') return { ...base, orient: 'vertical', right: 6, top: 'center' }
      if (pos === 'top') return { ...base, top: 4 }
      return { ...base, bottom: 0 } // default: bottom
    },

    // 通用 tooltip
    buildTooltip(trigger = 'axis') {
      return {
        trigger,
        backgroundColor: 'rgba(10, 25, 50, 0.95)',
        borderColor: 'rgba(64, 158, 255, 0.4)',
        borderWidth: 1,
        textStyle: { color: '#e8f4ff', fontSize: 12 },
        padding: [8, 12]
      }
    },

    // 通用网格
    buildGrid(cc, hasSecondaryY = false) {
      const legendPos = cc.legendPosition || 'bottom'
      return {
        top: legendPos === 'top' ? 36 : 16,
        right: hasSecondaryY ? 56 : (legendPos === 'right' ? 100 : 20),
        bottom: legendPos === 'bottom' ? 40 : 16,
        left: 10,
        containLabel: true
      }
    },

    // Y轴格式化（支持数值格式化）
    buildAxisLabel(cc) {
      return {
        fontSize: 11,
        color: 'rgba(255,255,255,0.5)',
        formatter: (val) => {
          const fmt = cc.numberFormat
          if (fmt === 'wan') return (val / 10000).toFixed(0) + 'w'
          if (fmt === 'yi') return (val / 100000000).toFixed(1) + 'y'
          if (fmt === 'percent') return val + '%'
          if (val >= 1000000) return (val / 1000000).toFixed(1) + 'M'
          if (val >= 1000) return (val / 1000).toFixed(0) + 'k'
          return val
        }
      }
    },

    // ===== 双 Y 轴零刻度对齐 =====
    // 当主/副轴任一侧有负值时，alignTicks 无法保证 0 在同一水平线。
    // 此方法通过统一「负值占比」比例，手动设置两轴的 min/max，确保 0 严格对齐。
    syncDualYAxisZero(primaryAxis, secondaryAxis, data, primaryFields, secondaryFields) {
      const getRange = (fields) => {
        const vals = fields.flatMap(f =>
          data.map(row => row[f] != null ? Number(row[f]) : NaN).filter(v => !isNaN(v))
        )
        if (!vals.length) return { min: 0, max: 1 }
        return { min: Math.min(...vals), max: Math.max(...vals) }
      }

      const pr = getRange(primaryFields)
      const sr = getRange(secondaryFields)

      // 有效负/正区间（至少包含 0）
      const pNeg = Math.min(pr.min, 0)
      const pPos = Math.max(pr.max, 0)
      const sNeg = Math.min(sr.min, 0)
      const sPos = Math.max(sr.max, 0)

      // 已保证两侧都无负值时不处理
      if (pNeg === 0 && sNeg === 0) return

      // 零刻度从底部算起的占比：|neg| / (|neg| + pos)
      const zeroRatio = (neg, pos) => (pos - neg) > 0 ? Math.abs(neg) / (pos - neg) : 0
      const pRatio = zeroRatio(pNeg, pPos)
      const sRatio = zeroRatio(sNeg, sPos)
      const ratio = Math.max(pRatio, sRatio)  // 取较大者作为公共比例

      if (ratio <= 0 || ratio >= 1) return

      // 各轴保留自然正值最大值加 10% 余量，按公共比例反推 min
      const pMaxPad = (pPos || 1) * 1.1
      const sMaxPad = (sPos || 1) * 1.1
      primaryAxis.max = pMaxPad
      primaryAxis.min = -(pMaxPad * ratio / (1 - ratio))
      secondaryAxis.max = sMaxPad
      secondaryAxis.min = -(sMaxPad * ratio / (1 - ratio))
    },

    // ===== 笛卡尔坐标系（柱/折/面积/散点）=====
    buildCartesianOption(cc) {
      const data = this.data
      const xField = cc.xAxisField
      const yFields = cc.yAxisFields || []
      const seriesTypes = cc.seriesTypes || {}
      const useSecondaryY = cc.useSecondaryYAxis || {}
      const stacked = cc.stacked || false
      const chartType = cc.chartType

      const xData = data.map(row => row[xField] != null ? String(row[xField]) : '')
      const hasSecondaryY = yFields.some(f => useSecondaryY[f])

      const series = yFields.map((field, idx) => {
        // seriesTypes[field] 可能是 'bar'/'line'/'area'，fallback 到整体 chartType
        const rawType = seriesTypes[field] ||
          (chartType === 'scatter' ? 'scatter'
            : chartType === 'line' ? 'line'
            : chartType === 'area' ? 'area'
            : 'bar')
        // ECharts 无 'area' 类型，统一用 line 渲染，通过 isArea 标记补 areaStyle
        const isArea = rawType === 'area'
        const type = (chartType === 'scatter' || rawType === 'scatter') ? 'scatter'
          : (rawType === 'bar' ? 'bar' : 'line')
        const isSecondary = useSecondaryY[field] || false
        const color = this.getSeriesColor(field, idx, cc)

        const item = {
          name: field,
          type,
          yAxisIndex: isSecondary ? 1 : 0,
          itemStyle: { color },
          data: data.map(row => row[field] != null ? Number(row[field]) : null)
        }

        if (type === 'scatter') {
          const dotSize = xData.length > 50 ? 5 : xData.length > 20 ? 7 : 10
          item.symbolSize = dotSize
          item.symbol = 'circle'
          item.itemStyle = { color, opacity: 0.85 }
          item.emphasis = { itemStyle: { color, opacity: 1, borderColor: '#fff', borderWidth: 1.5 }, scale: 1.4 }
        }

        if (type === 'bar') {
          if (stacked) item.stack = 'total'
          item.barMaxWidth = 50
          item.itemStyle = { color, borderRadius: [3, 3, 0, 0] }
        }
        if (type === 'line') {
          // 面积图：整体 chartType 是 area，或者单系列被设置为 area
          if (isArea || chartType === 'area') {
            item.areaStyle = { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: color + 'aa' }, { offset: 1, color: color + '11' }] } }
          }
          item.smooth = true
          item.lineStyle = { width: 2.5, color }
          item.symbol = 'circle'
          item.symbolSize = 6
          item.itemStyle = { color }
        }
        return item
      })

      // 计算每个 Y 轴（主/副）下所有系列数据的范围，判断是否含负值
      const primaryFields = yFields.filter(f => !useSecondaryY[f])
      const secondaryFields = yFields.filter(f => useSecondaryY[f])

      const hasNegative = (fields) => fields.some(f =>
        data.some(row => row[f] != null && Number(row[f]) < 0)
      )

      const primaryHasNeg = hasNegative(primaryFields)
      const secondaryHasNeg = hasNegative(secondaryFields)

      const yAxisBase = {
        type: 'value',
        splitLine: { lineStyle: { type: 'dashed', color: 'rgba(255,255,255,0.07)' } },
        axisLabel: this.buildAxisLabel(cc),
        axisLine: { show: false },
        axisTick: { show: false }
      }

      // 主 Y 轴：无负值时强制 min:0，有负值时 ECharts 自动计算
      const primaryYAxis = { ...yAxisBase }
      if (!primaryHasNeg) primaryYAxis.min = 0

      const yAxis = [primaryYAxis]

      if (hasSecondaryY) {
        const secondaryYAxis = { ...yAxisBase, splitLine: { show: false } }
        if (!secondaryHasNeg) secondaryYAxis.min = 0

        if (primaryHasNeg || secondaryHasNeg) {
          // 有负值时手动对齐两轴零刻度线，alignTicks 此场景下无效
          this.syncDualYAxisZero(primaryYAxis, secondaryYAxis, data, primaryFields, secondaryFields)
        } else {
          // 全为正值时使用 alignTicks 自动对齐刻度
          primaryYAxis.alignTicks = true
          secondaryYAxis.alignTicks = true
        }

        yAxis.push(secondaryYAxis)
      }

      // 散点图 tooltip 显示 X 字段具体信息
      const scatterTooltip = chartType === 'scatter'
        ? { trigger: 'item',
            formatter: (params) => {
            const row = data[params.dataIndex] || {}
            const xVal = row[xField] != null ? row[xField] : params.dataIndex
            return `${params.marker}${params.seriesName}<br/>${xField}: <b>${xVal}</b><br/>值: <b>${this.formatNumber(params.value, cc)}</b>`
          }}
        : {}

      return {
        backgroundColor: 'transparent',
        tooltip: { ...this.buildTooltip('axis'), ...scatterTooltip },
        legend: this.buildLegend(cc, yFields),
        grid: this.buildGrid(cc, hasSecondaryY),
        xAxis: {
          type: 'category',
          data: xData,
          axisLabel: {
            fontSize: 11,
            color: 'rgba(255,255,255,0.5)',
            rotate: xData.length > 12 ? 30 : 0,
            interval: xData.length > 30 ? 'auto' : 0
          },
          axisLine: { onZero: false, lineStyle: { color: 'rgba(255,255,255,0.1)' } },
          axisTick: { alignWithLabel: true, lineStyle: { color: 'rgba(255,255,255,0.1)' } }
        },
        yAxis,
        series
      }
    },

    // ===== 饼图 / 环形图 =====
    buildPieOption(cc, isDonut) {
      const data = this.data
      const xField = cc.xAxisField
      const yFields = cc.yAxisFields || []
      if (!xField || yFields.length === 0) return null

      const valueField = yFields[0]
      // 过滤掉 value 为0的条目，避免出现大量同等切片
      const pieData = data
        .map((row, idx) => ({
          name: row[xField] != null ? String(row[xField]) : `项目${idx + 1}`,
          value: row[valueField] != null ? Number(row[valueField]) : 0,
          itemStyle: {
            color: (cc.seriesColors && cc.seriesColors[row[xField]])
              || DEFAULT_PALETTE[idx % DEFAULT_PALETTE.length]
          }
        }))
        .filter(d => d.value > 0) // 过滤零值

      // 数据条目多时（比如按天/按小时），隐藏外部标签防止拥挤
      const tooMany = pieData.length > 12
      const labelConfig = tooMany
        ? { show: false }  // 数据多时全隐，展示在 tooltip 和图例上
        : {
            show: true,
            color: 'rgba(255,255,255,0.75)',
            fontSize: 11,
            formatter: (params) => {
              // 百分比大于3%才显示，避免小切片拥挤
              if (params.percent < 3) return ''
              return `${params.name}\n${params.percent.toFixed(1)}%`
            }
          }

      return {
        backgroundColor: 'transparent',
        tooltip: {
          ...this.buildTooltip('item'),
          formatter: (params) => {
            const val = typeof params.value === 'number'
              ? this.formatNumber(params.value, cc)
              : params.value
            return `${params.marker}${params.name}<br/>数值: <b>${val}</b><br/>占比: <b>${params.percent.toFixed(2)}%</b>`
          }
        },
        legend: {
          ...this.buildLegend(cc, pieData.map(d => d.name)),
          type: 'scroll',
          // 数据多时强制显示图例（即便用户选了hidden）
          show: tooMany ? true : (cc.legendPosition !== 'hidden')
        },
        series: [{
          type: 'pie',
          radius: isDonut ? ['42%', '68%'] : '65%',
          center: ['50%', tooMany || cc.legendPosition === 'bottom' ? '44%' : '50%'],
          data: pieData,
          label: labelConfig,
          labelLine: {
            show: !tooMany,
            lineStyle: { color: 'rgba(255,255,255,0.3)' }
          },
          emphasis: {
            itemStyle: { shadowBlur: 12, shadowOffsetX: 0, shadowColor: 'rgba(64,158,255,0.5)' },
            label: { show: true, fontSize: 13, fontWeight: 700,
              formatter: '{b}\n{d}%' }
          }
        }]
      }
    },


    // ===== 雷达图 =====
    buildRadarOption(cc) {
      const data = this.data
      const xField = cc.xAxisField
      const yFields = cc.yAxisFields || []
      if (!xField || yFields.length === 0) return null

      // 以 xField 各行做指标
      const indicators = data.map(row => ({
        name: row[xField] != null ? String(row[xField]) : '—',
        max: Math.max(...yFields.map(f => row[f] != null ? Number(row[f]) : 0)) * 1.2 || 100
      }))

      const series = yFields.map((field, idx) => ({
        name: field,
        type: 'radar',
        data: [{ value: data.map(row => row[field] != null ? Number(row[field]) : 0), name: field }],
        lineStyle: { color: this.getSeriesColor(field, idx, cc), width: 2 },
        areaStyle: { color: this.getSeriesColor(field, idx, cc) + '44' },
        symbol: 'circle', symbolSize: 5,
        itemStyle: { color: this.getSeriesColor(field, idx, cc) }
      }))

      return {
        backgroundColor: 'transparent',
        tooltip: this.buildTooltip('item'),
        legend: this.buildLegend(cc, yFields),
        radar: {
          indicator: indicators,
          splitLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
          splitArea: { areaStyle: { color: ['rgba(255,255,255,0.02)', 'transparent'] } },
          axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
          name: { textStyle: { color: 'rgba(255,255,255,0.6)', fontSize: 11 } }
        },
        series
      }
    },

    // ===== 仪表盘 =====
    buildGaugeOption(cc) {
      const data = this.data
      const yFields = cc.yAxisFields || []
      if (yFields.length === 0 || !data.length) return null

      const field = yFields[0]
      const value = data[0][field] != null ? Number(data[0][field]) : 0
      const color = this.getSeriesColor(field, 0, cc)

      // 智能范围
      const max = cc.gaugeMax || (value > 100 ? Math.ceil(value * 1.2) : 100)
      const min = cc.gaugeMin || 0

      return {
        backgroundColor: 'transparent',
        tooltip: { ...this.buildTooltip('item'), formatter: `${field}: {c}` },
        series: [{
          type: 'gauge',
          min, max,
          radius: '80%',
          progress: { show: true, width: 14, itemStyle: { color } },
          axisLine: { lineStyle: { width: 14, color: [[1, 'rgba(255,255,255,0.1)']] } },
          pointer: { itemStyle: { color }, length: '65%', width: 5 },
          axisTick: { lineStyle: { color: 'rgba(255,255,255,0.2)' } },
          splitLine: { lineStyle: { color: 'rgba(255,255,255,0.15)', width: 2 } },
          axisLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 10 },
          detail: {
            valueAnimation: true,
            formatter: (val) => this.formatNumber(val, cc),
            fontSize: 22,
            fontWeight: 700,
            color,
            offsetCenter: [0, '70%']
          },
          title: { color: 'rgba(255,255,255,0.5)', fontSize: 12, offsetCenter: [0, '90%'] },
          data: [{ value, name: field }]
        }]
      }
    }
  }
}
</script>

<style scoped>
/* ===== 卡片基础 ===== */
.dashboard-card {
  position: relative;
  background: rgba(10, 25, 50, 0.7);
  border-radius: 8px;
  border: 1px solid rgba(64, 158, 255, 0.2);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  height: 100%;
  transition: border-color 0.3s, box-shadow 0.3s;
  backdrop-filter: blur(10px);
}
/* 科技感发光边框 */
.dashboard-card::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 8px;
  padding: 1px;
  background: linear-gradient(
    135deg,
    rgba(64, 158, 255, 0.5) 0%,
    rgba(64, 158, 255, 0.05) 40%,
    rgba(139, 92, 246, 0.05) 60%,
    rgba(139, 92, 246, 0.4) 100%
  );
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: destination-out;
  mask-composite: exclude;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.3s;
}
.dashboard-card:hover::before {
  opacity: 1;
}
.dashboard-card:hover {
  border-color: rgba(64, 158, 255, 0.4);
  box-shadow: 0 0 24px rgba(64, 158, 255, 0.1), 0 0 4px rgba(64, 158, 255, 0.2);
}

/* 头部 */
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 10px;
  background: rgba(64, 158, 255, 0.08);
  border-bottom: 1px solid rgba(64, 158, 255, 0.12);
  flex-shrink: 0;
  min-height: 34px;
  gap: 6px;
}

/* 拖拽手柄 */
.drag-handle {
  cursor: grab;
  color: rgba(255, 255, 255, 0.3);
  font-size: 14px;
  padding: 2px 4px;
  border-radius: 4px;
  transition: all 0.2s;
  flex-shrink: 0;
  display: flex;
  align-items: center;
}
.drag-handle:hover {
  color: rgba(64, 158, 255, 0.8);
  background: rgba(64, 158, 255, 0.1);
  cursor: grab;
}
.drag-handle:active { cursor: grabbing; }

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
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s;
  flex-shrink: 0;
}
.dashboard-card:hover .card-actions {
  opacity: 1;
}
.action-icon {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.45);
  cursor: pointer;
  padding: 3px;
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

/* ===== 表格模式 ===== */
.table-mode {
  padding: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
/* 固定表头容器 */
.scroll-thead-wrapper {
  flex-shrink: 0;
  overflow: hidden;
}
/* 滚动 tbody 容器 */
.table-scroll-wrapper {
  flex: 1;
  overflow: hidden;
  /* 自定义滚动条 */
  scrollbar-width: thin;
  scrollbar-color: rgba(64,158,255,0.3) transparent;
}
/* 静态表格区滚动条可见 */
.static-scroll {
  overflow: auto;
}
.table-scroll-wrapper::-webkit-scrollbar {
  width: 5px;
  height: 5px;
}
.table-scroll-wrapper::-webkit-scrollbar-thumb {
  background: rgba(64,158,255,0.3);
  border-radius: 3px;
}
.table-scroll-wrapper::-webkit-scrollbar-track {
  background: transparent;
}
/* 自动滚动内容容器 */
.scroll-content {
  width: 100%;
}
.auto-scroll-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}
.auto-scroll-table th {
  background: rgba(64,158,255,0.12);
  color: rgba(255,255,255,0.85);
  font-weight: 600;
  font-size: 12px;
  border-bottom: 1px solid rgba(64,158,255,0.25);
  padding: 6px 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.auto-scroll-table td {
  font-size: 12px;
  padding: 5px 8px;
  border-bottom: 1px solid rgba(255,255,255,0.05);
  color: rgba(255,255,255,0.78);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.auto-scroll-table tbody tr:nth-child(even) {
  background: rgba(64,158,255,0.04);
}
.auto-scroll-table tbody tr:hover {
  background: rgba(64,158,255,0.1);
}
.num-cell {
  font-variant-numeric: tabular-nums;
  font-family: 'Consolas', 'Monaco', monospace;
}

/* ===== 图表模式 ===== */
.chart-mode { padding: 4px; }
.chart-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
}
.chart-container {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
}

/* ===== KPI 大数字模式 ===== */
.kpi-mode {
  display: flex;
  align-items: center;
  justify-content: center;
}
.kpi-wrapper {
  position: relative;
  text-align: center;
  padding: 16px;
}
.kpi-value {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 4px;
  line-height: 1;
}
.kpi-number {
  font-size: clamp(28px, 5vw, 52px);
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  letter-spacing: -1px;
  filter: drop-shadow(0 0 12px currentColor);
  animation: kpi-pulse 3s ease-in-out infinite;
}
@keyframes kpi-pulse {
  0%, 100% { filter: drop-shadow(0 0 8px currentColor); }
  50% { filter: drop-shadow(0 0 20px currentColor); }
}
.kpi-unit {
  font-size: 18px;
  font-weight: 600;
  opacity: 0.8;
  margin-left: 2px;
}
.kpi-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  margin-top: 8px;
  letter-spacing: 1px;
}
.kpi-glow {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  filter: blur(40px);
  opacity: 0.08;
  pointer-events: none;
}

/* ===== 状态样式 ===== */
.card-loading, .card-error, .card-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: rgba(255, 255, 255, 0.35);
  font-size: 12px;
}
.loading-spinner {
  width: 28px;
  height: 28px;
  border: 2px solid rgba(64,158,255,0.2);
  border-top-color: #409EFF;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
.card-error { color: rgba(245, 108, 108, 0.8); }
.card-error i { font-size: 24px; color: #F56C6C; }
.card-empty i { font-size: 24px; color: rgba(64,158,255,0.3); }

/* ===== 深色主题表格覆盖 ===== */
::v-deep .el-table {
  background-color: transparent !important;
  color: rgba(255, 255, 255, 0.8);
  font-size: 12px;
}
::v-deep .el-table tr { background-color: transparent !important; }
::v-deep .el-table--striped .el-table__body tr.el-table__row--striped td {
  background: rgba(64,158,255,0.04) !important;
}
::v-deep .el-table td {
  padding: 4px 0;
  border-bottom: 1px solid rgba(255,255,255,0.05) !important;
}
::v-deep .el-table--border td { border-right: 1px solid rgba(255,255,255,0.05) !important; }
::v-deep .el-table--border::after,
::v-deep .el-table--group::after,
::v-deep .el-table::before { background-color: rgba(64,158,255,0.1) !important; }
::v-deep .el-table__body tr:hover > td { background-color: rgba(64,158,255,0.1) !important; }
::v-deep .el-table__empty-block { background: transparent; }
</style>
