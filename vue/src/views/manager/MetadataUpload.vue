<template>
  <div class="metadata-upload-container">
    <h2>元数据上传</h2>
    <el-divider></el-divider>

    <!-- 上传区域 -->
    <div class="upload-section">
      <el-upload
          class="upload-demo"
          drag
          :action="uploadUrl"
          :headers="uploadHeaders"
          :on-success="handleUploadSuccess"
          :on-error="handleUploadError"
          :before-upload="beforeUpload"
          :file-list="fileList"
          multiple
      >
        <i class="el-icon-upload"></i>
        <div class="el-upload__text">将文件拖到此处，或<em>点击上传</em></div>
        <div class="el-upload__tip" slot="tip">
          支持上传 .csv, .xlsx, .json, .xml 等格式文件，单个文件不超过 50MB
        </div>
      </el-upload>
    </div>

    <!-- 已上传文件列表 -->
    <div class="file-list-section">
      <h3>已上传的元数据文件</h3>
      <el-table :data="metadataList" style="width: 100%">
        <el-table-column prop="fileName" label="文件名" width="300"></el-table-column>
        <el-table-column prop="fileSize" label="文件大小" width="120"></el-table-column>
        <el-table-column prop="uploadTime" label="上传时间" width="180"></el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template v-slot="scope">
            <el-tag :type="scope.row.status === '已处理' ? 'success' : 'warning'">
              {{ scope.row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="uploader" label="上传者" width="120"></el-table-column>
        <el-table-column label="操作" width="200">
          <template v-slot="scope">
            <el-button size="mini" type="primary" @click="viewMetadata(scope.row)">查看</el-button>
            <el-button size="mini" type="danger" @click="deleteMetadata(scope.row.id)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination">
        <el-pagination
            background
            @current-change="handleCurrentChange"
            :current-page="pageNum"
            :page-size="pageSize"
            layout="total, prev, pager, next"
            :total="total">
        </el-pagination>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'MetadataUpload',
  data() {
    return {
      uploadUrl: this.$baseUrl + '/files/upload',
      uploadHeaders: {
        token: JSON.parse(localStorage.getItem('xm-user') || '{}').token
      },
      fileList: [],
      metadataList: [],
      pageNum: 1,
      pageSize: 10,
      total: 0
    }
  },
  created() {
    this.loadMetadataList()
  },
  methods: {
    beforeUpload(file) {
      const isLt50M = file.size / 1024 / 1024 < 50
      if (!isLt50M) {
        this.$message.error('上传文件大小不能超过 50MB!')
      }
      return isLt50M
    },
    handleUploadSuccess(response, file, fileList) {
      if (response.code === '200') {
        this.$message.success('上传成功!')
        this.loadMetadataList()
      } else {
        this.$message.error('上传失败: ' + response.msg)
      }
    },
    handleUploadError(err, file, fileList) {
      this.$message.error('上传失败，请重试')
    },
    loadMetadataList() {
      // TODO: 从后端加载元数据文件列表
      // 示例数据
      this.metadataList = [
        {
          id: 1,
          fileName: 'users_metadata.csv',
          fileSize: '2.5 MB',
          uploadTime: '2025-12-15 10:30:00',
          status: '已处理',
          uploader: 'admin'
        },
        {
          id: 2,
          fileName: 'products_data.xlsx',
          fileSize: '5.8 MB',
          uploadTime: '2025-12-15 09:15:00',
          status: '处理中',
          uploader: 'admin'
        }
      ]
      this.total = 2
    },
    viewMetadata(row) {
      this.$message.info('查看元数据：' + row.fileName)
      // TODO: 实现查看元数据详情
    },
    deleteMetadata(id) {
      this.$confirm('确定要删除这个元数据文件吗？', '确认删除', {
        type: 'warning'
      }).then(() => {
        // TODO: 调用删除接口
        this.$message.success('删除成功')
        this.loadMetadataList()
      }).catch(() => {})
    },
    handleCurrentChange(pageNum) {
      this.pageNum = pageNum
      this.loadMetadataList()
    }
  }
}
</script>

<style scoped>
.metadata-upload-container {
  padding: 20px;
}

.metadata-upload-container h2,
.metadata-upload-container h3 {
  color: #303133;
  margin-bottom: 10px;
}

.upload-section {
  margin: 30px 0;
}

.file-list-section {
  margin-top: 40px;
}

.pagination {
  margin-top: 20px;
  text-align: right;
}
</style>
