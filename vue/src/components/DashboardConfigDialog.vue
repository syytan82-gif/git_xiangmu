<template>
  <el-dialog
    :title="isEdit ? '编辑卡片' : '添加卡片'"
    :visible.sync="dialogVisible"
    width="820px"
    :close-on-click-modal="false"
    custom-class="dashboard-config-dialog"
    @close="handleClose"
    :append-to-body="!isFullscreen"
  >
    <el-form :model="form" label-width="90px" size="small">
      <!-- 第一行：标题 + 数据源 -->
      <div class="form-row">
        <el-form-item label="卡片标题" class="flex-item">
          <el-input v-model="form.title" placeholder="请输入卡片标题" maxlength="30"></el-input>
        </el-form-item>
        <el-form-item label="数据源" class="flex-item">
          <el-select v-model="form.dbConfigId" placeholder="选择数据源" @change="onDatasourceChange">
            <el-option
              v-for="ds in datasourceList"
              :key="ds.id"
              :label="ds.name"
              :value="ds.id"
            >
              <span>
                <el-tag size="mini" :type="getDbTypeTag(ds.dbType)" style="margin-right:6px">{{ ds.dbType }}</el-tag>
                {{ ds.name }}
              </span>
            </el-option>
          </el-select>
        </el-form-item>
      </div>

      <!-- SQL 输入 -->
      <el-form-item label="SQL 语句">
        <div class="sql-editor-wrapper">
          <textarea
            v-model="form.sql"
            class="sql-editor"
            placeholder="请输入 SELECT 查询语句..."
            rows="4"
            spellcheck="false"
          ></textarea>
          <div class="sql-actions">
            <el-button type="primary" size="mini" icon="el-icon-video-play" @click="executePreview" :loading="executing">
              执行预览
            </el-button>
            <span v-if="previewData.length > 0" class="preview-count">
              <i class="el-icon-tickets"></i> {{ previewData.length }} 条数据，{{ previewColumns.length }} 列
            </span>
          </div>
        </div>
      </el-form-item>

      <!-- 预览数据表格 -->
      <div v-if="previewData.length > 0" class="preview-section">
        <div class="preview-header">
          <span class="preview-title"><i class="el-icon-view"></i> 数据预览</span>
          <div class="preview-header-actions">
            <el-button
              type="text"
              size="mini"
              icon="el-icon-download"
              :loading="downloading"
              @click="downloadPreviewExcel"
            >下载 Excel</el-button>
            <el-button type="text" size="mini" @click="previewData = []">收起</el-button>
          </div>
        </div>
        <el-table
          :data="previewData.slice(0, 20)"
          stripe border size="mini" max-height="320" style="width: 100%"
          :header-cell-style="{ background: '#f5f7fa', fontSize: '12px' }"
        >
          <el-table-column
            v-for="col in previewColumns" :key="col.name"
            :prop="col.name"
            :label="col.name + (col.type ? ' (' + col.type + ')' : '')"
            :min-width="90" show-overflow-tooltip
          ></el-table-column>
        </el-table>
        <div class="preview-tip" v-if="previewData.length > 20">仅展示前 20 条，共 {{ previewData.length }} 条，下载将导出全部数据</div>
      </div>

      <!-- 展示模式 -->
      <el-form-item label="展示模式">
        <el-radio-group v-model="form.displayMode" @change="onDisplayModeChange">
          <el-radio-button label="table"><i class="el-icon-tickets"></i> 表格</el-radio-button>
          <el-radio-button label="chart"><i class="el-icon-data-analysis"></i> 图表</el-radio-button>
          <el-radio-button label="number"><i class="el-icon-odometer"></i> 数字卡片</el-radio-button>
        </el-radio-group>
      </el-form-item>

      <!-- ====== 图表配置（仅图表 + KPI 模式） ====== -->
      <template v-if="form.displayMode === 'chart' || form.displayMode === 'number'">

        <!-- 图表类型（仅 chart 模式） -->
        <el-form-item label="图表类型" v-if="form.displayMode === 'chart'">
          <div class="chart-type-grid">
            <div
              v-for="t in chartTypes"
              :key="t.value"
              class="chart-type-item"
              :class="{ active: form.chartConfig.chartType === t.value }"
              @click="selectChartType(t.value)"
            >
              <i :class="t.icon"></i>
              <span>{{ t.label }}</span>
            </div>
          </div>
        </el-form-item>

        <!-- X 轴 / 分类字段（除仪表盘外都有） -->
        <el-form-item
          v-if="form.displayMode === 'chart' && !['gauge'].includes(form.chartConfig.chartType)"
          :label="xAxisLabel"
        >
          <el-select v-model="form.chartConfig.xAxisField" placeholder="选择字段" filterable style="width:100%">
            <el-option v-for="col in previewColumns" :key="col.name" :label="col.name" :value="col.name"></el-option>
          </el-select>
        </el-form-item>

        <!-- Y 轴 / 数值字段 -->
        <el-form-item :label="yAxisLabel">
          <!-- 多选模式（柱/折/面积/散点/雷达/热力图） -->
          <el-select
            v-if="allowMultiY"
            v-model="form.chartConfig.yAxisFields"
            placeholder="选择数值字段（可多选）"
            multiple
            filterable
            @change="onYFieldsChange"
            style="width:100%"
          >
            <el-option v-for="col in numericPreviewColumns" :key="col.name" :label="col.name" :value="col.name"></el-option>
          </el-select>
          <!-- 单选模式（饼/环/漏斗/仪表盘），用 yAxisFieldSingle 避免字符串被拆成字符 -->
          <el-select
            v-else
            v-model="yAxisFieldSingle"
            placeholder="选择数值字段"
            filterable
            style="width:100%"
          >
            <el-option v-for="col in numericPreviewColumns" :key="col.name" :label="col.name" :value="col.name"></el-option>
          </el-select>
        </el-form-item>

        <!-- 系列设置（颜色 + 类型 + 副轴），仅图表多Y轴模式展示 -->
        <el-form-item label="系列颜色" v-if="form.displayMode === 'chart' && showSeriesConfig && form.chartConfig.yAxisFields.length > 0">
          <div class="series-config-list">
            <div
              class="series-config-item"
              v-for="(field, idx) in form.chartConfig.yAxisFields"
              :key="field"
            >
              <div class="series-color-block">
                <el-color-picker
                  v-model="form.chartConfig.seriesColors[field]"
                  size="mini"
                  :predefine="predefineColors"
                  @change="$forceUpdate()"
                />
                <span class="color-hint" :style="{ color: form.chartConfig.seriesColors[field] || defaultPalette[idx % 10] }">
                  {{ field }}
                </span>
              </div>
              <!-- 系列图表类型（bar/line 混合） -->
              <el-select
                v-if="form.displayMode === 'chart' && ['bar', 'line', 'area'].includes(form.chartConfig.chartType)"
                v-model="form.chartConfig.seriesTypes[field]"
                size="mini"
                class="series-type-select"
                placeholder="类型"
              >
                <el-option label="柱状图" value="bar"></el-option>
                <el-option label="折线图" value="line"></el-option>
                <el-option label="面积图" value="area"></el-option>
              </el-select>
              <!-- 副Y轴 -->
              <el-checkbox
                v-if="form.displayMode === 'chart' && showSecondaryY"
                v-model="form.chartConfig.useSecondaryYAxis[field]"
                class="secondary-y-check"
              >副Y轴</el-checkbox>
            </div>
          </div>
        </el-form-item>

        <!-- 堆叠（仅柱状图） -->
        <el-form-item label="堆叠显示" v-if="form.displayMode === 'chart' && form.chartConfig.chartType === 'bar'">
          <el-switch v-model="form.chartConfig.stacked"></el-switch>
          <span class="form-hint">仅对柱状图生效</span>
        </el-form-item>

        <!-- 图例位置 -->
        <el-form-item label="图例位置" v-if="form.displayMode === 'chart'">
          <el-radio-group v-model="form.chartConfig.legendPosition" size="mini">
            <el-radio-button label="bottom">底部</el-radio-button>
            <el-radio-button label="right">右侧</el-radio-button>
            <el-radio-button label="top">顶部</el-radio-button>
            <el-radio-button label="hidden">隐藏</el-radio-button>
          </el-radio-group>
        </el-form-item>

        <!-- 数值格式化 -->
        <div class="form-row">
          <el-form-item label="数值格式" class="flex-item">
            <el-select v-model="form.chartConfig.numberFormat" placeholder="默认" style="width:100%">
              <el-option label="默认" value="default"></el-option>
              <el-option label="千分位 (1,234)" value="thousand"></el-option>
              <el-option label="万 (w)" value="wan"></el-option>
              <el-option label="亿 (y)" value="yi"></el-option>
              <el-option label="百分比 (%)" value="percent"></el-option>
            </el-select>
          </el-form-item>
          <el-form-item label="小数位数" class="flex-item">
            <el-input-number
              v-model="form.chartConfig.decimalPlaces"
              :min="0" :max="6" :step="1"
              placeholder="自动"
              style="width:100%"
            ></el-input-number>
          </el-form-item>
        </div>
      </template>


      <!-- 卡片背景颜色 -->
      <el-form-item label="卡片背景">
        <div class="bg-color-row">
          <el-color-picker
            v-model="form.cardBackground"
            :predefine="bgPredefineColors"
            show-alpha
            @change="$forceUpdate()"
          />
          <span class="bg-color-label" :style="form.cardBackground ? { color: form.cardBackground } : {}">
            {{ form.cardBackground || '默认（跟随大屏主题）' }}
          </span>
          <el-button
            v-if="form.cardBackground"
            type="text"
            size="mini"
            icon="el-icon-refresh-left"
            @click="form.cardBackground = ''"
          >重置</el-button>
        </div>
      </el-form-item>

      <!-- 自动滚动（仅表格模式） -->
      <el-form-item label="自动滚动" v-if="form.displayMode === 'table'">
        <el-switch v-model="form.autoScroll"></el-switch>
        <span class="form-hint">表格数据过多时自动循环滚动</span>
      </el-form-item>

      <!-- 滚动速度（仅表格模式且开启自动滚动） -->
      <el-form-item label="滚动速度" v-if="form.displayMode === 'table' && form.autoScroll">
        <div class="scroll-speed-row">
          <el-slider
            v-model="form.scrollSpeed"
            :min="1"
            :max="5"
            :step="1"
            show-stops
            style="flex: 1; margin-right: 16px;"
          ></el-slider>
          <span class="scroll-speed-label">{{ scrollSpeedLabel }}</span>
        </div>
      </el-form-item>

      <!-- 卡片创建后可在大屏中拖拽调整 -->
      <div class="size-tip-banner">
        <i class="el-icon-info"></i>
        卡片创建后默认占 2 列 ×2 行，可在大屏编辑模式中自由拖拽调整大小与位置。
      </div>

    </el-form>

    <span slot="footer">
      <el-button @click="dialogVisible = false" size="small">取 消</el-button>
      <el-button type="primary" @click="handleConfirm" size="small">确 定</el-button>
    </span>
  </el-dialog>
</template>

<script>
import * as XLSX from 'xlsx'

const DEFAULT_PALETTE = [
  '#3B82F6', '#06B6D4', '#8B5CF6', '#F59E0B',
  '#10B981', '#6366F1', '#EC4899', '#14B8A6',
  '#EF4444', '#84CC16'
]

export default {
  name: 'DashboardConfigDialog',
  props: {
    visible: { type: Boolean, default: false },
    cardConfig: { type: Object, default: null },
    datasourceList: { type: Array, default: () => [] },
    isFullscreen: { type: Boolean, default: false }
  },
  data() {
    return {
      executing: false,
      downloading: false,
      previewData: [],
      previewColumns: [],
      form: this.getDefaultForm(),
      defaultPalette: DEFAULT_PALETTE,
      predefineColors: DEFAULT_PALETTE,
      chartTypes: [
        { value: 'bar',      label: '柱状图',  icon: 'el-icon-s-data' },
        { value: 'line',     label: '折线图',  icon: 'el-icon-trend-charts' },
        { value: 'area',     label: '面积图',  icon: 'el-icon-data-analysis' },
        { value: 'scatter',  label: '散点图',  icon: 'el-icon-position' },
        { value: 'pie',      label: '饼图',    icon: 'el-icon-pie-chart' },
        { value: 'donut',    label: '环形图',  icon: 'el-icon-loading' },
        { value: 'radar',    label: '雷达图',  icon: 'el-icon-discover' },
        { value: 'gauge',    label: '仪表盘',  icon: 'el-icon-odometer' },
      ],
      bgPredefineColors: [
        'rgba(10,25,50,0.9)',
        'rgba(5,5,15,0.95)',
        'rgba(255,255,255,0.06)',
        '#0A1932',
        '#3B82F6',
        '#8B5CF6',
        '#10B981',
        '#F59E0B',
        '#EF4444',
        '#06B6D4',
        '#6366F1',
        '#EC4899',
      ]
    }
  },
  computed: {
    dialogVisible: {
      get() { return this.visible },
      set(val) { this.$emit('update:visible', val) }
    },
    isEdit() { return !!(this.cardConfig && this.cardConfig.id) },
    scrollSpeedLabel() {
      const v = this.form.scrollSpeed
      if (v <= 1) return '慢'
      if (v <= 3) return '中'
      if (v <= 4) return '快'
      return '极快'
    },
    numericPreviewColumns() {
      return this.previewColumns.filter(c => {
        const t = (c.type || '').toUpperCase()
        return ['INT', 'INTEGER', 'DECIMAL', 'FLOAT', 'DOUBLE', 'NUMERIC', 'BIGINT', 'NUMBER'].some(k => t.includes(k)) || !t
      })
    },
    xAxisLabel() {
      const type = this.form.chartConfig.chartType
      if (type === 'pie' || type === 'donut') return '分类字段'
      if (type === 'radar') return '维度字段'
      return 'X轴字段'
    },
    yAxisLabel() {
      const type = this.form.chartConfig.chartType
      if (type === 'gauge') return '数值字段'
      if (type === 'radar') return '指标字段'
      return 'Y轴字段'
    },
    allowMultiY() {
      const type = this.form.chartConfig.chartType
      return !['gauge', 'pie', 'donut'].includes(type)
    },
    showSeriesConfig() {
      return this.allowMultiY
    },
    showSecondaryY() {
      const type = this.form.chartConfig.chartType
      return ['bar', 'line', 'area'].includes(type)
    },
    // 单选Y字段的安全代理：避免愿 el-select 将字符串直接赋值给 yAxisFields数组导致逐字拆分
    yAxisFieldSingle: {
      get() {
        return (this.form.chartConfig.yAxisFields && this.form.chartConfig.yAxisFields[0]) || null
      },
      set(val) {
        this.$set(this.form.chartConfig, 'yAxisFields', val ? [val] : [])
        if (val) {
          if (!this.form.chartConfig.seriesColors[val]) {
            this.$set(this.form.chartConfig.seriesColors, val, null)
          }
        }
      }
    }
  },
  watch: {
    visible(val) {
      if (val) {
        if (this.cardConfig) {
          this.form = {
            id: this.cardConfig.id,
            title: this.cardConfig.title || '',
            sql: this.cardConfig.sql || '',
            dbConfigId: this.cardConfig.dbConfigId || null,
            displayMode: this.cardConfig.displayMode || 'table',
            w: this.cardConfig.w || 4,
            h: this.cardConfig.h || 4,
            autoScroll: this.cardConfig.autoScroll || false,
            scrollSpeed: this.cardConfig.scrollSpeed || 2,
            cardBackground: this.cardConfig.cardBackground || '',
            chartConfig: {
              chartType: 'bar',
              xAxisField: '',
              yAxisFields: [],
              seriesTypes: {},
              seriesColors: {},
              useSecondaryYAxis: {},
              stacked: false,
              legendPosition: 'bottom',
              numberFormat: 'default',
              decimalPlaces: null,
              ...(this.cardConfig.chartConfig || {})
            }
          }
          if (this.form.sql && this.form.dbConfigId) {
            this.executePreview()
          }
        } else {
          this.form = this.getDefaultForm()
          this.previewData = []
          this.previewColumns = []
        }
      }
    }
  },
  methods: {
    getDefaultForm() {
      return {
        id: null,
        title: '',
        sql: '',
        dbConfigId: null,
        displayMode: 'table',
        w: 2,
        h: 2,
        autoScroll: false,
        scrollSpeed: 2,
        cardBackground: '',
        chartConfig: {
          chartType: 'bar',
          xAxisField: '',
          yAxisFields: [],
          seriesTypes: {},
          seriesColors: {},
          useSecondaryYAxis: {},
          stacked: false,
          legendPosition: 'bottom',
          numberFormat: 'default',
          decimalPlaces: null
        }
      }
    },

    getDbTypeTag(type) {
      const map = { 'MySQL': '', 'Oracle': 'danger', 'PostgreSQL': 'success', 'SQL Server': 'warning' }
      return map[type] || 'info'
    },

    onDatasourceChange() {
      this.previewData = []
      this.previewColumns = []
    },

    onDisplayModeChange() {},

    selectChartType(type) {
      this.form.chartConfig.chartType = type
      // 切换类型时清空 Y 轴选择（仪表盘等只允许单选）
      if (!this.allowMultiY && this.form.chartConfig.yAxisFields.length > 1) {
        this.form.chartConfig.yAxisFields = [this.form.chartConfig.yAxisFields[0]]
      }
    },

    onYFieldsChange(fields) {
      const arr = Array.isArray(fields) ? fields : (fields ? [fields] : [])
      arr.forEach(f => {
        if (!this.form.chartConfig.seriesTypes[f]) {
          this.$set(this.form.chartConfig.seriesTypes, f, this.form.chartConfig.chartType === 'area' ? 'line' : (this.form.chartConfig.chartType || 'bar'))
        }
        if (this.form.chartConfig.useSecondaryYAxis[f] === undefined) {
          this.$set(this.form.chartConfig.useSecondaryYAxis, f, false)
        }
        if (!this.form.chartConfig.seriesColors[f]) {
          this.$set(this.form.chartConfig.seriesColors, f, null)
        }
      })
      // 清理已移除字段的配置
      Object.keys(this.form.chartConfig.seriesTypes).forEach(key => {
        if (!arr.includes(key)) {
          this.$delete(this.form.chartConfig.seriesTypes, key)
          this.$delete(this.form.chartConfig.useSecondaryYAxis, key)
          this.$delete(this.form.chartConfig.seriesColors, key)
        }
      })
    },

    executePreview() {
      if (!this.form.sql || !this.form.sql.trim()) { this.$message.warning('请输入 SQL 语句'); return }
      if (!this.form.dbConfigId) { this.$message.warning('请选择数据源'); return }

      this.executing = true
      this.$request.post('/dashboard/executeSql', {
        sql: this.form.sql.trim(),
        dbConfigId: this.form.dbConfigId
      }).then(res => {
        if (res.code === '200') {
          this.previewColumns = res.data.columns || []
          this.previewData = res.data.data || []
          if (this.previewData.length === 0) {
            this.$message.info('查询成功，但没有数据')
          } else {
            this.$message.success(`查询成功，共 ${this.previewData.length} 条数据`)
          }
        } else {
          this.$message.error(res.msg || 'SQL 执行失败')
        }
      }).catch(err => {
        this.$message.error((err && err.msg) || 'SQL 执行请求失败')
      }).finally(() => {
        this.executing = false
      })
    },

    handleConfirm() {
      if (!this.form.title) { this.$message.warning('请输入卡片标题'); return }
      if (!this.form.sql) { this.$message.warning('请输入 SQL 语句'); return }
      if (!this.form.dbConfigId) { this.$message.warning('请选择数据源'); return }

      if (this.form.displayMode === 'chart') {
        const cc = this.form.chartConfig
        if (!['gauge'].includes(cc.chartType) && !cc.xAxisField) {
          this.$message.warning('请选择X轴/分类字段'); return
        }
        if (!cc.yAxisFields || cc.yAxisFields.length === 0) {
          this.$message.warning('请选择至少一个数值字段'); return
        }
      }

      const result = {
        ...this.form,
        id: this.form.id || 'card_' + Date.now()
      }
      this.$emit('confirm', result)
      this.dialogVisible = false
    },

    handleClose() {
      this.previewData = []
      this.previewColumns = []
    },

    // 下载预览数据为 Excel
    downloadPreviewExcel() {
      if (!this.previewData || this.previewData.length === 0) {
        this.$message.warning('没有可下载的数据')
        return
      }
      this.downloading = true
      try {
        // 构建表头：只用字段名作为表头（去掉类型括号）
        const headers = this.previewColumns.map(col => col.name)
        // 构建行数据
        const rows = this.previewData.map(row =>
          headers.map(h => row[h] != null ? row[h] : '')
        )
        // 组合 header + rows
        const sheetData = [headers, ...rows]
        const ws = XLSX.utils.aoa_to_sheet(sheetData)
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
        // 文件名：卡片标题（没有则用 export）+ 时间戳
        const title = (this.form.title || 'export').replace(/[/\\?*:"<>|]/g, '_')
        const ts = new Date().toISOString().slice(0, 10)
        XLSX.writeFile(wb, `${title}_${ts}.xlsx`)
        this.$message.success(`已导出 ${this.previewData.length} 条数据`)
      } catch (e) {
        console.error('[Dashboard] Excel 导出失败:', e)
        this.$message.error('导出失败，请稍后重试')
      } finally {
        this.downloading = false
      }
    }
  }
}
</script>

<style>
/* 弹窗全局样式（非 scoped） */
.dashboard-config-dialog {
  border-radius: 10px;
  overflow: hidden;
}
.dashboard-config-dialog .el-dialog__header {
  background: #f7f8fa;
  padding: 16px 20px 12px;
  border-bottom: 1px solid #ebeef5;
}
.dashboard-config-dialog .el-dialog__body {
  padding: 16px 20px;
  max-height: 70vh;
  overflow-y: auto;
}
/* 全屏时弹窗需要更高 z-index（全屏容器 z-index:9999，弹窗需在其上方） */
.dashboard-view-container.is-fullscreen .v-modal {
  z-index: 10000 !important;
}
.dashboard-view-container.is-fullscreen .dashboard-config-dialog.el-dialog__wrapper {
  z-index: 10001 !important;
}
</style>

<style scoped>
.form-row {
  display: flex;
  gap: 16px;
}
.flex-item { flex: 1; }

/* SQL 编辑器 */
.sql-editor-wrapper {
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  overflow: hidden;
  transition: border-color 0.2s;
}
.sql-editor-wrapper:focus-within { border-color: #1890ff; }
.sql-editor {
  width: 100%;
  border: none;
  outline: none;
  padding: 10px 12px;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.5;
  color: #333;
  background: #fafbfc;
  resize: vertical;
  box-sizing: border-box;
}
.sql-editor::placeholder { color: #bbb; }
.sql-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 10px;
  background: #f5f7fa;
  border-top: 1px solid #ebeef5;
}
.preview-count { font-size: 12px; color: #67c23a; }
.preview-count i { margin-right: 4px; }

/* 预览 */
.preview-section { margin: 0 0 14px; }
.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}
.preview-title { font-size: 13px; font-weight: 600; color: #606266; }
.preview-title i { color: #1890ff; margin-right: 4px; }
.preview-header-actions { display: flex; align-items: center; gap: 4px; }
.preview-tip { font-size: 12px; color: #909399; margin-top: 4px; text-align: right; }

/* 图表类型选择网格 */
.chart-type-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
}
.chart-type-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 10px 4px;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 12px;
  color: #606266;
  background: #fafbfc;
}
.chart-type-item i { font-size: 20px; color: #c0c4cc; transition: color 0.2s; }
.chart-type-item:hover {
  border-color: #409EFF;
  color: #409EFF;
  background: #ecf5ff;
}
.chart-type-item:hover i { color: #409EFF; }
.chart-type-item.active {
  border-color: #409EFF;
  background: linear-gradient(135deg, #ecf5ff, #d9ecff);
  color: #1890ff;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(64,158,255,0.2);
}
.chart-type-item.active i { color: #1890ff; }

/* 系列配置 */
.series-config-list { display: flex; flex-direction: column; gap: 8px; }
.series-config-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  background: #fafbfc;
  border-radius: 6px;
  border: 1px solid #ebeef5;
}
.series-color-block {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}
.color-hint {
  font-size: 13px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: color 0.3s;
}
.series-type-select { width: 100px; flex-shrink: 0; }
.secondary-y-check { flex-shrink: 0; }

/* 尺寸提示横幅 */
.size-tip-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: #f0f9eb;
  border: 1px solid #c2e7b0;
  border-radius: 6px;
  font-size: 13px;
  color: #529b2e;
  margin-bottom: 4px;
}
.size-tip-banner i { font-size: 15px; flex-shrink: 0; }

/* 提示 */
.form-hint { font-size: 12px; color: #909399; margin-left: 8px; }

/* 卡片背景颜色选择 */
.bg-color-row {
  display: flex;
  align-items: center;
  gap: 12px;
}
.bg-color-label {
  font-size: 13px;
  font-family: 'Consolas', monospace;
  color: #606266;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: color 0.3s;
}

/* 滚动速度 */
.scroll-speed-row {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}
.scroll-speed-label {
  flex-shrink: 0;
  min-width: 28px;
  font-size: 13px;
  color: #606266;
  text-align: right;
}

</style>
