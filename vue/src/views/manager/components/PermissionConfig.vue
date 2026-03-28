<template>
  <div v-loading="searchLoading" class="permission-manage">
    <!-- 工具栏 -->
    <div class="tool-bar">
      <span class="page-title">权限配置</span>
      <div>
        <el-input
          v-model="keywords"
          clearable
          style="width: 240px; margin-right: 12px"
          placeholder="搜索规则名"
        >
          <i slot="prefix" class="el-input__icon el-icon-search"></i>
        </el-input>

        <el-button type="primary" @click="addHandler">
          <i class="el-icon-plus"></i>
          添加规则组
        </el-button>

        <el-button 
          v-if="copiedRule" 
          type="success" 
          plain 
          @click="handlePasteRule" 
          style="margin-left: 12px"
        >
          <i class="el-icon-document-copy"></i>
          粘贴规则组
        </el-button>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-if="!keywords && !ruleListWithSearch.length && !searchLoading" class="empty-state">
      <div class="empty-content">
        <i class="el-icon-folder-opened empty-icon"></i>
        <p class="empty-text">暂无权限规则</p>
        <el-button type="primary" @click="addHandler">
          <i class="el-icon-plus"></i>
          添加规则组
        </el-button>
      </div>
    </div>

    <!-- 搜索无结果 -->
    <div v-else-if="keywords && !ruleListWithSearch.length" class="empty-state">
      <div class="empty-content">
        <i class="el-icon-search empty-icon"></i>
        <p class="empty-text">未找到相关内容</p>
      </div>
    </div>

    <!-- 卡片列表 -->
    <div v-else class="card-content">
      <el-row :gutter="16">
        <el-col
          v-for="rule in ruleListWithSearch"
          :key="rule.id"
          :xs="24"
          :sm="12"
          :md="8"
          :lg="6"
          :xl="4"
          class="mb-16"
        >
          <permission-card
            :id="rule.id"
            :name="rule.name"
            :num="rule.ruleCount || 0"
            :user-count="rule.userCount || 0"
            @edit="handleEditRule(rule)"
            @del="deleteHandler(rule)"
            @set-user="setUser(rule)"
            @copy="handleCopyRule(rule)"
            :status="rule.status"
            @status-change="handleStatusChange(rule, $event)"
          />
        </el-col>
      </el-row>
    </div>

    <!-- 主抽屉：配置规则 -->
    <el-drawer
      :visible.sync="ruleConfigVisible"
      :before-close="beforeClose"
      :show-close="false"
      size="calc(100% - 100px)"
      direction="btt"
      custom-class="permission-drawer"
    >
      <div slot="title" class="drawer-header">
        <span style="white-space: nowrap; margin-right: 20px; font-size: 20px; font-weight: 600; color: #1f2329; letter-spacing: 0.5px;">{{ drawerTitle }}</span>
        <div v-if="isCreate" class="flex-center" style="flex: 1">
          <el-steps :active="activeStep" align-center style="max-width: 500px; flex: 1">
            <el-step title="设置权限规则"></el-step>
            <el-step title="选择受限用户"></el-step>
          </el-steps>
        </div>
        <i class="el-icon-close" style="cursor: pointer; font-size: 20px" @click="beforeClose"></i>
      </div>

      <!-- 步骤1：设置权限规�?-->
      <div v-show="activeStep === 0" class="drawer-content">
        <el-scrollbar>
          <div class="scroll-content">
            <div class="section-title">基本信息</div>

            <el-form
              ref="termFormRef"
              :model="currentPermission"
              label-position="top"
              :rules="rules"
              @submit.native.prevent
            >
              <el-form-item prop="name">
                <template slot="label">
                  <span>规则名称<span style="color: #f56c6c">*</span></span>
                </template>
                <el-input
                  v-model="currentPermission.name"
                  maxlength="50"
                  clearable
                  placeholder="请输入权限组名称"
                />
              </el-form-item>

              <el-form-item prop="description">
                <template slot="label">
                  <span>规则组描述</span>
                </template>
                <el-input
                  v-model="currentPermission.description"
                  type="textarea"
                  :rows="3"
                  maxlength="200"
                  show-word-limit
                  placeholder="请输入规则组描述（可选）"
                />
              </el-form-item>

              <el-form-item class="add-permission-form">
                <template slot="label">
                  <div class="form-label-header">
                    <div style="display: flex; align-items: center">
                      <span style="margin-right: 16px">权限规则</span>
                      <el-button class="add-button" size="small" @click="handleAddPermission">
                        添加规则
                        <i class="el-icon-plus el-icon--right"></i>
                      </el-button>
                    </div>
                    <el-input
                      v-model="searchTableKeyword"
                      placeholder="搜索数据表"
                      prefix-icon="el-icon-search"
                      size="small"
                      clearable
                      style="width: 200px; margin-left: 20px"
                    />
                  </div>
                </template>

                <div class="table-content">
                  <el-table
                    :data="filteredRules"
                    empty-text="暂无规则"
                    style="width: 100%"
                  >
                    <el-table-column prop="name" label="规则名称" />

                    <el-table-column prop="dbConfigName" label="数据源" />
                    <el-table-column prop="departmentName" label="部门" />
                    <el-table-column prop="tableName" label="数据表" />
                    <el-table-column fixed="right" width="100" label="操作">
                      <template slot-scope="scope">
                        <el-tooltip content="编辑" placement="top">
                          <i
                            class="el-icon-edit action-btn"
                            @click="editForm(scope.row)"
                          ></i>
                        </el-tooltip>
                        <el-tooltip content="删除" placement="top">
                          <i
                            class="el-icon-delete action-btn"
                            @click="deleteRuleHandler(scope.row)"
                          ></i>
                        </el-tooltip>
                      </template>
                    </el-table-column>
                  </el-table>
                </div>
              </el-form-item>
            </el-form>
          </div>
        </el-scrollbar>
      </div>

      <!-- 步骤2：选择受限用户 -->
      <div v-show="activeStep !== 0" class="select-permission-content">
        <el-scrollbar>
          <div class="scroll-content">
            <select-user ref="selectUserRef"></select-user>
          </div>
        </el-scrollbar>
      </div>

      <!-- 自定义底部按钮区域 (不再使用 slot="footer") -->
      <div class="custom-drawer-footer">
        <div class="footer-buttons">
          <el-button @click="beforeClose">取消</el-button>
          
          <!-- 上一步按钮 -->
          <el-button v-if="activeStep === 1 && isCreate" @click="preview">
            上一步
          </el-button>
          
          <!-- 下一步按钮 -->
          <el-button 
            v-if="activeStep === 0 && isCreate" 
            @click="next"
          >
            下一步
          </el-button>
          
          <!-- 保存按钮 - 始终显示 -->
          <el-button
            type="primary"
            :loading="saveLoading"
            @click="savePermission"
          >
            保存
          </el-button>
        </div>
      </div>
    </el-drawer>

    <!-- 对话框：配置权限规则 -->
    <el-dialog
      :visible.sync="dialogFormVisible"
      :title="dialogTitle"
      width="1000px"
      :close-on-click-modal="false"
      destroy-on-close
      @close="closeForm"
    >
      <el-form
        ref="columnFormRef"
        :model="columnForm"
        label-position="top"
        :rules="columnRules"
        @submit.native.prevent
      >




        <el-form-item v-if="!columnForm.id" prop="name">
          <template slot="label">
            <span>规则名称<span style="color: #f56c6c">*</span></span>
          </template>
          <el-input
            v-model="columnForm.name"
            maxlength="50"
            clearable
            placeholder="请输入规则名称"
          />
        </el-form-item>

        <el-form-item v-if="!columnForm.id" prop="dbConfigId">
           <template slot="label">
             <span>数据源<span style="color: #f56c6c">*</span></span>
           </template>
           <el-select
             v-model="activeDs"
             filterable
             placeholder="请选择数据源"
             value-key="id"
             @change="handleDsChange"
             style="width: 100%"
           >
             <el-option
               v-for="item in dsListOptions"
               :key="item.id"
               :label="item.name"
               :value="item"
             >
               <div style="display: flex; align-items: center">
                 <i class="el-icon-database" style="margin-right: 8px"></i>
                 {{ item.name }}
               </div>
             </el-option>
           </el-select>
        </el-form-item>

        <!-- Add Mode: Split View -->
        <div v-if="!columnForm.id" class="split-container" style="display: flex; height: 400px; border: 1px solid #EBEEF5;">
           <!-- Left: Departments -->
           <div class="split-left" style="width: 200px; border-right: 1px solid #EBEEF5; overflow-y: auto;">
             <div class="panel-title" style="padding: 10px; background: #F5F7FA; font-weight: bold;">部门列表</div>
             <div v-for="dept in deptListOptions" :key="dept" 
                  @click="handleDeptChange(dept)"
                  :style="{ padding: '10px', cursor: 'pointer', background: activeDeptName === dept ? '#E6F7FF' : '#fff', color: activeDeptName === dept ? '#1890FF' : '#606266' }">
               <i class="el-icon-office-building"></i> {{ dept }}
             </div>
             <div v-if="!activeDs" style="padding: 10px; color: #999; text-align: center">请先选择数据源</div>
           </div>
           <!-- Right: Tables -->
           <div class="split-right" style="flex: 1; display: flex; flex-direction: column;">
             <div class="panel-title" style="padding: 10px; background: #F5F7FA; font-weight: bold; display: flex; justify-content: space-between;">
               <span>数据表列表</span>
               <el-checkbox v-model="checkAllTables" :indeterminate="isIndeterminateTables" @change="handleCheckAllTablesChange">全选/取消</el-checkbox>
             </div>
             <div style="padding: 10px; overflow-y: auto; flex: 1;">
               <el-checkbox-group v-model="selectedTableList" @change="handleCheckedTablesChange">
                 <div v-for="table in tableListOptions" :key="table.name || table" style="margin-bottom: 8px;">
                   <el-checkbox :label="table.name || table">{{ table.name || table }}</el-checkbox>
                 </div>
               </el-checkbox-group>
               <div v-if="!tableListOptions.length" style="text-align: center; color: #909399; margin-top: 50px;">
                 请先选择数据源和部门
               </div>
             </div>
           </div>
        </div>

        <el-form-item v-if="columnForm.id" prop="tableName">
          <template slot="label">
            <span>数据表<span style="color: #f56c6c">*</span></span>
          </template>
           <!-- Existing Table Select for Edit - keeping it readonly or disabled mainly -->
             <el-select
              v-model="columnForm.tableName"
              disabled
              placeholder="数据表"
            >
              <el-option :label="columnForm.tableName" :value="columnForm.tableName"></el-option>
            </el-select>
        </el-form-item>

      </el-form>

      <!-- 列权限：字段列表 (Only in Edit Mode) -->
      <div v-if="columnForm.id" class="column-table-content">
        <div style="padding: 10px; background: #F5F7FA; display: flex; justify-content: flex-end;">
            <el-checkbox v-model="checkAllColumns" :indeterminate="isIndeterminateColumns" @change="handleCheckAllColumnsChange">全选/取消</el-checkbox>
        </div>
        <el-table
          :data="tableColumnData"
          empty-text="暂无字段"
          style="width: 100%"
        >
          <el-table-column prop="columnName" label="字段名称" />
          <el-table-column prop="remarks" label="字段备注" />
          <el-table-column fixed="right" width="100" label="操作">
            <template slot-scope="scope">
              <el-checkbox v-model="scope.row.enable" @change="handleCheckedColumnsChange" />
            </template>
          </el-table-column>
        </el-table>
      </div>

      <div slot="footer" class="dialog-footer">
        <el-button @click="closeForm">取消</el-button>
        <el-button class="save-button" @click="saveHandler">保存</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import PermissionCard from './PermissionCard.vue'
import SelectUser from './SelectUser.vue'
import { cloneDeep } from 'lodash'
import {
  getList,
  savePermissions,
  delPermissions,
  getRuleList,
  getUserList,
  getDbConfigList,
  getTables,
  getColumns,
  getDepartmentList,
  getTablesByDept,
  enablePermissionGroup,
  disablePermissionGroup
} from '@/api/permissions'

export default {
  name: 'PermissionConfig',

  components: {
    PermissionCard,
    SelectUser
  },

  provide() {
    return {
      filedList: () => this.fieldListOptions
    }
  },

  data() {
    return {
      keywords: '',
      activeStep: 0,
      dialogFormVisible: false,
      ruleConfigVisible: false,
      editRule: 0,
      drawerTitle: '',
      dialogTitle: '',
      activeDs: null,
      activeTable: null,
      ruleList: [],

      defaultPermission: {
        id: '',
        name: '',
        description: '',
        adminId: null,
        status: 0,
        rules: [],
        userIds: []
      },
      currentPermission: {},

      searchColumn: '',
      searchTableKeyword: '',  // Search keyword for table names in rule list
      isCreate: false,

      defaultForm: {
        name: '',
        id: '',
        dbConfigId: '',
        dbConfigName: '',
        tableName: '',
        ruleType: 'COLUMN',
        content: '',
        selectedColumns: []
      },
      columnForm: {},

      tableListOptions: [],
      fieldListOptions: [],
      dsListOptions: [],
      deptListOptions: [],
      activeDeptName: null,
      selectedTableList: [], // For Add Mode table selection
      checkAllTables: false,
      checkAllColumns: false,
      isIndeterminateTables: false,
      isIndeterminateColumns: false,


      searchLoading: false,
      saveLoading: false,
      copiedRule: null,

      rules: {
        name: [
          { required: true, message: '请输入规则组名称', trigger: 'blur' }
        ]
      },

      columnRules: {
        name: [
          { required: true, message: '请输入规则名称', trigger: 'blur' }
        ],
        dbConfigId: [
          { required: true, message: '请选择数据源', trigger: 'change' }
        ]
        // Remove tableName validation rule for Add mode as it's handled manually
      }
    }
  },

  computed: {
    ruleListWithSearch() {
      if (!this.keywords) return this.ruleList
      return this.ruleList.filter(rule =>
        rule.name.toLowerCase().includes(this.keywords.toLowerCase())
      )
    },

    tableColumnData() {
      if (!this.searchColumn) return this.columnForm.selectedColumns
      return this.columnForm.selectedColumns.filter(col =>
        col.columnName.toLowerCase().includes(this.searchColumn.toLowerCase())
      )
    },

    filteredRules() {
      if (!this.searchTableKeyword) return this.currentPermission.rules
      return (this.currentPermission.rules || []).filter(rule => 
        (rule.tableName || '').toLowerCase().includes(this.searchTableKeyword.toLowerCase())
      )
    }
  },

  mounted() {
    this.handleSearch()
    this.currentPermission = cloneDeep(this.defaultPermission)
    this.columnForm = cloneDeep(this.defaultForm)
  },

  methods: {
    setDrawerTitle() {
      if (this.activeStep === 0 && this.isCreate) {
        this.drawerTitle = '添加规则组'
      } else {
        if (this.editRule === 1) {
          this.drawerTitle = '设置权限规则'
        }
        if (this.editRule === 2) {
          this.drawerTitle = '选择受限用户'
        }
      }
    },

    addHandler() {
      this.isCreate = true
      this.activeStep = 0
      this.editRule = 0
      this.currentPermission = cloneDeep(this.defaultPermission)
      this.setDrawerTitle()
      this.ruleConfigVisible = true
      console.log('addHandler 调用完成 - isCreate:', this.isCreate, 'activeStep:', this.activeStep)
    },

    handleSearch() {
      this.searchLoading = true

      // 从 xm-user 获取管理员ID
      const user = JSON.parse(localStorage.getItem('xm-user') || '{}')
      const adminId = user.id
      if (!adminId) {
        this.$message.error('未获取到管理员信息')
        this.searchLoading = false
        return
      }

      getList(adminId).then(res => {
        // The new doc shows response data is in `res.data`
        // And status is "ENABLED" or "DISABLED"
        const list = res.data || []
        
        this.ruleList = list.map(item => ({
          ...item,
          // Map backend status string to frontend int (1=Enabled, 0=Disabled)
          status: item.status === 'ENABLED' ? 1 : 0
        }))
      }).catch(err => {
        console.error('获取权限列表失败:', err)
        this.$message.error('获取权限列表失败')
      }).finally(() => {
        this.searchLoading = false
      })
    },

    async handleEditRule(row) {
      this.editRule = 1
      this.isCreate = false
      this.setDrawerTitle()
      this.currentPermission = cloneDeep(row)
      
      // 获取管理员ID
      const user = JSON.parse(localStorage.getItem('xm-user') || '{}')
      this.currentPermission.adminId = user.id

      // 获取规则详情
      try {
        const rulesRes = await getRuleList(row.id)
        // Latest spec confirms response.data IS the list of rules
        const rules = rulesRes.data || []
        
        this.currentPermission.rules = Array.isArray(rules) ? rules : []
      } catch (err) {
        console.error('获取规则详情失败:', err)
      }

      // 获取绑定用户
      try {
        const usersRes = await getUserList(row.id)
        this.currentPermission.userIds = (usersRes.data || []).map(item => item.userId)
      } catch (err) {
        console.error('获取绑定用户失败:', err)
      }

      this.ruleConfigVisible = true
    },

    deleteHandler(row) {
      this.$confirm(`确定删除规则�?${row.name}"？`, '提示', {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        delPermissions(row.id).then(() => {
          this.$message.success('删除成功')
          this.handleSearch()
        }).catch(err => {
          console.error('删除失败:', err)
          this.$message.error('删除失败')
        })
      })
    },

    async setUser(row) {
      this.editRule = 2
      this.setDrawerTitle()
      this.isCreate = false
      this.currentPermission = cloneDeep(row)

      // 获取管理员ID
      const user = JSON.parse(localStorage.getItem('xm-user') || '{}')
      this.currentPermission.adminId = user.id
      
      // Load rules to prevent them from being cleared on save
      try {
        const rulesRes = await getRuleList(row.id)
        this.currentPermission.rules = rulesRes.data || []
      } catch (err) {
        console.error('获取规则详情失败:', err)
      }

      // 获取绑定用户
      try {
        const usersRes = await getUserList(row.id)
        this.currentPermission.userIds = (usersRes.data || []).map(item => item.userId)
      } catch (err) {
        console.error('获取绑定用户失败:', err)
      }

      this.activeStep = 1
      this.ruleConfigVisible = true
      this.$nextTick(() => {
        if (this.$refs.selectUserRef) {
          this.$refs.selectUserRef.open(this.currentPermission.userIds)
        }
      })
    },

    handleAddPermission() {
      this.columnForm = cloneDeep(this.defaultForm)
      this.columnForm.ruleType = 'COLUMN'
      this.handleColumnPermission(null)
    },

    async handleColumnPermission(row) {
      if (row) {
        // Edit Mode
        const { name, dbConfigId, tableName, id, content, dbConfigName, departmentName } = row
        Object.assign(this.columnForm, {
          id,
          name,
          dbConfigId,
          dbConfigName,
          tableName,
          departmentName,
          ruleType: 'COLUMN',
          content: content || ''
        })
        this.getDsList(row)
        this.dialogTitle = '编辑规则'
      } else {
        // Add Mode
        this.getDsList(null)
        this.activeDs = null // Ensure activeDs is reset so UI prompts "Please select DS"
        this.selectedTableList = []
        this.deptListOptions = [] // Reset departments until DB selected
        this.checkAllTables = false
        this.isIndeterminateTables = false
        this.activeDeptName = null
        this.tableListOptions = []
        this.dialogTitle = '添加规则'
      }
      this.dialogFormVisible = true
    },

    async getDepartmentList(dbConfigId) {
      if (!dbConfigId) return
      try {
        const res = await getDepartmentList(dbConfigId)
        this.deptListOptions = res.data || res || []
      } catch (err) {
         console.error('获取部门列表失败', err)
         this.$message.error('获取部门列表失败')
      }
    },

    handleDeptChange(deptName) {
      this.activeDeptName = deptName
      this.columnForm.departmentName = deptName
      this.selectedTableList = []
      this.checkAllTables = false
      this.isIndeterminateTables = false
      if (this.activeDs && this.activeDeptName) {
        this.loadTablesByDept(this.activeDs.id, this.activeDeptName)
      }
    },

    loadTablesByDept(dbConfigId, deptId) {
       getTablesByDept(dbConfigId, deptId).then(res => {
         this.tableListOptions = res.data || res || []
       }).catch(err => {
         console.error('获取表列表失败', err)
         this.$message.error('获取表列表失败')
       })
    },
    
    handleCheckAllTablesChange(val) {
      this.selectedTableList = val ? this.tableListOptions.map(t => t.name || t) : []
      this.isIndeterminateTables = false
    },
    
    handleCheckedTablesChange(value) {
      let checkedCount = value.length
      this.checkAllTables = checkedCount === this.tableListOptions.length
      this.isIndeterminateTables = checkedCount > 0 && checkedCount < this.tableListOptions.length
    },

    handleCheckAllColumnsChange(val) {
      this.columnForm.selectedColumns.forEach(col => {
        col.enable = val
      })
      this.isIndeterminateColumns = false
    },

    handleCheckedColumnsChange() {
      const checkedCount = this.columnForm.selectedColumns.filter(c => c.enable).length
      this.checkAllColumns = checkedCount === this.columnForm.selectedColumns.length
      this.isIndeterminateColumns = checkedCount > 0 && checkedCount < this.columnForm.selectedColumns.length
    },

    getDsList(row) {
      this.activeDs = null

      getDbConfigList().then(res => {
        this.dsListOptions = (res.data || res || []).map(item => ({
          id: item.id,
          name: item.name
        }))
        if (row?.dbConfigId) {
          this.activeDs = this.dsListOptions.find(d => +d.id === +row.dbConfigId)
        }
      }).catch(err => {
        console.error('获取数据源列表失败', err)
        this.$message.error('获取数据源列表失败')
      })

      if (row) {
        this.loadTables(row.dbConfigId, row.tableName)
      }
    },

    loadTables(dbConfigId, selectedTable) {
      if (!dbConfigId) return
      
      // For Edit Mode, we need departmentName to fetch tables
      // If we are here, columnForm.departmentName should be set (if we swap order)
      const deptName = this.columnForm.departmentName
      if (!deptName) {
        // If no dept name (e.g. data anomaly), we can't fetch tables according to new API
        // But let's try or return empty?
        // Actually, for Edit Mode, we definitely have deptName from row. 
        // We must ensure it's set before calling this.
        console.warn('loadTables called without departmentName')
        // return // If strict
      }

      getTables(dbConfigId, deptName).then(res => {
        this.tableListOptions = res.data || res || []
        if (selectedTable) {
          this.columnForm.tableName = selectedTable
          this.loadColumns(dbConfigId, selectedTable)
        }
      }).catch(err => {
        console.error('获取表列表失败', err)
        this.$message.error('获取表列表失败')
      })
    },

    handleDsChange(val) {
      this.columnForm.dbConfigId = val.id
      this.columnForm.dbConfigName = val.name
      this.activeDs = val
      
         // Add Mode
      if (!this.columnForm.id) {
         this.selectedTableList = []
         this.checkAllTables = false
         this.isIndeterminateTables = false
         this.activeDeptName = null
         this.tableListOptions = []
         // Load Departments for this DB
         this.getDepartmentList(val.id)
         return
      }

      // Edit Mode
      this.columnForm.tableName = ''
      this.columnForm.selectedColumns = []

      setTimeout(() => {
        this.$refs.columnFormRef.clearValidate('tableName')
      }, 0)

      this.loadTables(val.id)
    },

    handleTableChange(tableName) {
      this.loadColumns(this.columnForm.dbConfigId, tableName)
    },

    loadColumns(dbConfigId, tableName) {
      if (!dbConfigId || !tableName) return

      getColumns(dbConfigId, tableName).then(res => {
        const columns = res.data || res || []
        this.fieldListOptions = columns
        
        // 列权限：将字段转为复选框列表
        // Backend returns ["col1", "col2"] strings
        this.columnForm.selectedColumns = columns.map(field => {
          const name = typeof field === 'string' ? field : field.columnName
          return {
            columnName: name,
            remarks: (typeof field === 'object' && field.remarks) ? field.remarks : '-',
            enable: false
          }
        })

        // 如果是编辑模式，恢复之前的选中状态
        if (this.columnForm.content) {
          if (this.columnForm.content === '*') {
             this.columnForm.selectedColumns.forEach(col => {
               col.enable = true
             })
             this.checkAllColumns = true
             this.isIndeterminateColumns = false
          } else {
            const selectedFields = this.columnForm.content.split(',').map(f => f.trim())
            this.columnForm.selectedColumns.forEach(col => {
              col.enable = selectedFields.includes(col.columnName)
            })
            this.handleCheckedColumnsChange()
          }
        } else {
             this.checkAllColumns = false
             this.isIndeterminateColumns = false
        }
        
        // Update View Data
        this.tableColumnData = this.columnForm.selectedColumns
      }).catch(err => {
        console.error('获取字段列表失败', err)
        this.$message.error('获取字段列表失败')
      })
    },

    editForm(row) {
      this.handleColumnPermission(row)
    },

    deleteRuleHandler(row) {
      this.$confirm(`确定删除规则"${row.name}"？`, '提示', {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        this.currentPermission.rules = this.currentPermission.rules.filter(
          p => p.id !== row.id
        )
      })
    },



    saveHandler() {
      this.$refs.columnFormRef.validate(valid => {
        // Duplicate check only for Add Mode (as per user request)
        // In Edit Mode, we ignore this check.
        if (!this.columnForm.id) {
           const names = this.currentPermission.rules
             .map(p => p.name)

           // Check if the user-input name already exists
           if (names.includes(this.columnForm.name)) {
              this.$message.error('规则名称重复')
              return
           }
        }

        if (valid) {
          const { ruleType, name, dbConfigId, dbConfigName, id, departmentName } = this.columnForm

          // 如果是新增模式（没有ID），处理多选表
          if (!id) {
            if (!this.selectedTableList.length) {
              this.$message.warning('请至少选择一张数据表')
              return
            }
            
            this.selectedTableList.forEach(tableName => {
               // 检查是否已存在同名同表规则避免重复？ 
               // 用户需求不仅是避免同名，还要添加规则。这里暂不校验表重复，因为可能不同规则组
               const ruleData = {

                name, // Use user-input name
                dbConfigId,
                dbConfigName,
                tableName,
                departmentName,
                ruleType,
                content: '*' // 默认所有列
              }
              this.currentPermission.rules.push({
                ...ruleData,
                id: +new Date() + Math.random() // Ensure unique ID
              })
            })
          } else {
            // 编辑模式
            const tableName = this.columnForm.tableName
            
            // 列权限：将选中的字段转为逗号分隔的字符串
            let finalContent = ''
            if (this.checkAllColumns) {
               finalContent = '*'
            } else {
               const selectedFields = this.columnForm.selectedColumns
                .filter(col => col.enable)
                .map(col => col.columnName)
               finalContent = selectedFields.join(',')
            }

            const ruleData = {
              name: tableName, // Set name to tableName as input is removed
              dbConfigId,
              dbConfigName,
              tableName,
              departmentName,
              ruleType,
              content: finalContent
            }
            
            const index = this.currentPermission.rules.findIndex(p => p.id === id)
            if (index > -1) {
              this.$set(this.currentPermission.rules, index, {
                ...ruleData,
                id
              })
            }
          }

          this.dialogFormVisible = false
        }
      })
    },

    beforeClose() {
      if (this.$refs.termFormRef) {
        this.$refs.termFormRef.clearValidate()
      }
      this.ruleConfigVisible = false
      this.activeStep = 0
      this.isCreate = false
    },

    closeForm() {
      this.dialogFormVisible = false
    },

    preview() {
      this.currentPermission.userIds = this.$refs.selectUserRef.checkTableList.map(u => u.id)
      this.activeStep = 0
    },

    next() {
      this.$refs.termFormRef.validate(valid => {
        if (valid) {
          this.activeStep = 1
          this.$nextTick(() => {
            if (this.$refs.selectUserRef) {
              this.$refs.selectUserRef.open(this.currentPermission.userIds)
            }
          })
        }
      })
    },

    save() {
      const { id, name, description, rules, userIds, status } = cloneDeep(this.currentPermission)

      // 转换规则数据格式
      // Strictly follow Doc: name, dbConfigId, departmentName, tableName, ruleType, content
      const rulesData = (rules || []).map(rule => ({
        name: rule.name,
        dbConfigId: rule.dbConfigId,
        departmentName: rule.departmentName,
        tableName: rule.tableName,
        ruleType: rule.ruleType,
        content: rule.content
      }))

      const obj = {
        name,
        description: description || '',
        status: status === 1 ? 'ENABLED' : 'DISABLED',
        rules: rulesData,
        userIds: this.isCreate || this.activeStep === 1
          ? this.$refs.selectUserRef.checkTableList.map(u => u.id)
          : (userIds || [])
      }

      if (id) {
        obj.id = id
      }

      if (this.saveLoading) return
      this.saveLoading = true

      savePermissions(obj).then(() => {
        this.$message.success('保存成功')
        this.beforeClose()
        this.handleSearch()
      }).catch(err => {
        console.error('保存失败:', err)
        this.$message.error(err.msg || '保存失败')
      }).finally(() => {
        this.saveLoading = false
      })
    },



    async handleStatusChange(row, val) {
      if (val) {
         // Enable Logic
         try {
            const res = await enablePermissionGroup(row.id)
            
            // Check for business logic errors even if HTTP 200
            if (res.code === '409') {
                throw res // Throw res to catch block to handle conflict
            } else if (res.code !== '200') {
                throw new Error(res.msg || '未知错误') 
            }

            row.status = 1
            this.$message.success('已启用')
         } catch (err) {
            console.error('启用失败', err)
            
            // Handle conflict (can be from thrown res or axios error response)
            // If axios error (HTTP 409), err.response.data might contain the JSON
            const res = err.code ? err : (err.response && err.response.data ? err.response.data : null)

            if (res && res.code === '409') {
               const conflicts = res.data || []
               if (conflicts.length > 0) {
                 const h = this.$createElement;
                 const conflictNodes = conflicts.map(c => h('div', { style: 'margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 5px; font-size: 13px;' }, [
                    h('div', [h('strong', '用户: '), `${c.username}`]),
                    h('div', [h('strong', '冲突组: '), `${c.conflictGroupName}`]),
                    h('div', [h('strong', '数据表: '), `${c.tableName}`]),
                    h('div', { style: 'color: #F56C6C' }, [h('strong', '现有规则: '), `${c.conflictRule}`]),
                    h('div', { style: 'color: #909399' }, [h('strong', '当前尝试: '), `${c.currentRule}`])
                 ]))

                 this.$msgbox({
                   title: '启用失败：存在权限冲突',
                   message: h('div', { style: 'max-height: 400px; overflow-y: auto;' }, conflictNodes),
                   type: 'error',
                   showCancelButton: false,
                   confirmButtonText: '我知道了'
                 })
               } else {
                 this.$message.error(res.msg || '无法启用，存在冲突')
               }
            } else {
               this.$message.error('启用失败: ' + (err.msg || err.message || '未知错误'))
            }
            
            // Revert status safely
            row.status = 0
         }
      } else {
         // Disable Logic
         try {
             const res = await disablePermissionGroup(row.id)
             if (res.code === '200') {
                 row.status = 0
                 this.$message.success('已禁用')
             } else {
                 this.$message.error(res.msg || '禁用失败')
                 row.status = 1 // Revert
             }
         } catch (err) {
             console.error('禁用失败', err)
             this.$message.error('禁用失败')
             row.status = 1 // Revert
         }
      }
    },


    savePermission() {
      if (!this.isCreate && this.activeStep === 0) {
        this.$refs.termFormRef.validate(valid => {
          if (valid) {
            this.save()
          }
        })
        return
      }

      this.save()
    },

    async handleCopyRule(row) {
      this.searchLoading = true
      try {
        // Fetch full details
        const rulesRes = await getRuleList(row.id)
        const usersRes = await getUserList(row.id)
        
        this.copiedRule = {
          ...row,
          rules: rulesRes.data || [],
          userIds: (usersRes.data || []).map(item => item.userId)
        }
        this.$message.success('规则组已复制，请点击“粘贴规则组”进行创建')
      } catch (err) {
        console.error('复制失败', err)
        this.$message.error('复制失败')
      } finally {
        this.searchLoading = false
      }
    },

    async handlePasteRule() {
      if (!this.copiedRule) return
      
      this.$confirm(`确定复制并创建 "${this.copiedRule.name}-副本" 吗？`, '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'info'
      }).then(async () => {
         this.searchLoading = true
         try {
            const newName = `${this.copiedRule.name}-副本`
            // Check if name exists (optional but good)
            
            const { description, rules, userIds, adminId } = this.copiedRule
            
            // 获取管理员ID
            const user = JSON.parse(localStorage.getItem('xm-user') || '{}')
            const finalAdminId = user.id || adminId

             // 转换规则数据
            const rulesData = (rules || []).map(rule => ({
              name: rule.name, // rules inside might verify name uniqueness? 
              // If backend enforces unique rule names per group, it's fine. 
              // If backend enforces unique rule names GLOBALLY, we might have issue. 
              // Assuming scoped to group or it's fine. 
              // But wait, existing logic check `names.includes(this.columnForm.name)` within the group. 
              // So names duplicates across groups are likely fine.
              dbConfigId: rule.dbConfigId,
              tableName: rule.tableName,
              ruleType: rule.ruleType,
              content: rule.content
            }))

            const obj = {
              name: newName,
              description: description || '',
              adminId: parseInt(finalAdminId),
              rules: rulesData,
              userIds: userIds || []
            }

            await savePermissions(obj)
            this.$message.success('粘贴成功，已创建新规则组')
            this.handleSearch()
            this.copiedRule = null // Clear clipboard after paste? Or keep it? keeping allow multiple pastes.
            // keeping it is better UX usually.
         } catch (err) {
            console.error('粘贴失败', err)
            this.$message.error(err.msg || '粘贴失败')
         } finally {
            this.searchLoading = false
         }
      })
    }
  }
}
</script>

<style scoped>
.permission-manage {
  /* padding: 20px; 被外层容器接管padding */
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

.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  flex: 1;
}

.empty-content {
  text-align: center;
}

.empty-icon {
  font-size: 80px;
  color: #c0c4cc;
  margin-bottom: 20px;
}

.empty-text {
  font-size: 14px;
  color: #909399;
  margin-bottom: 20px;
}

.card-content {
  background: #fff;
  padding: 20px;
  border-radius: 8px;
  flex: 1;
  overflow-y: auto;
}

.mb-16 {
  margin-bottom: 16px;
}

.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.flex-center {
  display: flex;
  justify-content: center;
}

.drawer-content,
.select-permission-content {
  height: calc(100vh - 200px);
}

.scroll-content {
  padding: 20px;
}

.section-title {
  font-size: 16px;
  font-weight: 500;
  margin-bottom: 16px;
}

.form-label-header {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 16px;
  font-weight: 500;
}

.add-permission-form >>> .el-form-item__label {
  padding: 0 !important;
}

.table-content {
  border: 1px solid #ebeef5;
  border-radius: 8px;
  overflow: hidden;
}

.action-btn {
  font-size: 16px;
  cursor: pointer;
  margin: 0 4px;
  color: #606266;
}

.action-btn:hover {
  color: #409eff;
}

.auth-tree-content {
  padding: 16px;
  border: 1px solid #dcdfe6;
  border-radius: 8px;
  background: #f5f7fa;
  min-height: 200px;
}

.rule-actions {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e4e7ed;
}

.drawer-footer {
  padding: 10px 20px;
  text-align: right;
  border-top: 1px solid #ebeef5;
}

/* 蓝色添加按钮 */
.add-button {
  background-color: #1890ff;
  color: #fff;
  border-color: #1890ff;
}

.add-button:hover,
.add-button:focus {
  background-color: #40a9ff;
  border-color: #40a9ff;
  color: #fff;
}

.add-button:active {
  background-color: #096dd9;
  border-color: #096dd9;
}

/* 蓝色保存按钮 */
.save-button {
  background-color: #1890ff;
  color: #fff;
  border-color: #1890ff;
}

.save-button:hover,
.save-button:focus {
  background-color: #40a9ff;
  border-color: #40a9ff;
  color: #fff;
}

.save-button:active {
  background-color: #096dd9;
  border-color: #096dd9;
}

/* 并排选择器 */
.table-select-row {
  display: flex;
  gap: 16px;
}

.table-select-row .el-select {
  flex: 1;
}

/* 列权限表格样式 */
.column-table-content {
  border: 1px solid #ebeef5;
  border-radius: 4px;
  overflow: hidden;
}
</style>

<style>
.permission-drawer .el-drawer__header {
  margin-bottom: 0;
  padding: 20px;
  border-bottom: 1px solid #ebeef5;
}

.permission-drawer .el-drawer__body {
  padding: 0;
}

/* 蓝色 Switch 样式 */
.permission-manage .el-switch.is-checked .el-switch__core {
  background-color: #1890ff;
  border-color: #1890ff;
}

.permission-manage .el-switch.is-checked .el-switch__core:hover {
  background-color: #40a9ff;
  border-color: #40a9ff;
}

/* Drawer Footer 按钮布局 */
/* Drawer Footer 按钮布局 */
.custom-drawer-footer {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  padding: 16px 20px;
  border-top: 1px solid #ebeef5;
  background: #fff;
  z-index: 100;
}

.footer-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

/* 确保内容不被footer遮挡 */
.drawer-content, .select-permission-content {
  padding-bottom: 70px;
  height: 100%;
  box-sizing: border-box;
}

</style>
