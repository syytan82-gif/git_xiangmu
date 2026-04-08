<template>
  <div class="query-stats-container">

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

        <el-input
            v-model.number="maxCount"
            class="count-filter"
            placeholder="筛选总提问数小于..."
            clearable
            @clear="load(1)"
            @keyup.enter.native="load(1)">
          <template slot="prepend"><i class="el-icon-sort"></i></template>
        </el-input>

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
            :header-cell-style="{ background: '#f5f7fa', color: '#606266', fontWeight: '600' }">

          <el-table-column prop="displayIndex" label="序号" width="60" align="center"></el-table-column>
          <el-table-column prop="username" label="账号" min-width="120"></el-table-column>
          <el-table-column prop="name" label="姓名" min-width="100"></el-table-column>

          <el-table-column label="智能问数" min-width="100" align="center">
            <template v-slot="scope">
              <span class="count-cell count-text2sql">{{ scope.row.text2sqlCount || 0 }}</span>
            </template>
          </el-table-column>

          <el-table-column label="智能填表" min-width="100" align="center">
            <template v-slot="scope">
              <span class="count-cell count-form">{{ scope.row.formCount || 0 }}</span>
            </template>
          </el-table-column>

          <el-table-column label="智能问答" min-width="100" align="center">
            <template v-slot="scope">
              <span class="count-cell count-rag">{{ scope.row.ragCount || 0 }}</span>
            </template>
          </el-table-column>

          <el-table-column label="总计" min-width="100" align="center">
            <template v-slot="scope">
              <span class="count-cell count-total">{{ computeTotal(scope.row) }}</span>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <div class="pagination-container">
        <el-pagination
            background
            small
            @current-change="handleCurrentChange"
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
  name: 'QueryStats',
  data() {
    // 计算今天的默认时间范围
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
      maxCount: null,
      user: JSON.parse(localStorage.getItem('xm-user') || '{}'),
      startPickerOptions: {
        shortcuts: [
          {
            text: '今天',
            onClick(picker) {
              const d = new Date()
              d.setHours(0, 0, 0, 0)
              picker.$emit('pick', d)
            }
          },
          {
            text: '昨天',
            onClick(picker) {
              const d = new Date()
              d.setDate(d.getDate() - 1)
              d.setHours(0, 0, 0, 0)
              picker.$emit('pick', d)
            }
          },
          {
            text: '一周前',
            onClick(picker) {
              const d = new Date()
              d.setDate(d.getDate() - 7)
              d.setHours(0, 0, 0, 0)
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
              const d = new Date()
              d.setHours(23, 59, 59, 0)
              picker.$emit('pick', d)
            }
          },
          {
            text: '昨天',
            onClick(picker) {
              const d = new Date()
              d.setDate(d.getDate() - 1)
              d.setHours(23, 59, 59, 0)
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
    computeTotal(row) {
      return (row.text2sqlCount || 0) + (row.formCount || 0) + (row.ragCount || 0)
    },
    load(pageNum) {
      if (pageNum) this.pageNum = pageNum
      this.loading = true

      const params = {
        pageNum: this.pageNum,
        pageSize: this.pageSize,
        adminId: this.user.id
      }

      // 可选参数
      if (this.username) params.username = this.username
      if (this.startTime) params.startTime = this.startTime
      if (this.endTime) params.endTime = this.endTime
      if (this.maxCount !== null && this.maxCount !== '' && !isNaN(this.maxCount)) {
        params.maxCount = this.maxCount
      }

      this.$request.get('/queryStats/selectPage', { params })
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
          console.error('提问统计加载失败:', err)
          this.loading = false
          this.tableData = []
          this.total = 0
          this.$message.error('提问统计加载失败，请检查网络连接或联系管理员')
        })
    },
    reset() {
      this.username = null
      this.maxCount = null
      // 重置为今天的时间范围
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
    }
  }
}
</script>

<style scoped>
/* ===== 核心布局（复用 User.vue 体系） ===== */
.query-stats-container {
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

.sqlbot-search {
  width: 200px;
}
::v-deep .sqlbot-search .el-input__inner {
  height: 36px;
  line-height: 36px;
  border-radius: 20px;
  background-color: #f5f7fa;
  border-color: #e4e7ed;
  padding-left: 35px;
}
::v-deep .sqlbot-search .el-input__icon {
  line-height: 36px;
}

.time-picker {
  width: 210px;
}
::v-deep .time-picker .el-input__inner {
  height: 36px;
  line-height: 36px;
  border-radius: 6px;
  font-size: 13px;
}

.time-separator {
  color: #909399;
  font-size: 13px;
  padding: 0 2px;
}

.count-filter {
  width: 200px;
}
::v-deep .count-filter .el-input__inner {
  height: 36px;
  line-height: 36px;
  border-radius: 6px;
}
::v-deep .count-filter .el-input-group__prepend {
  padding: 0 10px;
  background-color: #f5f7fa;
  border-radius: 6px 0 0 6px;
}

.primary-btn {
  background-color: #1890ff;
  border-color: #1890ff;
  color: white;
  border-radius: 4px;
}
.primary-btn:hover {
  background-color: #0050B3;
  border-color: #0050B3;
}
.secondary-btn {
  background: #f5f5f5;
  color: #333;
  border: 1px solid #ddd;
  border-radius: 4px;
}
.secondary-btn:hover {
  background: #eee;
}

/* ===== 表格主容器 ===== */
.sqlbot-table {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.table-body {
  flex: 1;
  width: 100%;
  height: 0;
}

/* 表格样式：无竖线，有横线 */
.custom-table {
  width: 100%;
}
::v-deep .el-table td,
::v-deep .el-table th.is-leaf {
  border-right: none !important;
  border-bottom: 1px solid #dcdfe6 !important;
}
::v-deep .el-table::before {
  height: 0;
}
::v-deep .el-table__row {
  height: 52px;
}
::v-deep .el-table__row:hover > td {
  background-color: #f0f7ff !important;
}

/* 分页器 */
.pagination-container {
  height: 50px;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  padding: 0 20px;
  background-color: #ffffff;
  border-top: 1px solid #ebeef5;
  flex-shrink: 0;
}

/* ===== 数值单元格样式 ===== */
.count-cell {
  display: inline-block;
  min-width: 40px;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  text-align: center;
  line-height: 1.4;
}

.count-text2sql {
  background-color: #e6f7ff;
  color: #1890ff;
}

.count-form {
  background-color: #f6ffed;
  color: #52c41a;
}

.count-rag {
  background-color: #fff7e6;
  color: #fa8c16;
}

.count-total {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #ffffff;
  box-shadow: 0 2px 6px rgba(102, 126, 234, 0.3);
}
</style>
