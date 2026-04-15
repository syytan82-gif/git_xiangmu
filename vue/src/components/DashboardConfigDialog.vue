<template>
  <el-dialog
    :title="isEdit ? '编辑卡片' : '添加卡片'"
    :visible.sync="dialogVisible"
    width="780px"
    :close-on-click-modal="false"
    custom-class="config-dialog"
    @close="handleClose"
    append-to-body
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
            rows="5"
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
          <el-button type="text" size="mini" @click="previewData = []">收起</el-button>
        </div>
        <el-table
          :data="previewData.slice(0, 10)"
          stripe
          border
          size="mini"
          max-height="200"
          style="width: 100%"
          :header-cell-style="{ background: '#f5f7fa', fontSize: '12px' }"
        >
          <el-table-column
            v-for="col in previewColumns"
            :key="col.name"
            :prop="col.name"
            :label="col.name + (col.type ? ' (' + col.type + ')' : '')"
            :min-width="100"
            show-overflow-tooltip
          ></el-table-column>
        </el-table>
        <div class="preview-tip" v-if="previewData.length > 10">仅展示前 10 条，共 {{ previewData.length }} 条</div>
      </div>

      <!-- 展示模式 -->
      <el-form-item label="展示模式">
        <el-radio-group v-model="form.displayMode" @change="onDisplayModeChange">
          <el-radio-button label="table">
            <i class="el-icon-tickets"></i> 表格
          </el-radio-button>
          <el-radio-button label="chart">
            <i class="el-icon-data-analysis"></i> 图表
          </el-radio-button>
        </el-radio-group>
      </el-form-item>

      <!-- 图表配置（仅图表模式） -->
      <template v-if="form.displayMode === 'chart'">
        <!-- X 轴 -->
        <el-form-item label="X轴字段">
          <el-select v-model="form.chartConfig.xAxisField" placeholder="选择X轴字段" filterable>
            <el-option
              v-for="col in previewColumns"
              :key="col.name"
              :label="col.name"
              :value="col.name"
            ></el-option>
          </el-select>
        </el-form-item>

        <!-- Y 轴 -->
        <el-form-item label="Y轴字段">
          <el-select
            v-model="form.chartConfig.yAxisFields"
            placeholder="选择Y轴字段（可多选）"
            multiple
            filterable
            @change="onYFieldsChange"
          >
            <el-option
              v-for="col in numericPreviewColumns"
              :key="col.name"
              :label="col.name"
              :value="col.name"
            ></el-option>
          </el-select>
        </el-form-item>

        <!-- 每个 Y 轴字段的图表类型配置 -->
        <el-form-item label="系列设置" v-if="form.chartConfig.yAxisFields.length > 0">
          <div class="series-config-list">
            <div
              class="series-config-item"
              v-for="field in form.chartConfig.yAxisFields"
              :key="field"
            >
              <span class="series-name">{{ field }}</span>
              <el-select
                v-model="form.chartConfig.seriesTypes[field]"
                size="mini"
                class="series-type-select"
                placeholder="类型"
              >
                <el-option label="柱状图" value="bar"></el-option>
                <el-option label="折线图" value="line"></el-option>
              </el-select>
              <el-checkbox
                v-model="form.chartConfig.useSecondaryYAxis[field]"
                class="secondary-y-check"
              >
                副Y轴（右侧）
              </el-checkbox>
            </div>
          </div>
        </el-form-item>

        <!-- 堆叠开关 -->
        <el-form-item label="堆叠显示">
          <el-switch v-model="form.chartConfig.stacked"></el-switch>
          <span class="form-hint">仅对柱状图系列生效</span>
        </el-form-item>
      </template>

      <!-- 卡片尺寸 -->
      <el-form-item label="卡片大小">
        <div class="size-config">
          <span class="size-label">占几列：</span>
          <el-input-number v-model="form.gridW" :min="1" :max="3" :step="1" size="small"></el-input-number>
          <span class="size-label" style="margin-left:16px">占几行：</span>
          <el-input-number v-model="form.gridH" :min="0.5" :max="3" :step="0.5" size="small"></el-input-number>
        </div>
        <div class="size-hint">大屏共 3 列 3 行，支持 0.5 行步长。卡片按添加顺序自动排列。</div>
        <!-- 网格预览：6行(每行代表0.5个视觉行) x 3列 -->
        <div class="grid-preview">
          <div
            v-for="r in 6"
            :key="'row-'+r"
            class="grid-preview-row"
          >
            <div
              v-for="c in 3"
              :key="'cell-'+r+'-'+c"
              class="grid-preview-cell grid-preview-cell-half"
              :class="{ 'cell-active': r <= form.gridH * 2 && c <= form.gridW }"
            ></div>
          </div>
        </div>
      </el-form-item>
    </el-form>

    <span slot="footer">
      <el-button @click="dialogVisible = false" size="small">取 消</el-button>
      <el-button type="primary" @click="handleConfirm" size="small">确 定</el-button>
    </span>
  </el-dialog>
</template>

<script>
export default {
  name: 'DashboardConfigDialog',
  props: {
    visible: { type: Boolean, default: false },
    cardConfig: { type: Object, default: null },
    datasourceList: { type: Array, default: () => [] }
  },
  data() {
    return {
      executing: false,
      previewData: [],
      previewColumns: [],
      form: this.getDefaultForm()
    }
  },
  computed: {
    dialogVisible: {
      get() { return this.visible },
      set(val) { this.$emit('update:visible', val) }
    },
    isEdit() {
      return !!(this.cardConfig && this.cardConfig.id)
    },
    numericPreviewColumns() {
      return this.previewColumns.filter(c => {
        const t = (c.type || '').toUpperCase()
        // 类型明确为数值，或者类型为空时默认可选
        return ['INT', 'INTEGER', 'DECIMAL', 'FLOAT', 'DOUBLE', 'NUMERIC', 'BIGINT', 'NUMBER'].some(k => t.includes(k)) || !t
      })
    }
  },
  watch: {
    visible(val) {
      if (val) {
        if (this.cardConfig) {
          // 编辑模式：加载已有配置
          this.form = {
            id: this.cardConfig.id,
            title: this.cardConfig.title || '',
            sql: this.cardConfig.sql || '',
            dbConfigId: this.cardConfig.dbConfigId || null,
            displayMode: this.cardConfig.displayMode || 'table',
            gridW: this.cardConfig.gridW || 1,
            gridH: this.cardConfig.gridH || 1,
            chartConfig: {
              xAxisField: '',
              yAxisFields: [],
              seriesTypes: {},
              useSecondaryYAxis: {},
              stacked: false,
              ...(this.cardConfig.chartConfig || {})
            }
          }
          // 如果有 SQL，自动执行预览以获取列信息
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
        gridW: 1,
        gridH: 1,
        chartConfig: {
          xAxisField: '',
          yAxisFields: [],
          seriesTypes: {},
          useSecondaryYAxis: {},
          stacked: false
        }
      }
    },

    getDbTypeTag(type) {
      switch(type) {
        case 'MySQL': return ''
        case 'Oracle': return 'danger'
        case 'PostgreSQL': return 'success'
        case 'SQL Server': return 'warning'
        default: return 'info'
      }
    },

    onDatasourceChange() {
      // 切换数据源时清空预览
      this.previewData = []
      this.previewColumns = []
    },

    onDisplayModeChange() {
      // 切换显示模式时不清空配置
    },

    onYFieldsChange(fields) {
      // 为新增的字段设置默认类型
      fields.forEach(f => {
        if (!this.form.chartConfig.seriesTypes[f]) {
          this.$set(this.form.chartConfig.seriesTypes, f, 'bar')
        }
        if (this.form.chartConfig.useSecondaryYAxis[f] === undefined) {
          this.$set(this.form.chartConfig.useSecondaryYAxis, f, false)
        }
      })
      // 清理已移除字段的配置
      Object.keys(this.form.chartConfig.seriesTypes).forEach(key => {
        if (!fields.includes(key)) {
          this.$delete(this.form.chartConfig.seriesTypes, key)
          this.$delete(this.form.chartConfig.useSecondaryYAxis, key)
        }
      })
    },

    executePreview() {
      if (!this.form.sql || !this.form.sql.trim()) {
        this.$message.warning('请输入 SQL 语句')
        return
      }
      if (!this.form.dbConfigId) {
        this.$message.warning('请选择数据源')
        return
      }

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
        const msg = (err && err.msg) || 'SQL 执行请求失败'
        this.$message.error(msg)
      }).finally(() => {
        this.executing = false
      })
    },

    handleConfirm() {
      if (!this.form.title) {
        this.$message.warning('请输入卡片标题')
        return
      }
      if (!this.form.sql) {
        this.$message.warning('请输入 SQL 语句')
        return
      }
      if (!this.form.dbConfigId) {
        this.$message.warning('请选择数据源')
        return
      }
      if (this.form.displayMode === 'chart') {
        const cc = this.form.chartConfig
        if (!cc.xAxisField) {
          this.$message.warning('请选择X轴字段')
          return
        }
        if (!cc.yAxisFields || cc.yAxisFields.length === 0) {
          this.$message.warning('请选择至少一个Y轴字段')
          return
        }
      }

      // 生成 ID（新建时）
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
    }
  }
}
</script>

<style scoped>
/* 表单行布局 */
.form-row {
  display: flex;
  gap: 16px;
}
.flex-item {
  flex: 1;
}

/* SQL 编辑器 */
.sql-editor-wrapper {
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  overflow: hidden;
  transition: border-color 0.2s;
}
.sql-editor-wrapper:focus-within {
  border-color: #1890ff;
}
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
.sql-editor::placeholder {
  color: #bbb;
}
.sql-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 10px;
  background: #f5f7fa;
  border-top: 1px solid #ebeef5;
}
.preview-count {
  font-size: 12px;
  color: #67c23a;
}
.preview-count i {
  margin-right: 4px;
}

/* 预览区 */
.preview-section {
  margin: 0 0 16px;
  padding: 0 14px;
}
.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.preview-title {
  font-size: 13px;
  font-weight: 600;
  color: #606266;
}
.preview-title i {
  color: #1890ff;
  margin-right: 4px;
}
.preview-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
  text-align: right;
}

/* 系列配置 */
.series-config-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.series-config-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  background: #fafbfc;
  border-radius: 6px;
  border: 1px solid #ebeef5;
}
.series-name {
  font-size: 13px;
  font-weight: 500;
  color: #303133;
  min-width: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.series-type-select {
  width: 110px;
}
.secondary-y-check {
  margin-left: auto;
}

/* 尺寸配置 */
.size-config {
  display: flex;
  align-items: center;
}
.size-label {
  font-size: 13px;
  color: #606266;
}
.size-hint {
  font-size: 12px;
  color: #909399;
  margin-top: 6px;
}

/* 网格预览 */
.grid-preview {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: 200px;
}
.grid-preview-row {
  display: flex;
  gap: 3px;
}
.grid-preview-cell {
  width: 46px;
  height: 28px;
  border-radius: 3px;
  background: #f0f2f5;
  border: 1px solid #e8ecf1;
  transition: all 0.2s;
}
/* 半行高单元格 */
.grid-preview-cell-half {
  height: 14px;
}
.cell-active {
  background: #1890ff;
  border-color: #1890ff;
}

/* 提示文本 */
.form-hint {
  font-size: 12px;
  color: #909399;
  margin-left: 8px;
}
</style>
