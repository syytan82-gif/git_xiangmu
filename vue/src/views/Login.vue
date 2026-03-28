<template>
  <div class="login-container">
    <div class="login-card-container">

      <!-- 左侧：品牌视觉区 (图片+蒙层) -->
      <div class="brand-side">
        <div class="brand-content">
          <img src="@/assets/imgs/mx_logo.png" alt="Logo" class="brand-logo" />
          <div class="separator"></div>
          <h1 class="brand-title">美心翼申数据智能</h1>
          <p class="brand-slogan">Smart Data Analysis Platform</p>
        </div>

        <!-- 左侧底部公司署名 -->
        <div class="brand-footer">
          <div class="company-cn">重庆美心翼申机械股份有限公司</div>
          <div class="company-en">Chongqing Mexin Yishen Machinery Co.,Ltd</div>
        </div>
      </div>

      <!-- 右侧：登录表单区 -->
      <div class="form-side">
        <div class="form-header">
          <div class="welcome">欢迎回来</div>
          <div class="subtitle">请登录您的企业账号</div>
        </div>

        <el-form :model="form" :rules="rules" ref="formRef" class="login-form">
          <el-form-item prop="username">
            <el-input
                placeholder="请输入账号"
                v-model="form.username"
                class="modern-input">
              <i slot="prefix" class="el-icon-user"></i>
            </el-input>
          </el-form-item>

          <el-form-item prop="password">
            <el-input
                placeholder="请输入密码"
                show-password
                v-model="form.password"
                class="modern-input">
              <i slot="prefix" class="el-icon-lock"></i>
            </el-input>
          </el-form-item>



          <el-form-item>
            <el-button class="login-btn" :loading="false" @click="login">
              立即登录
            </el-button>
          </el-form-item>
        </el-form>

        <div class="powered-by">
          Powered by 重庆山之南大数据科技有限公司
        </div>
      </div>

    </div>
  </div>
</template>

<script>
export default {
  name: "Login",
  data() {
    return {
      form: {},
      rules: {
        username: [
          { required: true, message: '请输入账号', trigger: 'blur' },
        ],
        password: [
          { required: true, message: '请输入密码', trigger: 'blur' },
        ]
      }
    }
  },
  methods: {
    login() {
      this.$refs['formRef'].validate((valid) => {
        if (valid) {
          const payload = {
            ...this.form,
            clientType: 'WEB'
          }
          this.$request.post('/login', payload).then(res => {
            if (res.code === '200') {
              localStorage.removeItem("xm-user"); // 先清除旧 token，防止残留
              localStorage.setItem("xm-user", JSON.stringify(res.data))
              this.$router.push('/')
              this.$message.success('登录成功')
            } else {
              this.$message.error(res.msg)
            }
          })
        }
      })
    }
  }
}
</script>

<style scoped>
/* 外部容器：清爽的灰色背景 */
.login-container {
  height: 100vh;
  width: 100vw;
  background-color: #f0f2f5;
  background-image:
      radial-gradient(#e1e4e8 1px, transparent 1px);
  background-size: 24px 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Inter', -apple-system, sans-serif;
}

/* 核心卡片容器 */
.login-card-container {
  width: 1000px;
  height: 600px;
  background: #fff;
  border-radius: 20px;
  box-shadow: 0 20px 80px rgba(0, 0, 0, 0.08);
  display: flex;
  overflow: hidden;
}

/* --- 左侧品牌视觉区 --- */
.brand-side {
  flex: 1.2;
  position: relative;
  background-color: #001529; /* 兜底色 */
  /* 背景图 */
  background-image: url('~@/assets/imgs/bg.png');
  background-size: cover;
  background-position: center;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 左侧深蓝蒙层：保证文字清晰，统一色调 */
.brand-side::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: linear-gradient(135deg, rgba(0, 21, 41, 0.85) 0%, rgba(0, 60, 150, 0.7) 100%);
  z-index: 1;
}

.brand-content {
  position: relative;
  z-index: 2;
  text-align: center;
  color: white;
  padding: 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* 左侧 Logo 优化 */
.brand-logo {
  height: 64px;
  width: auto;
  background: white; /* 纯白底色衬托Logo */
  padding: 16px;
  border-radius: 12px;
  box-shadow: 0 8px 16px rgba(0,0,0,0.2);
  margin-bottom: 20px;
}

.separator {
  width: 40px;
  height: 4px;
  background: #1890ff;
  border-radius: 2px;
  margin-bottom: 24px;
}

.brand-title {
  font-size: 32px;
  font-weight: 700;
  margin-bottom: 12px;
  letter-spacing: 1px;
}

.brand-slogan {
  font-size: 14px;
  opacity: 0.8;
  letter-spacing: 0.5px;
  font-weight: 300;
  text-transform: uppercase;
}

/* 左侧底部公司信息 */
.brand-footer {
  position: absolute;
  bottom: 40px;
  width: 100%;
  text-align: center;
  z-index: 2;
  color: rgba(255, 255, 255, 0.7);
}

.company-cn {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 4px;
  letter-spacing: 1px;
}

.company-en {
  font-size: 10px;
  opacity: 0.8;
  text-transform: uppercase;
  font-family: 'Inter', sans-serif;
  letter-spacing: 0.5px;
}

/* --- 右侧表单区 --- */
.form-side {
  flex: 1;
  background: #fff;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 0 60px;
  position: relative; /* 添加相对定位，以便 powered-by 可以绝对定位 */
}

.form-header {
  margin-bottom: 40px;
}

.welcome {
  font-size: 28px;
  font-weight: 700;
  color: #1f2329;
  margin-bottom: 8px;
}

.subtitle {
  font-size: 14px;
  color: #8c909f;
}

/* 输入框样式 */
.modern-input /deep/ .el-input__inner,
.modern-select /deep/ .el-input__inner {
  height: 52px;
  line-height: 52px;
  background: #f7f8fa;
  border: 1px solid transparent;
  border-radius: 12px;
  padding-left: 45px !important;
  font-size: 15px;
  transition: all 0.3s;
}

.modern-input /deep/ .el-input__inner:focus,
.modern-select /deep/ .el-input__inner:focus {
  background: #fff;
  border-color: #1890ff;
  box-shadow: 0 0 0 3px rgba(24, 144, 255, 0.1);
}

.modern-input /deep/ .el-input__prefix i {
  line-height: 52px;
  font-size: 18px;
  color: #c0c4cc;
  margin-left: 5px;
}

/* 按钮样式 */
.login-btn {
  width: 100%;
  height: 52px;
  background: #1890ff;
  border: none;
  font-size: 16px;
  font-weight: 600;
  color: white;
  border-radius: 12px;
  margin-top: 10px;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 4px 12px rgba(24, 144, 255, 0.25);
}

.login-btn:hover {
  background: #096dd9;
  box-shadow: 0 8px 24px rgba(24, 144, 255, 0.35);
  transform: translateY(-1px);
}



.powered-by {
  position: absolute;
  bottom: 40px; /* 与左侧 brand-footer 相同的底部距离 */
  left: 0;
  right: 0;
  text-align: center;
  font-size: 12px;
  color: #8c909f; /* 稍微深一点，与右侧整体风格协调 */
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  letter-spacing: 0.5px;
}
</style>