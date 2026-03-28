<template>
  <div class="rag-container">
    <!-- Left Sidebar: Folder List -->
    <div class="kb-sidebar">
      <div class="sidebar-header">
        <div class="title">文件夹</div>
        <el-button type="text" icon="el-icon-plus" class="add-kb-btn" @click="openCreateFolderDialog">新建</el-button>
      </div>

      <div class="kb-list" v-loading="loading.folderList">
        <!-- 全部文件 (根入口) -->
        <div 
          class="kb-item" 
          :class="{ active: currentFolderId === null }"
          @click="selectFolder(null, '全部文件')"
        >
          <div class="kb-info">
            <span class="kb-name">
              <i class="el-icon-files" style="margin-right: 6px;"></i>
              全部文件
            </span>
          </div>
        </div>

        <!-- 文件夹树 -->
        <el-tree
          :data="folderTreeData"
          node-key="id"
          :expand-on-click-node="false"
          :default-expand-all="false"
          :highlight-current="true"
          :current-node-key="currentFolderId"
          class="custom-tree"
          @node-click="handleNodeClick"
        >
          <span class="custom-tree-node kb-item" slot-scope="{ node, data }" :class="{ active: currentFolderId === data.id }">
            <span class="kb-info">
              <span class="kb-name" :title="data.name">
                <i class="el-icon-folder" style="margin-right: 6px;"></i>
                {{ data.name }}
              </span>
            </span>
            <span class="kb-actions">
              <el-tooltip content="重命名" placement="top">
                <i class="el-icon-edit action-icon" @click.stop="openRenameFolderDialog(data)"></i>
              </el-tooltip>
              <el-tooltip content="删除" placement="top">
                <i class="el-icon-delete action-icon delete" @click.stop="handleDeleteFolder(data)"></i>
              </el-tooltip>
            </span>
          </span>
        </el-tree>

        <div v-if="folderList.length === 0 && !loading.folderList" class="empty-kb">
          暂无文件夹,点击右上角"新建"创建
        </div>
      </div>
    </div>

    <!-- 可拖动的分隔线 -->
    <div class="resize-handle" @mousedown="startResize"></div>

    <!-- Right Content: Document List -->
    <div class="doc-content" ref="docContent">
      <div class="content-wrapper">
        <div class="content-header">
          <div class="header-left">
            <div class="current-kb-name">
              {{ currentFolderName }}
              <el-tooltip content="刷新列表" placement="right">
                <i class="el-icon-refresh refresh-icon" @click="refreshDocList"></i>
              </el-tooltip>
            </div>
            <div class="kb-meta">
              <span class="meta-item"><i class="el-icon-document"></i> {{ docList.length }} 文档</span>
            </div>
          </div>
          <div class="header-right">
             <el-input
              v-model="searchKeyword"
              :placeholder="currentFolderId === null ? '搜索整个知识库' : '在当前文件夹搜索'"
              clearable
              size="medium"
              style="width: 300px; margin-right: 12px"
              @clear="fetchDocList"
              @keyup.enter.native="fetchDocList"
            >
              <el-button slot="append" icon="el-icon-search" @click="fetchDocList"></el-button>
            </el-input>
            <!-- 只有在选择了具体文件夹时才显示上传按钮 -->
            <el-button 
              v-if="currentFolderId !== null" 
              type="primary" 
              icon="el-icon-upload2" 
              @click="openUploadDialog"
            >
              上传文档
            </el-button>
            <!-- 在全部文件视图时显示提示 -->
            <el-tooltip v-else content="请先在左侧选择一个文件夹以上传文档" placement="bottom">
              <el-button type="info" icon="el-icon-upload2" disabled>上传文档</el-button>
            </el-tooltip>
          </div>
        </div>

        <el-table
          :data="docList"
          v-loading="loading.docList"
          class="doc-table"
          height="calc(100vh - 200px)"
        >
          <el-table-column label="文档名称" min-width="200">
            <template slot-scope="scope">
              <div class="doc-name-cell">
                <i :class="getFileIcon(scope.row.name)"></i>
                <span>{{ scope.row.name }}</span>
              </div>
            </template>
          </el-table-column>
          
          <el-table-column prop="status" label="解析状态" width="120" align="center">
            <template slot-scope="scope">
              <el-tag v-if="scope.row.status === '1'" type="success" size="small" effect="plain">解析成功</el-tag>
              <el-tag v-else-if="scope.row.status === '-1'" type="danger" size="small" effect="plain">解析失败</el-tag>
              <el-tag v-else type="warning" size="small" effect="plain">解析中</el-tag>
            </template>
          </el-table-column>

          <el-table-column prop="chunkNum" label="分块数" width="100" align="center"></el-table-column>
          
          <el-table-column label="启用" width="100" align="center">
            <template slot-scope="scope">
              <el-switch
                v-model="scope.row.enabledBoolean"
                active-color="#3370ff"
                inactive-color="#dcdfe6"
                @change="handleDocEnableChange(scope.row)"
              ></el-switch>
            </template>
          </el-table-column>

          <el-table-column label="操作" width="180" align="center">
            <template slot-scope="scope">
              <div class="table-actions">
                 <el-tooltip content="重命名" placement="top">
                  <el-button type="text" icon="el-icon-edit" @click="openRenameDocDialog(scope.row)"></el-button>
                </el-tooltip>
                <el-tooltip content="下载" placement="top">
                  <el-button type="text" icon="el-icon-download" @click="handleDownloadDoc(scope.row)"></el-button>
                </el-tooltip>
                <el-tooltip content="删除" placement="top">
                  <el-button type="text" icon="el-icon-delete" class="delete-btn" @click="handleDeleteDoc(scope.row)"></el-button>
                </el-tooltip>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>

    <!-- Dialogs -->
    
    <!-- Create Folder Dialog -->
    <el-dialog title="创建文件夹" :visible.sync="dialog.createFolder.visible" width="500px">
      <el-form :model="dialog.createFolder.form" label-width="80px">
        <el-form-item label="名称">
          <el-input v-model="dialog.createFolder.form.name" placeholder="请输入文件夹名称"></el-input>
        </el-form-item>
      </el-form>
      <span slot="footer" class="dialog-footer">
        <el-button @click="dialog.createFolder.visible = false">取消</el-button>
        <el-button type="primary" @click="submitCreateFolder" :loading="loading.createFolder">创建</el-button>
      </span>
    </el-dialog>

    <!-- Rename Folder Dialog -->
    <el-dialog title="重命名文件夹" :visible.sync="dialog.renameFolder.visible" width="500px">
      <el-form :model="dialog.renameFolder.form" label-width="80px">
        <el-form-item label="名称">
          <el-input v-model="dialog.renameFolder.form.newName" placeholder="请输入新名称"></el-input>
        </el-form-item>
      </el-form>
      <span slot="footer" class="dialog-footer">
        <el-button @click="dialog.renameFolder.visible = false">取消</el-button>
        <el-button type="primary" @click="submitRenameFolder" :loading="loading.renameFolder">保存</el-button>
      </span>
    </el-dialog>

    <!-- Upload File Dialog -->
    <el-dialog title="上传文档" :visible.sync="dialog.upload.visible" width="500px">
      <el-upload
        class="upload-demo"
        drag
        action="#"
        :http-request="customUpload"
        :on-change="handleFileChange"
        :file-list="dialog.upload.fileList"
        :auto-upload="false"
        multiple
        ref="uploadRef"
      >
        <i class="el-icon-upload"></i>
        <div class="el-upload__text">将文件拖到此处,或<em>点击选择</em></div>
        <div class="el-upload__tip" slot="tip">支持 PDF, Word, Txt, Excel, PPT 等格式,可批量上传多个文件</div>
      </el-upload>
      <span slot="footer" class="dialog-footer">
        <el-button @click="dialog.upload.visible = false">取消</el-button>
        <el-button type="primary" @click="submitUpload" :loading="loading.upload">
          {{ loading.upload ? '上传中...' : (dialog.upload.fileList.length > 0 ? `开始上传 (${dialog.upload.fileList.length}个文件)` : '开始上传') }}
        </el-button>
      </span>
    </el-dialog>

    <!-- Rename Doc Dialog -->
    <el-dialog title="重命名文档" :visible.sync="dialog.renameDoc.visible" width="500px">
      <el-form :model="dialog.renameDoc.form" label-width="80px">
        <el-form-item label="名称">
          <el-input v-model="dialog.renameDoc.form.newName" placeholder="请输入新名称(含后缀)"></el-input>
        </el-form-item>
      </el-form>
      <span slot="footer" class="dialog-footer">
        <el-button @click="dialog.renameDoc.visible = false">取消</el-button>
        <el-button type="primary" @click="submitRenameDoc" :loading="loading.renameDoc">保存</el-button>
      </span>
    </el-dialog>

  </div>
</template>

<script>
import axios from 'axios';

// 专用于 RAG 的请求实例
const ragRequest = axios.create({
  baseURL: process.env.VUE_APP_RAG_BASEURL, 
  timeout: 60000
});

ragRequest.interceptors.request.use(config => {
  const isFormData = config.data instanceof FormData;
  
  if (!isFormData && !config.headers['Content-Type']) {
    config.headers['Content-Type'] = 'application/json;charset=utf-8';
  }
  
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

ragRequest.interceptors.response.use(res => {
    return res;
}, error => {
    return Promise.reject(error);
});

export default {
  name: "RagUpload",
  data() {
    return {
      user: {},
      folderList: [],
      folderTreeData: [],
      currentFolderId: null, // null 代表全部文档
      currentFolderName: '全部文档',
      searchKeyword: '',
      docList: [],
      loading: {
        folderList: false,
        docList: false,
        createFolder: false,
        renameFolder: false,
        upload: false,
        renameDoc: false
      },
      dialog: {
        createFolder: {
          visible: false,
          form: { name: '', parentId: null }
        },
        renameFolder: {
          visible: false,
          form: { folderId: null, newName: '' }
        },
        upload: {
          visible: false,
          fileList: []
        },
        renameDoc: {
          visible: false,
          form: { docId: null, newName: '', originalName: '' }
        }
      },
      refreshTimer: null,
      // 侧边栏拖动调整
      sidebarWidth: 280,
      isResizing: false,
      startX: 0,
      startWidth: 0
    };
  },
  created() {
    this.user = JSON.parse(localStorage.getItem('xm-user') || '{}');
    this.fetchFolderList();
    this.fetchDocList();
  },
  beforeDestroy() {
      if(this.refreshTimer) clearInterval(this.refreshTimer);
  },
  methods: {
    // ---------------- Folder Management ----------------
    fetchFolderList() {
      this.loading.folderList = true;
      ragRequest.get('/kb/folder/list').then(res => {
        if (res.data.code === '200') {
          this.folderList = res.data.data || [];
          this.folderTreeData = this.buildFolderTree(this.folderList);
        } else {
          this.$message.error('获取文件夹列表失败: ' + res.data.msg);
        }
      }).catch(err => {
        console.error('获取文件夹列表失败:', err);
        this.$message.error('获取文件夹列表失败');
      }).finally(() => {
        this.loading.folderList = false;
      });
    },

    buildFolderTree(list) {
      if (!list || list.length === 0) return [];
      
      const map = {};
      const tree = [];
      const roots = [];

      // 初始化 map
      list.forEach(item => {
        map[item.id] = { ...item, children: [] };
      });

      // 组装树
      list.forEach(item => {
        // 找到当前项的完整对象
        const node = map[item.id];
        if (item.parentId !== null && map[item.parentId]) {
          // 如果有父节点且父节点存在，加入父节点的 children
          map[item.parentId].children.push(node);
        } else {
          // 否则作为根节点
          roots.push(node);
        }
      });

      return roots;
    },

    handleNodeClick(data) {
      this.selectFolder(data.id, data.name);
    },

    selectFolder(folderId, folderName) {
      this.currentFolderId = folderId;
      this.currentFolderName = folderName;
      this.fetchDocList();
    },

    openCreateFolderDialog() {
      // 默认为当前选中的文件夹作为父文件夹，如果没有选中则为根目录
      this.dialog.createFolder.form = { 
        name: '', 
        parentId: this.currentFolderId 
      };
      this.dialog.createFolder.visible = true;
    },

    submitCreateFolder() {
      if (!this.dialog.createFolder.form.name) {
        this.$message.warning('请输入文件夹名称');
        return;
      }
      this.loading.createFolder = true;
      
      // 构建请求参数
      const params = {
        name: this.dialog.createFolder.form.name
      };
      
      // 如果有 parentId 且不是 null,则添加
      if (this.dialog.createFolder.form.parentId !== null) {
        params.parentId = this.dialog.createFolder.form.parentId;
      }
      
      console.log('创建文件夹请求参数:', params);
      
      ragRequest.post('/kb/folder/create', null, { params })
        .then(res => {
          console.log('创建文件夹响应:', res.data);
          if (res.data.code === '200') {
            this.$message.success('创建成功');
            this.dialog.createFolder.visible = false;
            this.fetchFolderList();
          } else {
            this.$message.error('创建失败: ' + res.data.msg);
          }
        })
        .catch(err => {
          console.error('创建文件夹失败:', err);
          console.error('错误详情:', err.response?.data);
          let errorMsg = '创建失败';
          if (err.response?.data?.msg) {
            errorMsg = err.response.data.msg;
          }
          this.$message.error(errorMsg);
        })
        .finally(() => {
          this.loading.createFolder = false;
        });
    },

    openRenameFolderDialog(folder) {
      this.dialog.renameFolder.form = { 
        folderId: folder.id, 
        newName: folder.name 
      };
      this.dialog.renameFolder.visible = true;
    },

    submitRenameFolder() {
      if (!this.dialog.renameFolder.form.newName) {
        this.$message.warning('请输入新名称');
        return;
      }
      this.loading.renameFolder = true;
      
      ragRequest.put('/kb/folder/rename', null, {
        params: {
          folderId: this.dialog.renameFolder.form.folderId,
          newName: this.dialog.renameFolder.form.newName
        }
      }).then(res => {
        if (res.data.code === '200') {
          this.$message.success('重命名成功');
          this.dialog.renameFolder.visible = false;
          this.fetchFolderList();
          if (this.currentFolderId === this.dialog.renameFolder.form.folderId) {
            this.currentFolderName = this.dialog.renameFolder.form.newName;
          }
        } else {
          this.$message.error('重命名失败: ' + res.data.msg);
        }
      }).catch(err => {
        console.error('重命名文件夹失败:', err);
        this.$message.error('重命名失败');
      }).finally(() => {
        this.loading.renameFolder = false;
      });
    },

    handleDeleteFolder(folder) {
      const h = this.$createElement;
      this.$msgbox({
        title: '警告',
        message: h('div', null, [
          h('div', { style: { fontSize: '14px', marginBottom: '10px' } }, [
            '确定要删除文件夹 ',
            h('span', { style: { fontWeight: 'bold', color: '#333' } }, folder.name),
            ' 吗？'
          ]),
          h('div', { style: { color: '#f56c6c', fontSize: '13px', lineHeight: '1.5', background: '#fef0f0', padding: '10px', borderRadius: '4px' } }, [
            h('i', { class: 'el-icon-warning', style: { marginRight: '5px' } }),
            '此操作将永久删除该文件夹及其包含的所有文档！'
          ])
        ]),
        showCancelButton: true,
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        confirmButtonClass: 'el-button--danger',
        closeOnClickModal: false,
        beforeClose: (action, instance, done) => {
          if (action === 'confirm') {
            instance.confirmButtonLoading = true;
            instance.confirmButtonText = '删除中...';
            
            ragRequest.delete('/kb/folder/delete', { 
              params: { folderId: folder.id } 
            }).then(res => {
              instance.confirmButtonLoading = false;
              if (res.data.code === '200') {
                this.$message.success('删除成功');
                if (this.currentFolderId === folder.id) {
                  this.currentFolderId = null;
                  this.currentFolderName = '全部文档';
                  this.docList = [];
                }
                this.fetchFolderList();
                this.fetchDocList();
                done();
              } else {
                this.$message.error('删除失败: ' + res.data.msg);
                instance.confirmButtonText = '确定删除';
                done();
              }
            }).catch(err => {
              instance.confirmButtonLoading = false;
              instance.confirmButtonText = '确定删除';
              console.error('删除文件夹失败:', err);
              this.$message.error('删除失败');
              done();
            });
          } else {
            done();
          }
        }
      }).catch(() => {});
    },

    // ---------------- Document Management ----------------
    fetchDocList() {
      this.loading.docList = true;
      const params = {};
      
      // 如果有搜索关键词，调用搜索接口
      if (this.searchKeyword) {
        params.keyword = this.searchKeyword;
        if (this.currentFolderId !== null) {
          params.folderId = this.currentFolderId;
        }
        
        console.log('Searching docs with params:', params);
        
        ragRequest.get('/kb/search-docs', { params }).then(this.handleDocListResponse).catch(this.handleDocListError).finally(() => {
          this.loading.docList = false;
        });
      } else {
        // 否则调用普通列表接口
        if (this.currentFolderId !== null) {
          params.folderId = this.currentFolderId;
        }
        
        ragRequest.get('/kb/list-docs', { params }).then(this.handleDocListResponse).catch(this.handleDocListError).finally(() => {
          this.loading.docList = false;
        });
      }
    },

    handleDocListResponse(res) {
      if (res.data.code === '200') {
        const rawList = res.data.data || [];
        this.docList = rawList.map(doc => ({
          ...doc,
          enabledBoolean: doc.enabled === 1 || doc.enabled === '1'
        }));
      } else {
        this.$message.error('获取文档失败: ' + res.data.msg);
      }
    },

    handleDocListError(err) {
      console.error('获取文档列表失败:', err);
      this.$message.error('获取文档失败');
    },
    
    // 专门给 reload button 用，清除 loading 状态由 fetchDocList 处理
    refreshDocList() {
      // 同步文档状态
      ragRequest.post('/kb/sync-status').then(() => {
        this.fetchDocList();
        this.$message.success('状态已同步');
      }).catch(() => {
        this.fetchDocList();
      });
    },

    openUploadDialog() {
      this.dialog.upload.visible = true;
      this.dialog.upload.fileList = [];
    },

    handleFileChange(file, fileList) {
      // 保留所有文件,支持批量上传
      this.dialog.upload.fileList = fileList;
    },

    customUpload(option) {
      // 在 submitUpload 中处理
    },

    submitUpload() {
      if (this.dialog.upload.fileList.length === 0) {
        this.$message.warning('请选择文件');
        return;
      }
      
      const totalFiles = this.dialog.upload.fileList.length;
      
      // 如果只有一个文件,直接上传不显示确认对话框
      if (totalFiles === 1) {
        this.performBatchUpload();
        return;
      }
      
      // 多个文件时显示确认对话框
      this.$confirm(`确定要批量上传 ${totalFiles} 个文件吗?`, '批量上传确认', {
        confirmButtonText: '确定上传',
        cancelButtonText: '取消',
        type: 'info'
      }).then(() => {
        this.performBatchUpload();
      }).catch(() => {});
    },
    
    performBatchUpload() {
      this.loading.upload = true;
      const uploadPromises = [];
      const fileList = this.dialog.upload.fileList;
      
      // 循环上传每个文件
      fileList.forEach((fileItem) => {
        const file = fileItem.raw;
        const formData = new FormData();
        formData.append('file', file);
        
        // 如果在子文件夹中,传递 folderId
        if (this.currentFolderId !== null) {
          formData.append('folderId', this.currentFolderId);
        }

        const uploadPromise = ragRequest.post('/kb/upload', formData)
          .then(res => {
            console.log(`上传文件 ${file.name} 响应:`, res.data);
            if (res.data.code === '200') {
              return { success: true, fileName: file.name };
            } else {
              return { success: false, fileName: file.name, error: res.data.msg };
            }
          })
          .catch(err => {
            console.error(`文件 ${file.name} 上传错误:`, err);
            let errorMsg = '系统异常';
            if (err.response) {
              errorMsg = err.response.data?.msg || `HTTP ${err.response.status}`;
            } else if (err.request) {
              errorMsg = '网络连接失败';
            } else {
              errorMsg = err.message;
            }
            return { success: false, fileName: file.name, error: errorMsg };
          });

        uploadPromises.push(uploadPromise);
      });

      // 等待所有文件上传完成
      Promise.all(uploadPromises).then(results => {
        this.loading.upload = false;
        
        const successCount = results.filter(r => r.success).length;
        const failCount = results.filter(r => !r.success).length;
        
        if (failCount > 0) {
          const failedFiles = results.filter(r => !r.success).map(r => `${r.fileName} (${r.error})`).join(', ');
          this.$message.error(`${failCount} 个文件上传失败: ${failedFiles}`);
        }
        
        if (successCount > 0) {
          this.$message.success(`成功上传 ${successCount} 个文件!`);
          this.dialog.upload.visible = false;
          this.dialog.upload.fileList = [];
          this.refreshDocList();
        }
      }).catch(err => {
        this.loading.upload = false;
        console.error('批量上传异常:', err);
        this.$message.error('批量上传失败');
      });
    },

    handleDeleteDoc(doc) {
      this.$confirm(`确定删除文档 "${doc.name}" 吗?`, '提示', {
        type: 'warning'
      }).then(() => {
        ragRequest.delete('/kb/delete-doc', { 
          params: { docId: doc.id } 
        }).then(res => {
          if (res.data.code === '200') {
            this.$message.success('删除成功');
            this.fetchDocList();
          } else {
            this.$message.error('删除失败: ' + res.data.msg);
          }
        }).catch(err => {
          console.error('删除文档失败:', err);
          this.$message.error('删除失败');
        });
      }).catch(() => {});
    },

    handleDocEnableChange(doc) {
      const newState = doc.enabledBoolean ? 1 : 0;
      
      ragRequest.put('/kb/doc-enabled', null, {
        params: { 
          docId: doc.id, 
          enabled: newState 
        }
      }).then(res => {
        if (res.data.code === '200') {
          this.$message.success('状态更新成功');
          doc.enabled = newState;
        } else {
          this.$message.error('更新失败: ' + res.data.msg);
          doc.enabledBoolean = !doc.enabledBoolean;
        }
      }).catch(err => {
        console.error('更新状态失败:', err);
        this.$message.error('更新失败');
        doc.enabledBoolean = !doc.enabledBoolean;
      });
    },

    openRenameDocDialog(doc) {
      this.dialog.renameDoc.form = { 
        docId: doc.id, 
        newName: doc.name,
        originalName: doc.name
      };
      this.dialog.renameDoc.visible = true;
    },

    submitRenameDoc() {
      if (!this.dialog.renameDoc.form.newName || !this.dialog.renameDoc.form.docId) {
        this.$message.warning('参数缺失');
        return;
      }
      
      const originalName = this.dialog.renameDoc.form.originalName;
      const newName = this.dialog.renameDoc.form.newName;
      
      const getExtension = (filename) => {
        const lastDot = filename.lastIndexOf('.');
        return lastDot === -1 ? '' : filename.substring(lastDot).toLowerCase();
      };
      
      const originalExt = getExtension(originalName);
      const newExt = getExtension(newName);
      
      if (originalExt !== newExt) {
        this.$message.error(`文件扩展名不能修改,必须保持为 ${originalExt}`);
        return;
      }
      
      this.loading.renameDoc = true;
      
      ragRequest.put('/kb/rename-doc', null, {
        params: {
          docId: this.dialog.renameDoc.form.docId,
          newName: this.dialog.renameDoc.form.newName
        }
      }).then(res => {
        if (res.data.code === '200') {
          this.$message.success('重命名成功');
          this.dialog.renameDoc.visible = false;
          this.fetchDocList();
        } else {
          this.$message.error('重命名失败: ' + res.data.msg);
        }
      }).catch(err => {
        console.error('重命名文档失败:', err);
        this.$message.error('重命名失败');
      }).finally(() => {
        this.loading.renameDoc = false;
      });
    },

    handleDownloadDoc(doc) {
      this.$message.info('正在请求下载...');
      ragRequest.get('/kb/download-doc', {
        params: { docId: doc.id },
        responseType: 'blob'
      }).then(res => {
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const link = document.createElement('a');
        link.href = url;
        const contentDisposition = res.headers['content-disposition'];
        let fileName = doc.name;
        if (contentDisposition) {
          const match = contentDisposition.match(/filename\*=UTF-8''(.+)/) || contentDisposition.match(/filename="?([^"]+)"?/);
          if (match) fileName = decodeURIComponent(match[1]);
        }
        link.setAttribute('download', fileName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }).catch(err => {
        console.error('下载失败:', err);
        this.$message.error('下载失败');
      });
    },

    getFileIcon(fileName) {
      if (!fileName) return 'el-icon-document';
      const ext = fileName.split('.').pop().toLowerCase();
      if (['pdf'].includes(ext)) return 'el-icon-document text-danger';
      if (['doc', 'docx'].includes(ext)) return 'el-icon-document text-primary';
      if (['txt', 'md'].includes(ext)) return 'el-icon-document text-info';
      if (['xls', 'xlsx', 'csv'].includes(ext)) return 'el-icon-s-grid text-success';
      if (['ppt', 'pptx'].includes(ext)) return 'el-icon-s-data text-warning';
      return 'el-icon-document';
    },

    // 侧边栏拖动调整方法
    startResize(e) {
      this.isResizing = true;
      const sidebar = document.querySelector('.kb-sidebar');
      this.startX = e.clientX;
      this.startWidth = sidebar ? sidebar.offsetWidth : this.sidebarWidth;
      
      document.addEventListener('mousemove', this.doResize);
      document.addEventListener('mouseup', this.stopResize);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      e.preventDefault();
    },

    doResize(e) {
      if (!this.isResizing) return;
      
      // 计算鼠标移动的距离
      const diffX = e.clientX - this.startX;
      const newWidth = this.startWidth + diffX;
      
      // 限制最小和最大宽度
      const minWidth = 200;
      const maxWidth = 500;
      const finalWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
      
      this.sidebarWidth = finalWidth;
      
      // 更新侧边栏宽度
      const sidebar = document.querySelector('.kb-sidebar');
      if (sidebar) {
        sidebar.style.width = `${finalWidth}px`;
      }
      
      e.preventDefault();
    },

    stopResize(e) {
      this.isResizing = false;
      document.removeEventListener('mousemove', this.doResize);
      document.removeEventListener('mouseup', this.stopResize);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      e.preventDefault();
    }
  }
};
</script>

<style scoped>
.rag-container {
  display: flex;
  height: calc(100vh - 60px);
  background-color: #f7f9fc;
}

/* Left Sidebar */
.kb-sidebar {
  min-width: 200px;
  max-width: 500px;
  width: 280px;
  background: white;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

/* 可拖动的分隔线 */
.resize-handle {
  width: 8px;
  background: transparent;
  cursor: col-resize;
  position: relative;
  flex-shrink: 0;
}

.sidebar-header {
  padding: 16px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #f0f2f5;
}

.sidebar-header .title {
  font-size: 16px;
  font-weight: 600;
  color: #1f2329;
}

.add-kb-btn {
    padding: 0;
    font-size: 14px;
}

.kb-list {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
}

/* Custom Tree Styles */
.custom-tree {
  background: transparent;
}

.custom-tree ::v-deep .el-tree-node__content {
  height: 40px;
  border-radius: 8px;
  margin-bottom: 4px;
}

.custom-tree ::v-deep .el-tree-node__content:hover {
  background-color: #f5f7fa;
}

.custom-tree ::v-deep .el-tree-node.is-current > .el-tree-node__content {
  background-color: #e6f7ff;
  color: #1890ff;
}

/* 让自定义节点内容占满宽度 */
.custom-tree-node {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 14px;
  padding-right: 8px;
  overflow: hidden; /* 防止文字溢出 */
}

.kb-item {
  /* 移除原来的 padding 和 margin，交给 el-tree-node__content 控制 */
  padding: 0; 
  cursor: pointer;
}

.kb-item.active .kb-name {
  color: #1890ff;
}
/* 根目录项保持原样 */
.kb-list > .kb-item {
  padding: 12px 14px;
  border-radius: 8px;
  cursor: pointer;
  margin-bottom: 4px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  transition: background-color 0.2s;
}

.kb-list > .kb-item:hover {
  background-color: #f5f7fa;
}

.kb-list > .kb-item.active {
  background-color: #e6f7ff;
  color: #1890ff;
}

.kb-info {
  flex: 1;
  overflow: hidden;
  display: flex;
  align-items: center;
}

.kb-name {
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: flex;
  align-items: center;
}

.kb-name i {
  font-size: 16px;
  color: #3370ff;
}

.kb-actions {
  display: flex;
  gap: 8px;
  opacity: 0;
  transition: opacity 0.2s;
}

/* 树节点和根目录项 hover 时显示 actions */
.custom-tree ::v-deep .el-tree-node__content:hover .kb-actions,
.kb-list > .kb-item:hover .kb-actions {
  opacity: 1;
}

.action-icon {
  font-size: 14px;
  color: #8c959f;
  padding: 2px;
}

.action-icon:hover {
  color: #1890ff;
}

.action-icon.delete:hover {
  color: #ff4d4f;
}

.empty-kb {
  text-align: center;
  color: #ccc;
  margin-top: 40px;
  font-size: 13px;
}

/* Right Content */
.doc-content {
  flex: 1;
  padding: 20px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.content-wrapper {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.content-header {
  padding: 20px 24px;
  border-bottom: 1px solid #f0f2f5;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left .current-kb-name {
  font-size: 20px;
  font-weight: 600;
  color: #1f2329;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
}

.refresh-icon {
  margin-left: 8px;
  font-size: 18px;
  color: #909399;
  cursor: pointer;
  transition: all 0.3s;
}

.refresh-icon:hover {
  color: #3370ff;
  transform: rotate(180deg);
}

.kb-meta {
  display: flex;
  gap: 16px;
  font-size: 13px;
  color: #8c959f;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.meta-item i {
  font-size: 14px;
}

.header-right {
  display: flex;
  gap: 10px;
}

/* 搜索框样式覆盖 */
.header-right ::v-deep .el-input-group__append {
  background-color: #3370ff;
  border-color: #3370ff;
  color: #fff;
}

.header-right ::v-deep .el-input-group__append .el-button {
  color: #fff;
  border: none;
  margin: -10px -20px;
  padding: 10px 20px;
}

.header-right ::v-deep .el-input-group__append:hover {
  opacity: 0.85;
}

.header-right ::v-deep .el-input-group__append:active {
  opacity: 1;
}

.header-right ::v-deep .el-input__inner:focus {
  border-color: #3370ff;
}

.header-right ::v-deep .el-input__inner {
  border-right-width: 0;
}

/* Document Table */
.doc-table {
  flex: 1;
}

.doc-name-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.doc-name-cell i {
  font-size: 18px;
}

.text-danger { color: #f56c6c; }
.text-primary { color: #409eff; }
.text-info { color: #909399; }
.text-success { color: #67c23a; }
.text-warning { color: #e6a23c; }

.table-actions {
  display: flex;
  justify-content: center;
  gap: 4px;
}

.delete-btn {
  color: #f56c6c;
}

/* Upload Dialog */
::v-deep .upload-demo {
  width: 100%;
  display: block;
}

::v-deep .upload-demo .el-upload {
  width: 100%;
  display: block;
}

::v-deep .el-upload-dragger {
  width: 100%;
  height: 220px; /* 稍微调整高度 */
  border: 2px dashed #e4e7ed; /* 更柔和的边框色 */
  border-radius: 12px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: #f9fafb; /* 极淡的灰色背景 */
  overflow: hidden;
}

::v-deep .el-upload-dragger:hover {
  border-color: #3370ff;
  background-color: #f0f5ff;
  transform: translateY(-2px); /* 细微的上浮效果 */
  box-shadow: 0 4px 12px rgba(51, 112, 255, 0.08); /* 添加柔和阴影 */
}

::v-deep .el-upload-dragger .el-icon-upload {
  font-size: 56px; /* 稍微调小图标 */
  color: #c0c4cc;
  margin-bottom: 12px;
  margin-top: 10px;
  transition: all 0.3s;
}

::v-deep .el-upload-dragger:hover .el-icon-upload {
  color: #3370ff;
  transform: scale(1.1); /* 图标放大效果 */
}

::v-deep .el-upload__text {
  color: #606266;
  font-size: 15px;
  margin-top: 8px;
  line-height: 1.6;
}

::v-deep .el-upload__text em {
  color: #3370ff;
  font-style: normal;
  font-weight: 600;
  cursor: pointer;
  border-bottom: 1px solid transparent;
  transition: border-bottom-color 0.2s;
}

::v-deep .el-upload__text em:hover {
  border-bottom-color: #3370ff;
}

::v-deep .el-upload__tip {
  font-size: 13px;
  color: #909399;
  margin-top: 12px;
  text-align: center;
  line-height: 1.5;
}

::v-deep .el-dialog__body {
  padding: 24px 32px 10px; /* 调整内边距 */
}

::v-deep .el-dialog__footer {
  padding: 10px 32px 32px;
  text-align: center;
  border-top: none; /*移除可能的边框*/
}

::v-deep .el-dialog {
  border-radius: 16px; /* 更圆润的 Dialog */
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12); /* 更高级的阴影 */
}

::v-deep .el-dialog__header {
  padding: 24px 32px 10px;
  font-weight: 600;
}

::v-deep .el-dialog__headerbtn {
  top: 24px;
  right: 24px;
}

::v-deep .el-dialog__footer .dialog-footer {
  display: flex;
  justify-content: flex-end; /* 改回右对齐，符合一般操作习惯，或者居中也可以，用户之前没特指 */
  align-items: center;
  gap: 12px;
}

/* 如果用户还是喜欢居中按钮，可以取消上面的 justify-content: flex-end 并使用 center */
::v-deep .el-dialog__footer .dialog-footer {
  justify-content: center; 
}

::v-deep .el-dialog__footer .el-button {
  min-width: 96px;
  height: 36px;
  padding: 8px 20px;
  border-radius: 8px;
  font-weight: 500;
}

/* 响应式 */
@media (max-width: 768px) {
  .kb-sidebar {
    width: 220px;
  }
}
</style>
