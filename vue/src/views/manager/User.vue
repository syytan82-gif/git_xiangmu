<template>
  <div class="user-manage-center">

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
        <el-button type="primary" size="small" class="primary-btn" @click="load(1)">查询</el-button>
        <el-button size="small" class="secondary-btn" @click="reset">重置</el-button>
      </div>

      <div class="tool-right">
        <div class="tool-btn primary-btn-action" @click="handleAdd">
          <i class="el-icon-plus"></i>
          <span>新增用户</span>
        </div>
        <div class="tool-btn danger-btn-action" :class="{ disabled: !ids.length }" @click="delBatch">
          <i class="el-icon-delete"></i>
          <span>批量删除</span>
        </div>
      </div>
    </div>

    <div class="sqlbot-table">
      <div class="table-body">
        <el-table
            :data="tableData"
            v-loading="loading"
            class="custom-table"
            height="100%"
            :header-cell-style="{ background: '#f5f7fa', color: '#606266', fontWeight: '600' }"
            @selection-change="handleSelectionChange">

          <el-table-column type="selection" width="50" align="center"></el-table-column>
          <el-table-column prop="displayIndex" label="序号" width="60" align="center"></el-table-column>

          <el-table-column prop="username" label="账号" min-width="120"></el-table-column>
          <el-table-column prop="name" label="姓名" min-width="120"></el-table-column>

          <el-table-column label="头像" width="80" align="center">
            <template v-slot="scope">
              <div class="avatar-wrapper">
                <ProxyImage
                    style="width: 36px; height: 36px; border-radius: 50%; border: 1px solid #eee;"
                    v-if="scope.row.avatar"
                    :src="resolveAvatarUrl(scope.row.avatar)"
                    />
                <div v-else class="avatar-placeholder">{{ scope.row.name ? scope.row.name.substring(0,1) : 'U' }}</div>
              </div>
            </template>
          </el-table-column>

          <el-table-column prop="phone" label="电话" width="140"></el-table-column>
          <el-table-column prop="email" label="邮箱" min-width="180"></el-table-column>
          <el-table-column prop="createdBy" label="创建人" width="120"></el-table-column>

          <el-table-column prop="role" label="角色" width="120">
            <template v-slot="scope">
              <div class="role-badge" :class="scope.row.role === 'ADMIN' ? 'role-admin' : 'role-user'">
                <i :class="scope.row.role === 'ADMIN' ? 'el-icon-s-custom' : 'el-icon-user'"></i>
                <span>{{ scope.row.role === 'ADMIN' ? '管理员' : '普通用户' }}</span>
              </div>
            </template>
          </el-table-column>

          <el-table-column label="操作" align="center" width="140" fixed="right">
            <template v-slot="scope">
              <div class="table-operate">
                <el-tooltip content="重置密码" placement="top" :enterable="false">
                  <div class="opt-btn" @click="resetPassword(scope.row)">
                    <i class="el-icon-key"></i>
                  </div>
                </el-tooltip>
                <el-tooltip content="编辑" placement="top" :enterable="false">
                  <div class="opt-btn" @click="handleEdit(scope.row)">
                    <i class="el-icon-edit"></i>
                  </div>
                </el-tooltip>
                <el-tooltip content="删除" placement="top" :enterable="false">
                  <div class="opt-btn delete" @click="del(scope.row.id)">
                    <i class="el-icon-delete"></i>
                  </div>
                </el-tooltip>
              </div>
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

    <el-dialog
        :title="form.id ? '编辑用户信息' : '新增用户信息'"
        :visible.sync="fromVisible"
        width="500px"
        :close-on-click-modal="false"
        destroy-on-close
        class="custom-dialog">

      <el-form
          :model="form"
          label-position="top"
          :rules="rules"
          ref="formRef"
          size="medium"
          class="sqlbot-form">

        <el-form-item label="账号" prop="username">
          <el-input v-model="form.username" placeholder="请输入账号" :disabled="!!form.id"></el-input>
        </el-form-item>

        <el-form-item label="姓名" prop="name">
          <el-input v-model="form.name" placeholder="请输入姓名"></el-input>
        </el-form-item>

        <el-form-item label="电话" prop="phone">
          <el-input v-model="form.phone" placeholder="请输入电话"></el-input>
        </el-form-item>

        <el-form-item label="邮箱" prop="email">
          <el-input v-model="form.email" placeholder="请输入邮箱"></el-input>
        </el-form-item>

        <el-form-item label="头像">
          <el-upload
              class="avatar-uploader"
              :action="$baseUrl + '/image/upload'"
              :headers="{ token: user.token, 'ngrok-skip-browser-warning': 'true' }"
              :data="{ username: form.username }"
              :show-file-list="false"
              :on-success="handleAvatarSuccess"
              :on-error="handleAvatarError"
          >
            <div v-if="form.avatar" class="avatar-preview">
              <ProxyImage :src="resolveAvatarUrl(form.avatar)" :key="form.avatar" class="dialog-avatar" />
              <div class="avatar-mask"><i class="el-icon-plus"></i></div>
            </div>
            <i v-else class="el-icon-plus avatar-uploader-icon"></i>
          </el-upload>
        </el-form-item>
      </el-form>

      <div slot="footer" class="dialog-footer">
        <el-button @click="fromVisible = false">取 消</el-button>
        <el-button type="primary" class="primary-btn" @click="save">确 定</el-button>
      </div>
    </el-dialog>

  </div>
</template>

<script>
import ProxyImage from '@/components/ProxyImage.vue';

export default {
  name: "User",
  components: {
    ProxyImage
  },
  data() {
    return {
      loading: false,
      tableData: [],
      pageNum: 1,
      pageSize: 10,
      total: 0,
      username: null,
      fromVisible: false,
      form: {},
      user: JSON.parse(localStorage.getItem('xm-user') || '{}'),
      rules: {
        username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
        name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
        phone: [
          { required: true, message: '请输入手机号', trigger: 'blur' },
          { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号', trigger: 'blur' }
        ],
        email: [
          { pattern: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, message: '请输入有效的邮箱', trigger: 'blur' }
        ]
      },
      ids: []
    }
  },
  created() {
    this.load(1)
  },
  methods: {
    handleAdd() {
      this.form = {}
      this.fromVisible = true
    },
    handleEdit(row) {
      this.form = JSON.parse(JSON.stringify(row))
      this.fromVisible = true
    },
    save() {
      this.$refs.formRef.validate((valid) => {
        if (valid) {
          this.$request({
            url: this.form.id ? '/user/update' : '/user/add',
            method: this.form.id ? 'PUT' : 'POST',
            data: this.form
          }).then(res => {
            if (res.code === '200') {
              this.$message.success('保存成功')
              this.load(this.form.id ? this.pageNum : 1)
              this.fromVisible = false
            } else {
              this.$message.error(res.msg)
            }
          })
        }
      })
    },
    del(id) {
      this.$confirm('确认删除该用户吗？', '提示', { type: "warning" }).then(() => {
        this.$request.delete('/user/delete/' + id).then(res => {
          if (res.code === '200') {
            this.$message.success('删除成功')
            this.load(this.pageNum)
          } else {
            this.$message.error(res.msg)
          }
        })
      }).catch(() => {})
    },
    handleSelectionChange(rows) {
      this.ids = rows.map(v => v.id)
    },
    delBatch() {
      if (!this.ids.length) {
        this.$message.warning('请选择数据')
        return
      }
      this.$confirm('确认批量删除选中数据吗？', '提示', { type: "warning" }).then(() => {
        this.$request.delete('/user/delete/batch', { data: this.ids }).then(res => {
          if (res.code === '200') {
            this.$message.success('删除成功')
            this.load(this.pageNum)
          } else {
            this.$message.error(res.msg)
          }
        })
      }).catch(() => {})
    },
    resetPassword(row) {
      this.$confirm(`确认将账号 ${row.username} 的密码重置为默认密码吗？`, '提示', { type: "warning" }).then(() => {
        this.$request.put('/user/resetPassword', { id: row.id }).then(res => {
          if (res.code === '200') {
            this.$message.success('密码重置成功')
            this.load(this.pageNum)
          } else {
            this.$message.error(res.msg)
          }
        })
      }).catch(() => {})
    },
    load(pageNum) {
      if (pageNum) this.pageNum = pageNum
      this.loading = true
      this.$request.get('/user/selectPage', {
        params: {
          pageNum: this.pageNum,
          pageSize: this.pageSize,
          username: this.username,
        }
      }).then(res => {
        this.loading = false
        // Robust data handling
        let list = []
        let total = 0
        if (res.data) {
           // Standard Page format according to new doc: { total, list, ... }
           if (res.data.list && Array.isArray(res.data.list)) {
              list = res.data.list
              total = res.data.total || 0
           } else if (Array.isArray(res.data)) {
              // Fallback for flat array if any
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
          }));
        })
      }).catch(err => {
        console.error('用户列表加载失败:', err)
        this.loading = false
        // 确保即使出错也能显示空列表，而不是让页面崩溃
        this.tableData = []
        this.total = 0
        // 显示友好的错误提示
        this.$message.error('用户列表加载失败，请检查网络连接或联系管理员')
      })
    },
    reset() {
      this.username = null
      this.load(1)
    },
    handleCurrentChange(pageNum) {
      this.load(pageNum)
    },
    handleAvatarSuccess(response, file, fileList) {
      // 调试：打印完整响应
      console.log('图片上传响应:', response)
      console.log('response.code:', response.code)
      console.log('response.data:', response.data)
      
      // 严格校验响应码，防止误将错误当成功
      if (response.code === '200' && response.data) {
        // 修复：后端可能返回 localhost URL，需要替换为实际的后端地址
        let imageUrl = response.data
        if (imageUrl.includes('localhost')) {
          // 提取后端地址（去掉可能的尾部斜杠）
          const backendUrl = this.$baseUrl.replace(/\/$/, '')
          // 替换 localhost:端口 为实际后端地址
          imageUrl = imageUrl.replace(/http:\/\/localhost:\d+/, backendUrl)
          console.log('URL已修正:', imageUrl)
        }
        
        this.$set(this.form, 'avatar', imageUrl)
        this.$message.success('头像上传成功')
        console.log('头像设置为:', this.form.avatar)
      } else {
        this.$message.error(response.msg || '上传失败，请重试')
      }
    },
    handleAvatarError(err, file, fileList) {
      console.error('图片上传失败 - 完整错误:', err)
      console.error('错误类型:', typeof err)
      console.error('错误对象:', JSON.stringify(err, null, 2))
      console.error('文件信息:', file)
      this.$message.error('图片上传失败，请检查网络连接或联系管理员')
    },
    resolveAvatarUrl(url) {
      if (!url) return ''
      // 处理 Windows 路径反斜杠
      url = url.replace(/\\/g, '/')
      
      // 修复：后端返回的 localhost 地址在公网/ngrok 环境下无法访问
      if (url.includes('localhost:9090')) {
        return url.replace('http://localhost:9090', this.$baseUrl);
      }
      
      if (url.startsWith('http')) {
        return url
      }
      // 确保拼接时有且仅有一个斜杠
      const baseUrl = this.$baseUrl.endsWith('/') ? this.$baseUrl : this.$baseUrl + '/'
      const path = url.startsWith('/') ? url.substring(1) : url
      const finalUrl = baseUrl + path
      return finalUrl
    }
  }
}
</script>

<style scoped>
:root {
  --primary-color: #1890ff;
  --bg-color: #f7f8fa;
  --white: #ffffff;
  --text-main: #606266;
  --border-color: #dcdfe6; /* 边框颜色加深 */
}

/* 核心布局容器
  1. calc(100vh - 120px): 减去头部导航栏(约60px) + 容器上下padding(约40px) + 安全余量。
     这确保容器高度小于视口，从而不出现浏览器级滚动条。
  2. overflow: hidden: 禁止外层滚动。
*/
.user-manage-center {
  padding: 12px; /* 优化：从 20px 减少到 12px */
  background-color: #f7f8fa;
  height: calc(100vh - 120px);
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 16px; /* 优化：从 20px 减少到 16px */
  overflow: hidden;
  width: 100%; /* Explicitly set full width */
}

/* 工具栏 - 固定高度 */
.sqlbot-tool {
  height: 60px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #ffffff;
  padding: 0 20px;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  flex-shrink: 0;
}

/* 表格主容器 - 占据剩余空间 */
.sqlbot-table {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);

  /* Flex 布局撑满剩余高度 */
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0; /* 关键：允许容器收缩 */
  overflow: hidden;
}

/* 表格Body - 占据分页器之外的所有空间 */
.table-body {
  flex: 1;
  width: 100%;
  height: 0; /* 配合 flex:1，强制表格在内部滚动 */
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

/* 分页器 - 固定高度，在最下方 */
.pagination-container {
  height: 50px;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  padding: 0 20px;
  background-color: #ffffff;
  border-top: 1px solid #ebeef5;
  flex-shrink: 0; /* 禁止被压缩 */
}


/* 其他辅助样式保持不变 */
.tool-left { display: flex; align-items: center; gap: 10px; }
.sqlbot-search { width: 280px; }
::v-deep .sqlbot-search .el-input__inner { height: 36px; line-height: 36px; border-radius: 20px; background-color: #f5f7fa; border-color: #e4e7ed; padding-left: 35px; }
::v-deep .sqlbot-search .el-input__icon { line-height: 36px; }

.tool-right { display: flex; align-items: center; gap: 12px; }
.tool-btn { display: flex; align-items: center; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-size: 14px; font-weight: 500; transition: all 0.3s; gap: 6px; }
.primary-btn-action { background-color: #1890ff; color: white; }
.primary-btn-action:hover { background-color: #0050B3; }
.danger-btn-action { background-color: #fff1f0; color: #ff4d4f; border: 1px solid #ffccc7; }
.danger-btn-action:hover { background-color: #ff4d4f; color: white; border-color: #ff4d4f; }
.danger-btn-action.disabled { opacity: 0.6; cursor: not-allowed; background-color: #f5f5f5; color: #ccc; border-color: #ddd; }
.primary-btn { background-color: #1890ff; border-color: #1890ff; color: white; }
.primary-btn:hover { background-color: #0050B3; border-color: #0050B3; }
.secondary-btn { background: #f5f5f5; color: #333; border: 1px solid #ddd; }
.secondary-btn:hover { background: #eee; }

.table-operate { display: flex; justify-content: center; gap: 8px; }
.opt-btn { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #5f6368; cursor: pointer; background-color: #f1f3f4; transition: all 0.2s; font-size: 16px; }
.opt-btn:hover { background-color: #e6f7ff; color: #1890ff; }
.opt-btn.delete:hover { background-color: #fff1f0; color: #ff4d4f; }

.role-badge { display: flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 4px; width: fit-content; font-size: 13px; }
.role-admin { background-color: #f9f0ff; color: #722ed1; } /* 管理员：紫色尊贵感 */
.role-user { background-color: #e6f7ff; color: #1890ff; } /* 普通用户：科技蓝 */

.avatar-placeholder { width: 36px; height: 36px; background: #e0e0e0; color: #fff; border-radius: 50%; text-align: center; line-height: 36px; font-weight: bold; margin: 0 auto; }
.avatar-wrapper { display: flex; justify-content: center; }

/* 弹窗 */
::v-deep .custom-dialog .el-dialog__header { text-align: left; border-bottom: 1px solid #ebeef5; padding: 15px 20px; font-weight: 600; }
::v-deep .custom-dialog .el-dialog__body { padding: 20px 30px; }
::v-deep .el-form--label-top .el-form-item__label { padding-bottom: 4px; line-height: 20px; }

.avatar-uploader-icon { font-size: 28px; color: #8c939d; width: 80px; height: 80px; line-height: 80px; text-align: center; border: 1px dashed #d9d9d9; border-radius: 6px; cursor: pointer; transition: all 0.3s; }
.avatar-uploader-icon:hover { border-color: #1890ff; color: #1890ff; }
.avatar-preview { position: relative; width: 80px; height: 80px; border-radius: 6px; overflow: hidden; cursor: pointer; }
.dialog-avatar { width: 100%; height: 100%; object-fit: cover; }
.avatar-mask { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; color: #fff; font-size: 20px; opacity: 0; transition: opacity 0.3s; }
.avatar-preview:hover .avatar-mask { opacity: 1; }
</style>