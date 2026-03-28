export default {
  methods: {
    // 新的 handleSend 方法实现
    async handleSend() {
      const content = this.userInput.trim();
      if (!content || this.loading) return;

      if (!this.selectedDatasourceId) {
        this.$message.warning('请先选择数据源');
        return;
      }

      // Reset AbortController
      if (this.abortController) this.abortController = null;
      this.abortController = new AbortController();

      // 立即显示用户消息
      this.currentMessagesData.push({ role: 0, content: content, displayedContent: content });
      const userQuestion = content;  // 保存用户问题，用于自动生成标题
      this.userInput = '';
      this.resizeTextarea();
      this.scrollToBottom();
      this.loading = true;
      this.loadingSeconds = 0;
      if (this.loadingTimer) clearInterval(this.loadingTimer);
      this.loadingTimer = setInterval(() => {
        this.loadingSeconds++;
      }, 1000);

      try {
        // ========== 步骤 1: 如果是新会话，先创建会话 ==========
        if (!this.currentChatId) {
          console.log('[Text2sql] 创建新会话...');
          const sessionRes = await request.post('/sessions', {
            title: '新对话',  // 先用默认标题，后续会自动更新
            module: 'DATA'
          }, {
            signal: this.abortController.signal
          });

          if (sessionRes.data.code === '200') {
            this.currentChatId = sessionRes.data.data.sessionId;
            this.pendingSessionId = this.currentChatId;
            console.log('[Text2sql] 新会话创建成功，ID:', this.currentChatId);
          } else {
            throw new Error(sessionRes.data.msg || '创建会话失败');
          }
        } else {
          this.pendingSessionId = this.currentChatId;
        }

        // ========== 步骤 2: 保存用户消息 ==========
        console.log('[Text2sql] 保存用户消息...');
        await request.post('/message', {
          sessionId: this.currentChatId,
          role: 0,  // 0 = 用户
          content: content
        }, {
          signal: this.abortController.signal
        });

        // ========== 步骤 3: 调用 AI 生成 SQL ==========
        console.log('[Text2sql] 调用 AI 生成 SQL...');
        const aiRes = await request.post('/test/text2sql', {
          question: content,
          dbConfigId: this.selectedDatasourceId
        }, {
          signal: this.abortController.signal
        });

        if (aiRes.data.code !== '200') {
          throw new Error(aiRes.data.msg || 'AI 生成失败');
        }

        const generatedSql = aiRes.data.data?.generatedSql || '';
        console.log('[Text2sql] AI 生成成功，SQL:', generatedSql);

        // 构建 AI 回复内容（只包含 SQL，不包含查询结果）
        const aiReplyContent = generatedSql
          ? `**生成的 SQL：**\n\n\`\`\`sql\n${generatedSql}\n\`\`\``
          : '抱歉，无法生成 SQL 语句。';

        // ========== 步骤 4: 保存 AI 回复 ==========
        console.log('[Text2sql] 保存 AI 回复...');
        await request.post('/message', {
          sessionId: this.currentChatId,
          role: 1,  // 1 = AI
          content: aiReplyContent
        }, {
          signal: this.abortController.signal
        });

        // ========== 步骤 5: 自动生成会话标题（首次对话） ==========
        // 检查是否是该会话的第一条消息（通过消息数量判断）
        const isFirstMessage = this.currentMessagesData.filter(m => m.role === 0).length === 1;
        if (isFirstMessage && userQuestion) {
          console.log('[Text2sql] 自动生成会话标题...');
          // 截取用户问题的前20个字符作为标题
          const autoTitle = userQuestion.length > 20
            ? userQuestion.substring(0, 20) + '...'
            : userQuestion;

          request.put('/chat/session', {
            id: this.currentChatId,
            title: autoTitle
          }).then(() => {
            console.log('[Text2sql] 会话标题自动更新为:', autoTitle);
            this.refreshHistoryList();
          }).catch(err => {
            console.warn('[Text2sql] 自动更新标题失败:', err);
          });
        }

        // ========== 显示 AI 回复（打字机效果） ==========
        this.loading = false;
        clearInterval(this.loadingTimer);
        this.loadingTimer = null;

        const newMsgIndex = this.currentMessagesData.length;
        this.currentMessagesData.push({
          role: 1,
          content: aiReplyContent,
          displayedContent: '',  // 打字机效果从空开始
        });

        this.typewriterEffect(aiReplyContent, newMsgIndex);
        this.refreshHistoryList();

        // 清除临时会话ID
        this.pendingSessionId = null;

      } catch (err) {
        this.loading = false;
        clearInterval(this.loadingTimer);
        this.loadingTimer = null;

        // 如果是用户主动中止(abort)，则不显示错误提示
        const isAborted = err.name === 'AbortError' ||
          err.name === 'CanceledError' ||
          err.message?.includes('abort') ||
          err.message?.includes('cancel') ||
          err.code === 'ERR_CANCELED';

        if (isAborted) {
          console.log('[Text2sql] 用户主动终止，跳过错误提示');
          this.pendingSessionId = null;
          return;
        }

        let errorMsg = '网络连接异常';
        if (err.message) errorMsg = err.message;
        else if (err.message?.includes('timeout')) errorMsg = '请求超时';

        this.currentMessagesData.push({
          role: 1,
          content: `❌ ${errorMsg}`,
          displayedContent: `❌ ${errorMsg}`
        });
        this.scrollToBottom();
        console.error('[Text2sql] 发送失败:', err);

        // 清除临时会话ID
        this.pendingSessionId = null;
      }
    }
  }
}
