<template>
  <div class="user-person-container">
    <el-card class="box-card">
      <div slot="header" class="clearfix">
        <span style="font-weight: bold; font-size: 16px">个人信息</span>
      </div>
      <el-form :model="user" label-width="100px" :rules="rules" ref="formRef">
        
        <div class="avatar-container">
          <!-- 头像展示 -->
          <div class="avatar-wrapper">
            <ProxyImage 
              v-if="avatarSrc" 
              :src="avatarSrc" 
              class="avatar-img" 
            />
            <div v-else class="avatar-placeholder">
              <i class="el-icon-user-solid"></i>
            </div>
          </div>
          <!-- 修改按钮 -->
          <el-upload
              class="avatar-uploader-btn"
              :action="$baseUrl + '/image/upload'"
              :headers="{ token: user.token, 'ngrok-skip-browser-warning': 'true' }"
              :show-file-list="false"
              :on-success="handleAvatarSuccess"
          >
            <el-button size="small" type="primary" plain>更换头像</el-button>
          </el-upload>
        </div>

        <el-form-item label="账号" prop="username">
          <el-input v-model="user.username" placeholder="账号" disabled></el-input>
        </el-form-item>
        <el-form-item label="姓名" prop="name">
          <el-input v-model="user.name" placeholder="姓名" disabled></el-input>
        </el-form-item>
        <el-form-item label="电话" prop="phone">
          <el-input v-model="user.phone" placeholder="电话"></el-input>
        </el-form-item>
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="user.email" placeholder="邮箱"></el-input>
        </el-form-item>
        <div style="text-align: center; margin-top: 30px">
          <el-button type="primary" @click="update">保 存</el-button>
        </div>
      </el-form>
    </el-card>
  </div>
</template>

<script>
import ProxyImage from '@/components/ProxyImage.vue';

export default {
  name: "UserPerson",
  components: {
    ProxyImage
  },
  data() {
    return {
      user: JSON.parse(localStorage.getItem('xm-user') || '{}'),
      rules: {
        username: [
          { required:true, message: '请输入用户名', trigger: 'blur' }
        ],
        name: [
          {required: true, message: '请输入姓名', trigger: 'blur'}
        ],
        phone: [
          {required: true, message: '请输入手机号', trigger: 'blur'},
          {
            pattern: /^1[3-9]\d{9}$/,
            message: '请输入正确的手机号（11位数字）',
            trigger: 'blur'
          }
        ],
        email: [
          {required: true, message: '请输入邮箱', trigger: 'blur'},
          {
            pattern: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
            message: '请输入有效的邮箱（如 example@domain.com）',
            trigger: 'blur'
          }
        ]
      },
    }
  },
  computed: {
    avatarSrc() {
      let avatar = this.user.avatar;
      
      // 默认头像 (保持与 Manager.vue 一致)
      const defaultAvatar = 'https://www.keaitupian.cn/cjpic/frombd/2/253/3810755577/3802575188.jpg';
      
      if (!avatar) return defaultAvatar;
      
      // 修复：后端返回的 localhost 地址在公网/ngrok 环境下无法访问
      if (avatar.includes('localhost:9090')) {
        return avatar.replace('http://localhost:9090', this.$baseUrl);
      }

      if (avatar.startsWith('http')) {
        return avatar;
      }
      
      let baseUrl = this.$baseUrl || '';
      if (!baseUrl.endsWith('/') && !avatar.startsWith('/')) {
        return baseUrl + '/' + avatar;
      }
      return baseUrl + avatar;
    }
  },
  created() {
    this.loadUser()
  },
  methods: {
    loadUser() {
      if (this.user.id) {
        this.$request.get('/user/selectById/' + this.user.id).then(res => {
          if (res.code === '200') {
            let cachedUser = JSON.parse(localStorage.getItem('xm-user') || '{}');
            this.user = { ...res.data, token: cachedUser.token };
            localStorage.setItem('xm-user', JSON.stringify(this.user))
          }
        })
      }
    },
    update() {
      this.$refs.formRef.validate((valid) => {
        if (valid) {
          this.$request.put('/user/update', this.user).then(res => {
            if (res.code === '200') {
              this.$message.success('保存成功')
              localStorage.setItem('xm-user', JSON.stringify(this.user))
              this.$emit('update:user')
            } else {
              this.$message.error(res.msg)
            }
          })
        }
      })
    },
    handleAvatarSuccess(response, file, fileList) {
      console.log('Upload Response:', response);
      if (response.code === '200' || response.code === 200) {
        // 强制更新 avatar 属性
        this.$set(this.user, 'avatar', response.data);
        this.$forceUpdate(); // 强制刷新视图
        
        // 【关键修复】头像上传后需要立即保存更新到数据库，否则刷新丢失
        this.$request.put('/user/update', this.user).then(res => {
          if (res.code === '200') {
            this.$message.success('头像更换成功');
            localStorage.setItem('xm-user', JSON.stringify(this.user));
            this.$emit('update:user');
          } else {
            this.$message.error('头像保存失败: ' + res.msg);
          }
        });
      } else {
        this.$message.error(response.msg || '上传失败');
      }
    },
  }
}
</script>

<style scoped>
.user-person-container {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 40px;
  min-height: 80vh;
}

.box-card {
  width: 600px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.avatar-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 20px;
}

.avatar-wrapper {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  overflow: hidden;
  border: 1px solid #e0e0e0;
  margin-bottom: 12px;
  background-color: #f5f7fa;
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #909399;
  font-size: 40px;
  background-color: #f0f2f5;
}

.avatar-uploader-btn {
  display: inline-block;
}

::v-deep .el-form-item__label {
  font-weight: bold;
}
</style>