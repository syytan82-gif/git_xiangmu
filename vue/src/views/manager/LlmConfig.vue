<template>
  <div class="sqlbot-container">
    <div class="sqlbot-content-box">

      <div class="page-header">
        <div class="header-content">
          <div class="header-left">
            <div class="title-row">
              <div class="header-title">大模型配置</div>
              <el-radio-group v-model="modelMode" size="small" class="mode-toggle" @change="handleModeChange">
                <el-radio-button label="local">本地模型</el-radio-button>
                <el-radio-button label="online">在线模型</el-radio-button>
              </el-radio-group>
            </div>
            <div class="header-desc">配置大模型服务商与 API 连接信息</div>
          </div>
        </div>
      </div>

      <div v-if="modelMode === 'online'" class="tab-content">
        <div class="section-title">
          <span class="icon-wrapper"><i class="el-icon-cpu"></i></span>
          模型服务商
        </div>

        <div class="provider-selector">
          <div
              class="provider-card"
              :class="{ active: currentProvider === 'aliyun' }"
              @click="selectProvider('aliyun')"
          >
            <div class="provider-logo aliyun-bg">
              <img :src="logos.aliyun" alt="Aliyun">
            </div>
            <div class="provider-info">
              <div class="name">阿里云百炼</div>
              <div class="desc">通义千问 Qwen</div>
            </div>
            <div class="check-mark" v-if="currentProvider === 'aliyun'">
              <i class="el-icon-check"></i>
            </div>
          </div>

          <div
              class="provider-card"
              :class="{ active: currentProvider === 'gpt' }"
              @click="selectProvider('gpt')"
          >
            <div class="provider-logo gpt-bg">
              <img :src="logos.gpt" alt="GPT">
            </div>
            <div class="provider-info">
              <div class="name">OpenAI</div>
              <div class="desc">GPT-3.5 / GPT-4</div>
            </div>
            <div class="check-mark" v-if="currentProvider === 'gpt'">
              <i class="el-icon-check"></i>
            </div>
          </div>

          <div
              class="provider-card"
              :class="{ active: currentProvider === 'deepseek' }"
              @click="selectProvider('deepseek')"
          >
            <div class="provider-logo deepseek-bg">
              <img :src="logos.deepseek" alt="DeepSeek">
            </div>
            <div class="provider-info">
              <div class="name">DeepSeek</div>
              <div class="desc">深度求索 Coder</div>
            </div>
            <div class="check-mark" v-if="currentProvider === 'deepseek'">
              <i class="el-icon-check"></i>
            </div>
          </div>

          <div
              class="provider-card"
              :class="{ active: currentProvider === 'other' }"
              @click="selectProvider('other')"
          >
            <div class="provider-logo other-bg">
              <img :src="logos.other" alt="Other">
            </div>
            <div class="provider-info">
              <div class="name">其他模型</div>
              <div class="desc">通用 LLM 服务</div>
            </div>
            <div class="check-mark" v-if="currentProvider === 'other'">
              <i class="el-icon-check"></i>
            </div>
          </div>
        </div>

        <el-divider></el-divider>

        <div class="section-title">
          <span class="icon-wrapper"><i class="el-icon-setting"></i></span>
          参数配置
        </div>

        <el-form :model="llmForm" :rules="llmRules" ref="llmFormRef" label-position="top" class="sqlbot-form">
          <el-row :gutter="24">
            <el-col :span="12">
              <el-form-item label="API Key (鉴权密钥)" prop="apiKey">
                <el-input
                    v-model="llmForm.apiKey"
                    placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxx"
                    show-password
                    prefix-icon="el-icon-key">
                </el-input>
              </el-form-item>
            </el-col>

            <el-col :span="12">
              <el-form-item label="Base URL (接口地址)" prop="baseUrl">
                <el-input
                    v-model="llmForm.baseUrl"
                    :placeholder="defaultBaseUrlPlaceholder"
                    prefix-icon="el-icon-link">
                </el-input>
              </el-form-item>
            </el-col>

            <el-col :span="12">
              <el-form-item label="模型名称 (Model Name)" prop="modelName">
                <el-select
                    v-model="llmForm.modelName"
                    placeholder="请选择或输入模型"
                    filterable
                    allow-create
                    default-first-option
                    style="width: 100%">
                  <el-option
                      v-for="item in currentModelOptions"
                      :key="item.value"
                      :label="item.label"
                      :value="item.value">
                    <span style="float: left">{{ item.label }}</span>
                    <span style="float: right; color: #8492a6; font-size: 13px">{{ item.value }}</span>
                  </el-option>
                </el-select>
              </el-form-item>
            </el-col>

            <el-col :span="12">
              <el-form-item label="超时时间 (Timeout)" prop="timeout">
                <el-input-number v-model="llmForm.timeout" :min="10" :max="300" style="width: 100%" controls-position="right"></el-input-number>
              </el-form-item>
            </el-col>
          </el-row>

          <div class="form-actions">
            <el-button class="secondary-btn" icon="el-icon-connection" @click="testLlmConnection" :loading="llmTesting">测试连接</el-button>
            <el-button type="primary" class="primary-btn" icon="el-icon-check" @click="saveLlmConfig" :loading="llmSaving" :disabled="!isTestPassed">保存配置</el-button>
          </div>
        </el-form>
      </div>

      <div v-if="modelMode === 'local'" class="tab-content">
        <div class="section-title">
          <span class="icon-wrapper blue"><i class="el-icon-s-home"></i></span>
          本地模型设置
        </div>

        <div class="provider-selector">
          <div
              class="provider-card"
              :class="{ active: currentLocalType === 'inference' }"
              @click="currentLocalType = 'inference'"
          >
            <div class="provider-logo other-bg">
              <i class="el-icon-chat-dot-round" style="font-size: 24px; color: #1890ff;"></i>
            </div>
            <div class="provider-info">
              <div class="name">问数大模型</div>
              <div class="desc">Inference Model</div>
            </div>
            <div class="check-mark" v-if="currentLocalType === 'inference'">
              <i class="el-icon-check"></i>
            </div>
          </div>

          <div
              class="provider-card"
              :class="{ active: currentLocalType === 'embedding' }"
              @click="currentLocalType = 'embedding'"
          >
            <div class="provider-logo deepseek-bg">
              <i class="el-icon-collection" style="font-size: 24px; color: #1890ff;"></i>
            </div>
            <div class="provider-info">
              <div class="name">嵌入大模型</div>
              <div class="desc">Embedding Model</div>
            </div>
            <div class="check-mark" v-if="currentLocalType === 'embedding'">
              <i class="el-icon-check"></i>
            </div>
          </div>

          <div
              class="provider-card"
              :class="{ active: currentLocalType === 'rerank' }"
              @click="currentLocalType = 'rerank'"
          >
            <div class="provider-logo gpt-bg">
              <i class="el-icon-sort" style="font-size: 24px; color: #67c23a;"></i>
            </div>
            <div class="provider-info">
              <div class="name">排序大模型</div>
              <div class="desc">Rerank Model</div>
            </div>
            <div class="check-mark" v-if="currentLocalType === 'rerank'">
              <i class="el-icon-check"></i>
            </div>
          </div>
        </div>

        <el-divider></el-divider>

        <div class="section-title">
          <span class="icon-wrapper blue"><i class="el-icon-setting"></i></span>
          参数配置
        </div>

        <el-form :model="localForm" :rules="localRules" ref="localFormRef" label-position="top" class="sqlbot-form">
          <el-row :gutter="24">
            <el-col :span="12">
              <el-form-item label="模型版本名称 (Model Name)" :prop="currentLocalType + 'ModelName'">
                <el-input
                    v-model="localForm[currentLocalType + 'ModelName']"
                    placeholder="请输入模型版本名称"
                    prefix-icon="el-icon-cpu">
                </el-input>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="模型部署地址 (Base URL)" :prop="currentLocalType + 'BaseUrl'">
                <el-input
                    v-model="localForm[currentLocalType + 'BaseUrl']"
                    placeholder="例如: http://192.168.1.100:8000/v1"
                    prefix-icon="el-icon-link">
                </el-input>
              </el-form-item>
            </el-col>
          </el-row>

          <div class="form-actions">
            <el-button class="secondary-btn" icon="el-icon-connection" @click="testLocalConnection" :loading="localTesting">测试连接</el-button>
            <el-button type="primary" class="primary-btn" icon="el-icon-check" @click="saveLocalConfig" :loading="localSaving" :disabled="!localTestStatus[currentLocalType]">保存本地配置</el-button>
          </div>
        </el-form>
      </div>

    </div>
  </div>
</template>

<script>
import axios from 'axios'

// 引入本地图片资源
import aliyunLogo from '@/assets/model/icon_alybl_colorful.png'
import gptLogo from '@/assets/model/openai.png'
import deepseekLogo from '@/assets/model/icon_deepseek_colorful.png'
import tongyonglogo from '@/assets/model/tongyong.png'

const configRequest = axios.create({
  baseURL: process.env.VUE_APP_BASEURL + 'api/ai-model',
  timeout: 30000 // 增加超时时间以等待模型响应
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
  name: 'LlmConfig',
  data() {
    return {
      // 模式状态：'online' (在线) | 'local' (本地)
      modelMode: 'online',

      llmTesting: false,
      llmSaving: false,
      isTestPassed: false,

      // 在线模型数据
      currentProvider: 'aliyun',
      logos: {
        aliyun: aliyunLogo,
        gpt: gptLogo,
        deepseek: deepseekLogo,
        other: tongyonglogo
      },
      llmForm: {
        baseUrl: '',
        apiKey: '',
        modelName: '',
        timeout: 60
      },
      llmRules: {
        apiKey: [{ required: true, message: '请输入 API Key', trigger: 'blur' }],
        baseUrl: [{ required: true, message: '请输入接口地址', trigger: 'blur' }],
        modelName: [{ required: true, message: '请选择或输入模型名称', trigger: 'change' }]
      },

      // 本地模型数据
      currentLocalType: 'inference',
      localTesting: false,
      localSaving: false,
      localTestStatus: {
        inference: false,
        embedding: false,
        rerank: false
      },
      localForm: {
        inferenceBaseUrl: '',
        inferenceModelName: '',
        embeddingBaseUrl: '',
        embeddingModelName: '',
        rerankBaseUrl: '',
        rerankModelName: ''
      },
      localRules: {
        inferenceBaseUrl: [{ required: true, message: '请输入模型部署地址', trigger: 'blur' }],
        inferenceModelName: [{ required: true, message: '请输入模型版本名称', trigger: 'blur' }],
        embeddingBaseUrl: [{ required: true, message: '请输入模型部署地址', trigger: 'blur' }],
        embeddingModelName: [{ required: true, message: '请输入模型版本名称', trigger: 'blur' }],
        rerankBaseUrl: [{ required: true, message: '请输入模型部署地址', trigger: 'blur' }],
        rerankModelName: [{ required: true, message: '请输入模型版本名称', trigger: 'blur' }]
      },

      // 预设选项配置
      modelOptionsMap: {
        aliyun: [
          { label: '通义千问-Plus', value: 'qwen-plus' },
          { label: '通义千问-Turbo', value: 'qwen-turbo' },
          { label: '通义千问-Max', value: 'qwen-max' }
        ],
        gpt: [
          { label: 'GPT-3.5 Turbo', value: 'gpt-3.5-turbo' },
          { label: 'GPT-4', value: 'gpt-4' },
          { label: 'GPT-4o', value: 'gpt-4o' }
        ],
        deepseek: [
          { label: 'DeepSeek Chat', value: 'deepseek-chat' },
          { label: 'DeepSeek Coder', value: 'deepseek-coder' }
        ],
        other: []
      },
      baseUrlMap: {
        aliyun: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
        gpt: 'https://api.openai.com/v1',
        deepseek: 'https://api.deepseek.com',
        other: ''
      }
    }
  },
  watch: {
    // 监听在线表单变化，任何修改都需要重新测试
    llmForm: {
      handler() {
        this.isTestPassed = false;
      },
      deep: true
    },
    'localForm.inferenceBaseUrl'() { this.localTestStatus.inference = false; },
    'localForm.inferenceModelName'() { this.localTestStatus.inference = false; },
    'localForm.embeddingBaseUrl'() { this.localTestStatus.embedding = false; },
    'localForm.embeddingModelName'() { this.localTestStatus.embedding = false; },
    'localForm.rerankBaseUrl'() { this.localTestStatus.rerank = false; },
    'localForm.rerankModelName'() { this.localTestStatus.rerank = false; }
  },
  computed: {
    currentModelOptions() {
      return this.modelOptionsMap[this.currentProvider] || [];
    },
    defaultBaseUrlPlaceholder() {
      if (this.currentProvider === 'other') {
        return '请输入自定义服务的 API Base URL';
      }
      return this.baseUrlMap[this.currentProvider] || '请输入 API Base URL';
    }
  },
  created() {
    this.loadLlmConfig();
  },
  methods: {
    // 切换模式处理
    handleModeChange(val) {
      if (val === 'online') {
        // 切换回在线，重新检测一下 Provider
        this.detectProvider();
      }
    },

    selectProvider(provider) {
      this.currentProvider = provider;
      if (this.baseUrlMap[provider]) {
        this.llmForm.baseUrl = this.baseUrlMap[provider];
      } else {
        this.llmForm.baseUrl = '';
      }
      if (this.modelOptionsMap[provider] && this.modelOptionsMap[provider].length > 0) {
        const currentModelInNewList = this.modelOptionsMap[provider].some(m => m.value === this.llmForm.modelName);
        if (!this.llmForm.modelName || !currentModelInNewList) {
          this.llmForm.modelName = this.modelOptionsMap[provider][0].value;
        }
      } else if (provider === 'other') {
        this.llmForm.modelName = '';
      }
    },

    loadLlmConfig() {
      configRequest.get('/config/active').then(res => {
        if (res.code === '200' && Array.isArray(res.data)) {
          let hasOnline = false;
          let hasLocal = false;
          res.data.forEach(item => {
            switch (item.modelType) {
              case 'ONLINE_INFERENCE':
                this.llmForm.baseUrl = item.baseUrl || '';
                this.llmForm.apiKey = item.apiKey || '';
                this.llmForm.modelName = item.modelName || '';
                try {
                  const extra = item.extraConfig ? JSON.parse(item.extraConfig) : {};
                  this.llmForm.timeout = extra.timeout || 60;
                } catch(e) {
                  this.llmForm.timeout = 60;
                }
                hasOnline = true;
                this.detectProvider();
                break;
              case 'LOCAL_INFERENCE':
                this.localForm.inferenceModelName = item.modelName || '';
                this.localForm.inferenceBaseUrl = item.baseUrl || '';
                hasLocal = true;
                break;
              case 'LOCAL_EMBEDDING':
                this.localForm.embeddingModelName = item.modelName || '';
                this.localForm.embeddingBaseUrl = item.baseUrl || '';
                break;
              case 'RERANK':
                this.localForm.rerankModelName = item.modelName || '';
                this.localForm.rerankBaseUrl = item.baseUrl || '';
                break;
            }
          });
          if (hasOnline) {
             this.modelMode = 'online';
          } else if (hasLocal) {
             this.modelMode = 'local';
          }
        }
      }).catch(err => console.error('加载模型配置失败:', err));
    },

    detectProvider() {
      const modelLower = (this.llmForm.modelName || '').toLowerCase();
      const urlLower = (this.llmForm.baseUrl || '').toLowerCase();

      if (modelLower.includes('qwen') || urlLower.includes('aliyun') || urlLower.includes('dashscope')) {
        this.currentProvider = 'aliyun';
      } else if (modelLower.includes('deepseek') || urlLower.includes('deepseek')) {
        this.currentProvider = 'deepseek';
      } else if (modelLower.includes('gpt') || urlLower.includes('openai')) {
        this.currentProvider = 'gpt';
      } else {
        this.currentProvider = 'other';
      }
    },

    testLocalConnection() {
      this.$refs.localFormRef.validate(valid => {
        if (valid) {
          this.localTesting = true;
          const urlField = `${this.currentLocalType}BaseUrl`;
          const modelField = `${this.currentLocalType}ModelName`;
          
          const testEndpointMap = {
            inference: '/test/inference',
            embedding: '/test/embedding',
            rerank: '/test/rerank'
          };
          
          // 不传 apiKey，后端走本地裸连测试
          configRequest.post(testEndpointMap[this.currentLocalType], {
            baseUrl: this.localForm[urlField],
            modelName: this.localForm[modelField]
          }).then(res => {
            if (res.code === '200') {
              this.$message.success('连通性测试成功');
              this.localTestStatus[this.currentLocalType] = true;
            } else {
              this.$message.error(res.msg || '连接失败');
              this.localTestStatus[this.currentLocalType] = false;
            }
          }).catch(() => {
            this.$message.error('测试连接请求异常');
            this.localTestStatus[this.currentLocalType] = false;
          }).finally(() => { this.localTesting = false; });
        }
      });
    },

    saveLocalConfig() {
      if (!this.localTestStatus[this.currentLocalType]) {
        this.$message.warning('请先进行连通性测试并成功后才能保存');
        return;
      }
      
      this.$refs.localFormRef.validate(valid => {
        if (valid) {
          this.localSaving = true;
          const urlField = `${this.currentLocalType}BaseUrl`;
          const modelField = `${this.currentLocalType}ModelName`;
          
          const endpointMap = {
            inference: '/local-inference',
            embedding: '/local-embedding',
            rerank: '/rerank'
          };

          const payload = {
            baseUrl: this.localForm[urlField] || null,
            modelName: this.localForm[modelField] || null
          };

          configRequest.post(endpointMap[this.currentLocalType], payload).then(res => {
            if (res.code === '200') {
              this.$message.success('本地模型配置已保存，模型已激活');
            } else {
              this.$message.error(res.msg || '保存失败');
            }
          }).finally(() => { this.localSaving = false; });
        }
      });
    },

    // --- 在线模型相关逻辑 ---
    saveLlmConfig() {
      if (!this.isTestPassed) {
        this.$message.warning('请先进行连接测试');
        return;
      }

      this.$refs.llmFormRef.validate(valid => {
        if (valid) {
          this.llmSaving = true;
          const payload = {
            baseUrl: this.llmForm.baseUrl,
            apiKey: this.llmForm.apiKey,
            modelName: this.llmForm.modelName,
            timeout: this.llmForm.timeout
          };

          configRequest.post('/online-inference', payload).then(res => {
            if (res.code === '200') {
              this.$message.success('大模型配置保存成功，模型已激活');
            } else {
              this.$message.error(res.msg || '保存失败');
            }
          }).finally(() => { this.llmSaving = false; });
        }
      });
    },

    testLlmConnection() {
      this.$refs.llmFormRef.validate(valid => {
        if (valid) {
          this.llmTesting = true;
          configRequest.post('/test/inference', {
            baseUrl: this.llmForm.baseUrl,
            apiKey: this.llmForm.apiKey,
            modelName: this.llmForm.modelName,
            timeout: this.llmForm.timeout
          }).then(res => {
            if (res.code === '200') {
              this.$message.success('连接成功');
              this.isTestPassed = true;
            } else {
              this.$message.error(res.msg || '连接失败');
              this.isTestPassed = false;
            }
          }).catch(() => {
            this.$message.error('测试连接请求异常');
            this.isTestPassed = false;
          }).finally(() => { this.llmTesting = false; });
        }
      });
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
  padding: 12px;
  background-color: #f7f8fa;
  min-height: calc(100vh - 80px);
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}

.sqlbot-content-box {
  background: #ffffff;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  padding: 20px;
  flex: 1;
}

.page-header {
  margin-bottom: 18px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f0f0f0;
}
.header-content {
  display: flex;
  align-items: center;
}
.header-left {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.title-row {
  display: flex;
  align-items: center;
  gap: 16px;
}
.header-title {
  font-size: 20px;
  font-weight: 600;
  color: #2d2e31;
  margin: 0;
}
.header-desc {
  font-size: 13px;
  color: #909399;
  margin: 0;
}
.mode-toggle {
  transform: translateY(1px);
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: #2d2e31;
  margin-bottom: 16px;
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.icon-wrapper {
  width: 24px;
  height: 24px;
  background: #e6f7ff;
  border-radius: 4px;
  color: #1890ff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
}
.icon-wrapper.blue {
  background: #e6f7ff;
  color: #1890ff;
}

.provider-selector {
  display: flex;
  gap: 16px;
  margin-bottom: 20px;
}
.provider-card {
  flex: 1;
  height: 80px;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  display: flex;
  align-items: center;
  padding: 0 16px;
  cursor: pointer;
  position: relative;
  background: #fff;
  transition: all 0.3s ease;
}
.provider-card:hover {
  border-color: #85a5ff;
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
}
.provider-card.active {
  border-color: #1890ff;
  background-color: #f0f7ff;
}
.provider-logo {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
  background: #f5f7fa;
}
.provider-logo img {
  width: 24px;
  height: 24px;
  object-fit: contain;
}
.aliyun-bg { background-color: #ffefe6; }
.gpt-bg { background-color: #ecfcf3; }
.deepseek-bg { background-color: #eef6ff; }
.other-bg { background-color: #f5f7fa; }

.provider-info .name {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin-bottom: 2px;
}
.provider-info .desc {
  font-size: 12px;
  color: #909399;
}
.check-mark {
  position: absolute;
  top: 0; right: 0;
  width: 0; height: 0;
  border-top: 32px solid #1890ff;
  border-left: 32px solid transparent;
}
.check-mark i {
  position: absolute;
  top: -28px; right: 2px;
  color: #fff;
  font-size: 12px;
}

.sqlbot-form {
  padding: 0 5px;
}
::v-deep .el-form--label-top .el-form-item__label {
  padding-bottom: 6px;
  line-height: 20px;
  font-size: 14px;
  color: #606266;
}
::v-deep .el-input__inner {
  border-radius: 4px;
  height: 38px;
  line-height: 38px;
}
::v-deep .el-input__inner:focus {
  border-color: #1890ff;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px dashed #eee;
}

.primary-btn {
  background-color: #1890ff;
  border-color: #1890ff;
  padding: 10px 24px;
}
.primary-btn:hover {
  background-color: #0050B3;
  border-color: #0050B3;
}
.primary-btn.is-disabled, .primary-btn.is-disabled:hover {
  background-color: #a0cfff;
  border-color: #a0cfff;
  opacity: 0.6;
}

.secondary-btn {
  background: #f5f5f5;
  color: #333;
  border: 1px solid #ddd;
  padding: 10px 24px;
}
.secondary-btn:hover {
  background: #eee;
  color: #1890ff;
  border-color: #85a5ff;
}
</style>