<template>
  <div class="query-detail-container">

    <!-- 工具栏 -->
    <div class="sqlbot-tool">
      <div class="tool-left">
        <el-input
            v-model="username"
            class="sqlbot-search"
            placeholder="请输入账号查询"
            prefix-icon="el-icon-search"
            clearable
            @clear="load(1)"
            @keyup.enter.native="load(1)">
        </el-input>

        <el-date-picker
            v-model="startTime"
            type="datetime"
            placeholder="开始时间"
            format="yyyy-MM-dd HH:mm:ss"
            value-format="yyyy-MM-dd HH:mm:ss"
            :default-time="'00:00:00'"
            class="time-picker"
            :picker-options="startPickerOptions">
        </el-date-picker>

        <span class="time-separator">至</span>

        <el-date-picker
            v-model="endTime"
            type="datetime"
            placeholder="结束时间"
            format="yyyy-MM-dd HH:mm:ss"
            value-format="yyyy-MM-dd HH:mm:ss"
            :default-time="'23:59:59'"
            class="time-picker"
            :picker-options="endPickerOptions">
        </el-date-picker>

        <el-select v-model="module" placeholder="模块" clearable class="module-select" @change="load(1)">
          <el-option label="全部" value=""></el-option>
          <el-option label="智能问数" value="DATA"></el-option>
          <el-option label="智能填表" value="FORM"></el-option>
          <el-option label="智能问答" value="QA"></el-option>
        </el-select>

        <el-button type="primary" size="small" class="primary-btn" @click="load(1)">查询</el-button>
        <el-button size="small" class="secondary-btn" @click="reset">重置</el-button>
      </div>
    </div>

    <!-- 数据表格 -->
    <div class="sqlbot-table">
      <div class="table-body">
        <el-table
            :data="tableData"
            v-loading="loading"
            class="custom-table"
            height="100%"
            :header-cell-style="{ background: '#f5f7fa', color: '#606266', fontWeight: '600' }"
            row-key="id">

          <!-- 展开行：显示完整 SQL -->
          <el-table-column type="expand" width="40">
            <template v-slot="scope">
              <div class="expand-sql-wrapper">
                <div class="expand-section">
                  <div class="expand-label">
                    <i class="el-icon-chat-dot-round"></i> 提问内容
                  </div>
                  <div class="expand-question">{{ scope.row.question }}</div>
                </div>
                <div v-if="scope.row.module !== 'QA'" class="expand-section">
                  <div class="expand-label">
                    <i class="el-icon-document"></i> 生成的 SQL
                  </div>
                  <div class="expand-sql-block">
                    <div class="sql-header">
                      <span class="sql-lang-tag">SQL</span>
                      <span class="sql-copy-btn" @click="copySql(scope.row.generatedSql)">
                        <i class="el-icon-document-copy"></i> 复制
                      </span>
                    </div>
                    <pre class="sql-code"><code>{{ scope.row.generatedSql || '无' }}</code></pre>
                  </div>
                </div>
              </div>
            </template>
          </el-table-column>

          <el-table-column prop="displayIndex" label="序号" width="60" align="center"></el-table-column>
          <el-table-column prop="username" label="账号" min-width="110"></el-table-column>
          <el-table-column prop="name" label="姓名" min-width="90"></el-table-column>

          <el-table-column label="模块" width="110" align="center">
            <template v-slot="scope">
              <el-tag
                size="small"
                :type="scope.row.module === 'DATA' ? '' : scope.row.module === 'FORM' ? 'success' : 'warning'"
                effect="plain">
                {{ scope.row.module === 'DATA' ? '智能问数' : scope.row.module === 'FORM' ? '智能填表' : '智能问答' }}
              </el-tag>
            </template>
          </el-table-column>

          <el-table-column label="提问内容" min-width="200" show-overflow-tooltip>
            <template v-slot="scope">
              <span class="question-text">{{ scope.row.question }}</span>
            </template>
          </el-table-column>

          <el-table-column label="生成的 SQL" min-width="200" show-overflow-tooltip>
            <template v-slot="scope">
              <span v-if="scope.row.module !== 'QA'" class="sql-preview">{{ truncateSql(scope.row.generatedSql) }}</span>
              <span v-else class="no-sql-tip">—</span>
            </template>
          </el-table-column>

          <el-table-column label="提问时间" width="160" align="center">
            <template v-slot="scope">
              <span class="time-text">{{ scope.row.createTime }}</span>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <div class="pagination-container">
        <el-pagination
            background
            small
            @current-change="handleCurrentChange"
            @size-change="handleSizeChange"
            :current-page="pageNum"
            :page-sizes="[10, 20, 30]"
            :page-size="pageSize"
            layout="total, sizes, prev, pager, next, jumper"
            :total="total">
        </el-pagination>
      </div>
    </div>

  </div>
</template>

<script>
export default {
  name: 'QueryDetail',
  data() {
    const today = new Date()
    const yyyy = today.getFullYear()
    const mm = String(today.getMonth() + 1).padStart(2, '0')
    const dd = String(today.getDate()).padStart(2, '0')
    const defaultStart = `${yyyy}-${mm}-${dd} 00:00:00`
    const defaultEnd = `${yyyy}-${mm}-${dd} 23:59:59`

    return {
      loading: false,
      tableData: [],
      pageNum: 1,
      pageSize: 10,
      total: 0,
      username: null,
      startTime: defaultStart,
      endTime: defaultEnd,
      module: '',
      user: JSON.parse(localStorage.getItem('xm-user') || '{}'),
      startPickerOptions: {
        shortcuts: [
          {
            text: '今天',
            onClick(picker) {
              const d = new Date(); d.setHours(0, 0, 0, 0)
              picker.$emit('pick', d)
            }
          },
          {
            text: '昨天',
            onClick(picker) {
              const d = new Date(); d.setDate(d.getDate() - 1); d.setHours(0, 0, 0, 0)
              picker.$emit('pick', d)
            }
          },
          {
            text: '一周前',
            onClick(picker) {
              const d = new Date(); d.setDate(d.getDate() - 7); d.setHours(0, 0, 0, 0)
              picker.$emit('pick', d)
            }
          }
        ]
      },
      endPickerOptions: {
        shortcuts: [
          {
            text: '今天',
            onClick(picker) {
              const d = new Date(); d.setHours(23, 59, 59, 0)
              picker.$emit('pick', d)
            }
          },
          {
            text: '昨天',
            onClick(picker) {
              const d = new Date(); d.setDate(d.getDate() - 1); d.setHours(23, 59, 59, 0)
              picker.$emit('pick', d)
            }
          }
        ]
      }
    }
  },
  created() {
    this.load(1)
  },
  methods: {
    truncateSql(sql) {
      if (!sql) return '—'
      // 将换行替换为空格，截取前 80 个字符
      const flat = sql.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim()
      return flat.length > 80 ? flat.substring(0, 80) + '...' : flat
    },
    copySql(sql) {
      if (!sql) return
      // 兼容非 HTTPS 环境
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(sql).then(() => {
          this.$message.success('SQL 已复制')
        })
      } else {
        const textarea = document.createElement('textarea')
        textarea.value = sql
        textarea.style.position = 'fixed'
        textarea.style.left = '-9999px'
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
        this.$message.success('SQL 已复制')
      }
    },
    load(pageNum) {
      if (pageNum) this.pageNum = pageNum
      this.loading = true

      const params = {
        pageNum: this.pageNum,
        pageSize: this.pageSize,
        adminId: this.user.id
      }

      if (this.username) params.username = this.username
      if (this.startTime) params.startTime = this.startTime
      if (this.endTime) params.endTime = this.endTime
      if (this.module) params.module = this.module

      this.$request.get('/queryDetail/selectPage', { params })
        .then(res => {
          this.loading = false
          let list = []
          let total = 0
          if (res.data) {
            if (res.data.list && Array.isArray(res.data.list)) {
              list = res.data.list
              total = res.data.total || 0
            } else if (Array.isArray(res.data)) {
              list = res.data
              total = list.length
            }
          }

          this.tableData = list
          this.total = total

          this.$nextTick(() => {
            this.tableData = this.tableData.map((item, index) => ({
              ...item,
              displayIndex: (this.pageNum - 1) * this.pageSize + index + 1,
            }))
          })
        })
        .catch(err => {
          console.error('提问明细加载失败:', err)
          this.loading = false
          this.tableData = []
          this.total = 0
          this.$message.error('提问明细加载失败，请检查网络连接或联系管理员')
        })
    },
    reset() {
      this.username = null
      this.module = ''
      const today = new Date()
      const yyyy = today.getFullYear()
      const mm = String(today.getMonth() + 1).padStart(2, '0')
      const dd = String(today.getDate()).padStart(2, '0')
      this.startTime = `${yyyy}-${mm}-${dd} 00:00:00`
      this.endTime = `${yyyy}-${mm}-${dd} 23:59:59`
      this.load(1)
    },
    handleCurrentChange(pageNum) {
      this.load(pageNum)
    },
    handleSizeChange(size) {
      this.pageSize = size
      this.load(1)
    }
  }
}
</script>

<style scoped>
/* ===== 核心布局（复用 User.vue 体系） ===== */
.query-detail-container {
  padding: 12px;
  background-color: #f7f8fa;
  height: calc(100vh - 120px);
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow: hidden;
  width: 100%;
}

/* ===== 工具栏 ===== */
.sqlbot-tool {
  min-height: 60px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #ffffff;
  padding: 12px 20px;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  flex-shrink: 0;
  flex-wrap: wrap;
  gap: 10px;
}
.tool-left {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.sqlbot-search { width: 200px; }
::v-deep .sqlbot-search .el-input__inner {
  height: 36px; line-height: 36px; border-radius: 20px;
  background-color: #f5f7fa; border-color: #e4e7ed; padding-left: 35px;
}
::v-deep .sqlbot-search .el-input__icon { line-height: 36px; }

.time-picker { width: 210px; }
::v-deep .time-picker .el-input__inner {
  height: 36px; line-height: 36px; border-radius: 6px; font-size: 13px;
}
.time-separator { color: #909399; font-size: 13px; padding: 0 2px; }

.module-select { width: 130px; }
::v-deep .module-select .el-input__inner {
  height: 36px; line-height: 36px; border-radius: 6px;
}

.primary-btn {
  background-color: #1890ff; border-color: #1890ff; color: white; border-radius: 4px;
}
.primary-btn:hover { background-color: #0050B3; border-color: #0050B3; }
.secondary-btn { background: #f5f5f5; color: #333; border: 1px solid #ddd; border-radius: 4px; }
.secondary-btn:hover { background: #eee; }

/* ===== 表格主容器 ===== */
.sqlbot-table {
  background: #fff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  flex: 1; display: flex; flex-direction: column; min-height: 0; overflow: hidden;
}
.table-body { flex: 1; width: 100%; height: 0; }

.custom-table { width: 100%; }
::v-deep .el-table td,
::v-deep .el-table th.is-leaf {
  border-right: none !important;
  border-bottom: 1px solid #dcdfe6 !important;
}
::v-deep .el-table::before { height: 0; }
::v-deep .el-table__row { height: 52px; }
::v-deep .el-table__row:hover > td { background-color: #f0f7ff !important; }

/* 分页器 */
.pagination-container {
  height: 50px; display: flex; justify-content: flex-end; align-items: center;
  padding: 0 20px; background-color: #ffffff; border-top: 1px solid #ebeef5; flex-shrink: 0;
}

/* ===== 展开行样式 ===== */
::v-deep .el-table__expanded-cell {
  padding: 0 !important;
  background-color: #fafbfc !important;
}

.expand-sql-wrapper {
  padding: 16px 24px 16px 50px;
  background: linear-gradient(135deg, #fafbfc 0%, #f0f5ff 100%);
  border-left: 3px solid #1890ff;
}

.expand-section {
  margin-bottom: 14px;
}
.expand-section:last-child {
  margin-bottom: 0;
}

.expand-label {
  font-size: 13px;
  font-weight: 600;
  color: #606266;
  margin-bottom: 8px;
}
.expand-label i {
  margin-right: 4px;
  color: #1890ff;
}

.expand-question {
  font-size: 14px;
  color: #303133;
  line-height: 1.6;
  padding: 8px 12px;
  background: #ffffff;
  border-radius: 6px;
  border: 1px solid #e8ecf1;
}

.expand-sql-block {
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #e0e6ed;
}

.sql-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 12px;
  background: #282c34;
}
.sql-lang-tag {
  font-size: 12px;
  color: #abb2bf;
  font-weight: 600;
  text-transform: uppercase;
}
.sql-copy-btn {
  font-size: 12px;
  color: #abb2bf;
  cursor: pointer;
  transition: color 0.2s;
}
.sql-copy-btn:hover { color: #61afef; }

.sql-code {
  margin: 0;
  padding: 14px 16px;
  background: #282c34;
  color: #abb2bf;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.6;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-all;
}

/* ===== 行内文本样式 ===== */
.question-text {
  color: #303133;
}
.no-sql-tip {
  color: #c0c4cc;
  font-size: 14px;
}
.sql-preview {
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 12px;
  color: #8c8c8c;
  background: #f5f5f5;
  padding: 2px 6px;
  border-radius: 3px;
}
.time-text {
  font-size: 13px;
  color: #909399;
}
</style>
