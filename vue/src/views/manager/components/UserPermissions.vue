<template>
  <div class="user-permissions">
    <!-- 工具栏 -->
    <div class="tool-bar">
      <span class="page-title">用户权限详情</span>
      <div>
        <el-input
          v-model="keywords"
          clearable
          style="width: 240px; margin-right: 12px"
          placeholder="搜索账号/姓名"
          @keyup.enter.native="handleSearch"
        >
          <i slot="prefix" class="el-input__icon el-icon-search"></i>
        </el-input>
        <el-button type="primary" @click="handleSearch">
          <i class="el-icon-search"></i>
          搜索
        </el-button>
      </div>
    </div>

    <!-- 用户列表 (Flattened) -->
    <div class="card-content">
      <el-table 
        v-loading="loading" 
        :data="flatUserList" 
        style="width: 100%"
        height="100%"
        :header-cell-style="{ background: '#f5f7fa', color: '#606266', fontWeight: '600' }"
        :span-method="objectSpanMethod"
        border
      >
        <el-table-column
          prop="displayIndex"
          label="序号"
          width="60"
          align="center"
        />
        <el-table-column
          prop="username"
          label="账号"
          width="120"
        />
        <el-table-column
          prop="username"
          label="姓名"
          width="120"
        />
        
        <el-table-column label="数据源 / 部门 / 数据表" min-width="200">
          <template slot-scope="scope">
             <div v-if="scope.row.noPermissions" class="no-permissions">
                暂无权限
             </div>
             <div v-else class="table-info-cell">
                <el-tag size="mini" effect="plain" type="info">{{ scope.row.dbConfigName }}</el-tag>
                <el-tag size="mini" effect="light" type="warning" class="dept-tag">{{ scope.row.departmentName }}</el-tag>
                <span class="table-name-bold">{{ scope.row.tableName }}</span>
             </div>
          </template>
        </el-table-column>

        <el-table-column label="可访问列 (Accessible Columns)" min-width="200">
          <template slot-scope="scope">
              <div v-if="scope.row.noPermissions" class="col-none">-</div>
              <div v-else class="permission-columns">
                 <i class="el-icon-key" style="margin-right: 4px; color: #909399;"></i>
                 <template v-if="Array.isArray(scope.row.allowedColumns) && scope.row.allowedColumns.length">
                    <span v-if="scope.row.allowedColumns.includes('*')" class="col-all">全表权限</span>
                    <span v-else class="col-list-wrap">
                      {{ scope.row.allowedColumns.join(', ') }}
                    </span>
                 </template>
                 <span v-else class="col-none">无访问权限</span>
              </div>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-container">
        <el-pagination
          background
          small
          layout="total, sizes, prev, pager, next, jumper"
          :current-page.sync="pageNum"
          :page-sizes="[10, 20, 30]"
          :page-size="pageSize"
          :total="total"
          @current-change="handleSearch"
          @size-change="handleSizeChange"
        />
      </div>
    </div>
  </div>
</template>

<script>
import { getUserListWithPermissions } from '@/api/permissions'

export default {
  name: 'UserPermissions',
  data() {
    return {
      keywords: '',
      loading: false,
      userList: [],     // Raw data from API
      flatUserList: [], // Processed flat data for table
      pageNum: 1,
      pageSize: 10,
      total: 0
    }
  },
  mounted() {
    this.handleSearch()
  },
  methods: {
    handleSearch() {
      this.loading = true
      const params = {
        pageNum: this.pageNum,
        pageSize: this.pageSize,
        name: this.keywords
      }
      getUserListWithPermissions(params).then(res => {
         const data = res.data || []
         let list = []
         if (Array.isArray(data)) {
            list = data
            this.total = data.length
         } else {
             list = data.list || []
             this.total = data.total || list.length
         }
         this.userList = list
         this.processFlatData()
      }).catch(err => {
         console.error('获取用户权限列表失败', err)
         this.$message.error('获取用户权限列表失败')
      }).finally(() => {
         this.loading = false
      })
    },
    
    // Transform nested user data into flat permission rows
    processFlatData() {
      const flat = []
      this.userList.forEach((user, userIdx) => {
          const displayIndex = (this.pageNum - 1) * this.pageSize + userIdx + 1
          
          if (!user.accessList || user.accessList.length === 0) {
              // Row for user with no permissions
              flat.push({
                  ...user,
                  displayIndex,
                  noPermissions: true,
                  rowSpan: 1,
                  isFirst: true
              })
          } else {
              user.accessList.forEach((access, index) => {
                  flat.push({
                      ...user, // userId, username
                      ...access, // dbConfigName, tableName, allowedColumns
                      displayIndex,
                      noPermissions: false,
                      rowSpan: index === 0 ? user.accessList.length : 0,
                      isFirst: index === 0
                  })
              })
          }
      })
      this.flatUserList = flat
    },

    // Merge User Columns
    objectSpanMethod({ row, column, rowIndex, columnIndex }) {
      // Columns 0 (Index), 1 (Account), 2 (Name) need merging
      if (columnIndex < 3) {
          if (row.isFirst) {
              return {
                  rowspan: row.rowSpan,
                  colspan: 1
              }
          } else {
              return {
                  rowspan: 0,
                  colspan: 0
              }
          }
      }
    },

    handleSizeChange(val) {
      this.pageSize = val
      this.handleSearch()
    }
  }
}
</script>

<style scoped>
.user-permissions {
  height: calc(100vh - 200px);
  display: flex;
  flex-direction: column;
}

.tool-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  background: #fff;
  padding: 16px 20px;
  border-radius: 8px;
  flex-shrink: 0;
}

.page-title {
  font-size: 20px;
  font-weight: 500;
  color: #303133;
}

.card-content {
  background: #fff;
  border-radius: 8px;
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

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

/* Table Styles */
.table-info-cell {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}

.dept-tag {
  margin-right: 0;
}

.table-name-bold {
  color: #303133;
  font-weight: 600;
  font-size: 13px;
}

.permission-columns {
  display: flex;
  align-items: center;
  font-size: 12px;
  color: #606266;
}

.col-all {
  color: #1890ff;
  background-color: #e6f7ff;
  padding: 1px 6px;
  border-radius: 4px;
  font-weight: 500;
}

.col-list-wrap {
  color: #606266;
  white-space: normal;
  word-break: break-all;
  line-height: 1.4;
}

.col-none {
  color: #909399;
  font-style: italic;
  font-size: 12px;
}

.no-permissions {
  color: #C0C4CC;
  font-style: italic;
  font-size: 13px;
}
</style>
