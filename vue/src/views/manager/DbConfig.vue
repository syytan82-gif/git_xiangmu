<template>
  <div class="sqlbot-container">
    <div class="sqlbot-content-box">

      <div class="page-header">
        <div class="header-left">
          <div class="header-title">业务数据库配置</div>
        </div>
        <div class="header-right">
          <el-button type="primary" icon="el-icon-plus" class="primary-btn" @click="handleAdd">新增数据源</el-button>
        </div>
      </div>

      <div class="table-container">
        <el-table :data="dbList" v-loading="loading" style="width: 100%" class="custom-table">
          <el-table-column prop="name" label="连接名称" min-width="150">
            <template slot-scope="scope">
              <span style="font-weight: 600; color: #333">{{ scope.row.name }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="dbType" label="类型" width="120">
            <template slot-scope="scope">
              <el-tag size="small" :type="getDbTypeTag(scope.row.dbType)">{{ scope.row.dbType }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="host" label="主机地址" min-width="180"></el-table-column>
          <el-table-column prop="port" label="端口" width="100"></el-table-column>
          <el-table-column prop="dbName" label="数据库名" min-width="150"></el-table-column>
          <el-table-column label="操作" width="200" align="center">
            <template slot-scope="scope">
              <el-button type="text" icon="el-icon-edit" @click="handleEdit(scope.row)">编辑</el-button>
              <el-button type="text" icon="el-icon-connection" @click="handleQuickTest(scope.row)">测试</el-button>
              <el-button type="text" icon="el-icon-delete" class="danger-text" @click="handleDelete(scope.row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <el-dialog
          :title="dialogTitle"
          :visible.sync="dialogVisible"
          width="600px"
          :close-on-click-modal="false"
          append-to-body
          custom-class="db-dialog"
      >
        <el-form :model="dbForm" :rules="dbRules" ref="dbFormRef" label-position="top" class="sqlbot-form db-form">

          <el-form-item label="连接名称" prop="name">
            <el-input v-model="dbForm.name" placeholder="例如：财务生产库" prefix-icon="el-icon-price-tag"></el-input>
          </el-form-item>

          <el-form-item label="数据库类型" prop="dbType">
            <el-radio-group v-model="dbForm.dbType" size="medium" @input="handleDbTypeChange" class="custom-radio-group">
              <el-radio-button label="MySQL">MySQL</el-radio-button>
              <el-radio-button label="Oracle">Oracle</el-radio-button>
              <el-radio-button label="PostgreSQL">PG</el-radio-button>
              <el-radio-button label="SQLServer">SQLServer</el-radio-button>
            </el-radio-group>
          </el-form-item>

          <el-row :gutter="20">
            <el-col :span="16">
              <el-form-item label="主机地址 (Host)" prop="host">
                <el-input v-model="dbForm.host" placeholder="localhost 或 IP地址" prefix-icon="el-icon-s-platform"></el-input>
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="端口 (Port)" prop="port">
                <el-input v-model="dbForm.port" placeholder="3306"></el-input>
              </el-form-item>
            </el-col>
          </el-row>

          <el-form-item label="数据库名 (Database Name)" prop="dbName">
            <el-input v-model="dbForm.dbName" placeholder="请输入数据库名称" prefix-icon="el-icon-files"></el-input>
          </el-form-item>

          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="用户名 (Username)" prop="username">
                <el-input v-model="dbForm.username" placeholder="请输入数据库账号" prefix-icon="el-icon-user"></el-input>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="密码 (Password)" prop="password">
                <el-input v-model="dbForm.password" type="password" show-password placeholder="请输入数据库密码" prefix-icon="el-icon-lock"></el-input>
              </el-form-item>
            </el-col>
          </el-row>
        </el-form>

        <div slot="footer" class="dialog-footer">
          <div class="footer-left">
            <el-tag type="info" v-if="!isTestPassed"><i class="el-icon-info"></i> 修改配置后需重新测试</el-tag>
            <el-tag type="success" v-else><i class="el-icon-check"></i> 测试通过</el-tag>
          </div>
          <div class="footer-right">
            <el-button @click="dialogVisible = false">取消</el-button>
            <el-button class="secondary-btn" icon="el-icon-connection" @click="testDbConnection" :loading="dbTesting">测试连接</el-button>
            <el-button type="primary" class="primary-btn" icon="el-icon-check" @click="saveDbConfig" :loading="dbSaving" :disabled="!isTestPassed">保存</el-button>
          </div>
        </div>
      </el-dialog>

    </div>
  </div>
</template>

<script>
import axios from 'axios'

const configRequest = axios.create({
  baseURL: process.env.VUE_APP_BASEURL,
  timeout: 15000
})

configRequest.interceptors.request.use(config => {
  config.headers['Content-Type'] = 'application/json;charset=utf-8';
  // ngrok 免费版需要此请求头来绕过警告页面
  config.headers['ngrok-skip-browser-warning'] = 'true';
  const userJson = localStorage.getItem("xm-user");
  if (userJson) {
    const user = JSON.parse(userJson);
    if (user.token) {
      config.headers['token'] = user.token;
    }
  }
  return config
}, error => Promise.reject(error));

configRequest.interceptors.response.use(response => {
  let res = response.data;
  if (typeof res === 'string') {
    res = res ? JSON.parse(res) : res
  }
  return res;
}, error => {
  console.error('Config Request Error:', error)
  return Promise.reject(error)
});

export default {
  name: 'DbConfig',
  data() {
    return {
      loading: false,
      dbList: [], // 存储数据库列表
      dialogVisible: false,
      dialogTitle: '新增数据源',

      dbTesting: false,
      dbSaving: false,
      isTestPassed: false, // 是否测试通过

      dbForm: {
        id: null,
        name: '', // 连接名称
        dbType: 'MySQL',
        host: 'localhost',
        port: '3306',
        dbName: '',
        username: '',
        password: ''
      },
      dbRules: {
        name: [{ required: true, message: '请输入连接名称', trigger: 'blur' }],
        dbType: [{ required: true, message: '请选择数据库类型', trigger: 'change' }],
        host: [{ required: true, message: '请输入主机地址', trigger: 'blur' }],
        port: [{ required: true, message: '请输入端口号', trigger: 'blur' }],
        dbName: [{ required: true, message: '请输入数据库名称', trigger: 'blur' }],
        username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
        password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
      }
    }
  },
  watch: {
    // 监听表单变化，任何修改都需要重新测试
    dbForm: {
      handler() {
        this.isTestPassed = false;
      },
      deep: true
    }
  },
  created() {
    this.getList();
  },
  methods: {
    // --- 列表相关逻辑 ---

    getList() {
      this.loading = true;
      // 调用接口：获取数据库配置列表
      configRequest.get('/dbConfig/list').then(res => {
        if (res.code === '200') {
          this.dbList = res.data || [];
        } else {
          this.$message.error(res.msg || '获取数据库列表失败');
        }
      }).catch(err => {
        console.error('List Error:', err);
        this.$message.error('获取列表请求异常');
      }).finally(() => {
        this.loading = false;
      });
    },

    handleAdd() {
      this.dialogTitle = '新增数据源';
      // 重置表单
      this.dbForm = {
        id: null,
        name: '',
        dbType: 'MySQL',
        host: 'localhost',
        port: '3306',
        dbName: '',
        username: '',
        password: ''
      };
      this.isTestPassed = false; // 重置测试状态
      this.dialogVisible = true;
      this.$nextTick(() => {
        this.$refs.dbFormRef.clearValidate();
      });
    },

    handleEdit(row) {
      this.dialogTitle = '编辑数据源';
      // 深拷贝，回显数据
      this.dbForm = JSON.parse(JSON.stringify(row));
      this.isTestPassed = false; // 编辑时，必须重新测试才能保存（为了安全）
      this.dialogVisible = true;
      this.$nextTick(() => {
        this.$refs.dbFormRef.clearValidate();
      });
    },

    handleDelete(row) {
      this.$confirm(`确定要删除数据源 "${row.name}" 吗?`, '提示', {
        type: 'warning'
      }).then(() => {
        // 调用接口：删除数据库配置
        configRequest.delete(`/dbConfig/delete/${row.id}`).then(res => {
          if (res.code === '200') {
            this.$message.success('删除成功');
            this.getList(); // 刷新列表
          } else {
            this.$message.error(res.msg || '删除失败');
          }
        }).catch(() => {
          this.$message.error('删除请求异常');
        });
      }).catch(() => {});
    },

    // --- 表单与连接逻辑 ---

    handleDbTypeChange(val) {
      if (val === 'MySQL') this.dbForm.port = '3306';
      else if (val === 'Oracle') this.dbForm.port = '1521';
      else if (val === 'SQL Server') this.dbForm.port = '1433';
      else if (val === 'PostgreSQL') this.dbForm.port = '5432';
    },

    testDbConnection() {
      this.$refs.dbFormRef.validate(valid => {
        if (valid) {
          this.dbTesting = true;
          // 调用接口：测试数据库连接
          configRequest.post('/dbConfig/test', this.dbForm).then(res => {
            if (res.code === '200') {
              this.$message.success(res.data || '连接成功');
              this.isTestPassed = true;
            } else {
              this.$message.error(res.msg || '连接失败');
              this.isTestPassed = false;
            }
          }).catch(err => {
            let msg = '测试连接请求异常';
            if (err.message && err.message.includes('timeout')) msg = '连接超时，请检查网络';
            this.$message.error(msg);
            this.isTestPassed = false;
          }).finally(() => { this.dbTesting = false; });
        }
      });
    },

    // 在列表上快速测试（不打开弹窗）
    handleQuickTest(row) {
      const loading = this.$loading({ lock: true, text: '正在测试连接...', spinner: 'el-icon-loading', background: 'rgba(0, 0, 0, 0.7)' });
      // 直接使用行数据测试
      configRequest.post('/dbConfig/test', row).then(res => {
        loading.close();
        if (res.code === '200') {
          this.$message.success(`[${row.name}] 连接成功`);
        } else {
          this.$message.error(res.msg || '连接失败');
        }
      }).catch(() => {
        loading.close();
        this.$message.error('连接请求异常');
      });
    },

    saveDbConfig() {
      if (!this.isTestPassed) {
        this.$message.warning('请先进行连接测试');
        return;
      }
      this.$refs.dbFormRef.validate(valid => {
        if (valid) {
          this.dbSaving = true;

          // 根据 id 判断是新增还是更新
          const isUpdate = !!this.dbForm.id;
          const url = isUpdate ? '/dbConfig/update' : '/dbConfig/add';

          configRequest.post(url, this.dbForm).then(res => {
            if (res.code === '200') {
              this.$message.success('数据库配置保存成功');
              this.dialogVisible = false;
              this.getList(); // 刷新列表
            } else {
              this.$message.error(res.msg || '保存失败');
            }
          }).catch(err => {
            console.error('Save Error:', err);
            this.$message.error('保存请求异常');
          }).finally(() => {
            this.dbSaving = false;
          });
        }
      });
    },

    getDbTypeTag(type) {
      switch(type) {
        case 'MySQL': return '';
        case 'Oracle': return 'danger';
        case 'PostgreSQL': return 'success';
        case 'SQL Server': return 'warning';
        default: return 'info';
      }
    }
  }
}
</script>

<style scoped>
:root {
  --primary-color: #1890ff;
  --bg-gray: #f7f8fa;
  --text-main: #2d2e31;
  --text-sub: #606266;
  --border-color: #ebeef5;
}

.sqlbot-container {
  padding: 12px; /* 优化：从 20px 减少到 12px */
  background-color: #f7f8fa;
  min-height: calc(100vh - 80px);
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  width: 100%; /* Explicitly set full width */
}

.sqlbot-content-box {
  background: #ffffff;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  padding: 20px; /* 优化：从 30px 减少到 20px */
  flex: 1;
  display: flex;
  flex-direction: column;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 18px; /* 优化：从 25px 减少到 18px */
  padding-bottom: 12px; /* 优化：从 15px 减少到 12px */
  border-bottom: 1px solid #f0f0f0;
}
.header-title {
  font-size: 20px;
  font-weight: 600;
  color: #2d2e31;
  margin-bottom: 8px;
}
.header-desc {
  font-size: 14px;
  color: #909399;
}

.table-container {
  flex: 1;
}

/* 表格样式优化 */
.custom-table {
  border-radius: 4px;
  border: 1px solid #ebeef5;
}
::v-deep .custom-table th {
  background-color: #f5f7fa !important;
  color: #606266;
  font-weight: 600;
}
.danger-text {
  color: #f56c6c;
}
.danger-text:hover {
  color: #f78989;
}

/* 弹窗底部布局 */
.dialog-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.footer-right {
  display: flex;
  gap: 10px;
}

.primary-btn {
  background-color: #1890ff;
  border-color: #1890ff;
}
.primary-btn:hover {
  background-color: #0050B3;
  border-color: #0050B3;
}
.primary-btn.is-disabled {
  background-color: #a0cfff;
  border-color: #a0cfff;
}

.secondary-btn {
  background: #f5f5f5;
  color: #333;
  border: 1px solid #ddd;
}
.secondary-btn:hover {
  background: #eee;
  color: #1890ff;
  border-color: #85a5ff;
}

::v-deep .custom-radio-group .el-radio-button__inner {
  padding: 10px 20px;
}
::v-deep .custom-radio-group .el-radio-button__orig-radio:checked + .el-radio-button__inner {
  background-color: #1890ff;
  border-color: #1890ff;
  box-shadow: -1px 0 0 0 #1890ff;
}
</style>