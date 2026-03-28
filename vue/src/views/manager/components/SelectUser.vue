<template>
  <div class="select-user-permission">
    <p class="lighter-bold">选择受限用户</p>
    <div v-loading="loading" class="flex border" style="height: 428px; border-radius: 6px">
      <div class="p-16 border-r">
        <el-input
          v-model="search"
          placeholder="搜索"
          style="width: 364px; margin-left: 16px"
          clearable
        >
          <i slot="prefix" class="el-input__icon el-icon-search"></i>
        </el-input>
        <div class="mt-8 max-height-workspace">
          <el-checkbox
            v-model="checkAll"
            class="mb-8"
            style="margin-left: 16px"
            :indeterminate="isIndeterminate"
            @change="handleCheckAllChange"
          >
            全选
          </el-checkbox>
          <el-checkbox-group
            v-model="checkedUsers"
            class="checkbox-group-block"
            @change="handleCheckedUsersChange"
          >
            <el-checkbox
              v-for="user in usersWithKeywords"
              :key="user.id"
              :label="user.id"
              class="hover-bg"
            >
              <div class="flex">
                <i class="el-icon-user" style="font-size: 28px"></i>
                <span class="ml-4 ellipsis" style="max-width: 40%" :title="user.name">
                  {{ user.name }}
                </span>
                <span class="account ellipsis" style="max-width: 40%" :title="user.username">
                  ({{ user.username }})
                </span>
              </div>
            </el-checkbox>
          </el-checkbox-group>
        </div>
      </div>
      <div class="p-16 w-full">
        <div class="flex-between mb-16" style="margin: 0 16px">
          <span class="lighter">
            已选择 {{ checkTableList.length }} 人
          </span>
          <el-button type="text" @click="clearUsersAll">
            清空
          </el-button>
        </div>
        <div
          v-for="user in checkTableList"
          :key="user.id"
          style="margin: 0 16px; position: relative"
          class="flex-between align-center hover-bg-select"
        >
          <div class="flex align-center ellipsis" style="width: 100%">
            <i class="el-icon-user" style="font-size: 28px"></i>
            <span class="ml-4 lighter ellipsis" style="max-width: 40%" :title="user.name">
              {{ user.name }}
            </span>
            <span class="account ellipsis" style="max-width: 40%" :title="user.username">
              ({{ user.username }})
            </span>
          </div>
          <el-button class="close-btn" type="text">
            <i class="el-icon-close" style="font-size: 16px" @click="clearUser(user)"></i>
          </el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { getCandidateUsers } from '@/api/permissions'

export default {
  name: 'SelectUser',
  
  data() {
    return {
      checkAll: false,
      isIndeterminate: false,
      checkedUsers: [],
      users: [],
      search: '',
      loading: false,
      checkTableList: []
    }
  },
  
  computed: {
    usersWithKeywords() {
      if (!this.search) return this.users
      return this.users.filter(user => 
        (user.name || '').toLowerCase().includes(this.search.toLowerCase()) ||
        (user.username || '').toLowerCase().includes(this.search.toLowerCase())
      )
    }
  },
  
  watch: {
    search() {
      const userIds = this.usersWithKeywords.map(u => u.id)
      this.checkedUsers = this.checkTableList
        .filter(u => userIds.includes(u.id))
        .map(u => u.id)
      
      const checkedCount = this.checkedUsers.length
      this.checkAll = checkedCount === this.usersWithKeywords.length
      this.isIndeterminate = checkedCount > 0 && checkedCount < this.usersWithKeywords.length
    }
  },
  
  methods: {
    async open(selectedUserIds) {
      this.loading = true
      this.search = ''
      this.checkedUsers = []
      this.checkAll = false
      this.checkTableList = []
      this.isIndeterminate = false
      
      try {
        // 使用新的候选用户列表API
        const res = await getCandidateUsers()
        this.users = res.data || res || []
        
        if (selectedUserIds && selectedUserIds.length) {
          const selectedUsers = this.users.filter(u => selectedUserIds.includes(u.id))
          this.checkedUsers = selectedUsers.map(u => u.id)
          this.checkTableList = [...selectedUsers]
          this.handleCheckedUsersChange(this.checkedUsers)
        }
      } catch (error) {
        console.error('加载用户列表失败:', error)
        this.$message.error('加载用户列表失败')
      } finally {
        this.loading = false
      }
    },
    
    handleCheckAllChange(val) {
      const userIds = this.usersWithKeywords.map(u => u.id)
      
      if (val) {
        // 全选：添加当前搜索结果中的所有用户
        const newUsers = this.usersWithKeywords.filter(u => 
          !this.checkTableList.find(existing => existing.id === u.id)
        )
        this.checkTableList = [...this.checkTableList, ...newUsers]
        this.checkedUsers = [
          ...this.checkedUsers.filter(id => !userIds.includes(id)),
          ...userIds
        ]
      } else {
        // 取消全选：移除当前搜索结果中的用户
        this.checkTableList = this.checkTableList.filter(u => !userIds.includes(u.id))
        this.checkedUsers = this.checkedUsers.filter(id => !userIds.includes(id))
      }
      
      this.isIndeterminate = false
    },
    
    handleCheckedUsersChange(value) {
      const checkedCount = value.length
      this.checkAll = checkedCount === this.usersWithKeywords.length
      this.isIndeterminate = checkedCount > 0 && checkedCount < this.usersWithKeywords.length
      
      // 更新选中列表
      const userIds = this.usersWithKeywords.map(u => u.id)
      const uncheckedUsers = this.checkTableList.filter(u => !userIds.includes(u.id))
      const checkedUsers = this.users.filter(u => value.includes(u.id))
      
      this.checkTableList = [...uncheckedUsers, ...checkedUsers]
    },
    
    clearUser(user) {
      this.checkedUsers = this.checkedUsers.filter(id => id !== user.id)
      this.checkTableList = this.checkTableList.filter(u => u.id !== user.id)
      this.handleCheckedUsersChange(this.checkedUsers)
    },
    
    clearUsersAll() {
      this.checkedUsers = []
      this.checkTableList = []
      this.handleCheckedUsersChange([])
    }
  }
}
</script>

<style scoped>
.select-user-permission .lighter-bold {
  margin-bottom: 16px;
  font-weight: 500;
  font-size: 16px;
  line-height: 24px;
}

.mb-8 {
  margin-bottom: 8px;
}

.mb-16 {
  margin-bottom: 16px;
}

.hover-bg:hover::after,
.hover-bg-select:hover::after {
  content: '';
  height: 44px;
  width: calc(100% + 34px);
  background: rgba(31, 35, 41, 0.1);
  position: absolute;
  border-radius: 6px;
  top: 50%;
  transform: translateY(-50%);
  left: -8px;
  z-index: 1;
}

.hover-bg-select:hover::after {
  width: calc(100% + 16px);
}

.mt-8 {
  margin-top: 8px;
}

.mt-16 {
  margin-top: 16px;
}

.p-16 {
  padding: 16px 0;
}

.lighter {
  font-weight: 400;
  font-size: 14px;
  line-height: 22px;
}

.checkbox-group-block {
  margin: 0 16px;
}

.checkbox-group-block >>> .el-checkbox,
.checkbox-group-block >>> .el-checkbox__label,
.checkbox-group-block .flex {
  width: 96%;
  height: 44px;
}

.checkbox-group-block .flex {
  align-items: center;
}

.checkbox-group-block .flex .account {
  color: #8f959e;
}

.close-btn {
  position: relative;
  z-index: 10;
  height: 24px;
  line-height: 24px;
}

.close-btn:hover,
.close-btn:active,
.close-btn:focus {
  background: rgba(31, 35, 41, 0.1) !important;
}

.border {
  border: 1px solid #dee0e3;
}

.w-full {
  height: 100%;
  width: 50%;
  overflow-y: auto;
}

.w-full .flex-between {
  height: 44px;
}

.max-height-workspace {
  max-height: calc(100% - 24px);
  overflow-y: auto;
}

.align-center {
  align-items: center;
}

.flex-between {
  display: flex;
  justify-content: space-between;
}

.ml-4 {
  margin-left: 4px;
}

.flex {
  display: flex;
}

.border-r {
  border-right: 1px solid #dee0e3;
  width: 50%;
  overflow: hidden;
}

.ellipsis {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
