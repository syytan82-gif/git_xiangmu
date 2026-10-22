<template>
  <div class="sqlbot-container">
    <div class="sqlbot-content-box">

      <div class="page-header">
        <div class="header-title">文件上传中心</div>
        <div class="header-desc">管理您的数据字典、数据库模式、案例对和行业术语，用于模型训练与知识库构建</div>
      </div>

      <el-tabs v-model="activeTab" class="custom-tabs" @tab-click="handleTabClick">

        <el-tab-pane label="数据模式" name="schema">
          <div class="tab-content">

            <div class="section-title">
              <span class="icon-wrapper"><i class="el-icon-upload"></i></span>
              上传数据模式与字典文件
              <el-tooltip content="请上传包含数据库模式和数据字典的合并 Excel 文件" placement="top">
                <i class="el-icon-info info-icon"></i>
              </el-tooltip>
              <div style="flex: 1"></div>
              <el-link type="primary" :underline="false" :href="getTemplateUrl('数据字典文件（模板）.xlsx')">
                <i class="el-icon-download"></i> 下载文件模板
              </el-link>
            </div>

            
            <el-form label-position="top" class="sqlbot-form">
              <el-form-item>
                <el-upload
                    class="drag-uploader full-width-uploader"
                    drag
                    action="#"
                    :auto-upload="false"
                    :on-change="(f, l) => handleFileChange(f, l, 'singleSchema')"
                    :limit="20"
                    multiple
                    :file-list="fileListSingleSchema"
                    :disabled="schemaProcessing">
                  <div class="upload-content">
                    <i class="el-icon-folder-opened upload-icon"></i>
                    <div class="el-upload__text">拖拽或 <em>点击上传</em> 模式与字典合并文件 (Excel)</div>
                  </div>
                  <div class="el-upload__tip center-tip" slot="tip">支持 .xlsx / .xls 格式，<span style="color: #f56c6c">需要上传完整的数据字典与模式文件</span></div>
                </el-upload>
              </el-form-item>
              <div class="form-actions">
                <transition name="el-fade-in-linear">
                  <div v-if="schemaProcessing" class="submit-timer-box">
                    {{ getTabClock('schema') }}
                  </div>
                </transition>
                <el-button
                    type="primary"
                    class="primary-btn"
                    :loading="loading.schema || schemaProcessing"
                    :disabled="schemaProcessing"
                    @click="submitSchemaUploadSingle"
                    icon="el-icon-upload2">
                  {{ schemaProcessing ? '后台处理中...' : '提交文件' }}
                </el-button>
              </div>
            </el-form>

            <el-divider></el-divider>

            <div class="section-title">
              <span class="icon-wrapper blue"><i class="el-icon-time"></i></span>
              历史版本记录
              <el-button type="text" icon="el-icon-refresh" class="refresh-btn" @click="fetchHistory('schema')">刷新</el-button>
            </div>

            <el-table
                :data="historyData.schema"
                v-loading="loading.history"
                class="custom-table"
                header-cell-class-name="custom-header">
              <el-table-column label="序号" type="index" width="60" align="center"></el-table-column>
              <el-table-column prop="originalName" label="文件名称" min-width="200">
                <template slot-scope="scope">
                  <div class="file-name-cell">
                    <i class="el-icon-document"></i> {{ scope.row.originalName }}
                  </div>
                </template>
              </el-table-column>
              <el-table-column prop="uploadTime" label="上传时间" width="180" align="center"></el-table-column>
              <el-table-column label="操作" width="150" align="center">
                <template slot-scope="scope">
                  <div class="table-operate">
                    <el-tooltip content="下载" placement="top">
                      <div class="opt-btn" @click="handleDownload(scope.row)">
                        <i class="el-icon-download"></i>
                      </div>
                    </el-tooltip>
                    <el-tooltip content="删除" placement="top">
                      <div class="opt-btn delete" @click="handleDelete(scope.row, 'schema')">
                        <i class="el-icon-delete"></i>
                      </div>
                    </el-tooltip>
                  </div>
                </template>
              </el-table-column>
            </el-table>

          </div>
        </el-tab-pane>

        <el-tab-pane label="案例对" name="case">
          <div class="tab-content">

            <div class="section-title">
              <span class="icon-wrapper"><i class="el-icon-document-copy"></i></span>
              上传案例对文件
              <el-tooltip content="上传包含 Question-SQL 对的 Excel 文件" placement="top">
                <i class="el-icon-info info-icon"></i>
              </el-tooltip>
              <div style="flex: 1"></div>
              <el-link type="primary" :underline="false" :href="getTemplateUrl('案例对文件（模板）.xlsx')">
                <i class="el-icon-download"></i> 下载文件模板
              </el-link>
            </div>

            
            <el-form label-position="top" class="sqlbot-form">
              <el-form-item>
                <el-upload
                    class="drag-uploader full-width-uploader"
                    drag
                    action="#"
                    :auto-upload="false"
                    :on-change="(f, l) => handleFileChange(f, l, 'case')"
                    :limit="20"
                    multiple
                    :file-list="fileListCase"
                    :disabled="caseProcessing">
                  <div class="upload-content">
                    <i class="el-icon-upload upload-icon"></i>
                    <div class="el-upload__text">拖拽或 <em>点击上传</em> 案例文件 (Excel)</div>
                  </div>
                  <div class="el-upload__tip center-tip" slot="tip">支持 .xlsx / .xls 格式，<span style="color: #f56c6c">需要上传完整的案例对文件</span></div>
                </el-upload>
              </el-form-item>
              <div class="form-actions">
                <transition name="el-fade-in-linear">
                  <div v-if="caseProcessing" class="submit-timer-box">
                    {{ getTabClock('case') }}
                  </div>
                </transition>
                <el-button
                    type="primary"
                    class="primary-btn"
                    :loading="loading.cases || caseProcessing"
                    :disabled="caseProcessing"
                    @click="submitCaseUpload"
                    icon="el-icon-upload2">
                  {{ caseProcessing ? '后台处理中...' : '提交文件' }}
                </el-button>
              </div>
            </el-form>

            <el-divider></el-divider>

            <div class="section-title">
              <span class="icon-wrapper blue"><i class="el-icon-time"></i></span>
              历史案例集
              <el-button type="text" icon="el-icon-refresh" class="refresh-btn" @click="fetchHistory('case')">刷新</el-button>
            </div>

            <el-table
                :data="historyData.case"
                v-loading="loading.history"
                class="custom-table"
                header-cell-class-name="custom-header">
              <el-table-column label="序号" type="index" width="60" align="center"></el-table-column>
              <el-table-column prop="originalName" label="文件名称" min-width="200">
                <template slot-scope="scope">
                  <div class="file-name-cell">
                    <i class="el-icon-tickets"></i> {{ scope.row.originalName }}
                  </div>
                </template>
              </el-table-column>
              <el-table-column prop="uploadTime" label="上传时间" width="180" align="center"></el-table-column>
              <el-table-column label="操作" width="150" align="center">
                <template slot-scope="scope">
                  <div class="table-operate">
                    <el-tooltip content="下载" placement="top">
                      <div class="opt-btn" @click="handleDownload(scope.row)">
                        <i class="el-icon-download"></i>
                      </div>
                    </el-tooltip>
                    <el-tooltip content="删除" placement="top">
                      <div class="opt-btn delete" @click="handleDelete(scope.row, 'case')">
                        <i class="el-icon-delete"></i>
                      </div>
                    </el-tooltip>
                  </div>
                </template>
              </el-table-column>
            </el-table>

          </div>
        </el-tab-pane>

        <el-tab-pane label="行业术语" name="rule">
          <div class="tab-content">

            <div class="section-title">
              <span class="icon-wrapper"><i class="el-icon-s-operation"></i></span>
              上传行业术语文件
              <el-tooltip content="上传行业术语 Excel 文件" placement="top">
                <i class="el-icon-info info-icon"></i>
              </el-tooltip>
              <div style="flex: 1"></div>
              <el-link type="primary" :underline="false" :href="getTemplateUrl('业务规则表（模板）.xlsx')">
                <i class="el-icon-download"></i> 下载文件模板
              </el-link>
            </div>

            
            <el-form label-position="top" class="sqlbot-form">
              <el-form-item>
                <el-upload
                    class="drag-uploader full-width-uploader"
                    drag
                    action="#"
                    :auto-upload="false"
                    :on-change="(f, l) => handleFileChange(f, l, 'rules')"
                    :limit="20"
                    multiple
                    :file-list="fileListRules"
                    :disabled="ruleProcessing">
                  <div class="upload-content">
                    <i class="el-icon-files upload-icon"></i>
                    <div class="el-upload__text">拖拽或 <em>点击上传</em> 行业术语文件 (Excel)</div>
                  </div>
                  <div class="el-upload__tip center-tip" slot="tip">支持 .xlsx / .xls 格式，<span style="color: #f56c6c">需要上传完整的行业术语文件</span></div>
                </el-upload>
              </el-form-item>
              <div class="form-actions">
                <transition name="el-fade-in-linear">
                  <div v-if="ruleProcessing" class="submit-timer-box">
                    {{ getTabClock('rule') }}
                  </div>
                </transition>
                <el-button
                    type="primary"
                    class="primary-btn"
                    :loading="loading.rules || ruleProcessing"
                    :disabled="ruleProcessing"
                    @click="submitRulesUpload"
                    icon="el-icon-upload2">
                  {{ ruleProcessing ? '后台处理中...' : '提交文件' }}
                </el-button>
              </div>
            </el-form>

            <el-divider></el-divider>

            <div class="section-title">
              <span class="icon-wrapper blue"><i class="el-icon-time"></i></span>
              历史规则库
              <el-button type="text" icon="el-icon-refresh" class="refresh-btn" @click="fetchHistory('rule')">刷新</el-button>
            </div>

            <el-table
                :data="historyData.rule"
                v-loading="loading.history"
                class="custom-table"
                header-cell-class-name="custom-header">
              <el-table-column label="序号" type="index" width="60" align="center"></el-table-column>
              <el-table-column prop="originalName" label="文件名称" min-width="200">
                <template slot-scope="scope">
                  <div class="file-name-cell">
                    <i class="el-icon-reading"></i> {{ scope.row.originalName }}
                  </div>
                </template>
              </el-table-column>
              <el-table-column prop="uploadTime" label="上传时间" width="180" align="center"></el-table-column>
              <el-table-column label="操作" width="150" align="center">
                <template slot-scope="scope">
                  <div class="table-operate">
                    <el-tooltip content="下载" placement="top">
                      <div class="opt-btn" @click="handleDownload(scope.row)">
                        <i class="el-icon-download"></i>
                      </div>
                    </el-tooltip>
                    <el-tooltip content="删除" placement="top">
                      <div class="opt-btn delete" @click="handleDelete(scope.row, 'rule')">
                        <i class="el-icon-delete"></i>
                      </div>
                    </el-tooltip>
                  </div>
                </template>
              </el-table-column>
            </el-table>

          </div>
        </el-tab-pane>

        <el-tab-pane label="部门表" name="mapping">
          <div class="tab-content">

            <div class="section-title">
              <span class="icon-wrapper"><i class="el-icon-connection"></i></span>
              上传部门表映射文件
              <el-tooltip content="上传部门表映射关系的Excel文件" placement="top">
                <i class="el-icon-info info-icon"></i>
              </el-tooltip>
            </div>

            
            <el-form label-position="top" class="sqlbot-form">
              <el-form-item>
                <el-upload
                    class="drag-uploader full-width-uploader"
                    drag
                    action="#"
                    :auto-upload="false"
                    :on-change="(f, l) => handleFileChange(f, l, 'mapping')"
                    :limit="20"
                    multiple
                    :file-list="fileListMapping"
                    :disabled="mappingProcessing">
                  <div class="upload-content">
                    <i class="el-icon-link upload-icon"></i>
                    <div class="el-upload__text">拖拽或 <em>点击上传</em> 部门表映射文件 (Excel)</div>
                  </div>
                  <div class="el-upload__tip center-tip" slot="tip">支持 .xlsx / .xls 格式</div>
                </el-upload>
              </el-form-item>
              <div class="form-actions">
                <transition name="el-fade-in-linear">
                  <div v-if="mappingProcessing" class="submit-timer-box">
                    {{ getTabClock('mapping') }}
                  </div>
                </transition>
                <el-button
                    type="primary"
                    class="primary-btn"
                    :loading="loading.mapping || mappingProcessing"
                    :disabled="mappingProcessing"
                    @click="submitMappingUpload"
                    icon="el-icon-upload2">
                  {{ mappingProcessing ? '后台处理中...' : '提交文件' }}
                </el-button>
              </div>
            </el-form>

            <el-divider></el-divider>

            <div class="section-title">
              <span class="icon-wrapper blue"><i class="el-icon-time"></i></span>
              历史记录
              <el-button type="text" icon="el-icon-refresh" class="refresh-btn" @click="fetchHistory('mapping')">刷新</el-button>
            </div>

            <el-table
                :data="historyData.mapping"
                v-loading="loading.history"
                class="custom-table"
                header-cell-class-name="custom-header">
              <el-table-column label="序号" type="index" width="60" align="center"></el-table-column>
              <el-table-column prop="originalName" label="文件名称" min-width="200">
                <template slot-scope="scope">
                  <div class="file-name-cell">
                    <i class="el-icon-connection"></i> {{ scope.row.originalName }}
                  </div>
                </template>
              </el-table-column>
              <el-table-column prop="uploadTime" label="上传时间" width="180" align="center"></el-table-column>
              <el-table-column label="操作" width="150" align="center">
                <template slot-scope="scope">
                  <div class="table-operate">
                    <el-tooltip content="下载" placement="top">
                      <div class="opt-btn" @click="handleDownload(scope.row)">
                        <i class="el-icon-download"></i>
                      </div>
                    </el-tooltip>
                    <el-tooltip content="删除" placement="top">
                      <div class="opt-btn delete" @click="handleDelete(scope.row, 'mapping')">
                        <i class="el-icon-delete"></i>
                      </div>
                    </el-tooltip>
                  </div>
                </template>
              </el-table-column>
            </el-table>

          </div>
        </el-tab-pane>

      </el-tabs>
    </div>
  </div>
</template>

<script>
import axios from 'axios';

// 1. Base URL 配置
const BASE_URL = process.env.VUE_APP_BASEURL;
const fileApi = axios.create({
  baseURL: BASE_URL,
  timeout: 1200000 // 20分钟超时，防止大文件上传或长任务处理中断
});

// 2. 鉴权 Token
fileApi.interceptors.request.use(config => {
  // ngrok 免费版需要此请求头来绕过警告页面
  config.headers['ngrok-skip-browser-warning'] = 'true';
  const userJson = localStorage.getItem("xm-user");
  if (userJson) {
    const user = JSON.parse(userJson);
    if (user.token) {
      config.headers['token'] = user.token;
    }
  }
  return config;
}, error => Promise.reject(error));

export default {
  name: "FileUpload",
  data() {
    return {
      activeTab: 'schema',
      username: '',

      fileListSingleSchema: [],
      fileListCase: [],
      fileListRules: [],
      fileListMapping: [],

      loading: {
        schema: false,
        cases: false,
        rules: false,
        mapping: false,
        history: false,
        processingSchema: false,
        processingCase: false,
        processingRule: false,
        processingMapping: false
      },

      historyData: {
        schema: [],
        case: [],
        rule: [],
        mapping: []
      },

      // 后台任务对象字典：{ [tabName]: { taskId, startTime, elapsedSeconds } }
      processingTasks: {
        schema: null,
        case: null,
        rule: null,
        mapping: null
      },

      // 计时器和轮询器映射
      clockTimers: {
        schema: null,
        case: null,
        rule: null,
        mapping: null
      },

      pollingTimers: {
        schema: null,
        case: null,
        rule: null,
        mapping: null
      },

      // 类别映射字典（对应后端接口期望的 category 参数值）
      categoryMap: {
        schema: 'SchemaDict',    // 数据字典/模式文件
        case: 'CasePair',        // 案例对
        rule: 'BusinessRule',    // 行业术语/规则
        mapping: 'TableMapping'  // 部门表映射
      }
    };
  },
  computed: {
    schemaProcessing() {
      return !!(this.processingTasks && this.processingTasks.schema);
    },
    caseProcessing() {
      return !!(this.processingTasks && this.processingTasks.case);
    },
    ruleProcessing() {
      return !!(this.processingTasks && this.processingTasks.rule);
    },
    mappingProcessing() {
      return !!(this.processingTasks && this.processingTasks.mapping);
    }
  },
  created() {
    const user = JSON.parse(localStorage.getItem('xm-user') || '{}');
    this.username = user.username || 'admin';

    // 如果从其他页面跳转带了 tab query 参数，切换到指定 tab
    if (this.$route.query && this.$route.query.tab) {
      this.activeTab = this.$route.query.tab;
    }

    this.fetchHistory(this.activeTab);

    // 页面挂载/点回来时，检查是否有正在处理中的任务，按 startTime 精确恢复走时与轮询
    this._resumePendingTasks();
  },
  beforeDestroy() {
    // 切换到其他页面时，清除本页面所有的时钟走时与轮询定时器，确保其他页面绝不显示任何计时器
    this.clearAllTimers();
  },
  methods: {
    getTabClock(tabName) {
      const task = this.processingTasks && this.processingTasks[tabName];
      return task ? this.formatClock(task.elapsedSeconds) : '00:00';
    },
    getTabDuration(tabName) {
      const task = this.processingTasks && this.processingTasks[tabName];
      return task ? this.formatDuration(task.elapsedSeconds) : '0秒';
    },
    formatClock(totalSeconds) {
      if (totalSeconds === undefined || totalSeconds === null || isNaN(totalSeconds)) {
        return '00:00';
      }
      const s = Math.max(0, Math.floor(totalSeconds));
      const hours = Math.floor(s / 3600);
      const minutes = Math.floor((s % 3600) / 60);
      const seconds = s % 60;
      const pad = num => (num < 10 ? '0' + num : '' + num);
      if (hours > 0) {
        return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
      }
      return `${pad(minutes)}:${pad(seconds)}`;
    },
    formatDuration(totalSeconds) {
      if (totalSeconds === undefined || totalSeconds === null || isNaN(totalSeconds)) {
        return '0秒';
      }
      const s = Math.max(0, Math.floor(totalSeconds));
      if (s < 60) {
        return `${s}秒`;
      }
      const minutes = Math.floor(s / 60);
      const remSec = s % 60;
      if (minutes < 60) {
        return remSec > 0 ? `${minutes}分${remSec}秒` : `${minutes}分钟`;
      }
      const hours = Math.floor(minutes / 60);
      const remMin = minutes % 60;
      return `${hours}小时${remMin}分`;
    },
    handleTabClick(tab) {
      this.fetchHistory(tab.name);
    },
    // 获取模板下载 URL
    getTemplateUrl(fileName) {
      // 通过 /files/ 接口获取后端指定 Template 目录下的文件
      // 这里的 baseUrl 已经包含了域名前缀
      const baseUrl = this.$baseUrl.endsWith('/') ? this.$baseUrl : this.$baseUrl + '/';
      return baseUrl + 'files/Template/' + encodeURIComponent(fileName);
    },

    // 文件校验
    handleFileChange(file, fileList, type) {
      const allowedExts = ['xlsx', 'xls'];
      let label = '';

      switch (type) {
        case 'singleSchema':
          label = '数据模型文件';
          this.fileListSingleSchema = fileList;
          break;
        case 'case':
          label = '案例文件';
          this.fileListCase = fileList;
          break;
        case 'rules':
          label = '规则文件';
          this.fileListRules = fileList;
          break;
        case 'mapping':
          label = '部门表映射文件';
          this.fileListMapping = fileList;
          break;
      }

      const fileName = file.name;
      const ext = fileName.substring(fileName.lastIndexOf('.') + 1).toLowerCase();

      if (!allowedExts.includes(ext)) {
        this.$message({ type: 'error', message: `${label}格式错误，仅支持: ${allowedExts.join(', ')}`, duration: 8000, showClose: true });
        if (type === 'singleSchema') this.fileListSingleSchema = [];
        if (type === 'case') this.fileListCase = [];
        if (type === 'rules') this.fileListRules = [];
        if (type === 'mapping') this.fileListMapping = [];
      }
    },

    // 历史记录查询
    fetchHistory(tabName) {
      this.loading.history = true;
      const category = this.categoryMap[tabName];
      if (!category) return;

      fileApi.get('/files/history', {
        params: {
          category: category,
          username: this.username
        }
      }).then(res => {
        if (res.data.code === '200') {
          this.historyData[tabName] = res.data.data || [];
        } else {
          this.$message({ type: 'error', message: '获取历史记录失败: ' + res.data.msg, duration: 8000, showClose: true });
        }
      }).catch(err => {
        console.error(err);
      }).finally(() => {
        this.loading.history = false;
      });
    },

    // 文件下载
    handleDownload(row) {
      if (!row.fileName) {
        this.$message.warning('文件名无效');
        return;
      }
      this.$message.info('正在请求下载...');
      fileApi.get(`/files/${row.fileName}`, {
        responseType: 'blob'
      }).then(res => {
        // 如果返回的是JSON格式（通常是错误信息），则尝试解析
        if (res.data.type === 'application/json') {
          const reader = new FileReader();
          reader.onload = () => {
            try {
              const result = JSON.parse(reader.result);
              this.$message({ type: 'error', message: result.message || '下载失败，文件可能不存在', duration: 8000, showClose: true });
            } catch (e) {
              this.$message({ type: 'error', message: '下载失败，无法解析错误信息', duration: 8000, showClose: true });
            }
          };
          reader.readAsText(res.data);
          return;
        }

        const url = window.URL.createObjectURL(new Blob([res.data]));
        const link = document.createElement('a');
        link.href = url;
        // 优先使用 originalName，如果没有则使用 fileName
        let fileName = row.originalName || row.fileName;
        
        // 尝试从 Content-Disposition 获取文件名
        const contentDisposition = res.headers['content-disposition'];
        if (contentDisposition) {
          const match = contentDisposition.match(/filename\*=UTF-8''(.+)/) || contentDisposition.match(/filename="?([^";]+)"?/);
          if (match) {
            fileName = decodeURIComponent(match[1]);
          }
        }
        
        link.setAttribute('download', fileName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }).catch(err => {
        console.error(err);
        if (err.response && err.response.status === 404) {
          this.$message({ type: 'error', message: '下载失败：文件不存在', duration: 8000, showClose: true });
        } else {
          this.$message({ type: 'error', message: '下载失败：网络错误或服务器异常', duration: 8000, showClose: true });
        }
      });
    },

    // 文件删除
    handleDelete(row, tabName) {
      this.$confirm(`确定要删除文件 "${row.originalName}" 吗?`, '提示', {
        type: 'warning'
      }).then(() => {
        fileApi.delete(`/files/delete/name/${row.fileName}`)
            .then(res => {
              if (res.data.code === '200') {
                this.$message.success('删除成功');
                this.fetchHistory(tabName);
              } else {
                this.$message({ type: 'error', message: res.data.msg || '删除失败', duration: 8000, showClose: true });
              }
            })
            .catch(err => {
              this.$message({ type: 'error', message: '删除请求异常', duration: 8000, showClose: true });
            });
      }).catch(() => {});
    },

    // --- 持久化辅助方法 ---
    _savePendingTask(tabName, taskData) {
      const key = 'xm-pending-tasks-v2';
      try {
        const tasks = JSON.parse(localStorage.getItem(key) || '{}');
        tasks[tabName] = taskData;
        localStorage.setItem(key, JSON.stringify(tasks));
      } catch (e) {
        console.error('[FileUpload] 保存持久化任务失败:', e);
      }
    },

    _clearPendingTask(tabName) {
      const key = 'xm-pending-tasks-v2';
      try {
        const tasks = JSON.parse(localStorage.getItem(key) || '{}');
        delete tasks[tabName];
        localStorage.setItem(key, JSON.stringify(tasks));
      } catch (e) {
        console.error('[FileUpload] 清除持久化任务失败:', e);
      }
    },

    // 页面挂载/点回来时，检查是否有未完成的后台任务需要恢复
    _resumePendingTasks() {
      try { localStorage.removeItem('xm-pending-tasks'); } catch (e) {}

      const key = 'xm-pending-tasks-v2';
      let tasks = {};
      try {
        tasks = JSON.parse(localStorage.getItem(key) || '{}');
      } catch (e) {
        tasks = {};
      }

      let hasRunningTask = false;
      let firstRunningTab = null;

      Object.keys(tasks).forEach(tabName => {
        const item = tasks[tabName];
        if (!item) return;

        const taskId = typeof item === 'object' ? item.taskId : item;
        const startTime = typeof item === 'object' && item.startTime ? item.startTime : Date.now();

        // 避免历史异常僵尸任务：超过 4 小时的任务视为过期丢弃
        if (Date.now() - startTime > 4 * 3600 * 1000) {
          this._clearPendingTask(tabName);
          return;
        }

        if (taskId) {
          hasRunningTask = true;
          if (!firstRunningTab) firstRunningTab = tabName;
          const elapsed = Math.max(0, Math.floor((Date.now() - startTime) / 1000));
          console.log(`[FileUpload] 精确恢复「${tabName}」处理任务: taskId=${taskId}, 已耗时=${elapsed}秒`);
          this.startTaskTracker(taskId, tabName, startTime);
        }
      });

      // 友好联动：如果当前处于的 tab 没有运行中任务，而其它 tab 正在处理中，且无指定 query，则自动切到进行中 tab
      if (hasRunningTask && firstRunningTab && !tasks[this.activeTab] && (!this.$route.query || !this.$route.query.tab)) {
        this.activeTab = firstRunningTab;
        this.fetchHistory(firstRunningTab);
      }
    },

    _getTabLabel(tabName) {
      const labelMap = {
        schema: '数据模式',
        case: '案例对',
        rule: '行业术语',
        mapping: '部门表'
      };
      return labelMap[tabName] || tabName;
    },

    // --- 核心逻辑：异步任务跟踪与状态轮询 ---
    pollTaskStatus(taskId, tabName) {
      if (!taskId) return;
      this.startTaskTracker(taskId, tabName);
    },

    startTaskTracker(taskId, tabName, existingStartTime = null) {
      if (!taskId || !tabName) return;

      const startTime = existingStartTime || Date.now();
      const initialElapsed = Math.max(0, Math.floor((Date.now() - startTime) / 1000));

      // 1. 设置当前响应式任务数据
      this.$set(this.processingTasks, tabName, {
        taskId,
        startTime,
        elapsedSeconds: initialElapsed
      });

      // 2. 本地持久化保存，存储精确的时间戳
      this._savePendingTask(tabName, { taskId, startTime });

      // 3. 清除该 tab 上已有的定时器
      this.clearTimerForTab(tabName);

      // 4. 启动实时秒表计时器 (基于 Date.now() - startTime 计算，切换页面再切回绝对精确，永不掉速)
      this.clockTimers[tabName] = setInterval(() => {
        if (this.processingTasks[tabName]) {
          const currentElapsed = Math.max(0, Math.floor((Date.now() - this.processingTasks[tabName].startTime) / 1000));
          this.$set(this.processingTasks[tabName], 'elapsedSeconds', currentElapsed);
        }
      }, 1000);

      // 5. 启动后端任务状态轮询
      let errorCount = 0;
      let isCompleted = false;

      const checkStatus = () => {
        if (isCompleted || !this.processingTasks[tabName]) return;

        fileApi.get(`/files/task/status/${taskId}`)
          .then(res => {
            errorCount = 0;
            const data = res.data && res.data.data;
            if (!data) return;

            const status = (data.status || '').toLowerCase();
            if ((status === 'completed' || status === 'success') && !isCompleted) {
              isCompleted = true;
              const finalElapsed = this.processingTasks[tabName] ? this.processingTasks[tabName].elapsedSeconds : 0;
              let costText = this.formatDuration(finalElapsed);
              if (data.duration && typeof data.duration === 'number') {
                costText = this.formatDuration(data.duration);
              } else if (data.costTime && typeof data.costTime === 'number') {
                costText = this.formatDuration(Math.floor(data.costTime / 1000));
              } else if (data.result && typeof data.result.duration === 'number') {
                costText = this.formatDuration(data.result.duration);
              }
              this.finishTask(tabName, true, `「${this._getTabLabel(tabName)}」文件处理成功！耗时 ${costText}`);
            } else if (status === 'failed' || status === 'failure') {
              isCompleted = true;
              const errorMsg = data.result ? data.result.error : (data.msg || '未知错误');
              this.finishTask(tabName, false, `「${this._getTabLabel(tabName)}」文件处理失败: ${errorMsg}`);
            }
          })
          .catch(err => {
            console.error(`[FileUpload] 轮询任务 ${taskId} 异常:`, err);
            errorCount++;
            if (errorCount > 30) {
              isCompleted = true;
              this.finishTask(tabName, false, `「${this._getTabLabel(tabName)}」状态查询超时，请稍后刷新列表查看。`);
            }
          });
      };

      // 立即查询一次状态
      checkStatus();
      // 随后每 1.5 秒轮询一次
      this.pollingTimers[tabName] = setInterval(checkStatus, 1500);
    },

    finishTask(tabName, isSuccess, message) {
      // 清除定时器
      this.clearTimerForTab(tabName);
      // 清除持久化记录
      this._clearPendingTask(tabName);
      // 移除处理中状态，小计时器自动消失
      this.$set(this.processingTasks, tabName, null);

      if (isSuccess) {
        this.$message.success(message);
        // 自动刷新历史列表
        this.fetchHistory(tabName);
      } else {
        this.$message.error(message);
      }
    },

    clearTimerForTab(tabName) {
      if (this.clockTimers[tabName]) {
        clearInterval(this.clockTimers[tabName]);
        this.clockTimers[tabName] = null;
      }
      if (this.pollingTimers[tabName]) {
        clearInterval(this.pollingTimers[tabName]);
        this.pollingTimers[tabName] = null;
      }
    },

    clearAllTimers() {
      Object.keys(this.clockTimers).forEach(tab => {
        if (this.clockTimers[tab]) {
          clearInterval(this.clockTimers[tab]);
          this.clockTimers[tab] = null;
        }
      });
      Object.keys(this.pollingTimers).forEach(tab => {
        if (this.pollingTimers[tab]) {
          clearInterval(this.pollingTimers[tab]);
          this.pollingTimers[tab] = null;
        }
      });
    },

    // 上传 - 模式与字典 (Schema)
    submitSchemaUploadSingle() {
      if (this.fileListSingleSchema.length === 0) {
        this.$message.warning('请选择要上传的文件');
        return;
      }
      this.loading.schema = true;
      const formData = new FormData();
      this.fileListSingleSchema.forEach(file => {
        formData.append('files', file.raw);
      });
      formData.append('username', this.username);

      fileApi.post('/files/upload/schema-dict', formData)
          .then(res => {
            this.loading.schema = false;
            if (res.data.code === '200') {
              this.$message.info('文件上传成功，正在后台处理...');
              this.fileListSingleSchema = [];
              // 启动轮询
              const taskId = res.data.data && (res.data.data.taskId || res.data.data.id);
              if (taskId) {
                this.pollTaskStatus(taskId, 'schema');
              } else {
                this.$message.warning('文件已上传，但未获取到任务ID，请手动刷新列表查看处理结果');
                this.fetchHistory('schema');
              }
            } else {
              this.$message({ type: 'error', message: res.data.msg || '上传失败', duration: 8000, showClose: true });
            }
          })
          .catch(err => {
            this.loading.schema = false;
            this.$message({ type: 'error', message: '上传请求异常: ' + err.message, duration: 8000, showClose: true });
          });
    },

    // 上传 - 案例对 (Case)
    submitCaseUpload() {
      if (this.fileListCase.length === 0) {
        this.$message.warning('请选择案例文件');
        return;
      }
      this.loading.cases = true;
      const formData = new FormData();
      this.fileListCase.forEach(file => {
        formData.append('files', file.raw);
      });
      formData.append('username', this.username);

      fileApi.post('/files/upload/case', formData)
          .then(res => {
            this.loading.cases = false;
            if (res.data.code === '200') {
              this.$message.info('文件上传成功，正在后台处理...');
              this.fileListCase = [];
              // 启动轮询
              const taskId = res.data.data && (res.data.data.taskId || res.data.data.id);
              if (taskId) {
                this.pollTaskStatus(taskId, 'case');
              } else {
                console.error('[FileUpload] 上传成功但未返回 taskId，完整响应:', JSON.stringify(res.data));
                this.$message.warning('文件已上传，但未获取到任务ID，请手动刷新列表查看处理结果');
                this.fetchHistory('case');
              }
            } else {
              console.error('[FileUpload] 上传返回非200，完整响应:', JSON.stringify(res.data));
              this.$message({ type: 'error', message: res.data.msg || res.data.message || '上传失败', duration: 8000, showClose: true });
            }
          })
          .catch(err => {
            this.loading.cases = false;
            console.error('[FileUpload] 案例对上传失败，完整错误:', err);
            console.error('[FileUpload] err.response:', err.response);
            // 兼容多种错误格式
            let errorDetail = '';
            if (err.response && err.response.data) {
              const d = err.response.data;
              errorDetail = d.msg || d.message || d.error || (typeof d === 'string' ? d : JSON.stringify(d));
            } else if (err.message) {
              errorDetail = err.message;
            } else if (typeof err === 'string') {
              errorDetail = err;
            } else {
              errorDetail = '请按F12打开控制台查看详细错误';
            }
            this.$message({ type: 'error', message: '上传请求异常: ' + errorDetail, duration: 8000, showClose: true });
          });
    },

    // 上传 - 规则 (Rules)
    submitRulesUpload() {
      if (this.fileListRules.length === 0) {
        this.$message.warning('请选择规则文件');
        return;
      }
      this.loading.rules = true;
      const formData = new FormData();
      this.fileListRules.forEach(file => {
        formData.append('files', file.raw);
      });
      formData.append('username', this.username);

      fileApi.post('/files/upload/rule', formData)
          .then(res => {
            this.loading.rules = false;
            if (res.data.code === '200') {
              this.$message.info('文件上传成功，正在后台处理...');
              this.fileListRules = [];
              // 启动轮询
              const taskId = res.data.data && (res.data.data.taskId || res.data.data.id);
              if (taskId) {
                this.pollTaskStatus(taskId, 'rule');
              } else {
                this.$message.warning('文件已上传，但未获取到任务ID，请手动刷新列表查看处理结果');
                this.fetchHistory('rule');
              }
            } else {
              this.$message({ type: 'error', message: res.data.msg || '上传失败', duration: 8000, showClose: true });
            }
          })
          .catch(err => {
            this.loading.rules = false;
            this.$message({ type: 'error', message: '上传请求异常: ' + err.message, duration: 8000, showClose: true });
          });
    },

    // 上传 - 部门表映射 (Mapping)
    submitMappingUpload() {
      if (this.fileListMapping.length === 0) {
        this.$message.warning('请选择部门表映射文件');
        return;
      }
      this.loading.mapping = true;
      const formData = new FormData();
      this.fileListMapping.forEach(file => {
        formData.append('files', file.raw);
      });
      formData.append('username', this.username);

      fileApi.post('/files/upload/table-mapping', formData)
          .then(res => {
            this.loading.mapping = false;
            if (res.data.code === '200') {
              this.$message.info('文件上传成功，正在后台处理...');
              this.fileListMapping = [];
              // 启动轮询
              const taskId = res.data.data && (res.data.data.taskId || res.data.data.id);
              if (taskId) {
                this.pollTaskStatus(taskId, 'mapping');
              } else {
                this.$message.warning('文件已上传，但未获取到任务ID，请手动刷新列表查看处理结果');
                this.fetchHistory('mapping');
              }
            } else {
              this.$message({ type: 'error', message: res.data.msg || '上传失败', duration: 8000, showClose: true });
            }
          })
          .catch(err => {
            this.loading.mapping = false;
            this.$message({ type: 'error', message: '上传请求异常: ' + err.message, duration: 8000, showClose: true });
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
  --border-color: #c0c4cc;
}

.sqlbot-container {
  padding: 12px; /* 优化：从 20px 减少到 12px */
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
  padding: 20px; /* 优化：从 30px 减少到 20px */
  flex: 1;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--border-color);
}

.page-header {
  margin-bottom: 25px;
  padding-bottom: 15px;
  border-bottom: 1px solid #dcdfe6;
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

::v-deep .custom-tabs .el-tabs__header { margin-bottom: 30px; }
::v-deep .custom-tabs .el-tabs__item { font-size: 15px; font-weight: 500; color: #606266; }
::v-deep .custom-tabs .el-tabs__item.is-active { color: #1890ff; font-weight: 600; }
::v-deep .custom-tabs .el-tabs__active-bar { background-color: #1890ff; height: 3px; }

.tab-content { /* max-width removed */ }

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #2d2e31;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 8px;
  position: relative;
}
.refresh-btn {
  margin-left: auto;
  color: #1890ff;
  font-weight: normal;
  font-size: 14px;
}
.refresh-btn:hover { color: #0050B3; }

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
.icon-wrapper.blue { background: #e6f7ff; color: #1890ff; }
.info-icon { color: #999; font-size: 14px; margin-left: 4px; cursor: pointer; font-weight: normal; }

/* 上传组件 */
::v-deep .drag-uploader .el-upload { width: 100%; }
::v-deep .drag-uploader .el-upload-dragger {
  width: 100%;
  height: 160px;
  border: 1px dashed #999;
  background-color: #fafafa;
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  transition: all 0.3s;
  overflow: hidden; /* 防止内容溢出 */
}

/* 确保全宽上传 */
.full-width-uploader {
  width: 100%;
  display: block;
}

::v-deep .drag-uploader .el-upload-dragger:hover {
  border-color: #1890ff;
  background-color: rgba(24, 144, 255, 0.02);
}

.upload-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.upload-icon {
  font-size: 40px;
  color: #c0c4cc;
  margin-bottom: 15px;
  transition: color 0.3s;
  display: block;
}
::v-deep .drag-uploader .el-upload-dragger:hover .upload-icon { color: #1890ff; }

::v-deep .el-upload__text {
  font-size: 14px;
  color: #606266;
  line-height: 1.5;
}
::v-deep .el-upload__text em { color: #1890ff; font-weight: 600; font-style: normal; }

.center-tip {
  text-align: center;
  margin-top: 10px;
  color: #909399;
}

/* 按钮区域与内嵌小计时器 */
.form-actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 12px;
  margin-top: 14px;
  margin-bottom: 10px;
}

.submit-timer-box {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 42px;
  padding: 0 16px;
  background: #f0f7ff;
  border: 1px solid #bae0ff;
  border-radius: 8px;
  box-shadow: 0 2px 6px rgba(24, 144, 255, 0.08);
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  font-size: 15px;
  font-weight: 700;
  color: #096dd9;
  letter-spacing: 0.8px;
  user-select: none;
  box-sizing: border-box;
}

.primary-btn {
  background: linear-gradient(135deg, #1890ff 0%, #096dd9 100%);
  border: none;
  padding: 12px 32px;
  font-size: 15px;
  font-weight: 500;
  border-radius: 8px;
  box-shadow: 0 4px 10px rgba(24, 144, 255, 0.3);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  letter-spacing: 0.5px;
  font-family: inherit; /* 强制继承字体，统一风格 */
}
.primary-btn:hover {
  background: linear-gradient(135deg, #40a9ff 0%, #096dd9 100%);
  box-shadow: 0 6px 16px rgba(24, 144, 255, 0.4);
  transform: translateY(-1px);
}
.primary-btn:active {
  transform: translateY(0);
  box-shadow: 0 2px 6px rgba(24, 144, 255, 0.2);
}

/* 表格样式 */
/* 表格样式 */
.custom-table {
  width: 100%;
  margin-top: 20px;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03); /* 轻微阴影提升层次感 */
  border: 1px solid #eef0f5;
}

::v-deep .custom-table td {
  padding: 12px 0;
  border-bottom: 1px solid #f0f2f5 !important;
  transition: background-color 0.2s;
}

::v-deep .custom-table th.is-leaf {
  border-bottom: 1px solid #eef0f5 !important;
  background-color: #f8f9fb !important;
  padding: 12px 0;
}

::v-deep .custom-header {
  background-color: #f8f9fb !important;
  color: #5d636e; /* 更高级的深灰色 */
  font-weight: 600;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

::v-deep .el-table--enable-row-hover .el-table__body tr:hover > td {
  background-color: #f5f8ff !important; /* 主题色系的浅蓝悬浮 */
}

.file-name-cell {
  font-weight: 500;
  color: #1f2329;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
}
.file-name-cell i {
  color: #1890ff;
  font-size: 16px;
}

/* 操作按钮 */
.table-operate { display: flex; justify-content: center; gap: 8px; }
.opt-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #5f6368;
  cursor: pointer;
  background-color: #f1f3f4;
  transition: all 0.2s;
  font-size: 16px;
  border: 1px solid #dcdfe6;
}
.opt-btn:hover { background-color: #e6f7ff; color: #1890ff; border-color: #1890ff; }
.opt-btn.delete:hover { background-color: #fff1f0; color: #ff4d4f; border-color: #ff4d4f; }
</style>
