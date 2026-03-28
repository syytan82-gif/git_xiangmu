<template>
  <div class="rag-chat-container">

    <div class="chat-sidebar" :class="{ 'collapsed': !isSidebarOpen }">
      <!-- 侧边栏内容容器 -->
      <div class="sidebar-content-wrapper">
        <div class="sidebar-header">
          <div class="new-chat-btn" @click="createNewChat(true)">
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
      <div class="chat-interface-wrapper">

        <div class="messages-container" ref="scrollRef" v-loading="historyLoading" element-loading-text="加载历史记录中...">
          <div v-if="currentMessages.length === 0 && !loading" class="empty-state">
            <div class="empty-icon">
              <img src="@/assets/imgs/RAG.png" alt="Logo">
            </div>
            <h2 class="empty-title">知识问答助手</h2>
            <p class="empty-desc">
              基于您的企业知识库,为您提供精准的问答服务。
            </p>

            <div class="suggestion-grid">
              <div class="suggestion-card" @click="fillInput('工龄奖金如何计算?发放条件是什么?')">
                <div class="card-title">薪酬制度</div>
                <div class="card-desc">工龄奖金如何计算?发放条件是什么?</div>
              </div>
              <div class="suggestion-card" @click="fillInput('在出现主轴过热故障时，应如何调整切削参数?')">
                <div class="card-title">设备维护</div>
                <div class="card-desc">在出现主轴过热故障时，应如何调整切削参数?</div>
              </div>
              <div class="suggestion-card" @click="fillInput('8200是什么故障?')">
                <div class="card-title">故障诊断</div>
                <div class="card-desc">8200是什么故障?</div>
              </div>
            </div>
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
                  <div class="markdown-body" v-html="renderContent(msg.displayedContent || msg.content)"></div>
                </div>
                <!-- 消息下方操作按钮 -->
                <div class="message-actions">
                  <el-tooltip v-if="msg.role === 1 && index === lastAiIndex && !loading" content="重新回答" placement="top" :open-delay="500">
                    <i class="el-icon-refresh action-icon" @click="regenerateAnswer(index)"></i>
                  </el-tooltip>
                  <el-tooltip content="复制" placement="top" :open-delay="500">
                    <i class="el-icon-document-copy action-icon" @click="copyContent(msg.content)"></i>
                  </el-tooltip>
                  <el-popover
                      v-if="msg.role === 1 && msg.referDoc && Object.keys(msg.referDoc).length > 0"
                      placement="bottom-start"
                      trigger="click"
                      popper-class="refer-doc-popover"
                      :visible-arrow="true"
                  >
                    <div class="refer-doc-list">
                      <div
                          v-for="(docName, docId) in msg.referDoc"
                          :key="docId"
                          class="refer-doc-item"
                          @click="openReferDoc(docId, docName)"
                      >
                        <i class="el-icon-link"></i>
                        <span class="refer-doc-name">{{ docName }}</span>
                      </div>
                    </div>
                    <el-tooltip slot="reference" content="参考文档" placement="top" :open-delay="500">
                      <i class="el-icon-document action-icon"></i>
                    </el-tooltip>
                  </el-popover>
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
                    <span>正在检索知识库... {{ loadingSeconds }}s</span>
                     <div class="dot-typing"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="input-area-wrapper">
          <div class="input-box">
            <textarea
                v-model="userInput"
                ref="inputRef"
                class="chat-input"
                placeholder="请输入您的问题..."
                rows="1"
                @keydown.enter.exact.prevent="handleSend"
                @input="resizeTextarea"
            ></textarea>
            <div class="input-actions">
              <button
                  class="send-icon-btn"
                  :class="{ 'is-stopping': isStopping }"
                  :disabled="!userInput.trim() && !loading"
                  @click="loading ? stopChat() : handleSend()"
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

    <!-- PDF 预览弹窗 -->
    <el-dialog
        :title="pdfPreviewTitle"
        :visible.sync="pdfPreviewVisible"
        width="80%"
        top="5vh"
        custom-class="pdf-preview-dialog"
        :close-on-click-modal="true"
        :destroy-on-close="true"
        @close="closePdfPreview"
    >
      <div class="pdf-preview-body" v-loading="pdfLoading" element-loading-text="正在加载文档...">
        <iframe
            v-if="pdfPreviewUrl"
            :src="pdfPreviewUrl"
            class="pdf-iframe"
            frameborder="0"
        ></iframe>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { marked } from 'marked';
import hljs from 'highlight.js';
import 'highlight.js/styles/atom-one-dark.css'; 
import axios from 'axios';

const request = axios.create({
  baseURL: process.env.VUE_APP_RAG_BASEURL,
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

// 专用于 RAG 的请求实例
const ragRequest = axios.create({
  baseURL: process.env.VUE_APP_RAG_BASEURL, 
  timeout: 300000
});

ragRequest.interceptors.request.use(config => {
  // 检测是否是 FormData（文件上传）
  const isFormData = config.data instanceof FormData;
  
  if (!isFormData && !config.headers['Content-Type']) {
    config.headers['Content-Type'] = 'application/json;charset=utf-8';
  }
  
  // ngrok 需要此请求头来绕过警告页面
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

ragRequest.interceptors.response.use(response => {
  return response;
}, error => {
  console.error('RAG API Error:', error);
  return Promise.reject(error);
});

export default {
  name: 'RagChat',
  data() {
    return {
      isSidebarOpen: true, // 控制侧边栏展开/收起
      currentChatId: null,
      userInput: '',
      loading: false,
      allSessions: [],
      currentMessagesData: [],
      minHeight: 24,
      maxHeight: 200,
      loadingTimer: null,
      loadingSeconds: 0,
      historyLoading: false,
      typewriterTimer: null,
      currentTaskId: null, // 当前任务的 UUID
      isStopping: false, // 标记是否正在暂停
      pdfPreviewVisible: false,
      pdfPreviewUrl: '',
      pdfPreviewTitle: '文档预览',
      pdfLoading: false,
    };
  },
  computed: {
    userHistory() { return this.allSessions; },
    currentMessages() { return this.currentMessagesData; },
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

    marked.setOptions({
      renderer: renderer,
      highlight: null
    });

    document.addEventListener('click', this.handleGlobalClick);
    this.loadUserHistory();
    this.resizeTextarea();
  },
  beforeDestroy() {
    document.removeEventListener('click', this.handleGlobalClick);
    if (this.loadingTimer) clearInterval(this.loadingTimer);
    if (this.typewriterTimer) clearInterval(this.typewriterTimer);
    // 释放 PDF blob URL
    if (this.pdfPreviewUrl) {
      URL.revokeObjectURL(this.pdfPreviewUrl);
    }
  },
  methods: {

    loadUserHistory() {
      // Assuming history is still on main backend or not implemented on RAG yet
      // If RAG supports it, switch to ragRequest
      request.get('/chat/sessions', {
        params: { module: 'QA' }
      }).then(res => {
        if (res.data.code === '200') {
          this.allSessions = res.data.data || [];
          if (this.allSessions.length === 0) {
             this.createNewChat(false);
          }
        }
      });
    },

    switchChat(chatId) {
      if (this.currentChatId === chatId) return;
      this.currentChatId = chatId;
      this.loadSessionMessages(chatId);
    },

    loadSessionMessages(chatId) {
      this.historyLoading = true;
      this.currentMessagesData = [];
      request.get('/chat/messages', {
        params: { sessionId: chatId }
      }).then(res => {
        this.historyLoading = false;
        if (res.data.code === '200') {
          const list = res.data.data || [];
          // 从缓存中获取该会话的 referDoc
          const cachedReferDocs = this.getReferDocCache(chatId);
          this.currentMessagesData = list.map(item => {
            // 优先使用接口返回的 referDoc，若无则从本地缓存恢复
            const referDoc = item.referDoc || (cachedReferDocs && cachedReferDocs[item.id]) || null;
            return {
              role: item.role === 'user' ? 0 : 1,
              content: item.content,
              displayedContent: item.content,
              messageId: item.id,
              referDoc: referDoc
            };
          });
          this.scrollToBottom();
        } else {
          this.$message.error(res.data.msg);
        }
      }).catch(() => {
        this.historyLoading = false;
      });
    },

    createNewChat(focus = true) {
      this.currentChatId = null;
      this.currentMessagesData = [];
      if (focus) {
        this.$nextTick(() => {
          if(this.$refs.inputRef) this.$refs.inputRef.focus();
        });
      }
    },

    handleSend() {
      const content = this.userInput.trim();
      if (!content || this.loading) return;

      this.currentMessagesData.push({ role: 0, content: content, messageId: null });
      this.userInput = '';
      this.resizeTextarea();
      this.scrollToBottom();
      
      this.loading = true;
      this.loadingSeconds = 0;
      this.isStopping = false; // 重置暂停状态
      if (this.loadingTimer) clearInterval(this.loadingTimer);
      this.loadingTimer = setInterval(() => { this.loadingSeconds++; }, 1000);

      // 生成唯一的 taskId
      this.currentTaskId = this.generateUUID();

      const params = {
        sessionId: this.currentChatId || null,
        module: "QA",
        content: content,
        taskId: this.currentTaskId
      };

      // 记录发送前是否为新会话
      const isFirstRound = !this.currentChatId;

      ragRequest.post('/chat/send', params).then(res => {
        this.loading = false;
        this.currentTaskId = null; // 清空任务 ID
        clearInterval(this.loadingTimer);
        this.loadingTimer = null;
        
        if (res.data.code === '200') {
          const dataList = res.data.data;
          // 后端返回 [userMsg, aiMsg] 数组
          const userMsg = dataList.find(m => m.role === 'user');
          const aiMsg = dataList.find(m => m.role === 'assistant');
          
          if (!aiMsg) return;

          // 回填用户消息的 messageId
          if (userMsg && userMsg.id) {
            const lastUserMsg = this.currentMessagesData[this.currentMessagesData.length - 1];
            if (lastUserMsg && lastUserMsg.role === 0) {
              lastUserMsg.messageId = userMsg.id;
            }
          }
          
          if (!this.currentChatId && aiMsg.sessionId) {
            this.currentChatId = aiMsg.sessionId;
          }

          const replyContent = aiMsg.content || '';
          
          // 如果是首轮对话，需要刷新侧边栏以显示新生成的会话标题
          if (isFirstRound) {
            this.refreshHistoryList();
          }
          
          // 缓存 referDoc 到 localStorage
          if (aiMsg.referDoc && Object.keys(aiMsg.referDoc).length > 0 && aiMsg.id && this.currentChatId) {
            this.saveReferDocCache(this.currentChatId, aiMsg.id, aiMsg.referDoc);
          }

          if (replyContent === '已终止生成。') {
            this.currentMessagesData.push({ 
              role: 1, 
              content: replyContent,
              displayedContent: replyContent,
              messageId: aiMsg.id,
              referDoc: aiMsg.referDoc || null
            });
          } else {
            const newMsgIndex = this.currentMessagesData.length;
            
            this.currentMessagesData.push({ 
              role: 1, 
              content: replyContent,
              displayedContent: '',
              messageId: aiMsg.id,
              referDoc: aiMsg.referDoc || null
            });
            
            this.typewriterEffect(replyContent, newMsgIndex);
          }

        } else {
          this.currentMessagesData.push({ role: 1, content: `❌ 请求失败: ${res.data.msg}`, displayedContent: `❌ 请求失败: ${res.data.msg}` });
        }
      }).catch(err => {
         this.loading = false;
         this.currentTaskId = null; // 清空任务 ID
         clearInterval(this.loadingTimer);
         this.loadingTimer = null;
         let errorMsg = '网络连接异常';
         if (err.message && err.message.includes('timeout')) errorMsg = '请求超时';
         this.currentMessagesData.push({ role: 1, content: `❌ ${errorMsg}`, displayedContent: `❌ ${errorMsg}` });
      });
    },

    deleteChat(chatId) {
      this.$confirm('确认删除该对话吗？', '提示', { type: 'warning' }).then(() => {
        request.delete(`/chat/session/${chatId}`).then(res => {
          if (res.data.code === '200') {
            this.$message.success('删除成功');
            // 同时清除该会话的 referDoc 缓存
            this.deleteReferDocCache(chatId);
            this.allSessions = this.allSessions.filter(s => s.id !== chatId);
            if (this.currentChatId === chatId) {
              this.createNewChat(false);
              if (this.allSessions.length > 0) this.switchChat(this.allSessions[0].id);
            }
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
      request.get('/chat/sessions', { params: { module: 'QA' } }).then(res => {
         if (res.data.code === '200') this.allSessions = res.data.data || [];
      });
    },

    fillInput(text) {
      this.userInput = text;
      this.$refs.inputRef.focus();
      this.$nextTick(this.resizeTextarea);
    },

    renderContent(content) {
      if (!content) return '';
      return marked.parse(content);
    },

    copyContent(text) {
      if (!text) return;
      navigator.clipboard.writeText(text).then(() => {
        this.$message.success('已复制到剪贴板');
      });
    },

    handleGlobalClick(e) {
      let target = e.target;
      // 安全检查：确保 parentElement 存在
      if (target.tagName === 'I' && target.parentElement && target.parentElement.classList.contains('copy-btn')) {
        target = target.parentElement;
      }
      // 安全检查：确保 target 有 classList 属性
      if (target.classList && target.classList.contains('copy-btn')) {
        const header = target.parentElement;
        const codeWrapper = header ? header.parentElement : null;
        const pre = codeWrapper ? codeWrapper.querySelector('pre') : null;
        const code = pre ? pre.innerText : '';
        if (code) {
          navigator.clipboard.writeText(code).then(() => this.$message.success('复制成功'));
        }
      }
    },

    resizeTextarea() {
      const el = this.$refs.inputRef;
      if (!el) return;
      el.style.height = 'auto';
      el.style.height = `${Math.min(el.scrollHeight, this.maxHeight)}px`;
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
      // 动态步长：目标在 0.5 秒左右快速完成显示（加快打字速度）
      const targetDuration = 500; 
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

        // 防御性编程：防止在打字期间切换/清空对话列表导致找不到下标
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

    // 暂停对话
    stopChat() {
      if (!this.currentTaskId) {
        this.$message.warning('没有正在进行的任务');
        return;
      }

      // 立即设置为正在暂停状态，按钮变灰
      this.isStopping = true;

      const params = {
        taskId: this.currentTaskId
      };

      ragRequest.post('/chat/stop', params).then(res => {
        if (res.data.code === '200') {
          // 停止计时
          this.loading = false;
          clearInterval(this.loadingTimer);
          this.loadingTimer = null;
          this.currentTaskId = null;
        } else {
          this.$message.error(res.data.msg || '暂停失败');
        }
        // 无论成功或失败，都重置暂停状态
        this.isStopping = false;
      }).catch(err => {
        console.error('Stop chat error:', err);
        this.$message.error('暂停请求失败');
        // 重置暂停状态
        this.isStopping = false;
      });
    },

    // 重新回答：调用后端删除消息接口，再重发用户问题
    regenerateAnswer(aiMsgIndex) {
      if (this.loading) return;

      // 找到该 AI 回复前面对应的用户消息
      let userMsgIndex = -1;
      for (let i = aiMsgIndex - 1; i >= 0; i--) {
        if (this.currentMessagesData[i].role === 0) {
          userMsgIndex = i;
          break;
        }
      }
      if (userMsgIndex === -1) return;

      const userContent = this.currentMessagesData[userMsgIndex].content;
      const aiMessageId = this.currentMessagesData[aiMsgIndex].messageId;
      const userMessageId = this.currentMessagesData[userMsgIndex].messageId;

      // 调用后端接口删除该 AI 消息及对应的用户消息
      request.delete(`/chat/message/${aiMessageId}/${userMessageId}`).then(res => {
        if (res.data.code === '200') {
          // 后端删除成功，本地同步移除
          this.currentMessagesData.splice(userMsgIndex);

          // 重新发送
          this.userInput = userContent;
          this.$nextTick(() => {
            this.handleSend();
          });
        } else {
          this.$message.error(res.data.msg || '删除消息失败');
        }
      }).catch(() => {
        this.$message.error('删除消息请求失败');
      });
    },

    // 打开参考文档 - PDF 预览
    openReferDoc(docId, docName) {
      this.pdfPreviewTitle = docName || '文档预览';
      this.pdfPreviewVisible = true;
      this.pdfLoading = true;

      // 释放之前的 blob URL
      if (this.pdfPreviewUrl) {
        URL.revokeObjectURL(this.pdfPreviewUrl);
        this.pdfPreviewUrl = '';
      }

      ragRequest.get(`/chat/pdf/preview/${docId}`, {
        responseType: 'blob'
      }).then(res => {
        const blob = new Blob([res.data], { type: 'application/pdf' });
        this.pdfPreviewUrl = URL.createObjectURL(blob);
        this.pdfLoading = false;
      }).catch(err => {
        console.error('PDF 预览加载失败:', err);
        this.$message.error('文档预览加载失败');
        this.pdfLoading = false;
        this.pdfPreviewVisible = false;
      });
    },

    // 关闭 PDF 预览时释放资源
    closePdfPreview() {
      if (this.pdfPreviewUrl) {
        URL.revokeObjectURL(this.pdfPreviewUrl);
        this.pdfPreviewUrl = '';
      }
    },

    // ========== referDoc 缓存工具方法 ==========
    // 缓存结构: { sessionId: { messageId: referDoc, ... }, ... }
    saveReferDocCache(sessionId, messageId, referDoc) {
      try {
        const cacheKey = 'rag-referDoc-cache';
        const cache = JSON.parse(localStorage.getItem(cacheKey) || '{}');
        if (!cache[sessionId]) {
          cache[sessionId] = {};
        }
        cache[sessionId][messageId] = referDoc;
        localStorage.setItem(cacheKey, JSON.stringify(cache));
      } catch (e) {
        console.warn('referDoc 缓存写入失败:', e);
      }
    },

    getReferDocCache(sessionId) {
      try {
        const cacheKey = 'rag-referDoc-cache';
        const cache = JSON.parse(localStorage.getItem(cacheKey) || '{}');
        return cache[sessionId] || null;
      } catch (e) {
        console.warn('referDoc 缓存读取失败:', e);
        return null;
      }
    },

    deleteReferDocCache(sessionId) {
      try {
        const cacheKey = 'rag-referDoc-cache';
        const cache = JSON.parse(localStorage.getItem(cacheKey) || '{}');
        delete cache[sessionId];
        localStorage.setItem(cacheKey, JSON.stringify(cache));
      } catch (e) {
        console.warn('referDoc 缓存删除失败:', e);
      }
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
  --code-bg: #f5f5f5; /* Quiet Light 背景 */
  --code-header-bg: #ededed; /* 浅色标题栏 */
}

.rag-chat-container {
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

/* --- KB 选择 Banner --- */
.current-kb-banner {
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
.kb-left {
  display: flex;
  align-items: center;
  font-size: 14px;
  gap: 12px;
}
.kb-label {
  color: #1f2329;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 6px;
}
.kb-label::before {
  content: '';
  display: block;
  width: 4px;
  height: 14px;
  background: #3370ff;
  border-radius: 2px;
}

/* 下拉框样式 */
.kb-select {
  width: 260px;
}
::v-deep .kb-select .el-input__inner {
  border-radius: 20px;
  border: 1px solid transparent;
  background-color: #f2f3f5;
  font-weight: 500;
  padding-left: 16px;
  color: #1f2329;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  height: 36px;
  line-height: 36px;
}
::v-deep .kb-select .el-input__inner::placeholder {
  color: #8f959e;
}
::v-deep .kb-select .el-input__inner:hover {
  background-color: #e4e6eb;
}
::v-deep .kb-select .el-input__inner:focus,
::v-deep .kb-select.is-focus .el-input__inner {
  background-color: #fff;
  border-color: #3370ff;
  box-shadow: 0 0 0 2px rgba(51, 112, 255, 0.1);
}
::v-deep .kb-select .el-input__icon {
  line-height: 36px;
}

.kb-option {
  display: flex;
  align-items: center;
  gap: 8px;
}
.db-icon { color: #3370ff; }

/* --- 聊天区域 --- */
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
  scroll-behavior: smooth;
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
.empty-title {
  font-size: 24px;
  font-weight: 600;
  color: #333;
  margin-bottom: 10px;
}
.empty-desc {
  font-size: 15px;
  color: #666;
  margin-bottom: 40px;
}

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
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.card-title {
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 6px;
  color: #333;
}
.card-desc {
  font-size: 12px;
  color: #888;
  line-height: 1.4;
}

/* 消息列表 */
.message-list {
  max-width: 1000px;
  margin: 0 auto;
  padding: 0 40px;
}
.message-row {
  display: flex;
  margin-bottom: 40px;
  align-items: flex-start;
  gap: 0; 
  animation: fadeInUp 0.3s ease;
}
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
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
.assistant-avatar { padding: 2px; }
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

/* AI 回复下方操作按钮 */
.message-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 6px;
  padding-left: 4px;
  opacity: 0;
  transition: opacity 0.2s;
}
.message-row:hover .message-actions { opacity: 1; }
.row-user .message-actions {
  justify-content: flex-end;
  padding-left: 0;
  padding-right: 4px;
}
.action-icon {
  cursor: pointer;
  color: #999;
  font-size: 16px;
  padding: 4px;
  transition: color 0.2s;
}
.action-icon:hover { color: #3370ff; }


/* Markdown & Code Styles (Quiet Light) */
::v-deep .markdown-body p { margin-bottom: 1em; }
::v-deep .markdown-body p:last-child { margin-bottom: 0; }

::v-deep .code-block-wrapper {
  margin: 16px 0;
  border-radius: 8px;
  overflow: hidden;
  background-color: #f5f5f5 !important;
  border: 1px solid #e0e0e0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

::v-deep .code-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #ededed !important;
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
::v-deep .lang-tag::before {
  content: '';
  display: block;
  width: 50px;
  height: 12px;
  background: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="54" height="14" viewBox="0 0 54 14"><circle cx="6" cy="7" r="6" fill="%23FF5F56"/><circle cx="26" cy="7" r="6" fill="%23FFBD2E"/><circle cx="46" cy="7" r="6" fill="%2327C93F"/></svg>') no-repeat center;
  margin-right: 12px;
}

::v-deep .copy-btn {
  cursor: pointer;
  color: #999;
  transition: color 0.2s;
  display: flex;
  align-items: center;
}
::v-deep .copy-btn:hover { color: #3370ff; }

::v-deep .hljs-pre {
  margin: 0;
  padding: 20px;
  background-color: #f5f5f5 !important;
  color: #383a42;
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

/* Quiet Light Syntax */
::v-deep .hljs-keyword, ::v-deep .hljs-selector-tag, ::v-deep .hljs-built_in, ::v-deep .hljs-name, ::v-deep .hljs-tag { color: #a626a4 !important; }
::v-deep .hljs-string, ::v-deep .hljs-title, ::v-deep .hljs-section, ::v-deep .hljs-attribute, ::v-deep .hljs-literal, ::v-deep .hljs-template-tag, ::v-deep .hljs-template-variable, ::v-deep .hljs-type, ::v-deep .hljs-addition { color: #50a14f !important; }
::v-deep .hljs-number, ::v-deep .hljs-symbol, ::v-deep .hljs-bullet, ::v-deep .hljs-meta { color: #986801 !important; }
::v-deep .hljs-comment, ::v-deep .hljs-quote, ::v-deep .hljs-deletion { color: #a0a1a7 !important; font-style: italic; }
::v-deep .hljs-function { color: #4078f2 !important; }

/* Markdown Content Styles */
::v-deep .markdown-body {
  font-size: 15px;
  line-height: 1.7;
  color: #2c3e50;
  word-wrap: break-word;
}
::v-deep .markdown-body p {
  margin-bottom: 1em;
  margin-top: 0;
}
::v-deep .markdown-body p:last-child {
  margin-bottom: 0;
}
::v-deep .markdown-body ul, ::v-deep .markdown-body ol {
  padding-left: 24px;
  margin-bottom: 1em;
  margin-top: 0.5em;
}
::v-deep .markdown-body li {
  margin-bottom: 0.5em;
  line-height: 1.6;
}
::v-deep .markdown-body h1, 
::v-deep .markdown-body h2, 
::v-deep .markdown-body h3, 
::v-deep .markdown-body h4 {
  margin-top: 1.5em;
  margin-bottom: 0.8em;
  font-weight: 600;
  line-height: 1.4;
  color: #1a1a1a;
}
::v-deep .markdown-body h1 { font-size: 1.6em; }
::v-deep .markdown-body h2 { font-size: 1.4em; }
::v-deep .markdown-body h3 { font-size: 1.2em; }
::v-deep .markdown-body strong {
  font-weight: 600;
  color: #1f2329;
}
::v-deep .markdown-body a {
  color: #3370ff;
  text-decoration: none;
}
::v-deep .markdown-body a:hover {
  text-decoration: underline;
}
::v-deep .markdown-body blockquote {
  margin: 1em 0;
  padding: 0.5em 1em;
  border-left: 4px solid #dfe2e5;
  color: #6a737d;
  background-color: #f9f9fa;
  border-radius: 0 4px 4px 0;
}
::v-deep .markdown-body code {
  background-color: rgba(27, 31, 35, 0.05);
  padding: 0.2em 0.4em;
  border-radius: 3px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 85%;
}
::v-deep .markdown-body pre code {
  background-color: transparent;
  padding: 0;
  font-size: 100%;
}
::v-deep .markdown-body table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 1em;
}
::v-deep .markdown-body th, ::v-deep .markdown-body td {
  border: 1px solid #dfe2e5;
  padding: 6px 13px;
}
::v-deep .markdown-body th {
  background-color: #f6f8fa;
  font-weight: 600;
}
::v-deep .markdown-body tr:nth-child(2n) {
  background-color: #fcfcfc;
}

/* Fix for User Message Bubble Text Color */
.row-user ::v-deep .markdown-body {
  color: #ffffff !important;
}
.row-user ::v-deep .markdown-body p,
.row-user ::v-deep .markdown-body li,
.row-user ::v-deep .markdown-body strong,
.row-user ::v-deep .markdown-body h1,
.row-user ::v-deep .markdown-body h2,
.row-user ::v-deep .markdown-body h3,
.row-user ::v-deep .markdown-body h4 {
  color: #ffffff !important;
}
.row-user ::v-deep .markdown-body a {
  color: #e6f7ff !important;
  text-decoration: underline;
}
.row-user ::v-deep .markdown-body code {
  color: #333; /* Keep code legible */
  background-color: rgba(255, 255, 255, 0.9); 
}




/* Input Area */
.input-area-wrapper {
  flex-shrink: 0;
  width: 100%;
  background: #fff;
  padding: 20px 20px 80px; 
  border-top: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  align-items: center;
  z-index: 10;
}

.input-box {
  position: relative;
  width: 100%;
  max-width: 920px;
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
/* 暂停按钮样式（loading 状态下的按钮） */
.stop-btn-inner {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.stop-btn-inner i {
  color: #fff;
  font-size: 16px;
  transition: all 0.2s;
}
/* loading 状态下按钮变为红色 */
.send-icon-btn:has(.stop-btn-inner) {
  background: linear-gradient(135deg, #ff6b6b 0%, #ff4757 100%);
  cursor: pointer;
}
.send-icon-btn:has(.stop-btn-inner):hover {
  background: linear-gradient(135deg, #ff4757 0%, #ee5a6f 100%);
  box-shadow: 0 4px 12px rgba(255, 107, 107, 0.4);
  transform: translateY(-2px) scale(1.05);
}
/* 正在暂停状态 - 灰色按钮 */
.send-icon-btn.is-stopping {
  background: linear-gradient(135deg, #a0a0a0 0%, #888888 100%) !important;
  cursor: not-allowed;
  pointer-events: none;
}
.send-icon-btn.is-stopping:hover {
  transform: none;
  box-shadow: none;
}

/* Loading */
.loading-bubble {
  padding: 10px 16px;
  background: #f0f0f0;
  border-radius: 8px;
  width: fit-content;
}
.loading-content {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #666;
  font-size: 14px;
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

.chat-history-popover { padding: 4px 0 !important; min-width: 100px !important; }
.history-actions .action-item { padding: 8px 16px; cursor: pointer; font-size: 13px; color: #333; display: flex; align-items: center; gap: 8px; }
.history-actions .action-item:hover { background-color: #f5f7fa; color: #10a37f; }
.history-actions .action-item.delete:hover { color: #ff4d4f; background-color: #fff1f0; }

/* 参考文档 Popover */
.refer-doc-list {
  padding: 4px 0;
}
.refer-doc-title {
  font-size: 13px;
  font-weight: 600;
  color: #606266;
  padding: 6px 14px 8px;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  align-items: center;
  gap: 6px;
}
.refer-doc-title i {
  color: #3370ff;
  font-size: 14px;
}
.refer-doc-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  cursor: pointer;
  font-size: 13px;
  color: #3370ff;
  transition: background-color 0.2s;
}
.refer-doc-item:hover {
  background-color: #f0f5ff;
}
.refer-doc-item i {
  font-size: 12px;
  flex-shrink: 0;
}
.refer-doc-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 240px;
}

/* PDF 预览弹窗 */
::v-deep .pdf-preview-dialog {
  border-radius: 12px;
  overflow: hidden;
}
::v-deep .pdf-preview-dialog .el-dialog__header {
  padding: 16px 20px;
  border-bottom: 1px solid #e4e7ed;
  background: #f9fafb;
}
::v-deep .pdf-preview-dialog .el-dialog__title {
  font-size: 15px;
  font-weight: 600;
  color: #1f2329;
}
::v-deep .pdf-preview-dialog .el-dialog__body {
  padding: 0;
  height: calc(85vh - 60px);
}
.pdf-preview-body {
  width: 100%;
  height: 100%;
  background: #f0f0f0;
}
.pdf-iframe {
  width: 100%;
  height: 100%;
  border: none;
}
</style>