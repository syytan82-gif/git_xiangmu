<template>
  <div class="card">
    <div class="name-icon">
      <div style="display: flex; align-items: center; overflow: hidden;">
        <i class="el-icon-lock card-icon"></i>
        <span class="name ellipsis" :title="name">{{ name }}</span>
      </div>
      <el-switch
        v-model="localStatus"
        active-color="#13ce66"
        inactive-color="#ff4949"
        @change="handleStatusChange"
        @click.native.stop
      ></el-switch>
    </div>
    <div class="type-value">
      <span class="type">权限规则</span>
      <span class="value">{{ num }} 条</span>
    </div>
    <div class="type-value">
      <span class="type">受限用户</span>
      <span class="value">{{ userCount }} 人</span>
    </div>
    <div class="methods">
      <el-button size="small" @click="handleEdit">
        <i class="el-icon-key"></i>
        设置规则
      </el-button>
      <el-button size="small" @click="handleSetUser">
        <i class="el-icon-user"></i>
        设置用户
      </el-button>
      <el-button size="small" @click="handleDelete">
        <i class="el-icon-delete"></i>
        删除
      </el-button>
      <el-button size="small" @click="handleCopy">
        <i class="el-icon-document-copy"></i>
        复制
      </el-button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'PermissionCard',
  
  props: {
    id: {
      type: [String, Number],
      default: ''
    },
    name: {
      type: String,
      default: '-'
    },
    num: {
      type: [String, Number],
      default: 0
    },
    userCount: {
      type: [String, Number],
      default: 0
    },
    status: {
      type: [Boolean, String, Number],
      default: true // Default enabled? Or false? Let's assume true or match backend.
    }
  },
  
  data() {
    return {
      localStatus: true
    }
  },

  watch: {
    status: {
      immediate: true,
      handler(val) {
        // Handle different types if necessary, e.g. 1/0 or '1'/'0'
        this.localStatus = val === true || val === 'true' || val === 1 || val === '1'
      }
    }
  },
  
  methods: {
    handleStatusChange(val) {
      this.$emit('status-change', val)
    },
    handleEdit() {
      this.$emit('edit')
    },
    
    handleDelete() {
      this.$emit('del')
    },
    
    handleSetUser() {
      this.$emit('set-user')
    },

    handleCopy() {
      this.$emit('copy')
    }
  }
}
</script>

<style scoped>
.card {
  width: 100%;
  min-height: 176px;
  height: auto;
  border: 1px solid #dee0e3;
  padding: 16px;
  border-radius: 12px;
  transition: box-shadow 0.3s;
  display: flex;
  flex-direction: column;
}

.card:hover {
  box-shadow: 0px 6px 24px 0px rgba(31, 35, 41, 0.08);
}

.card:hover .methods {
  opacity: 1;
  pointer-events: auto;
  transform: translateY(0);
}

.name-icon {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.card-icon {
  font-size: 32px;
  color: #409eff;
}

.name {
  margin-left: 12px;
  font-weight: 500;
  font-size: 16px;
  line-height: 24px;
  max-width: 250px;
}

.type-value {
  margin-top: 8px;
  display: flex;
  align-items: center;
  font-weight: 400;
  font-size: 14px;
  line-height: 22px;
}

.type {
  color: #646a73;
}

.value {
  margin-left: 16px;
}

.methods {
  margin-top: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap; /* Allow wrapping */
  gap: 8px; /* Increase gap */
  opacity: 0;
  pointer-events: none;
  transition: all 0.3s;
}

/* Remove individual margins since we use flex gap or justify */
.methods .el-button {
  margin: 0;
  padding: 6px 10px; /* Adjust padding */
  flex: 1 0 auto; /* Allow grow but also shrink if needed, or wrap */
  display: flex;
  justify-content: center;
  align-items: center;
  min-width: 70px; /* Ensure buttons don't get too small */
}

.methods .el-button span {
  margin-left: 2px;
}

.ellipsis {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
