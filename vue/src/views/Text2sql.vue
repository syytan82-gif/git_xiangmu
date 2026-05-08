<template>
  <div class="sql-chat-container">

    <div class="chat-sidebar" :class="{ 'collapsed': !isSidebarOpen }">
      <!-- 侧边栏内容容器 -->
      <div class="sidebar-content-wrapper">
        <div class="sidebar-header">
          <div class="new-chat-btn" @click="createNewChat">
            <i class="el-icon-plus"></i>
            <span>开启新对话</span>
          </div>
        </div>

        <div class="history-area">
          <div class="section-label">历史记录</div>
          <div class="history-list">
            <div
                v-for="chat in userHistory"
                :key="chat.id"
                class="history-item"
                :class="{ active: chat.id === currentChatId }"
                @click="switchChat(chat.id)"
            >
              <i class="el-icon-chat-dot-square item-icon"></i>
              <span class="chat-title" :title="chat.title">{{ chat.title || '未命名会话' }}</span>
              <el-popover
                  placement="bottom"
                  trigger="click"
                  popper-class="chat-history-popover"
                  :visible-arrow="false"
              >
                <div class="history-actions">
                  <div class="action-item" @click="renameChat(chat)">
                    <i class="el-icon-edit"></i> 重命名
                  </div>
                  <div class="action-item delete" @click="deleteChat(chat.id)">
                    <i class="el-icon-delete"></i> 删除
                  </div>
                </div>
                <span slot="reference" class="more-btn" @click.stop>
                  <i class="el-icon-more"></i>
                </span>
              </el-popover>
            </div>
          </div>
        </div>
      </div>

      <!-- 侧边栏收缩按钮 -->
      <div class="sidebar-toggle-btn" @click="isSidebarOpen = !isSidebarOpen" :title="isSidebarOpen ? '收起侧边栏' : '展开侧边栏'">
        <i :class="isSidebarOpen ? 'el-icon-arrow-left' : 'el-icon-arrow-right'"></i>
      </div>
    </div>

    <div class="chat-main">

      <!-- 数据源选择下拉框 - 顶部Banner -->
      <div class="current-ds-banner">
        <div class="ds-left">
          <span class="ds-label">当前数据源：</span>
          <el-select
              v-model="selectedDatasourceId"
              placeholder="请选择数据源"
              size="small"
              class="ds-select"
              @change="handleDatasourceChange"
              :loading="datasourceLoading"
          >
            <el-option
                v-for="ds in datasourceList"
                :key="ds.id"
                :label="ds.name"
                :value="ds.id"
            >
              <span class="ds-option">
                <el-tag size="mini" :type="getDbTypeTag(ds.dbType)" class="ds-option-tag">{{ ds.dbType }}</el-tag>
                <span class="ds-option-name">{{ ds.name }}</span>
              </span>
            </el-option>
          </el-select>
          <!-- 数据源为空时显示重新加载按钮 -->
          <el-tooltip v-if="!datasourceLoading && datasourceList.length === 0" content="重新加载数据源" placement="top">
            <el-button
                size="mini"
                type="warning"
                plain
                icon="el-icon-refresh"
                style="margin-left: 8px;"
                @click="loadDatasourceList"
            >重新加载</el-button>
          </el-tooltip>
        </div>
      </div>

      <div class="chat-interface-wrapper">

        <div class="messages-container" ref="scrollRef" v-loading="historyLoading" element-loading-text="加载历史记录中...">
          <div v-if="currentMessages.length === 0 && !loading" class="empty-state">
            <div class="empty-icon">
              <img src="@/assets/imgs/RAG.png" alt="Logo">
            </div>
            <h2 class="empty-title">智能数据查询</h2>
            <p class="empty-desc">
              {{ currentDatasource ? `基于 [${currentDatasource.name}] 数据库` : '基于您的业务数据库' }}，通过自然语言查询数据。
            </p>

          </div>

          <div class="message-list">
            <div
                v-for="(msg, index) in currentMessages"
                :key="index"
                class="message-row"
                :class="{ 'row-user': msg.role === 0, 'row-assistant': msg.role === 1 }"
            >
              <div v-if="msg.role === 1" class="avatar-col">
                <div class="avatar assistant-avatar">
                  <img src="@/assets/imgs/RAG.png" alt="AI">
                </div>
              </div>

              <div class="content-col">
                <div class="message-bubble">
                  <!-- AI消息：如果有SQL则显示自定义折叠组件 -->
                  <div v-if="msg.role === 1 && msg.generatedSql" class="sql-response">

                    <!-- SQL 执行错误提示（显示在 SQL 块上方） -->
                    <div v-if="msg.sqlError" class="sql-exec-error">
                      <div class="sql-error-header">
                        <i class="el-icon-circle-close"></i>
                        <span>SQL 执行失败</span>
                      </div>
                      <div class="sql-error-body">{{ msg.sqlError }}</div>
                      <div class="sql-error-tip">请检查生成的 SQL 是否符合目标数据库语法，或尝试重新提问。</div>
                    </div>

                    <!-- 空结果提示词（显示在 SQL 块上方，仅执行成功但无数据时展示） -->
                    <div v-if="!msg.sqlError && msg.chartData && msg.chartData.data && msg.chartData.data.length === 0" class="empty-result-hint">
                      <div class="empty-hint-main"><i class="el-icon-warning-outline"></i> 【提示】 SQL生成并执行，但数据库中无数据。</div>
                      <div class="empty-hint-sub">请检查查询条件（如时间范围）是否有误，数据库中是否确实不存在符合条件的数据，或者是您的提问方式不当导致生成了预期之外的SQL。</div>
                    </div>

                    <!-- SQL 代码块容器 -->
                    <div class="code-block-wrapper">
                      <!-- 代码块顶部栏 -->
                      <div class="code-header">
                        <span class="lang-tag">sql</span>
                        <div class="header-actions">
                          <span class="copy-btn" @click="copyContent(msg.generatedSql)" title="复制 SQL">
                            <i class="el-icon-document-copy"></i>
                          </span>
                          <span class="collapse-btn" @click="toggleSqlCollapse(index)" :title="collapsedSqlMap[index] === false ? '收起 SQL' : '展开 SQL'">
                            <i :class="collapsedSqlMap[index] === false ? 'el-icon-arrow-up' : 'el-icon-arrow-down'"></i>
                          </span>
                        </div>
                      </div>
                      <!-- SQL 代码区域（带折叠动画），默认折叠 -->
                      <transition name="sql-collapse">
                        <div v-show="collapsedSqlMap[index] === false" class="sql-content">
                          <pre class="hljs-pre"><code class="hljs sql" v-html="highlightSql(msg.generatedSql)"></code></pre>
                        </div>
                      </transition>
                    </div>


                    <!-- 查询结果数据表格（执行成功且有数据时展示） -->
                    <div v-if="!msg.sqlError && msg.chartData && msg.chartData.data && msg.chartData.data.length > 0" class="data-table-wrapper">
                      <!-- 表格头部栏 -->
                      <div class="table-header">
                        <div class="header-left">
                          <span class="table-tag">
                            <i class="el-icon-tickets"></i>
                            查询结果
                          </span>
                          <span class="table-count" v-if="msg.chartData.tableData">(共 {{ msg.chartData.tableData.length }} 条记录)</span>
                        </div>
                        <!-- 右侧：分页器 + 下载 + 折叠按钮 -->
                        <div class="header-actions">
                          <el-pagination
                              v-if="msg.chartData.tableData && msg.chartData.tableData.length > 10"
                              background
                              small
                              @current-change="handleTablePageChange(index, $event)"
                              :current-page="tablePaginationMap[index] ? tablePaginationMap[index].page : 1"
                              :page-size="tablePaginationMap[index] ? tablePaginationMap[index].size : 10"
                              layout="prev, slot, next"
                              :total="msg.chartData.tableData.length"
                              class="header-pagination">
                            <span class="header-page-info">{{ tablePaginationMap[index] ? tablePaginationMap[index].page : 1 }} / {{ Math.ceil(msg.chartData.tableData.length / (tablePaginationMap[index] ? tablePaginationMap[index].size : 10)) || 1 }}</span>
                          </el-pagination>
                          <el-tooltip v-if="msg.messageId" content="下载 Excel" placement="top" :open-delay="300">
                            <span class="download-btn" @click="downloadExcel(msg.messageId)">
                              <i class="el-icon-download"></i>
                            </span>
                          </el-tooltip>
                          <span class="collapse-btn" @click="toggleTableCollapse(index)" :title="collapsedTableMap[index] ? '展开表格' : '收起表格'">
                            <i :class="collapsedTableMap[index] ? 'el-icon-arrow-down' : 'el-icon-arrow-up'"></i>
                          </span>
                        </div>
                      </div>

                      <!-- 表格内容区域（带折叠动画） -->
                      <transition name="table-collapse">
                        <div v-show="!collapsedTableMap[index]" class="table-content">
                          <el-table
                              :data="getPaginatedData(msg.chartData.tableData, index)"
                              stripe
                              border
                              size="small"
                              :max-height="500"
                              style="width: 100%"
                              :header-cell-style="{ background: '#f5f7fa', color: '#606266', fontWeight: '500' }"
                          >
                            <el-table-column
                                v-for="col in msg.chartData.columns"
                                :key="col.name"
                                :prop="col.name"
                                :label="col.name"
                                :min-width="120"
                                show-overflow-tooltip
                            >
                              <template slot-scope="scope">
                                {{ formatCellValue(scope.row[col.name], col) }}
                              </template>
                            </el-table-column>
                          </el-table>
                        </div>
                      </transition>
                    </div>

                    <!-- 图表渲染组件（执行成功且有数据时展示） -->
                    <ChartRenderer
                        v-if="!msg.sqlError && msg.chartData && msg.chartData.data && msg.chartData.data.length > 0"
                        :messageId="msg.messageId"
                        :originalData="msg.chartData.data"
                        :columns="msg.chartData.columns"
                        :suggestion="msg.chartData.suggestion"
                        :sql="msg.generatedSql"
                        :dbConfigId="selectedDatasourceId"
                        :height="350"
                        @update-data="handleChartDataUpdate(index, $event)"
                    />
                  </div>

                  <!-- 普通文本回复（用户消息或无SQL的AI消息） -->
                  <div v-else class="markdown-body" v-html="renderContent(msg.displayedContent || msg.content)"></div>

                </div>
                <!-- AI 回复下方的操作按钮 -->
                <div class="message-actions">
                  <el-tooltip v-if="msg.role === 1 && index === lastAiIndex && !loading" content="重新回答" placement="top" :open-delay="500">
                    <i class="el-icon-refresh action-icon" @click="regenerateAnswer(msg)"></i>
                  </el-tooltip>
                  <el-tooltip v-if="msg.role === 1 && msg.messageId && msg.chartData && msg.chartData.data && msg.chartData.data.length > 0" content="下载 Excel" placement="top" :open-delay="500">
                    <i class="el-icon-download action-icon" @click="downloadExcel(msg.messageId)"></i>
                  </el-tooltip>
                  <el-tooltip v-if="msg.role === 1 && msg.messageId" :content="msg.evaluation === 'like' ? '取消点赞' : '点赞'" placement="top" :open-delay="500">
                    <i
                        class="el-icon-thumb action-icon thumb-up"
                        :class="{ active: msg.evaluation === 'like', disabled: !!evaluationLoadingMap[msg.messageId] }"
                        @click="handleLikeClick(msg)"
                    ></i>
                  </el-tooltip>
                  <el-tooltip v-if="msg.role === 1 && msg.messageId" :content="msg.evaluation === 'dislike' ? '取消点踩' : '点踩'" placement="top" :open-delay="500">
                    <i
                        class="el-icon-thumb action-icon thumb-down"
                        :class="{ active: msg.evaluation === 'dislike', disabled: !!evaluationLoadingMap[msg.messageId] }"
                        @click="handleDislikeClick(msg)"
                    ></i>
                  </el-tooltip>
                  <el-tooltip content="复制全文" placement="top" :open-delay="500">
                    <i class="el-icon-document-copy action-icon" @click="copyContent(msg.content)"></i>
                  </el-tooltip>
                </div>
              </div>
            </div>

            <div v-if="loading" class="message-row row-assistant">
              <div class="avatar-col">
                <div class="avatar assistant-avatar">
                  <img src="@/assets/imgs/RAG.png" alt="AI">
                </div>
              </div>
              <div class="content-col">
                <div class="message-bubble loading-bubble">
                  <div class="loading-content">
                    <span>正在查询中... {{ loadingSeconds }}s</span>
                    <div class="dot-typing"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="input-area-wrapper">

          <!-- 常见问题分类与示例面板（与输入框同宽、对齐） -->
          <div class="faq-panel">
            <div class="faq-header" @click="toggleFaqPanel">
              <span class="faq-header-title">
                <i class="el-icon-chat-dot-round faq-icon"></i> 常见问题分类与示例
              </span>
              <i :class="faqPanelOpen ? 'el-icon-arrow-up' : 'el-icon-arrow-down'" class="faq-arrow"></i>
            </div>
            <transition name="faq-expand">
              <div v-show="faqPanelOpen" class="faq-body">
                <el-select
                    v-model="faqSelectedCategory"
                    placeholder="请选择问题分类..."
                    class="faq-category-select"
                    :loading="faqCategoryLoading"
                    filterable
                    @change="onFaqCategoryChange"
                >
                  <el-option v-for="cat in faqCategoryList" :key="cat.id" :label="cat.name" :value="cat.id"></el-option>
                </el-select>
                <div v-if="faqCategoryLoading" class="faq-loading"><i class="el-icon-loading"></i> 加载中...</div>
                <div v-if="!faqCategoryLoading && faqDisplayItems.length > 0" class="faq-examples">
                  <ul class="faq-list">
                    <li v-for="(item, idx) in faqDisplayItems" :key="item.id" class="faq-list-item" @click="fillInput(item)">
                      <span class="faq-idx">{{ idx + 1 }}</span>{{ item.questionContent }}
                    </li>
                  </ul>
                  <div class="faq-footer">
                    <span
                        class="faq-refresh-btn"
                        :class="{ loading: faqRefreshLoading, 'faq-refresh-restart': faqHasMore[faqSelectedCategory] === false }"
                        @click="refreshFaqItems"
                    >
                      <i :class="faqRefreshLoading ? 'el-icon-loading' : (faqHasMore[faqSelectedCategory] === false ? 'el-icon-refresh-left' : 'el-icon-refresh')"></i>
                      {{ faqHasMore[faqSelectedCategory] === false ? '重新推荐' : '换一换' }}
                    </span>
                    <span class="faq-page-info" v-if="faqHasMore[faqSelectedCategory] === false">已展示全部问题</span>
                  </div>
                </div>
                <div v-if="!faqCategoryLoading && faqSelectedCategory && faqDisplayItems.length === 0" class="faq-empty">该分类下暂无示例问题</div>
              </div>
            </transition>
          </div>

          <div class="input-box">

            <textarea
                v-model="userInput"
                ref="inputRef"
                class="chat-input"
                placeholder="请输入您的查询问题，例如：查询所有员工..."
                rows="1"
                @keydown.enter.exact.prevent="handleSend"
                @input="resizeTextarea"
            ></textarea>
            <div class="input-actions">
              <button
                  class="send-icon-btn"
                  :disabled="!userInput.trim() && !loading"
                  @click="loading ? handleStop() : handleSend()"
              >
                <i v-if="!loading" class="el-icon-s-promotion"></i>
                <div v-else class="stop-btn-inner">
                  <i class="el-icon-video-pause"></i>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <el-dialog
        title="反馈"
        :visible.sync="feedbackDialogVisible"
        width="520px"
        custom-class="feedback-dialog"
        :close-on-click-modal="false"
        @close="resetFeedbackDialog"
    >
      <div class="feedback-dialog-body">
        <div class="feedback-reason-list">
          <span
              v-for="reason in feedbackReasonOptions"
              :key="reason"
              class="feedback-reason-tag"
              :class="{ active: feedbackSelectedReason === reason }"
              @click="toggleFeedbackReason(reason)"
          >
            {{ reason }}
          </span>
        </div>
        <el-input
            v-model="feedbackInput"
            type="textarea"
            :rows="5"
            resize="none"
            maxlength="500"
            show-word-limit
            class="feedback-textarea"
            placeholder="我们想知道你对此次回答不满意的原因，你认为更好的回答是什么？"
        ></el-input>
      </div>
      <span slot="footer" class="dialog-footer">
        <el-button @click="feedbackDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="feedbackSubmitting" @click="submitDislikeFeedback">提交</el-button>
      </span>
    </el-dialog>

  </div>
</template>

<script>
import { marked } from 'marked';
import hljs from 'highlight.js';
import 'highlight.js/styles/atom-one-dark.css';
import axios from 'axios';
import ChartRenderer from '@/components/ChartRenderer.vue';

const request = axios.create({
  baseURL: process.env.VUE_APP_BASEURL,
  timeout: 300000
});

request.interceptors.request.use(config => {
  config.headers['Content-Type'] = 'application/json;charset=utf-8';
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

request.interceptors.response.use(response => {
  if (response.data && response.data.code === '401') {
    localStorage.removeItem('xm-user'); // 清除过期 token
    window.location.href = '/login';
  }
  return response;
}, error => {
  console.error('API Error:', error);
  if (error && typeof error === 'object' && !error.name && !error.message) {
    return Promise.reject(new Error(JSON.stringify(error)));
  }
  return Promise.reject(error);
});

export default {
  components: {
    ChartRenderer
  },
  workers: {
    ChartRenderer
  },
  name: 'Text2sql',
  directives: {
    loadmore: {
      bind(el, binding) {
        const selectWrap = el.querySelector('.el-table__body-wrapper');
        if (selectWrap) {
          selectWrap.addEventListener('scroll', function() {
            const sign = 10; // 阈值
            const scrollDistance = this.scrollHeight - this.scrollTop - this.clientHeight;
            if (scrollDistance <= sign) {
              binding.value();
            }
          });
        }
      }
    }
  },
  data() {
    return {
      isSidebarOpen: true, // 控制侧边栏展开/收起
      currentChatId: null,
      pendingSessionId: null, // 临时会话ID，用于取消正在进行的请求
      selectedDatasourceId: null,
      currentDatasource: null,
      datasourceList: [],
      datasourceLoading: false,
      userInput: '',
      allSessions: [],
      currentMessagesData: [],
      minHeight: 24,
      maxHeight: 200,
      historyLoading: false,
      sessionStates: {}, // 结构 { [id]: { loading: false, loadingSeconds: 0, loadingTimer: null, abortController: null, userMsg: null } }
      typewriterTimer: null,
      collapsedSqlMap: {}, // 记录每条消息的 SQL 折叠状态
      collapsedTableMap: {}, // 【新增】记录每条消息的表格折叠状态
      tablePaginationMap: {}, // 【新增】记录每条消息的表格分页状态 { index: { page: 1, size: 10 } }
      fullscreenDialogVisible: false, // 全屏弹窗可见性
      fullscreenTableData: null, // 当前全屏显示的数据对象
      fullscreenActiveIndex: -1, // 当前全屏对应的数据索引
      fullscreenPage: 1,
      fullscreenSize: 50,
      // FAQ 常见问题面板
      faqPanelOpen: false,
      faqCategoryLoading: false,    // 首次加载 recommend 接口的 loading
      faqCategoryList: [],           // 模块名称列表（从 recommend 响应的 key 提取）
      faqSelectedCategory: null,     // 当前选中的模块名（string）
      faqModuleData: {},             // { 模块名: [{id, questionContent, ...}] } 当前展示的每模块 7 条
      faqShownIds: {},               // { 模块名: [id, ...] } 已展示过的问题 ID
      faqHasMore: {},                // { 模块名: true/false } 是否还有未展示的问题
      faqRefreshLoading: false,      // 换一批 loading
      faqRecommendLoaded: false,     // 是否已成功加载过 recommend 数据
      faqPendingClickId: null,       // 用户点击的问题 ID，发送时上报热度
      evaluationLoadingMap: {},      // { [messageId]: boolean } 点赞/点踩接口状态
      feedbackDialogVisible: false,  // 点踩反馈弹窗
      feedbackSubmitting: false,     // 反馈提交 loading
      feedbackTargetMessageId: null, // 当前反馈对应的消息 ID
      feedbackSelectedReason: '',    // 已选反馈标签
      feedbackInput: '',             // 反馈输入内容
      feedbackReasonOptions: ['SQL不准确', '结果不完整', '解释不清楚', '执行报错', '响应太慢', '其他']
    };
  },
  computed: {
    userHistory() { return this.allSessions; },
    currentMessages() { return this.currentMessagesData; },
    activeSessionId() { return this.currentChatId; },
    loading() {
      const state = this.sessionStates[this.activeSessionId];
      return !!(state && state.loading);
    },
    loadingSeconds() {
      const state = this.sessionStates[this.activeSessionId];
      return state ? state.loadingSeconds : 0;
    },
    abortController() {
      const state = this.sessionStates[this.activeSessionId];
      return state ? state.abortController : null;
    },
    fullscreenDisplayedData() {
      if (!this.fullscreenTableData || !this.fullscreenTableData.tableData) return [];
      const start = (this.fullscreenPage - 1) * this.fullscreenSize;
      const end = start + this.fullscreenSize;
      return this.fullscreenTableData.tableData.slice(start, end);
    },
    faqDisplayItems() {
      if (!this.faqSelectedCategory) return [];
      return this.faqModuleData[this.faqSelectedCategory] || [];
    },
    faqSelectedCategoryName() {
      return this.faqSelectedCategory || '';
    },
    lastAiIndex() {
      for (let i = this.currentMessagesData.length - 1; i >= 0; i--) {
        if (this.currentMessagesData[i].role === 1) return i;
      }
      return -1;
    }
  },
  mounted() {
    const renderer = new marked.Renderer();
    renderer.code = (code, language) => {
      const validLang = !!(language && hljs.getLanguage(language));
      const highlighted = validLang
          ? hljs.highlight(code, { language }).value
          : hljs.highlightAuto(code).value;
      const lang = language || 'text';
      return `<div class="code-block-wrapper">
        <div class="code-header">
          <span class="lang-tag">${lang}</span>
          <span class="copy-btn"><i class="el-icon-document-copy"></i></span>
        </div>
        <pre class="hljs-pre"><code class="hljs ${lang}">${highlighted}</code></pre>
      </div>`;
    };

    marked.use({
      renderer: renderer,
      hooks: {
        preprocess(markdown) { return markdown; },
        postprocess(html) { return html; }
      }
    });

    document.addEventListener('click', this.handleGlobalClick);
    this.loadDatasourceList();
    this.loadUserHistory();
    this.resizeTextarea();
  },
  beforeDestroy() {
    document.removeEventListener('click', this.handleGlobalClick);
    if (this.loadingTimer) clearInterval(this.loadingTimer);
    if (this.typewriterTimer) clearInterval(this.typewriterTimer);
  },
  methods: {
    // ===== FAQ 方法 =====

    // 展开/收起面板，首次展开时调用 recommend 接口
    toggleFaqPanel() {
      this.faqPanelOpen = !this.faqPanelOpen;
      if (this.faqPanelOpen && !this.faqRecommendLoaded) {
        this.loadFaqRecommend();
      }
    },

    // 获取当前数据源的 dbName
    getFaqDbName() {
      // currentDatasource 在切换历史对话时会被置 null，此时从 datasourceList 兜底查找
      const ds = this.currentDatasource
          || this.datasourceList.find(d => d.id === this.selectedDatasourceId)
          || null;
      if (!ds) return '';
      return ds.dbName || ds.name || '';
    },

    // 调用 GET /casePairQuestion/recommend 初始化所有模块数据
    loadFaqRecommend() {
      console.log('[FAQ] currentDatasource:', this.currentDatasource);
      const dbName = this.getFaqDbName();
      console.log('[FAQ] dbName 取值:', dbName);
      if (!dbName) {
        this.$message.warning('请先选择数据源后再查看问题推荐');
        return;
      }
      this.faqCategoryLoading = true;
      request.get('/casePairQuestion/recommend', { params: { dbName, limit: 5 } })
          .then(res => {
            if (res.data.code === '200') {
              const data = res.data.data || {};
              // 初始化各模块数据
              const moduleData = {};
              const shownIds = {};
              const hasMore = {};
              const categoryList = [];
              Object.keys(data).forEach(module => {
                const items = data[module] || [];
                moduleData[module] = items;
                shownIds[module] = items.map(q => q.id);
                hasMore[module] = true; // 初始默认还有更多，后续 next 接口会更新
                categoryList.push({ id: module, name: module });
              });
              this.faqModuleData = moduleData;
              this.faqShownIds = shownIds;
              this.faqHasMore = hasMore;
              this.faqCategoryList = categoryList;
              // 默认选中第一个模块
              if (categoryList.length > 0 && !this.faqSelectedCategory) {
                this.faqSelectedCategory = categoryList[0].id;
              }
              this.faqRecommendLoaded = true;
            } else {
              this.$message.error(res.data.msg || '获取推荐问题失败');
            }
          })
          .catch(() => this.$message.error('获取推荐问题接口异常'))
          .finally(() => { this.faqCategoryLoading = false; });
    },

    // 切换模块（不再发请求，数据已在 faqModuleData 中）
    onFaqCategoryChange(module) {
      this.faqSelectedCategory = module;
    },

    // 换一批：调用 GET /casePairQuestion/next/{module}
    refreshFaqItems() {
      const module = this.faqSelectedCategory;
      if (!module) return;
      const dbName = this.getFaqDbName();

      const excludeIds = (this.faqShownIds[module] || []).join(',');
      this.faqRefreshLoading = true;

      const params = { dbName, limit: 5 };
      if (excludeIds) params.excludeIds = excludeIds;

      request.get(`/casePairQuestion/next/${encodeURIComponent(module)}`, { params })
          .then(res => {
            if (res.data.code === '200') {
              const { questions = [], hasMore, isReset } = res.data.data || {};
              // 若后端发生了题库重置，清空本地该模块的 excludeIds
              if (isReset) {
                this.$set(this.faqShownIds, module, []);
              }
              // 更新当前模块的展示数据
              this.$set(this.faqModuleData, module, questions);
              // 追加已展示 ID（重置后从空开始累加）
              const baseIds = isReset ? [] : (this.faqShownIds[module] || []);
              this.$set(this.faqShownIds, module, [...baseIds, ...questions.map(q => q.id)]);
              this.$set(this.faqHasMore, module, hasMore !== false);
            } else {
              this.$message.error(res.data.msg || '换一批失败');
            }
          })
          .catch(() => this.$message.error('换一批接口异常'))
          .finally(() => { this.faqRefreshLoading = false; });
    },

    // 点击示例问题：填入输入框，并记录 ID 供发送时上报热度
    fillInput(item) {
      this.userInput = item.questionContent;
      this.faqPendingClickId = item.id;
      this.$nextTick(() => {
        if (this.$refs.inputRef) {
          this.$refs.inputRef.focus();
          this.resizeTextarea();
        }
      });
    },
    // ===== FAQ 方法 END =====

    loadDatasourceList() {

      this.datasourceLoading = true;
      let retryScheduled = false;
      const fetchDatasource = (isRetry = false) => {
        request.get('/dbConfig/list').then(res => {
          if (res.data.code === '200') {
            this.datasourceList = res.data.data || [];
            this.$nextTick(() => {
              if (this.datasourceList.length > 0 && !this.selectedDatasourceId) {
                this.selectedDatasourceId = this.datasourceList[0].id;
                this.currentDatasource = this.datasourceList[0];
              }
            });
          } else {
            if (!isRetry) {
              // 首次失败，2 秒后静默重试一次
              retryScheduled = true;
              setTimeout(() => fetchDatasource(true), 2000);
              return;
            }
            this.$message.error(res.data.msg || '获取数据源列表失败');
          }
        }).catch(() => {
          if (!isRetry) {
            // 首次网络异常，2 秒后静默重试一次
            retryScheduled = true;
            setTimeout(() => fetchDatasource(true), 2000);
            return;
          }
          this.$message.error('获取数据源列表请求异常');
        }).finally(() => {
          // 只有不安排重试时（成功 或 重试后）才关闭 loading
          if (!retryScheduled || isRetry) {
            this.datasourceLoading = false;
          }
        });
      };
      fetchDatasource();
    },

    handleDatasourceChange(dsId) {
      const ds = this.datasourceList.find(d => d.id === dsId);
      if (ds) {
        this.currentDatasource = ds;
        this.currentChatId = null;
        this.currentMessagesData = [];
        // 数据源切换 → 重置 FAQ 数据，重新加载新数据源的推荐问题
        this.faqRecommendLoaded = false;
        this.faqCategoryList = [];
        this.faqModuleData = {};
        this.faqShownIds = {};
        this.faqHasMore = {};
        this.faqSelectedCategory = null;
        if (this.faqPanelOpen) {
          this.loadFaqRecommend();
        }
        this.$nextTick(() => {
          if(this.$refs.inputRef) this.$refs.inputRef.focus();
        });
      }
    },

    getDbTypeTag(type) {
      switch(type) {
        case 'MySQL': return '';
        case 'Oracle': return 'danger';
        case 'PostgreSQL': return 'success';
        case 'SQL Server': return 'warning';
        default: return 'info';
      }
    },

    loadUserHistory() {
      request.get('/chat/sessions', {
        params: { module: 'DATA' }
      }).then(res => {
        if (res.data.code === '200') {
          this.allSessions = res.data.data || [];
          if (this.allSessions.length === 0) {
            this.createNewChat(false);
          }
        }
      }).catch(err => {
        console.warn('[Text2sql] 加载历史会话失败:', err);
      });
    },

    switchChat(chatId) {
      if (this.currentChatId === chatId) return;
      this.currentChatId = chatId;
      this.currentDatasource = null;
      this.loadSessionMessages(chatId);
    },

    loadSessionMessages(chatId) {
      this.historyLoading = true;
      this.currentMessagesData = [];

      // 如果是刚本地生成的占位对话，无需去后端请求消息历史
      if (String(chatId).startsWith('temp_')) {
        this.historyLoading = false;
        const state = this.sessionStates[chatId];
        if (state && state.userMsg) {
          this.currentMessagesData.push(state.userMsg);
        }
        return;
      }

      // 使用正确的 API 端点 /chat/messages（参考 API 文档第 6 节）
      request.get('/chat/messages', {
        params: { sessionId: chatId }
      }).then(res => {
        // 如果网络返回时，用户已经切换到了其他对话，直接抛弃这份陈旧的数据
        if (this.currentChatId !== chatId) return;

        this.historyLoading = false;
        if (res.data.code === '200') {
          const messages = res.data.data || [];

          // 遍历消息列表，解析 extraData 字段（结构同 /chat/send 返回值）
          this.currentMessagesData = messages.map(msg => {
            // 解析 extraData（后端返回的是 JSON 字符串）
            let extraData = null;
            let generatedSql = null;
            let chartData = null;
            let sqlErrorHist = null; // SQL 执行错误信息（历史记录）

            if (msg.extraData) {
              try {
                extraData = typeof msg.extraData === 'string'
                    ? JSON.parse(msg.extraData)
                    : msg.extraData;

                // 提取 SQL
                generatedSql = extraData.sql || null;

                // 提取图表数据（columns, data, suggestion）
                if (extraData.data && extraData.columns) {
                  chartData = {
                    data: extraData.data,
                    tableData: extraData.data,
                    originalTotal: extraData.data.length,
                    columns: extraData.columns,
                    suggestion: extraData.suggestion || {},
                    displayedData: [],
                    page: 0,
                    pageSize: 50
                  };
                  // 初始化 lazy data
                  this.initDisplayedData(chartData);
                }

                // �� 提取 SQL 执行错误信息（历史记录同步适配）
                if (extraData.error && typeof extraData.error === 'string') {
                  sqlErrorHist = extraData.error;
                  console.warn('[Text2sql] 历史消息 SQL 执行失败:', sqlErrorHist);
                }
              } catch (e) {
                console.warn('[Text2sql] extraData 解析失败:', e);
              }
            }

            // 返回格式化的消息对象
            return {
              role: msg.role === 'assistant' ? 1 : 0,
              content: msg.content,
              displayedContent: msg.content,
              generatedSql: generatedSql,
              chartData: chartData,
              sqlError: sqlErrorHist || null, // SQL 执行错误信息
              messageId: msg.id,
              evaluation: msg.evaluation || null,
              feedback: msg.feedback || null
            };
          });

          // 如果该对话在后台还在进行（未完成），补入最新的 userMsg
          const state = this.sessionStates[chatId];
          if (state && state.loading && state.userMsg) {
            const exist = this.currentMessagesData.find(m => m.role === 0 && m.content === state.userMsg.content);
            if (!exist) {
              this.currentMessagesData.push(state.userMsg);
            }
          }

          // 初始化历史消息的 SQL 折叠状态（默认全部折叠）
          const newCollapsedSqlMap = {};
          this.currentMessagesData.forEach((m, idx) => {
            if (m.generatedSql) newCollapsedSqlMap[idx] = true;
          });
          this.collapsedSqlMap = newCollapsedSqlMap;

          this.scrollToBottom();
        } else {
          this.$message.error(res.data.msg || '加载历史消息失败');
        }
      }).catch(err => {
        this.historyLoading = false;
        this.$message.error('加载历史消息请求异常');
        console.error('加载历史消息失败:', err);
      });
    },

    createNewChat(focus = true) {
      const newTempId = 'temp_' + Date.now();
      this.currentChatId = newTempId;
      this.currentMessagesData = [];
      this.collapsedSqlMap = {};
      this.collapsedTableMap = {};
      this.tablePaginationMap = {};

      if (this.datasourceList.length > 0) {
        this.selectedDatasourceId = this.datasourceList[0].id;
        this.currentDatasource = this.datasourceList[0];
      }

      this.allSessions.unshift({
        id: newTempId,
        title: '新对话'
      });

      if (focus) {
        this.$nextTick(() => {
          if(this.$refs.inputRef) this.$refs.inputRef.focus();
        });
      }
    },

    async handleSend() {
      const content = this.userInput.trim();
      if (!content || this.loading) return;

      if (!this.selectedDatasourceId) {
        this.$message.warning('请先选择数据源');
        return;
      }

      // 发送时收起 FAQ 面板
      this.faqPanelOpen = false;

      let sessionId = this.currentChatId;
      let isTemp = (!sessionId || String(sessionId).startsWith('temp_'));

      // 如果完全没有 sessionId (新对话)，赋予临时占位
      if (!sessionId) {
        sessionId = 'temp_' + Date.now();
        this.currentChatId = sessionId;
        this.allSessions.unshift({
          id: sessionId,
          title: content.length > 20 ? content.substring(0, 20) + '...' : content
        });
      } else if (isTemp) {
        const s = this.allSessions.find(x => x.id === sessionId);
        if (s && s.title === '新对话') {
          s.title = content.length > 20 ? content.substring(0, 20) + '...' : content;
        }
      }

      // 初始化该 Session 对应的独立状态
      if (!this.sessionStates[sessionId]) {
        this.$set(this.sessionStates, sessionId, { loading: false, loadingSeconds: 0, loadingTimer: null, abortController: null, userMsg: null, currentTaskId: null });
      }

      const state = this.sessionStates[sessionId];

      if (state.abortController) state.abortController = null;
      state.abortController = new AbortController();

      const userMsg = { role: 0, content: content, displayedContent: content };
      state.userMsg = userMsg;

      // 立即显示用户消息
      this.currentMessagesData.push(userMsg);
      const userQuestion = content;
      this.userInput = '';
      this.resizeTextarea();
      this.scrollToBottom();

      state.loading = true;
      state.loadingSeconds = 0;
      if (state.loadingTimer) clearInterval(state.loadingTimer);
      state.loadingTimer = setInterval(() => {
        state.loadingSeconds++;
      }, 1000);

      try {
        // 生成前端 taskId（UUID），无论新旧会话都可用此 ID 取消
        const taskId = this.generateUUID();
        state.currentTaskId = taskId;

        // 调用新的 /chat/send API
        console.log('[Text2sql] 调用 /chat/send API...');
        const sendRes = await request.post('/chat/send', {
          sessionId: isTemp ? null : sessionId,
          module: 'DATA',
          content: content,
          dbConfigId: this.selectedDatasourceId,
          taskId: taskId
        }, {
          signal: state.abortController.signal
        });

        console.log('[Text2sql] /chat/send 完整响应:', JSON.stringify(sendRes.data, null, 2));

        if (sendRes.data.code !== '200') {
          throw new Error(sendRes.data.msg || '查询失败');
        }

        const msgData = sendRes.data.data;
        const realSessionId = msgData.sessionId || sessionId;

        // 如果生成了真实会话（针对新建的查询），替换原先内存里的占位ID
        if (isTemp && realSessionId !== sessionId) {
          this.$set(this.sessionStates, realSessionId, this.sessionStates[sessionId]);
          this.$delete(this.sessionStates, sessionId);
          if (this.currentChatId === sessionId) {
            this.currentChatId = realSessionId;
          }
          const sessionInList = this.allSessions.find(s => s.id === sessionId);
          if (sessionInList) {
            sessionInList.id = realSessionId;
          }
          sessionId = realSessionId; // 同步当前操作 ID
          console.log('[Text2sql] 新会话创建并平移状态完毕，真实ID:', realSessionId);
        }

        // 解析 extraData (字符串转JSON)
        let extraData = null;
        let generatedSql = '';
        let chartData = null;
        let sqlError = null; // SQL 执行错误信息

        if (msgData.extraData) {
          try {
            extraData = typeof msgData.extraData === 'string'
                ? JSON.parse(msgData.extraData)
                : msgData.extraData;

            console.log('[Text2sql] 解析后的 extraData:', extraData);

            // 提取SQL
            generatedSql = extraData.sql || '';

            // 提取图表数据
            if (extraData.data && extraData.columns) {
              chartData = {
                data: extraData.data,
                tableData: extraData.data,
                originalTotal: extraData.data.length,
                columns: extraData.columns,
                suggestion: extraData.suggestion || {},
                displayedData: [],
                page: 0,
                pageSize: 50
              };
              // 初始化 lazy data
              this.initDisplayedData(chartData);
            }

            // �� 提取 SQL 执行错误信息（后端执行失败但仍返回了 SQL 时附带）
            if (extraData.error) {
              sqlError = extraData.error;
              console.warn('[Text2sql] SQL执行错误:', sqlError);
            }
          } catch (e) {
            console.warn('[Text2sql] extraData 解析失败:', e);
          }
        }

        // 自动生成会话标题（首次对话 或 标题仍为默认值）
        const isFirstMessage = this.currentMessagesData.filter(m => m.role === 0).length === 1;
        const currentSession = this.allSessions.find(s => s.id === sessionId);
        const isDefaultTitle = currentSession && currentSession.title.includes('...'); // temp 生成的包含省略号
        const isNewChat = currentSession && currentSession.title === '新对话';

        if ((isFirstMessage || isDefaultTitle || isNewChat) && userQuestion && sessionId) {
          const autoTitle = userQuestion.length > 20
              ? userQuestion.substring(0, 20) + '...'
              : userQuestion;

          request.put('/chat/session', {
            id: sessionId,
            title: autoTitle
          }).then(() => {
            console.log('[Text2sql] 会话标题已更新');
            this.refreshHistoryList();
          }).catch(err => {
            console.warn('[Text2sql] 更新标题失败:', err);
          });
        }

        // 标识当前后台请求已经彻底完成
        const finalState = this.sessionStates[sessionId];
        if (finalState) {
          finalState.loading = false;
          clearInterval(finalState.loadingTimer);
          finalState.loadingTimer = null;
        }

        const aiReplyContent = msgData.content || '查询完成';

        // 判断当前屏幕焦点是否还停留在该对话（以防切台，不推消息到屏幕）
        const isCurrent = (this.currentChatId === sessionId);

        if (isCurrent) {
          const newMsgIndex = this.currentMessagesData.length;
          // 新消息默认折叠 SQL
          this.$set(this.collapsedSqlMap, newMsgIndex, true);

          this.currentMessagesData.push({
            role: 1,
            content: aiReplyContent,
            displayedContent: '',
            generatedSql: generatedSql || null,
            chartData: chartData,
            sqlError: sqlError || null, // SQL 执行错误信息
            messageId: msgData.id,
            evaluation: msgData.evaluation || null,
            feedback: msgData.feedback || null
          });

          this.typewriterEffect(aiReplyContent, newMsgIndex);
        }

        this.refreshHistoryList();

        // 上报 FAQ 问题点击热度（发送成功时才统计）
        if (this.faqPendingClickId) {
          request.post(`/casePairQuestion/click/${this.faqPendingClickId}`).catch(() => {});
          this.faqPendingClickId = null;
        }

      } catch (err) {
        // 请求失败或者终端，确保该会话状态还原
        const stateTarget = this.sessionStates[sessionId];
        if (stateTarget) {
          stateTarget.loading = false;
          clearInterval(stateTarget.loadingTimer);
          stateTarget.loadingTimer = null;
        }

        const isAborted = err.name === 'AbortError' ||
            err.name === 'CanceledError' ||
            err.message?.includes('abort') ||
            err.message?.includes('cancel') ||
            err.code === 'ERR_CANCELED';

        if (isAborted) {
          console.log('[Text2sql] 用户主动终止', sessionId);
          if (this.currentChatId === sessionId) {
            this.currentMessagesData.push({
              role: 1,
              content: '查询已停止，您可以继续提问或开启新会话',
              displayedContent: '查询已停止，您可以继续提问或开启新会话',
              generatedSql: null
            });
            this.scrollToBottom();
          }
          return;
        }

        let errorMsg = '网络连接异常';
        if (err.message) errorMsg = err.message;

        if (this.currentChatId === sessionId) {
          this.currentMessagesData.push({
            role: 1,
            content: `❌ **查询失败**\n\n${errorMsg}`,
            displayedContent: `❌ **查询失败**\n\n${errorMsg}`,
            generatedSql: null,
            chartData: null
          });
          this.scrollToBottom();
        }
        console.error('[Text2sql] 发送失败:', err);
      }
    },



    handleStop() {
      console.log('[Text2sql] handleStop 被调用, currentChatId:', this.currentChatId);
      // 动作 1: 前端立即断开专属连接 (UI 立即停止 Loading 动画)
      const thisState = this.sessionStates[this.currentChatId];
      if (!thisState || !thisState.loading) {
        console.warn('[Text2sql] handleStop 提前退出: thisState=', thisState, 'loading=', thisState?.loading);
        return;
      }

      if (thisState.abortController) {
        thisState.abortController.abort();
        thisState.abortController = null;
      }

      thisState.loading = false;
      clearInterval(thisState.loadingTimer);
      thisState.loadingTimer = null;

      // 动作 2: 通知后端释放资源 (Fire-and-forget)
      // 优先用 taskId（新对话在等待响应期间 sessionId 未知），旧对话两者都有
      const sessionIdToCancel = String(this.currentChatId).startsWith('temp_') ? null : this.currentChatId;
      const taskIdToCancel = thisState.currentTaskId || null;
      console.log('[Text2sql] handleStop sessionIdToCancel:', sessionIdToCancel, 'taskId:', taskIdToCancel);

      if (sessionIdToCancel || taskIdToCancel) {
        console.log('[Text2sql] 发送任务取消请求');
        request.post('/chat/cancel', {
          sessionId: sessionIdToCancel,
          taskId: taskIdToCancel
        }).then(res => {
          if (res.data && res.data.code === '200') {
            console.log('[Text2sql] 任务取消成功');
          } else {
            console.warn('[Text2sql] 任务取消失败:', res.data?.msg);
          }
        }).catch(err => {
          console.warn('[Text2sql] 后端取消指令发送失败:', err);
        });
        // 清除 taskId，避免重复使用
        thisState.currentTaskId = null;
      } else {
        console.warn('[Text2sql] 无法取消任务: sessionId 和 taskId 均不存在');
      }

      // 清除临时会话ID
      this.pendingSessionId = null;
      // 停止消息由 handleSend 的 catch（AbortError）统一 push，此处不再重复添加
    },

    deleteChat(chatId) {
      this.$confirm('确认删除该对话吗？', '提示', { type: 'warning' }).then(() => {
        request.delete(`/chat/session/${chatId}`).then(res => {
          if (res.data.code === '200') {
            this.$message.success('删除成功');
            this.allSessions = this.allSessions.filter(s => s.id !== chatId);
            if (this.currentChatId === chatId) {
              this.createNewChat(false);
              if (this.allSessions.length > 0) this.switchChat(this.allSessions[0].id);
            }
            document.body.click();
          } else {
            this.$message.error(res.data.msg);
          }
        });
      }).catch(() => {});
    },

    renameChat(chat) {
      document.body.click();
      this.$prompt('请输入新的会话标题', '重命名', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        inputValue: chat.title,
        inputPattern: /\S/,
        inputErrorMessage: '标题不能为空'
      }).then(({ value }) => {
        request.put('/chat/session', { id: chat.id, title: value }).then(res => {
          if (res.data.code === '200') {
            this.$message.success('重命名成功');
            this.refreshHistoryList();
          } else {
            this.$message.error(res.data.msg);
          }
        });
      }).catch(() => {});
    },

    refreshHistoryList() {
      request.get('/chat/sessions', { params: { module: 'DATA' } }).then(res => {
        if (res.data.code === '200') this.allSessions = res.data.data || [];
      });
    },



    toggleSqlCollapse(index) {
      this.$set(this.collapsedSqlMap, index, !this.collapsedSqlMap[index]);
    },

    // 【新增】切换表格折叠状态
    toggleTableCollapse(index) {
      this.$set(this.collapsedTableMap, index, !this.collapsedTableMap[index]);
    },

    // 【新增】获取分页后的数据
    getPaginatedData(data, index) {
      if (!data || data.length === 0) return [];

      // 初始化分页信息
      if (!this.tablePaginationMap[index]) {
        this.$set(this.tablePaginationMap, index, { page: 1, size: 10 });
      }

      const { page, size } = this.tablePaginationMap[index];
      const start = (page - 1) * size;
      const end = start + size;

      return data.slice(start, end);
    },

    // 打开全屏表格
    openFullscreenTable(index) {
      if (!this.currentMessagesData[index] || !this.currentMessagesData[index].chartData) return;
      this.fullscreenActiveIndex = index;
      this.fullscreenTableData = this.currentMessagesData[index].chartData;

      // 同步当前的分页状态到全屏视图
      if (this.tablePaginationMap[index]) {
        this.fullscreenPage = this.tablePaginationMap[index].page;
        this.fullscreenSize = this.tablePaginationMap[index].size;
      } else {
        this.fullscreenPage = 1;
        this.fullscreenSize = 50;
      }

      this.fullscreenDialogVisible = true;
    },

    // 全屏下的页码变化
    handleFullscreenPageChange(page) {
      this.fullscreenPage = page;
      // 同步回原表格
      if (this.fullscreenActiveIndex !== -1) {
        this.handleTablePageChange(this.fullscreenActiveIndex, page);
      }
    },

    // 全屏下的每页条数变化
    handleFullscreenSizeChange(size) {
      this.fullscreenSize = size;
      this.fullscreenPage = 1;
      // 同步回原表格
      if (this.fullscreenActiveIndex !== -1) {
        this.handleTableSizeChange(this.fullscreenActiveIndex, size);
      }
    },

    // 【新增】处理表格页码变化
    handleTablePageChange(index, page) {
      if (!this.tablePaginationMap[index]) {
        this.$set(this.tablePaginationMap, index, { page: 1, size: 50 });
      }
      this.tablePaginationMap[index].page = page;
      this.$forceUpdate(); // 强制更新视图
    },

    // 【新增】处理表格每页条数变化
    handleTableSizeChange(index, size) {
      if (!this.tablePaginationMap[index]) {
        this.$set(this.tablePaginationMap, index, { page: 1, size: 50 });
      }
      this.tablePaginationMap[index].size = size;
      this.tablePaginationMap[index].page = 1; // 重置到第一页
      this.$forceUpdate(); // 强制更新视图
    },

    // 下载 Excel
    downloadExcel(messageId) {
      if (!messageId) return;
      this.$message.info('正在准备下载...');
      request.get('/chat/export/excel', {
        params: { messageId: messageId },
        responseType: 'blob'
      }).then(res => {
        const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const contentDisposition = res.headers['content-disposition'];
        let fileName = `export_${messageId}.xlsx`;
        if (contentDisposition) {
          const fileNameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
          if (fileNameMatch && fileNameMatch.length === 2) fileName = fileNameMatch[1];
        }
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }).catch(err => {
        console.error('Download failed:', err);
        this.$message.error('下载失败，请稍后重试');
      });
    },

    initDisplayedData(chartData) {
      if (!chartData || !chartData.tableData || chartData.tableData.length === 0) return;
      chartData.page = 1;
      // 初始加载 50 条
      chartData.displayedData = chartData.tableData.slice(0, chartData.pageSize);
    },

    loadMoreData(chartData) {
      if (!chartData || !chartData.tableData) return;

      const total = chartData.tableData.length;
      const currentCount = chartData.displayedData.length;

      if (currentCount >= total) return;

      const nextCount = currentCount + chartData.pageSize;
      const nextBatch = chartData.tableData.slice(currentCount, nextCount);
      chartData.displayedData = chartData.displayedData.concat(nextBatch);
    },

    // 【新增】格式化单元格值
    formatCellValue(value, col) {
      if (value === null || value === undefined) return '-';

      // 1. 优先尝试解析时间
      // 如果列名包含日期时间关键词，或者列类型是日期类型
      const colName = (col && col.name) ? col.name.toUpperCase() : '';
      const colType = (col && col.type) ? col.type.toUpperCase() : '';

      const isTimeCol = colName.includes('DATE') || colName.includes('TIME') || colName.includes('日期') || colName.includes('时间') ||
          colType.includes('DATE') || colType.includes('TIME') || colType.includes('TIMESTAMP');

      if (isTimeCol) {
        // 如果是数字且看起来像时间戳 (毫秒或秒)
        if (typeof value === 'number') {
          const str = value.toString();
          // 简单的启发式：13位是毫秒，10位是秒 (2000年~2200年大概范围)
          if (str.length === 13) {
            return this.formatDate(value);
          } else if (str.length === 10) {
            return this.formatDate(value * 1000);
          }
        }
        // 如果是字符串，尝试解析并格式化为本地时间
        if (typeof value === 'string' && !isNaN(Date.parse(value))) {
          const date = new Date(value);
          if (!isNaN(date.getTime())) {
            // 格式化为本地时间：YYYY-MM-DD HH:mm:ss
            const year = date.getFullYear();
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const day = date.getDate().toString().padStart(2, '0');
            const hours = date.getHours().toString().padStart(2, '0');
            const minutes = date.getMinutes().toString().padStart(2, '0');
            const seconds = date.getSeconds().toString().padStart(2, '0');
            return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
          }
          return value;
        }
      }


      if (typeof value === 'number') {
        // 数值类型，格式化显示
        if (Math.abs(value) >= 10000) {
          return value.toLocaleString(); // 添加千位分隔符
        }
        return value;
      }
      return value;
    },

    // 【新增】获取清理后的内容（移除 SQL 代码块和数据统计，防止和下面的图表/独立SQL块引发双重渲染）
    getCleanContent(msg) {
      let content = msg.displayedContent || msg.content;
      if (!content) return '';

      // 移除 SQL 代码块
      content = content.replace(/```sql[\s\S]*?```/gi, '').trim();

      // 移除智能问数独有的 "已为您查询到 X 条数据，您可以切换图表进行查看" 这类无意义占位符
      content = content.replace(/^已为您查询到\s*\d+\s*条数据[^。]*。?\s*/i, '').trim();

      return content;
    },

    // 辅助日期格式化
    formatDate(timestamp) {
      const date = new Date(timestamp);
      const y = date.getFullYear();
      const m = (date.getMonth() + 1).toString().padStart(2, '0');
      const d = date.getDate().toString().padStart(2, '0');
      const hh = date.getHours().toString().padStart(2, '0');
      const mm = date.getMinutes().toString().padStart(2, '0');
      const ss = date.getSeconds().toString().padStart(2, '0');
      return `${y}-${m}-${d} ${hh}:${mm}:${ss}`;
    },

    highlightSql(sqlCode) {
      if (!sqlCode) return '';
      const highlighted = hljs.highlight(sqlCode, { language: 'sql' }).value;
      return highlighted;
    },

    renderContent(content) {
      if (!content) return '';
      return marked.parse(content);
    },

    copyContent(text) {
      if (!text) return;
      const fallbackCopy = (content) => {
        const textarea = document.createElement('textarea');
        textarea.value = content;
        textarea.style.position = 'fixed';
        textarea.style.top = '0';
        textarea.style.left = '0';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        try {
          const successful = document.execCommand('copy');
          if (successful) {
            this.$message.success('复制成功');
          } else {
            this.$message.error('复制失败');
          }
        } catch (err) {
          this.$message.error('复制失败');
        }
        document.body.removeChild(textarea);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
          this.$message.success('复制成功');
        }).catch(() => {
          fallbackCopy(text);
        });
      } else {
        fallbackCopy(text);
      }
    },

    // ===== 消息点赞/点踩与反馈 =====
    getFeedbackPreset(feedback) {
      if (!feedback) return { reason: '', detail: '' };
      const text = String(feedback).trim();
      const matchedReason = this.feedbackReasonOptions.find(item => {
        return text === item || text.startsWith(`${item}：`) || text.startsWith(`${item}:`);
      });
      if (!matchedReason) return { reason: '', detail: text };

      const detail = text
          .replace(`${matchedReason}：`, '')
          .replace(`${matchedReason}:`, '')
          .trim();
      return { reason: matchedReason, detail };
    },

    buildFeedbackText() {
      const reason = this.feedbackSelectedReason;
      const detail = (this.feedbackInput || '').trim();

      if (reason && reason !== '其他') {
        return detail ? `${reason}：${detail}` : reason;
      }
      if (reason === '其他') {
        return detail || '其他';
      }
      return detail || null;
    },

    updateMessageEvaluationState(messageId, evaluation, feedback) {
      const target = this.currentMessagesData.find(item => item.messageId === messageId);
      if (!target) return;
      this.$set(target, 'evaluation', evaluation === undefined ? null : evaluation);
      this.$set(target, 'feedback', feedback === undefined ? null : feedback);
    },

    async saveMessageEvaluation({ messageId, evaluation, feedback, successMessage = '' }) {
      if (!messageId) return false;

      this.$set(this.evaluationLoadingMap, messageId, true);
      try {
        const res = await request.put('/chat/message/evaluation', {
          id: messageId,
          evaluation,
          feedback
        });

        if (!res || !res.data || res.data.code !== '200') {
          this.$message.error((res && res.data && res.data.msg) || '评价失败');
          return false;
        }

        this.updateMessageEvaluationState(messageId, evaluation, feedback);
        if (successMessage) this.$message.success(successMessage);
        return true;
      } catch (err) {
        console.error('[Text2sql] 消息评价失败:', err);
        this.$message.error('评价失败，请稍后重试');
        return false;
      } finally {
        this.$set(this.evaluationLoadingMap, messageId, false);
      }
    },

    async handleLikeClick(msg) {
      if (!msg || !msg.messageId || this.evaluationLoadingMap[msg.messageId]) return;
      const cancelLike = msg.evaluation === 'like';

      const success = await this.saveMessageEvaluation({
        messageId: msg.messageId,
        evaluation: cancelLike ? null : 'like',
        feedback: null,
        successMessage: cancelLike ? '已取消评价' : '感谢你的点赞'
      });

      if (success && this.feedbackTargetMessageId === msg.messageId) {
        this.feedbackDialogVisible = false;
      }
    },

    async handleDislikeClick(msg) {
      if (!msg || !msg.messageId || this.evaluationLoadingMap[msg.messageId]) return;

      const cancelDislike = msg.evaluation === 'dislike';
      if (cancelDislike) {
        await this.saveMessageEvaluation({
          messageId: msg.messageId,
          evaluation: null,
          feedback: null,
          successMessage: '已取消评价'
        });
        return;
      }

      const success = await this.saveMessageEvaluation({
        messageId: msg.messageId,
        evaluation: 'dislike',
        feedback: msg.feedback || null,
        successMessage: '已记录你的反馈'
      });

      if (success) {
        this.openFeedbackDialog(msg);
      }
    },

    openFeedbackDialog(msg) {
      if (!msg || !msg.messageId) return;
      const preset = this.getFeedbackPreset(msg.feedback);
      this.feedbackTargetMessageId = msg.messageId;
      this.feedbackSelectedReason = preset.reason;
      this.feedbackInput = preset.detail;
      this.feedbackDialogVisible = true;
    },

    toggleFeedbackReason(reason) {
      this.feedbackSelectedReason = this.feedbackSelectedReason === reason ? '' : reason;
    },

    resetFeedbackDialog() {
      this.feedbackSubmitting = false;
      this.feedbackTargetMessageId = null;
      this.feedbackSelectedReason = '';
      this.feedbackInput = '';
    },

    async submitDislikeFeedback() {
      const messageId = this.feedbackTargetMessageId;
      if (!messageId || this.feedbackSubmitting) return;

      this.feedbackSubmitting = true;
      try {
        const feedbackText = this.buildFeedbackText();
        const success = await this.saveMessageEvaluation({
          messageId,
          evaluation: 'dislike',
          feedback: feedbackText,
          successMessage: '反馈已提交，感谢你的建议'
        });
        if (success) {
          this.feedbackDialogVisible = false;
        }
      } finally {
        this.feedbackSubmitting = false;
      }
    },

    handleGlobalClick(e) {
      let target = e.target;

      // 安全检查：确保 parentElement 存在
      if (target.tagName === 'I' && target.parentElement && target.parentElement.classList.contains('copy-btn')) {
        target = target.parentElement;
      }

      // 安全检查：确保 classList 存在
      if (target.classList && target.classList.contains('copy-btn')) {
        const header = target.parentElement;
        if (!header) return;

        const codeWrapper = header.parentElement;
        if (!codeWrapper) return;

        const pre = codeWrapper.querySelector('pre');
        const code = pre ? pre.innerText : '';

        if (code) {
          const fallbackCopy = (content) => {
            const textarea = document.createElement('textarea');
            textarea.value = content;
            textarea.style.position = 'fixed';
            textarea.style.top = '0';
            textarea.style.left = '0';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.focus();
            textarea.select();
            try {
              const successful = document.execCommand('copy');
              if (successful) {
                this.$message.success('复制成功');
              } else {
                this.$message.error('复制失败');
              }
            } catch (err) {
              this.$message.error('复制失败');
            }
            document.body.removeChild(textarea);
          };
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(code).then(() => {
              this.$message.success('复制成功');
            }).catch(() => {
              fallbackCopy(code);
            });
          } else {
            fallbackCopy(code);
          }
        }
      }
    },

    resizeTextarea() {
      const el = this.$refs.inputRef;
      if (!el) return;
      el.style.height = 'auto';
      el.style.height = `${Math.min(el.scrollHeight, this.maxHeight)}px`;
    },



    handleChartDataUpdate(index, newData) {
      console.log('[Text2sql] 收到图表数据更新:', index, newData ? newData.length : 0);
      if (!this.currentMessagesData[index] || !this.currentMessagesData[index].chartData) return;

      const chartInfo = this.currentMessagesData[index].chartData;

      // 更新数据显示 (显示的数据应该是筛选后的数据)
      // 注意：这里我们更新的是 tableData (用于显示的源数据), 而不是 originalTotal (那是总数)
      // 如果没有筛选(newData是完整的)，tableData就等于originalData
      // 如果有筛选，tableData就是筛选后的子集

      // 关键：更新 tableData
      this.$set(chartInfo, 'tableData', newData || []);

      // 重置分页信息
      if (this.tablePaginationMap[index]) {
        this.tablePaginationMap[index].page = 1;
      } else {
        this.$set(this.tablePaginationMap, index, { page: 1, size: 50 });
      }
      this.$forceUpdate();
    },

    scrollToBottom() {
      this.$nextTick(() => {
        const el = this.$refs.scrollRef;
        if (el) el.scrollTop = el.scrollHeight;
      });
    },

    typewriterEffect(fullText, index) {
      if (this.typewriterTimer) clearInterval(this.typewriterTimer);

      const totalLen = fullText.length;

      // 如果文本过长，直接显示，避免打字机长时间占用主线程导致卡顿
      if (totalLen > 3000) {
        this.currentMessagesData[index].displayedContent = fullText;
        this.scrollToBottom();
        return;
      }

      let currentLen = 0;
      // 动态步长：目标在 1~1.5 秒内完成显示
      const targetDuration = 1000;
      const interval = 30; // 约 33fps，大幅降低重绘频率解决滚动下拉卡顿
      const frames = targetDuration / interval;
      const step = Math.max(1, Math.ceil(totalLen / frames));

      this.typewriterTimer = setInterval(() => {
        if (currentLen >= totalLen) {
          this.currentMessagesData[index].displayedContent = fullText;
          clearInterval(this.typewriterTimer);
          this.typewriterTimer = null;
          this.scrollToBottom();
          return;
        }

        currentLen += step;
        if (currentLen > totalLen) currentLen = totalLen; // 防止越界

        if (!this.currentMessagesData[index]) {
          clearInterval(this.typewriterTimer);
          this.typewriterTimer = null;
          return;
        }

        this.currentMessagesData[index].displayedContent = fullText.substring(0, currentLen);
        // 降低滚动频率，跟随更新即可
        this.scrollToBottom();
      }, interval);
    },

    // 生成 UUID (v4)
    generateUUID() {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    },

    // 重新回答：调用后端 /chat/regenerate 接口
    regenerateAnswer(msg) {
      if (this.loading) return;

      // 被暂停的消息没有 messageId，改为把最近的用户消息内容填回输入框
      if (!msg.messageId) {
        const lastUserMsg = [...this.currentMessagesData].reverse().find(m => m.role === 0);
        if (lastUserMsg && lastUserMsg.content) {
          this.userInput = lastUserMsg.content;
          this.$nextTick(() => {
            this.resizeTextarea();
            if (this.$refs.inputRef) this.$refs.inputRef.focus();
          });
        }
        return;
      }

      const sessionId = this.currentChatId;
      if (!this.sessionStates[sessionId]) {
        this.$set(this.sessionStates, sessionId, { loading: false, loadingSeconds: 0, loadingTimer: null, abortController: null, userMsg: null });
      }
      const stateTarget = this.sessionStates[sessionId];

      // 移除该 AI 消息
      const aiIndex = this.currentMessagesData.indexOf(msg);
      if (aiIndex !== -1) {
        this.currentMessagesData.splice(aiIndex, 1);
      }

      // 开始 loading
      stateTarget.loading = true;
      stateTarget.loadingSeconds = 0;
      if (stateTarget.loadingTimer) clearInterval(stateTarget.loadingTimer);
      stateTarget.loadingTimer = setInterval(() => { stateTarget.loadingSeconds++; }, 1000);
      this.scrollToBottom();

      request.post('/chat/regenerate', {
        messageId: msg.messageId,
        dbConfigId: this.selectedDatasourceId || null
      }).then(res => {
        stateTarget.loading = false;
        clearInterval(stateTarget.loadingTimer);
        stateTarget.loadingTimer = null;

        if (res.data.code === '200') {
          const newMsg = res.data.data;
          const aiReplyContent = newMsg.content || '查询完成';
          let generatedSql = '';
          let chartData = null;
          let sqlError = null;

          if (newMsg.extraData) {
            try {
              const extra = typeof newMsg.extraData === 'string' ? JSON.parse(newMsg.extraData) : newMsg.extraData;
              generatedSql = extra.sql || '';
              if (extra.data && extra.columns) {
                chartData = {
                  data: extra.data,
                  tableData: extra.data,
                  originalTotal: extra.data.length,
                  columns: extra.columns,
                  suggestion: extra.suggestion || {},
                  displayedData: [],
                  page: 0,
                  pageSize: 50
                };
                this.initDisplayedData(chartData);
              }
              if (extra.error) sqlError = extra.error;
            } catch (e) {
              console.error('[Text2sql] 重新回答 extraData 解析失败:', e);
            }
          }

          const newMsgIndex = this.currentMessagesData.length;
          this.$set(this.collapsedSqlMap, newMsgIndex, true);
          this.currentMessagesData.push({
            role: 1,
            content: aiReplyContent,
            displayedContent: '',
            generatedSql: generatedSql || null,
            chartData: chartData,
            sqlError: sqlError || null,
            messageId: newMsg.id,
            evaluation: newMsg.evaluation || null,
            feedback: newMsg.feedback || null
          });
          this.typewriterEffect(aiReplyContent, newMsgIndex);
        } else {
          this.currentMessagesData.push({
            role: 1,
            content: `❌ 重新回答失败: ${res.data.msg}`,
            displayedContent: `❌ 重新回答失败: ${res.data.msg}`,
            generatedSql: null,
            chartData: null
          });
          this.scrollToBottom();
        }
      }).catch(err => {
        stateTarget.loading = false;
        clearInterval(stateTarget.loadingTimer);
        stateTarget.loadingTimer = null;

        const errorMsg = err.message || '网络异常';
        this.currentMessagesData.push({
          role: 1,
          content: `❌ 重新回答失败: ${errorMsg}`,
          displayedContent: `❌ 重新回答失败: ${errorMsg}`,
          generatedSql: null,
          chartData: null
        });
        this.scrollToBottom();
      });
    }
  },
  watch: {
    // 监听消息变化，初始化折叠状态
    currentMessagesData: {
      handler(newMessages) {
        newMessages.forEach((msg, index) => {
          // 如果消息有 SQL 且折叠状态未初始化，则默认展开（false = 展开）
          if (msg.role === 1 && msg.generatedSql && this.collapsedSqlMap[index] === undefined) {
            this.$set(this.collapsedSqlMap, index, false); // false = 展开
          }

          // 【新增】如果消息有数据表格且折叠状态未初始化，则默认展开
          if (msg.role === 1 && msg.chartData && msg.chartData.data && this.collapsedTableMap[index] === undefined) {
            this.$set(this.collapsedTableMap, index, false); // false = 展开
          }
        });
      },
      deep: true
    }
  }
};
</script>

<style scoped>
:root {
  --primary-color: #3370ff;
  --primary-hover: #2559d9;
  --bg-sidebar: #f5f7fa;
  --border-color: #e4e7ed;
  --card-hover-border: #3370ff; /* 选中的蓝色 */
  --code-bg: #1e1e1e; /* 更深的背景色 */
  --code-header-bg: #2d2d2d; /* 稍亮的标题栏 */
}

.sql-chat-container {
  display: flex;
  height: calc(100vh - 105px);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  color: #333;
  background-color: #fff;
  overflow: hidden;
}

/* --- 侧边栏 --- */
.chat-sidebar {
  width: 260px;
  background-color: #f0f2f5;
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.04);
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: visible; /* 允许按钮超出侧边栏 */
}

.chat-sidebar.collapsed {
  width: 0;
  border-right: none;
  overflow: visible;
}

.sidebar-content-wrapper {
  width: 260px; /* 固定宽度防止内容挤压 */
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
  transition: opacity 0.2s;
}

.chat-sidebar.collapsed .sidebar-content-wrapper {
  opacity: 0;
  pointer-events: none;
}

.sidebar-toggle-btn {
  position: absolute;
  top: 50%;
  right: -12px;
  transform: translateY(-50%);
  width: 24px;
  height: 48px; /* 垂直胶囊形 */
  background-color: #ffffff;
  border: 1px solid #edf0f5;
  border-radius: 12px; /* 圆润的胶囊圆角 */
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 100;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); /* 极柔和的阴影 */
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  color: #909399;
  font-size: 12px;
  opacity: 0; /* 默认隐藏，看起来更干净 */
  pointer-events: none; /* 隐藏时不阻挡点击 */
}

/* 只有当鼠标悬停在侧边栏边缘区域，或者侧边栏收起时才显示按钮 */
.chat-sidebar:hover .sidebar-toggle-btn,
.chat-sidebar.collapsed .sidebar-toggle-btn {
  opacity: 1;
  pointer-events: auto;
  right: -12px;
}

.sidebar-toggle-btn:hover {
  background-color: #3370ff; /* 悬浮变为主题色 */
  color: #ffffff;
  border-color: #3370ff;
  box-shadow: 0 4px 16px rgba(51, 112, 255, 0.25);
  transform: translateY(-50%) scale(1.05);
}

.sidebar-header {
  padding: 20px;
}

.new-chat-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 10px 0;
  background: linear-gradient(135deg, #3370ff 0%, #2559d9 100%);
  color: white;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 12px rgba(51, 112, 255, 0.2);
}
.new-chat-btn:hover {
  background: linear-gradient(135deg, #2559d9 0%, #1a47c7 100%);
  box-shadow: 0 6px 16px rgba(51, 112, 255, 0.3);
  transform: translateY(-1px);
}

.history-area {
  flex: 1;
  overflow-y: auto;
  padding: 0 10px 20px;
}

.section-label {
  font-size: 12px;
  color: #999;
  margin: 10px 10px 5px;
  font-weight: 600;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.history-item {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  color: #444;
  position: relative;
  border: 1px solid transparent;
  background-color: #fff;
}
.history-item:hover {
  border-color: #d4e0ff;
  background-color: #f0f5ff;
}
.history-item.active {
  background: linear-gradient(135deg, #e8efff 0%, #f0f5ff 100%);
  color: #3370ff;
  border-color: #3370ff;
  box-shadow: 0 2px 8px rgba(51, 112, 255, 0.12);
}
.item-icon {
  font-size: 16px;
  margin-right: 10px;
  color: #666;
}
.history-item.active .item-icon {
  color: #3370ff;
}
.chat-title {
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}
.more-btn {
  display: none;
  font-size: 14px;
  color: #999;
  padding: 2px 6px;
  border-radius: 4px;
}
.more-btn:hover {
  background-color: rgba(51, 112, 255, 0.08);
  color: #3370ff;
}
.history-item:hover .more-btn {
  display: block;
}

/* --- 主区域 --- */
.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
  position: relative;
  background-color: #fff;
  overflow: hidden;
}

/* 顶部数据源Banner */
.current-ds-banner {
  height: 64px;
  background: linear-gradient(to right, #ffffff, #fcfdff);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 24px;
  flex-shrink: 0;
  z-index: 10;
  position: relative;
}
.ds-left {
  display: flex;
  align-items: center;
  font-size: 14px;
  gap: 12px;
}
.ds-label {
  color: #1f2329;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 6px;
}
.ds-label::before {
  content: '';
  display: block;
  width: 4px;
  height: 14px;
  background: #3370ff;
  border-radius: 2px;
}

/* 数据源下拉框样式 */
.ds-select {
  width: 260px;
}
::v-deep .ds-select .el-input__inner {
  border-radius: 20px;
  border: 1px solid transparent; /* 默认无边框 */
  background-color: #f2f3f5; /* 浅灰背景 */
  font-weight: 500;
  padding-left: 16px;
  color: #1f2329;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  height: 36px;
  line-height: 36px;
}
::v-deep .ds-select .el-input__inner::placeholder {
  color: #8f959e;
}
::v-deep .ds-select .el-input__inner:hover {
  background-color: #e4e6eb;
}
::v-deep .ds-select .el-input__inner:focus,
::v-deep .ds-select.is-focus .el-input__inner {
  background-color: #fff;
  border-color: #3370ff;
  box-shadow: 0 0 0 2px rgba(51, 112, 255, 0.1);
}
::v-deep .ds-select .el-input__icon {
  line-height: 36px;
}
.ds-option { display: flex; align-items: center; gap: 8px; }
.ds-option-tag { flex-shrink: 0; }
.ds-option-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* 聊天界面 */
.chat-interface-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
}
.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 40px 0;
  background-color: #fff;
}

.message-list {
  max-width: 1000px;
  margin: 0 auto;
  padding: 0 40px;
}

.message-row {
  display: flex;
  margin-bottom: 40px;
  align-items: flex-start;
  animation: fadeInUp 0.3s ease;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.row-user {
  flex-direction: row-reverse;
}

.avatar-col {
  flex-shrink: 0;
  margin-right: 16px;
}
.row-user .avatar-col {
  margin-right: 0;
  margin-left: 16px;
}

.row-assistant .content-col {
  flex: 1;
  min-width: 0;
}

.avatar {
  width: 36px;
  height: 36px;
  border-radius: 4px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}
.assistant-avatar {
  padding: 2px;
}
.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* 消息气泡 */
.message-bubble {
  max-width: 100%;
  padding: 14px 18px;
  border-radius: 12px;
  font-size: 15px;
  line-height: 1.7;
  position: relative;
  overflow: visible;
  transition: all 0.2s ease;
}

.row-user .message-bubble {
  background: linear-gradient(135deg, #3370ff 0%, #4a85ff 100%);
  color: #ffffff;
  border-radius: 16px 16px 4px 16px;
  box-shadow: 0 4px 12px rgba(51, 112, 255, 0.25), 0 2px 4px rgba(51, 112, 255, 0.1);
  border: none;
}
.row-user .message-bubble:hover {
  box-shadow: 0 6px 16px rgba(51, 112, 255, 0.3), 0 4px 6px rgba(51, 112, 255, 0.15);
  transform: translateY(-1px);
}

.row-assistant .message-bubble {
  background: #ffffff;
  padding: 14px 18px;
  color: #1a1a1a;
  width: 100%;
  border-radius: 4px 16px 16px 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  border: 1px solid #e4e7ed;
}
.row-assistant .message-bubble:hover {
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
  border-color: #dcdfe6;
}

/* AI 消息下方快捷操作栏 */
.message-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 6px;
  padding-left: 2px;
  opacity: 1;
}
.row-user .message-actions {
  justify-content: flex-end;
  padding-left: 0;
  padding-right: 2px;
}
.action-icon {
  cursor: pointer;
  color: #999;
  font-size: 16px;
  padding: 4px;
  border-radius: 4px;
  transition: color 0.2s, background 0.2s;
}
.action-icon:hover {
  color: #3370ff;
  background: rgba(51, 112, 255, 0.06);
}
.action-icon.active {
  color: #1d4ed8;
  background: rgba(29, 78, 216, 0.22);
  box-shadow: inset 0 0 0 1px rgba(29, 78, 216, 0.2);
}
.action-icon.disabled {
  opacity: 0.45;
  pointer-events: none;
}
.action-icon.thumb-down {
  transform: scaleY(-1);
}
.action-icon.thumb-up.active {
  color: #047857;
  background: rgba(4, 120, 87, 0.26);
  box-shadow: inset 0 0 0 1px rgba(4, 120, 87, 0.26);
}
.action-icon.thumb-down.active {
  color: #b91c1c;
  background: rgba(185, 28, 28, 0.24);
  box-shadow: inset 0 0 0 1px rgba(185, 28, 28, 0.24);
}

/* Markdown */
::v-deep .markdown-body p {
  margin-bottom: 1em;
}
::v-deep .markdown-body p:last-child {
  margin-bottom: 0;
}

/* 全屏表格弹窗样式 */
::v-deep .fullscreen-table-dialog {
  display: flex;
  flex-direction: column;
  margin: 0 !important;
  height: 100vh;
}
::v-deep .fullscreen-table-dialog .el-dialog__header {
  padding: 15px 20px;
  border-bottom: 1px solid #ebeef5;
  background-color: #f8f9fc;
}
::v-deep .fullscreen-table-dialog .el-dialog__body {
  flex: 1;
  padding: 20px;
  overflow: hidden;
  background-color: #ffffff;
}
.fullscreen-table-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 15px;
}
.dialog-pagination-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 15px;
  background: #f8f9fa;
  border-radius: 6px;
  border: 1px solid #ebeef5;
}
.dialog-header-left {
  display: flex;
  align-items: center;
}
.dialog-total-info {
  font-size: 14px;
  font-weight: 500;
  color: #606266;
}
::v-deep .fullscreen-btn {
  cursor: pointer;
  color: #999;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 4px;
}
::v-deep .fullscreen-btn:hover {
  color: #3370ff;
  background-color: rgba(51, 112, 255, 0.1);
}

/* 代码块样式 */
/* 代码块容器 - Quiet Light 浅色主题 */
::v-deep .code-block-wrapper {
  margin: 16px 0;
  border-radius: 8px;
  overflow: hidden;
  background-color: #f5f5f5 !important; /* Quiet Light 背景 */
  border: 1px solid #e0e0e0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

::v-deep .code-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #ededed !important; /* 浅色标题栏 */
  padding: 10px 16px;
  color: #5c6b7f;
  font-size: 13px;
  border-bottom: 1px solid #e0e0e0;
}

::v-deep .lang-tag {
  font-weight: 600;
  text-transform: uppercase;
  display: flex;
  align-items: center;
  gap: 8px;
}
/* Mac 风格窗口点 */
::v-deep .lang-tag::before {
  content: '';
  display: block;
  width: 54px;
  height: 14px;
  background: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="54" height="14" viewBox="0 0 54 14"><circle cx="7" cy="7" r="6" fill="%23FF5F56"/><circle cx="27" cy="7" r="6" fill="%23FFBD2E"/><circle cx="47" cy="7" r="6" fill="%2327C93F"/></svg>') no-repeat center;
  margin-right: 12px;
}

::v-deep .copy-btn {
  cursor: pointer;
  color: #999;
  transition: color 0.2s;
  display: flex;
  align-items: center;
}
::v-deep .copy-btn:hover {
  color: #3370ff;
}

/* 代码区域 */
::v-deep .hljs-pre {
  margin: 0;
  padding: 20px;
  background-color: #f5f5f5 !important;
  color: #383a42; /* 深色文字 */
  overflow-x: auto;
  font-family: 'JetBrains Mono', 'Consolas', 'Monaco', monospace;
  font-size: 14px;
  line-height: 1.6;
  border: none;
  border-radius: 0 0 8px 8px;
}

::v-deep .hljs {
  background: transparent !important;
  padding: 0;
  color: #383a42;
}

/* Quiet Light SQL 语法高亮 */
/* 关键字: 紫色 */
::v-deep .hljs-keyword,
::v-deep .hljs-selector-tag,
::v-deep .hljs-built_in,
::v-deep .hljs-name,
::v-deep .hljs-tag {
  color: #a626a4 !important;
}

/* 字符串: 绿色 */
::v-deep .hljs-string,
::v-deep .hljs-title,
::v-deep .hljs-section,
::v-deep .hljs-attribute,
::v-deep .hljs-literal,
::v-deep .hljs-template-tag,
::v-deep .hljs-template-variable,
::v-deep .hljs-type,
::v-deep .hljs-addition {
  color: #50a14f !important;
}

/* 数字: 橙色 */
::v-deep .hljs-number,
::v-deep .hljs-symbol,
::v-deep .hljs-bullet,
::v-deep .hljs-meta {
  color: #986801 !important;
}

/* 注释: 浅灰 */
::v-deep .hljs-comment,
::v-deep .hljs-quote,
::v-deep .hljs-deletion {
  color: #a0a1a7 !important;
  font-style: italic;
}

/* 函数名: 蓝色 */
::v-deep .hljs-function {
  color: #4078f2 !important;
}

/* 覆盖可能冲突的旧样式 */
::v-deep pre {
  margin: 0;
  border: none;
  background-color: transparent !important;
  padding: 0;
}

/* 底部输入区 */
.input-area-wrapper {
  flex-shrink: 0;
  width: 100%;
  background: #fff;
  padding: 20px 20px 80px; /* 增加底部留白 */
  border-top: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  align-items: center;
  z-index: 10;
}

.input-box {
  position: relative;
  width: 100%;
  max-width: 920px; /* 调整宽度 */
  background: #fff;
  border: 1px solid #c0c4cc;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  border-radius: 12px;
  padding: 12px 48px 12px 16px;
  transition: all 0.2s;
}
.input-box:focus-within {
  border-color: #3370ff;
  box-shadow: 0 4px 16px rgba(51, 112, 255, 0.2);
  transform: translateY(-1px);
}

.chat-input {
  width: 100%;
  border: none;
  outline: none;
  resize: none;
  font-size: 16px;
  color: #333;
  background: transparent;
  max-height: 200px;
  overflow-y: auto;
  line-height: 1.5;
}

.input-actions {
  position: absolute;
  bottom: 8px;
  right: 8px;
}

.send-icon-btn {
  width: 32px;
  height: 32px;
  background: linear-gradient(135deg, #3370ff 0%, #2559d9 100%);
  border: none;
  border-radius: 8px;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.send-icon-btn:disabled {
  background: #f0f0f0;
  color: #ccc;
  cursor: not-allowed;
}
.send-icon-btn:not(:disabled):hover {
  background: linear-gradient(135deg, #2559d9 0%, #1a47c7 100%);
  box-shadow: 0 4px 12px rgba(51, 112, 255, 0.4);
  transform: translateY(-2px) scale(1.05);
}
.send-icon-btn:active {
  transform: translateY(0) scale(0.95);
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 80%;
  text-align: center;
  max-width: 680px;
  margin: 0 auto;
  padding-top: 40px;
}
.empty-icon {
  width: 80px;
  height: 80px;
  margin-bottom: 20px;
}
.empty-icon img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.empty-title { font-size: 24px; font-weight: 600; margin-bottom: 10px; color: #333; }
.empty-desc { color: #666; margin-bottom: 40px; font-size: 15px; }

.suggestion-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  width: 100%;
}
.suggestion-card {
  background: #f9f9f9;
  border: 1px solid #dcdfe6;
  border-radius: 10px;
  padding: 16px;
  text-align: left;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  animation: slideUpFade 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) backwards;
}
.suggestion-card:nth-child(1) { animation-delay: 0.1s; }
.suggestion-card:nth-child(2) { animation-delay: 0.2s; }
.suggestion-card:nth-child(3) { animation-delay: 0.3s; }

.suggestion-card:hover {
  background: #fff;
  border-color: #3370ff;
  box-shadow: 0 8px 20px rgba(51, 112, 255, 0.15);
  transform: translateY(-4px);
}

@keyframes slideUpFade {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.card-title { font-weight: 600; font-size: 14px; margin-bottom: 6px; color: #333; }
.card-desc { font-size: 12px; color: #888; line-height: 1.4; }

/* Loading */
.loading-bubble {
  padding: 10px 16px;
  background: #f0f0f0;
  border-radius: 8px;
  width: fit-content;
}
.dot-typing {
  position: relative;
  left: -9999px;
  width: 6px;
  height: 6px;
  border-radius: 5px;
  background-color: #9880ff;
  color: #9880ff;
  box-shadow: 9984px 0 0 0 #9880ff, 9999px 0 0 0 #9880ff, 10014px 0 0 0 #9880ff;
  animation: dotTyping 1.5s infinite linear;
  margin-left: 15px;
  margin-top: 10px;
}
.loading-content {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #666;
  font-size: 14px;
}
.loading-bubble .dot-typing {
  margin-top: 0;
  margin-left: 15px;
  color: #666;
  box-shadow: 9984px 0 0 0 #666, 9999px 0 0 0 #666, 10014px 0 0 0 #666;
  background-color: #666;
}
@keyframes dotTyping {
  0% { box-shadow: 9984px 0 0 0 #9880ff, 9999px 0 0 0 #9880ff, 10014px 0 0 0 #9880ff; }
  16.667% { box-shadow: 9984px -6px 0 0 #9880ff, 9999px 0 0 0 #9880ff, 10014px 0 0 0 #9880ff; }
  33.333% { box-shadow: 9984px 0 0 0 #9880ff, 9999px -6px 0 0 #9880ff, 10014px 0 0 0 #9880ff; }
  50% { box-shadow: 9984px 0 0 0 #9880ff, 9999px 0 0 0 #9880ff, 10014px -6px 0 0 #9880ff; }
  66.667% { box-shadow: 9984px 0 0 0 #9880ff, 9999px 0 0 0 #9880ff, 10014px 0 0 0 #9880ff; }
  83.333% { box-shadow: 9984px 0 0 0 #9880ff, 9999px 0 0 0 #9880ff, 10014px 0 0 0 #9880ff; }
  100% { box-shadow: 9984px 0 0 0 #9880ff, 9999px 0 0 0 #9880ff, 10014px 0 0 0 #9880ff; }
}

.action-btn {
  background: linear-gradient(135deg, #3370ff 0%, #2559d9 100%);
  border: none;
  font-weight: 500;
  box-shadow: 0 2px 6px rgba(51, 112, 255, 0.2);
  transition: all 0.3s;
}
.action-btn:hover {
  background: linear-gradient(135deg, #2559d9 0%, #1a47c7 100%);
  box-shadow: 0 4px 12px rgba(51, 112, 255, 0.3);
  transform: translateY(-1px);
}

.chat-history-popover { padding: 4px 0 !important; min-width: 100px !important; }
.history-actions .action-item { padding: 8px 16px; cursor: pointer; font-size: 13px; color: #333; display: flex; align-items: center; gap: 8px; }
.history-actions .action-item:hover { background-color: #f5f7fa; color: #10a37f; }
.history-actions .action-item.delete:hover { color: #ff4d4f; background-color: #fff1f0; }

/* Table Wrapper */
.result-table-wrapper {
  margin-top: 16px;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid #e4e7ed;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  background: #fff;
}

::v-deep .custom-table {
  width: 100%;
}

/* 表头样式 */
::v-deep .custom-table th {
  background-color: #f8fcff !important;
  color: #1f2329;
  font-weight: 600;
  border-bottom: 1px solid #e4e7ed;
  height: 48px;
}

/* 单元格样式 */
::v-deep .custom-table td {
  padding: 12px 0;
  border-bottom: 1px solid #f0f2f5;
  color: #606266;
}

/* 去除 Element UI 默认的竖线边框，保持干净 */
::v-deep .custom-table::before {
  display: none;
}
::v-deep .el-table--border::after,
::v-deep .el-table--group::after,
::v-deep .el-table::before {
  display: none;
}

/* 悬停效果 */
::v-deep .custom-table .el-table__body tr:hover > td {
  background-color: #f0f7ff !important;
}

/* 滚动条美化 */
::v-deep .el-table__body-wrapper::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
::v-deep .el-table__body-wrapper::-webkit-scrollbar-thumb {
  background: #dcdfe6;
  border-radius: 4px;
}
::v-deep .el-table__body-wrapper::-webkit-scrollbar-track {
  background: transparent;
}

/* 停止按钮样式优化 */
.stop-btn-inner {
  cursor: pointer !important;
}

.stop-btn-inner i {
  cursor: pointer !important;
  transition: all 0.3s ease;
}

.stop-btn-inner:hover i {
  color: #ff4d4f;
  transform: scale(1.1);
}

/* SQL 折叠组件样式 - 简洁设计 */
.sql-response {
  width: 100%;
}

.sql-response .code-block-wrapper {
  margin: 0;
  border-radius: 8px;
  overflow: hidden;
  background-color: #f5f5f5 !important;
  border: 1px solid #e0e0e0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

/* SQL 内容区域 */
.sql-content {
  overflow: hidden;
}

/* 折叠过渡动画 */
.sql-collapse-enter-active,
.sql-collapse-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  max-height: 600px;
  opacity: 1;
}

.sql-collapse-enter,
.sql-collapse-leave-to {
  max-height: 0;
  opacity: 0;
  transform: translateY(-10px);
}

/* 代码块顶部栏样式 */
.sql-response .code-header {
  background: #ededed !important;
  padding: 10px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #e0e0e0;
}

/* 恢复 Mac 风格窗口点（lang-tag的伪元素） */
.sql-response .lang-tag::before {
  content: '';
  display: block;
  width: 54px;
  height: 14px;
  background: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="54" height="14" viewBox="0 0 54 14"><circle cx="7" cy="7" r="6" fill="%23FF5F56"/><circle cx="27" cy="7" r="6" fill="%23FFBD2E"/><circle cx="47" cy="7" r="6" fill="%2327C93F"/></svg>') no-repeat center;
  margin-right: 12px;
}


/* 显示 lang-tag */
.sql-response .lang-tag {
  font-weight: 600;
  text-transform: uppercase;
  display: flex;
  align-items: center;
  gap: 8px;
  color: #5c6b7f;
  font-size: 13px;
}

/* -------------------------- */
/* 【新增】数据表格样式 */
/* -------------------------- */
.data-table-wrapper {
  width: 100%;
  margin: 16px 0;
  border-radius: 8px;
  overflow: hidden;
  background-color: #fff;
  border: 1px solid #e0e0e0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.data-table-wrapper .table-header {
  background: #f5f7fa;
  padding: 10px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #ebeef5;
}

.data-table-wrapper .header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.data-table-wrapper .table-tag {
  font-weight: 600;
  color: #606266;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.data-table-wrapper .table-count {
  color: #909399;
  font-size: 12px;
  font-weight: normal;
}

.data-table-wrapper .header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.data-table-wrapper .action-btn,
.data-table-wrapper .collapse-btn {
  color: #909399;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
  padding: 4px;
  border-radius: 4px;
}

.data-table-wrapper .action-btn:hover,
.data-table-wrapper .collapse-btn:hover {
  background-color: rgba(0, 0, 0, 0.05);
  color: #409eff;
}

.data-table-wrapper .table-content {
  overflow: hidden;
}

/* 表头内嵌分页器 */
.header-pagination {
  display: flex;
  align-items: center;
}

/* 去掉 Element UI 小型分页器默认 margin */
::v-deep .header-pagination .el-pager,
::v-deep .header-pagination .el-pagination__prev,
::v-deep .header-pagination .el-pagination__next {
  margin: 0;
}

/* 上一页 / 下一页按钮缩小 */
::v-deep .header-pagination .btn-prev,
::v-deep .header-pagination .btn-next {
  min-width: 24px;
  height: 24px;
  line-height: 24px;
  padding: 0 4px;
  background: transparent !important;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  color: #606266;
  transition: all 0.2s;
}

::v-deep .header-pagination .btn-prev:hover,
::v-deep .header-pagination .btn-next:hover {
  border-color: #3370ff;
  color: #3370ff;
}

/* 页码显示文字 */
.header-page-info {
  display: inline-block;
  padding: 0 8px;
  font-size: 12px;
  color: #606266;
  white-space: nowrap;
  line-height: 24px;
}


/* 表格折叠动画 */
.table-collapse-enter-active,
.table-collapse-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  max-height: 500px;
  opacity: 1;
}

.table-collapse-enter,
.table-collapse-leave-to {
  max-height: 0;
  opacity: 0;
  transform: translateY(-10px);
}

/* Header 右侧操作按钮组 */
.sql-response .header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* 复制按钮和折叠按钮共用样式 */
.sql-response .copy-btn,
.sql-response .collapse-btn,
.sql-response .download-btn {
  cursor: pointer;
  color: #999;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  font-size: 16px;
  padding: 4px 6px;
  border-radius: 4px;
  background: transparent;
}

.sql-response .copy-btn:hover,
.sql-response .collapse-btn:hover,
.sql-response .download-btn:hover {
  color: #3370ff;
  background: rgba(51, 112, 255, 0.08);
}

.sql-response .collapse-btn i {
  transition: transform 0.3s ease;
}

/* SQL 内容区域 */
.sql-content {
  overflow: hidden;
}

.sql-content .hljs-pre {
  margin: 0;
  padding: 20px;
  background-color: #f5f5f5 !important;
  color: #383a42;
  overflow-x: auto;
  font-family: 'JetBrains Mono', 'Consolas', 'Monaco', monospace;
  font-size: 14px;
  line-height: 1.6;
  border: none;
}

/* 空结果提示词 */
.empty-result-hint {
  margin-top: 10px;
  padding: 10px 14px;
  background: #fff8f0;
  border-left: 4px solid #e6a23c;
  border-radius: 4px;
}

.empty-hint-main {
  font-size: 14px;
  color: #875400;
  font-weight: 500;
  line-height: 1.6;
}

.empty-hint-main .el-icon-warning-outline {
  color: #e6a23c;
  margin-right: 4px;
}

.empty-hint-sub {
  margin-top: 4px;
  font-size: 12px;
  color: #999;
  line-height: 1.6;
}

/* SQL 执行错误提示块 */
.sql-exec-error {
  margin-bottom: 10px;
  padding: 10px 14px;
  background: #fff2f2;
  border-left: 4px solid #f56c6c;
  border-radius: 4px;
}

.sql-error-header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 600;
  color: #c0392b;
  margin-bottom: 6px;
}

.sql-error-header .el-icon-circle-close {
  font-size: 16px;
  color: #f56c6c;
}

.sql-error-body {
  font-size: 13px;
  color: #7d3030;
  line-height: 1.6;
  word-break: break-all;
  white-space: pre-wrap;
  background: #fde8e8;
  border-radius: 3px;
  padding: 6px 10px;
  font-family: 'Consolas', 'Monaco', monospace;
}

.sql-error-tip {
  margin-top: 6px;
  font-size: 12px;
  color: #999;
  line-height: 1.5;
}

/* FAQ 常见问题面板 */
.faq-panel {
  width: 100%;
  max-width: 920px;
  margin-bottom: 10px;
  border: 1px solid #dde1f0;
  border-radius: 12px;
  background: #fff;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(51, 112, 255, 0.06);
}
.faq-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 11px 18px;
  cursor: pointer;
  user-select: none;
  background: #f4f6ff;
  transition: background 0.2s;
}
.faq-header:hover { background: #eaedff; }
.faq-header-title {
  font-size: 14px;
  font-weight: 500;
  color: #3370ff;
  display: flex;
  align-items: center;
  gap: 6px;
}
.faq-icon { font-size: 15px; margin-right: 2px; }
.faq-arrow { font-size: 13px; color: #3370ff; }

.faq-body { padding: 14px 16px 14px; border-top: 1px solid #dde1f0; background: #fff; }

/* 下拉框：全宽，高度与 input 视觉保持一致 */
.faq-category-select { width: 100%; }
::v-deep .faq-category-select .el-input__inner {
  height: 40px;
  line-height: 40px;
  border-radius: 8px;
  border-color: #dde1f0;
  font-size: 14px;
  color: #303133;
  background: #f8f9ff;
}
::v-deep .faq-category-select .el-input__inner:focus {
  border-color: #3370ff;
}

/* 示例列表区域 */
.faq-examples { margin-top: 12px; }

.faq-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.faq-list-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 9px 12px;
  font-size: 14px;
  color: #404040;
  cursor: pointer;
  border-radius: 8px;
  line-height: 1.55;
  border-left: 3px solid transparent;
  transition: all 0.16s ease;
}
.faq-list-item:hover {
  background: #edf0ff;
  border-left-color: #3370ff;
  color: #1a56db;
}
.faq-idx {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  line-height: 20px;
  text-align: center;
  font-size: 12px;
  font-weight: 600;
  color: #3370ff;
  background: #e8eeff;
  border-radius: 50%;
  margin-top: 1px;
}

/* 底部行 */
.faq-footer {
  margin-top: 10px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
}
.faq-refresh-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 13px;
  color: #3370ff;
  cursor: pointer;
  padding: 5px 14px;
  border-radius: 20px;
  border: 1px solid #b3c6ff;
  transition: all 0.18s;
  background: #f0f4ff;
  user-select: none;
  font-weight: 500;
}
.faq-refresh-btn:hover {
  background: #3370ff;
  color: #fff;
  border-color: #3370ff;
}
/* 题库已全部展示过后，按钮变为橙色"再来一轮"样式 */
.faq-refresh-btn.faq-refresh-restart {
  color: #e6a23c;
  background: #fdf6ec;
  border-color: #f5dab1;
}
.faq-refresh-btn.faq-refresh-restart:hover {
  background: #e6a23c;
  color: #fff;
  border-color: #e6a23c;
}
.faq-page-info {
  font-size: 12px;
  color: #909399;
}

.faq-loading, .faq-empty {
  margin-top: 10px;
  padding: 14px 0;
  font-size: 13px;
  color: #909399;
  text-align: center;
}

/* 展开折叠动画 */
.faq-expand-enter-active, .faq-expand-leave-active {
  transition: opacity 0.25s ease, max-height 0.3s ease;
  max-height: 600px;
  overflow: hidden;
}
.faq-expand-enter, .faq-expand-leave-to { opacity: 0; max-height: 0; }

/* 点踩反馈弹窗 */
::v-deep .feedback-dialog {
  border-radius: 16px;
  overflow: hidden;
}
::v-deep .feedback-dialog .el-dialog__header {
  padding: 18px 22px 10px;
}
::v-deep .feedback-dialog .el-dialog__title {
  font-size: 26px;
  font-weight: 600;
  color: #1f2329;
}
::v-deep .feedback-dialog .el-dialog__body {
  padding: 10px 22px 12px;
}
::v-deep .feedback-dialog .el-dialog__footer {
  padding: 10px 22px 22px;
}
.feedback-dialog-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.feedback-reason-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.feedback-reason-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 30px;
  padding: 0 14px;
  font-size: 14px;
  color: #606266;
  border: 1px solid #dcdfe6;
  border-radius: 15px;
  cursor: pointer;
  transition: all 0.2s ease;
  user-select: none;
}
.feedback-reason-tag:hover {
  color: #3370ff;
  border-color: #3370ff;
  background: #f5f8ff;
}
.feedback-reason-tag.active {
  color: #3370ff;
  border-color: #3370ff;
  background: #edf3ff;
}
::v-deep .feedback-textarea .el-textarea__inner {
  min-height: 156px !important;
  border-radius: 14px;
  border-color: #6f84ff;
  font-size: 16px;
  line-height: 1.5;
  color: #4f5665;
}
::v-deep .feedback-textarea .el-textarea__inner:focus {
  border-color: #4c67ff;
  box-shadow: 0 0 0 2px rgba(76, 103, 255, 0.08);
}
::v-deep .feedback-textarea .el-input__count {
  background: transparent;
  right: 10px;
  bottom: 8px;
}
::v-deep .feedback-dialog .dialog-footer {
  display: inline-flex;
  align-items: center;
  gap: 12px;
}

</style>
