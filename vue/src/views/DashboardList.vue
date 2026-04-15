<template>
  <div class="dashboard-list-container">
    <!-- 顶部操作栏 -->
    <div class="list-toolbar">
      <div class="toolbar-left">
        <h2 class="page-title">
          <i class="el-icon-data-line"></i> 数据大屏管理
        </h2>
        <span class="page-desc">创建和管理您的数据看板</span>
      </div>
      <div class="toolbar-right">
        <el-button type="primary" icon="el-icon-plus" @click="showCreateDialog">
          新建大屏
        </el-button>
      </div>
    </div>

    <!-- 大屏卡片列表 -->
    <div class="dashboard-grid" v-loading="loading" element-loading-text="加载中...">
      <!-- 新建卡片（固定在第一个） -->
      <div class="dash-card dash-card-create" @click="showCreateDialog">
        <div class="create-icon">
          <i class="el-icon-plus"></i>
        </div>
        <span class="create-text">新建大屏</span>
      </div>

      <!-- 已有大屏卡片 -->
      <div
        class="dash-card"
        v-for="item in dashboardList"
        :key="item.id"
        @click="openDashboard(item)"
      >
        <div class="card-top">
          <div class="card-icon-wrapper">
            <i class="el-icon-s-data"></i>
          </div>
          <el-dropdown trigger="click" @command="handleCommand($event, item)" @click.native.stop>
            <span class="more-btn">
              <i class="el-icon-more"></i>
            </span>
            <el-dropdown-menu slot="dropdown">
              <el-dropdown-item command="edit" icon="el-icon-edit">编辑</el-dropdown-item>
              <el-dropdown-item command="delete" icon="el-icon-delete" class="danger-item">删除</el-dropdown-item>
            </el-dropdown-menu>
          </el-dropdown>
        </div>
        <div class="card-body">
          <h3 class="card-title">{{ item.name }}</h3>
          <p class="card-desc">{{ item.description || '暂无描述' }}</p>
        </div>
        <div class="card-footer">
          <span class="footer-info">
            <i class="el-icon-time"></i>
            {{ item.updateTime || item.createTime || '—' }}
          </span>
          <span class="footer-refresh" v-if="item.refreshInterval">
            <i class="el-icon-refresh"></i>
            每{{ item.refreshInterval }}分钟
          </span>
          <span class="footer-refresh" v-else-if="item.refreshTime">
            <i class="el-icon-alarm-clock"></i>
            {{ item.refreshTime }}
          </span>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-if="!loading && dashboardList.length === 0" class="empty-state">
      <i class="el-icon-data-board empty-icon"></i>
      <p class="empty-title">暂无数据大屏</p>
      <p class="empty-desc">点击上方"新建大屏"按钮创建您的第一个数据看板</p>
    </div>

    <!-- 新建/编辑对话框 -->
    <el-dialog
      :title="editingDashboard ? '编辑大屏' : '新建大屏'"
      :visible.sync="createDialogVisible"
      width="500px"
      :close-on-click-modal="false"
      custom-class="create-dialog"
    >
      <el-form :model="formData" label-width="100px" :rules="formRules" ref="createForm">
        <el-form-item label="大屏名称" prop="name">
          <el-input v-model="formData.name" placeholder="请输入大屏名称" maxlength="50" show-word-limit></el-input>
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input
            v-model="formData.description"
            type="textarea"
            :rows="3"
            placeholder="请输入大屏描述（可选）"
            maxlength="200"
            show-word-limit
          ></el-input>
        </el-form-item>
        <el-form-item label="刷新方式">
          <el-radio-group v-model="formData.refreshMode">
            <el-radio label="none">不自动刷新</el-radio>
            <el-radio label="interval">按间隔刷新</el-radio>
            <el-radio label="fixed">定时刷新</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="formData.refreshMode === 'interval'" label="刷新间隔">
          <el-input-number
            v-model="formData.refreshInterval"
            :min="1"
            :max="1440"
            :step="10"
            placeholder="分钟"
          ></el-input-number>
          <span class="form-tip">分钟</span>
        </el-form-item>
        <el-form-item v-if="formData.refreshMode === 'fixed'" label="刷新时间">
          <el-time-picker
            v-model="formData.refreshTimeObj"
            format="HH:mm"
            value-format="HH:mm"
            placeholder="选择时间"
          ></el-time-picker>
        </el-form-item>
      </el-form>
      <span slot="footer">
        <el-button @click="createDialogVisible = false">取 消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">确 定</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
export default {
  name: 'DashboardList',
  data() {
    return {
      loading: false,
      saving: false,
      dashboardList: [],
      createDialogVisible: false,
      editingDashboard: null,
      formData: {
        name: '',
        description: '',
        refreshMode: 'none',
        refreshInterval: 30,
        refreshTimeObj: '08:00'
      },
      formRules: {
        name: [{ required: true, message: '请输入大屏名称', trigger: 'blur' }]
      }
    }
  },
  created() {
    this.loadList()
  },
  methods: {
    loadList() {
      this.loading = true
      this.$request.get('/dashboard/list').then(res => {
        if (res.code === '200') {
          this.dashboardList = res.data || []
        } else {
          this.$message.error(res.msg || '加载大屏列表失败')
        }
      }).catch(() => {
        // 后端接口未就绪时使用 localStorage 兜底
        const saved = localStorage.getItem('dashboard-list')
        if (saved) {
          try { this.dashboardList = JSON.parse(saved) } catch(e) { /* ignore */ }
        }
      }).finally(() => {
        this.loading = false
      })
    },

    showCreateDialog() {
      this.editingDashboard = null
      this.formData = {
        name: '',
        description: '',
        refreshMode: 'none',
        refreshInterval: 30,
        refreshTimeObj: '08:00'
      }
      this.createDialogVisible = true
    },

    openDashboard(item) {
      this.$router.push(`/dashboard/${item.id}`)
    },

    handleCommand(command, item) {
      if (command === 'edit') {
        this.editingDashboard = item
        this.formData = {
          name: item.name,
          description: item.description || '',
          refreshMode: item.refreshInterval ? 'interval' : (item.refreshTime ? 'fixed' : 'none'),
          refreshInterval: item.refreshInterval || 30,
          refreshTimeObj: item.refreshTime || '08:00'
        }
        this.createDialogVisible = true
      } else if (command === 'delete') {
        this.$confirm('确定删除该大屏配置？删除后不可恢复。', '提示', {
          type: 'warning'
        }).then(() => {
          this.$request.delete(`/dashboard/delete/${item.id}`).then(res => {
            if (res.code === '200') {
              this.$message.success('删除成功')
              this.loadList()
            } else {
              this.$message.error(res.msg || '删除失败')
            }
          }).catch(() => {
            // 兜底：从 localStorage 删除
            this.dashboardList = this.dashboardList.filter(d => d.id !== item.id)
            localStorage.setItem('dashboard-list', JSON.stringify(this.dashboardList))
            this.$message.success('删除成功')
          })
        }).catch(() => {})
      }
    },

    handleSave() {
      this.$refs.createForm.validate(valid => {
        if (!valid) return

        this.saving = true
        const payload = {
          name: this.formData.name,
          description: this.formData.description,
          refreshInterval: this.formData.refreshMode === 'interval' ? this.formData.refreshInterval : null,
          refreshTime: this.formData.refreshMode === 'fixed' ? this.formData.refreshTimeObj : null,
          config: this.editingDashboard
            ? (this.editingDashboard.config || '{"gridColumns":4,"cards":[]}')
            : '{"gridColumns":4,"cards":[]}'
        }

        if (this.editingDashboard) {
          payload.id = this.editingDashboard.id
        }

        this.$request.post('/dashboard/save', payload).then(res => {
          if (res.code === '200') {
            this.$message.success(this.editingDashboard ? '更新成功' : '创建成功')
            this.createDialogVisible = false
            if (!this.editingDashboard && res.data && res.data.id) {
              // 新建后跳转到编辑页
              this.$router.push(`/dashboard/${res.data.id}`)
            } else {
              this.loadList()
            }
          } else {
            this.$message.error(res.msg || '保存失败')
          }
        }).catch(() => {
          // 兜底：存入 localStorage
          const id = this.editingDashboard ? this.editingDashboard.id : 'local_' + Date.now()
          const item = {
            id: id,
            ...payload,
            createTime: new Date().toLocaleString(),
            updateTime: new Date().toLocaleString()
          }
          if (this.editingDashboard) {
            const idx = this.dashboardList.findIndex(d => d.id === id)
            if (idx >= 0) this.dashboardList.splice(idx, 1, item)
          } else {
            this.dashboardList.push(item)
          }
          localStorage.setItem('dashboard-list', JSON.stringify(this.dashboardList))
          this.$message.success('保存成功（本地存储）')
          this.createDialogVisible = false
          if (!this.editingDashboard) {
            this.$router.push(`/dashboard/${id}`)
          }
        }).finally(() => {
          this.saving = false
        })
      })
    }
  }
}
</script>

<style scoped>
.dashboard-list-container {
  padding: 20px 24px;
  background-color: #f7f8fa;
  min-height: calc(100vh - 110px);
  box-sizing: border-box;
}

/* 工具栏 */
.list-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}
.toolbar-left {
  display: flex;
  align-items: baseline;
  gap: 12px;
}
.page-title {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #1f2329;
}
.page-title i {
  color: #1890ff;
  margin-right: 6px;
}
.page-desc {
  font-size: 13px;
  color: #8f959e;
}

/* 卡片网格 */
.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}

/* 单个卡片 */
.dash-card {
  background: #fff;
  border-radius: 12px;
  border: 1px solid #e8ecf1;
  padding: 20px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  flex-direction: column;
  min-height: 180px;
}
.dash-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.08);
  border-color: #d6e4ff;
}

/* 新建卡片 */
.dash-card-create {
  border: 2px dashed #d9d9d9;
  background: #fafbfc;
  align-items: center;
  justify-content: center;
  gap: 12px;
}
.dash-card-create:hover {
  border-color: #1890ff;
  background: #f0f7ff;
}
.create-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, #e6f7ff, #bae7ff);
  display: flex;
  align-items: center;
  justify-content: center;
}
.create-icon i {
  font-size: 24px;
  color: #1890ff;
}
.create-text {
  font-size: 14px;
  color: #8f959e;
  font-weight: 500;
}

/* 卡片顶部 */
.card-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}
.card-icon-wrapper {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: linear-gradient(135deg, #1890ff, #096dd9);
  display: flex;
  align-items: center;
  justify-content: center;
}
.card-icon-wrapper i {
  font-size: 20px;
  color: #fff;
}
.more-btn {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.2s;
}
.more-btn:hover {
  background: #f0f2f5;
}
.more-btn i {
  font-size: 14px;
  color: #8f959e;
  transform: rotate(90deg);
}

/* 卡片主体 */
.card-body {
  flex: 1;
}
.card-title {
  margin: 0 0 8px;
  font-size: 16px;
  font-weight: 600;
  color: #1f2329;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.card-desc {
  margin: 0;
  font-size: 13px;
  color: #8f959e;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}

/* 卡片底部 */
.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid #f0f2f5;
}
.footer-info, .footer-refresh {
  font-size: 12px;
  color: #a0a4ad;
}
.footer-info i, .footer-refresh i {
  margin-right: 4px;
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 80px 20px;
}
.empty-icon {
  font-size: 64px;
  color: #d9d9d9;
}
.empty-title {
  font-size: 16px;
  color: #606266;
  margin: 16px 0 8px;
}
.empty-desc {
  font-size: 13px;
  color: #909399;
}

/* 对话框 */
.form-tip {
  margin-left: 8px;
  font-size: 13px;
  color: #909399;
}

/* 下拉菜单危险项 */
::v-deep .danger-item {
  color: #ff4d4f !important;
}
</style>
