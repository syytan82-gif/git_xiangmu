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
                    :disabled="loading.processingSchema">
                  <div class="upload-content">
                    <i class="el-icon-folder-opened upload-icon"></i>
                    <div class="el-upload__text">拖拽或 <em>点击上传</em> 模式与字典合并文件 (Excel)</div>
                  </div>
                  <div class="el-upload__tip center-tip" slot="tip">支持 .xlsx / .xls 格式，<span style="color: #f56c6c">需要上传完整的数据字典与模式文件</span></div>
                </el-upload>
              </el-form-item>
              <div class="form-actions">
                <el-button
                    type="primary"
                    class="primary-btn"
                    :loading="loading.schema || loading.processingSchema"
                    @click="submitSchemaUploadSingle"
                    icon="el-icon-upload2">
                  {{ loading.processingSchema ? '后台处理中...' : '提交文件' }}
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
                    :disabled="loading.processingCase">
                  <div class="upload-content">
                    <i class="el-icon-upload upload-icon"></i>
                    <div class="el-upload__text">拖拽或 <em>点击上传</em> 案例文件 (Excel)</div>
                  </div>
                  <div class="el-upload__tip center-tip" slot="tip">支持 .xlsx / .xls 格式，<span style="color: #f56c6c">需要上传完整的案例对文件</span></div>
                </el-upload>
              </el-form-item>
              <div class="form-actions">
                <el-button
                    type="primary"
                    class="primary-btn"
                    :loading="loading.cases || loading.processingCase"
                    @click="submitCaseUpload"
                    icon="el-icon-upload2">
                  {{ loading.processingCase ? '后台处理中...' : '提交文件' }}
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
                    :disabled="loading.processingRule">
                  <div class="upload-content">
                    <i class="el-icon-files upload-icon"></i>
                    <div class="el-upload__text">拖拽或 <em>点击上传</em> 行业术语文件 (Excel)</div>
                  </div>
                  <div class="el-upload__tip center-tip" slot="tip">支持 .xlsx / .xls 格式，<span style="color: #f56c6c">需要上传完整的行业术语文件</span></div>
                </el-upload>
              </el-form-item>
              <div class="form-actions">
                <el-button
                    type="primary"
                    class="primary-btn"
                    :loading="loading.rules || loading.processingRule"
                    @click="submitRulesUpload"
                    icon="el-icon-upload2">
                  {{ loading.processingRule ? '后台处理中...' : '提交文件' }}
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
                    :disabled="loading.processingMapping">
                  <div class="upload-content">
                    <i class="el-icon-link upload-icon"></i>
                    <div class="el-upload__text">拖拽或 <em>点击上传</em> 部门表映射文件 (Excel)</div>
                  </div>
                  <div class="el-upload__tip center-tip" slot="tip">支持 .xlsx / .xls 格式</div>
                </el-upload>
              </el-form-item>
              <div class="form-actions">
                <el-button
                    type="primary"
                    class="primary-btn"
                    :loading="loading.mapping || loading.processingMapping"
                    @click="submitMappingUpload"
                    icon="el-icon-upload2">
                  {{ loading.processingMapping ? '后台处理中...' : '提交文件' }}
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

      // 类别映射字典（对应后端接口期望的 category 参数值）
      categoryMap: {
        schema: 'SchemaDict',    // 数据字典/模式文件
        case: 'CasePair',        // 案例对
        rule: 'BusinessRule',    // 行业术语/规则
        mapping: 'TableMapping'  // 部门表映射
      },

      // 轮询定时器映射
      pollingTimers: {
        schema: null,
        case: null,
        rule: null,
        mapping: null
      }
    };
  },
  created() {
    const user = JSON.parse(localStorage.getItem('xm-user') || '{}');
    this.username = user.username || 'admin';
    this.fetchHistory(this.activeTab);
  },
  beforeDestroy() {
    // 清除所有定时器
    Object.keys(this.pollingTimers).forEach(key => {
      if (this.pollingTimers[key]) {
        clearInterval(this.pollingTimers[key]);
      }
    });
  },
  methods: {
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
        this.$message.error(`${label}格式错误，仅支持: ${allowedExts.join(', ')}`);
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
          this.$message.error('获取历史记录失败: ' + res.data.msg);
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
              this.$message.error(result.message || '下载失败，文件可能不存在');
            } catch (e) {
              this.$message.error('下载失败，无法解析错误信息');
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
          this.$message.error('下载失败：文件不存在');
        } else {
          this.$message.error('下载失败：网络错误或服务器异常');
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
                this.$message.error(res.data.msg || '删除失败');
              }
            })
            .catch(err => {
              this.$message.error('删除请求异常');
            });
      }).catch(() => {});
    },

    // --- 核心逻辑：异步任务状态轮询 ---
    pollTaskStatus(taskId, tabName) {
      // 映射 tabName 到 loading 状态的 key
      const loadingKeyMap = {
        'schema': 'processingSchema',
        'case': 'processingCase',
        'rule': 'processingRule',
        'mapping': 'processingMapping'
      };
      const loadingKey = loadingKeyMap[tabName];
      if (!loadingKey) return;

      // 清除该 tab 之前的定时器
      if (this.pollingTimers[tabName]) {
        clearInterval(this.pollingTimers[tabName]);
        this.pollingTimers[tabName] = null;
      }
      
      this.loading[loadingKey] = true;
      let isCompleted = false;
      let errorCount = 0; // 连续错误计数

      // 为该 tab 启动独立的定时器
      this.pollingTimers[tabName] = setInterval(() => {
        if (isCompleted) {
          clearInterval(this.pollingTimers[tabName]);
          this.pollingTimers[tabName] = null;
          return;
        }
        
        fileApi.get(`/files/task/status/${taskId}`)
            .then(res => {
              errorCount = 0; // 请求成功，重置错误计数
              const data = res.data.data;
              if (!data) return;

              // status == "completed" or "success" 表示成功
              if ((data.status === 'completed' || data.status === 'success') && !isCompleted) {
                isCompleted = true; // 标记为已完成
                clearInterval(this.pollingTimers[tabName]);
                this.pollingTimers[tabName] = null;
                this.loading[loadingKey] = false;
                this.$message.success('文件处理成功！');
                this.fetchHistory(tabName); // 刷新列表
              }
              // status == "failed" 表示失败
              else if (data.status === 'failed' || data.status === 'failure') {
                isCompleted = true;
                clearInterval(this.pollingTimers[tabName]);
                this.pollingTimers[tabName] = null;
                this.loading[loadingKey] = false;
                const errorMsg = data.result ? data.result.error : '未知错误';
                this.$message.error(`文件处理失败: ${errorMsg}`);
              }
              // status == "processing" -> 继续轮询
              else {
                console.log(`Task ${taskId} is processing...`);
              }
            })
            .catch(err => {
              console.error('轮询出错:', err);
              errorCount++;
              // 允许连续失败 20 次 (约 30 秒)，防止由于网络抖动或服务端繁忙导致的短暂超时
              if (errorCount > 20) {
                isCompleted = true;
                clearInterval(this.pollingTimers[tabName]);
                this.pollingTimers[tabName] = null;
                this.loading[loadingKey] = false;
                this.$message.error('状态查询超时或失败次数过多，后台任务可能仍在进行，请稍后刷新列表查看结果。');
              }
            });
      }, 1500);
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
              const taskId = res.data.data.taskId;
              this.pollTaskStatus(taskId, 'schema');
            } else {
              this.$message.error(res.data.msg || '上传失败');
            }
          })
          .catch(err => {
            this.loading.schema = false;
            this.$message.error('上传请求异常: ' + err.message);
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
              const taskId = res.data.data.taskId;
              this.pollTaskStatus(taskId, 'case');
            } else {
              this.$message.error(res.data.msg || '上传失败');
            }
          })
          .catch(err => {
            this.loading.cases = false;
            this.$message.error('上传请求异常: ' + err.message);
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
              const taskId = res.data.data.taskId;
              this.pollTaskStatus(taskId, 'rule');
            } else {
              this.$message.error(res.data.msg || '上传失败');
            }
          })
          .catch(err => {
            this.loading.rules = false;
            this.$message.error('上传请求异常: ' + err.message);
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
              const taskId = res.data.data.taskId;
              this.pollTaskStatus(taskId, 'mapping');
            } else {
              this.$message.error(res.data.msg || '上传失败');
            }
          })
          .catch(err => {
            this.loading.mapping = false;
            this.$message.error('上传请求异常: ' + err.message);
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

/* 按钮右对齐 */
.form-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 10px;
  margin-bottom: 10px;
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
.opt-btn.delete:hover { background-color: #fff1f0; color: #ff4d4f; border-color: #ff4d4f; }</style>