<template>
  <div>
    <div class="front-notice"><i class="el-icon-bell" style="margin-right: 2px"></i>公告：{{ top }}</div>
    <!--头部-->
    <div class="front-header">
      <div class="front-header-left">
        <img src="@/assets/imgs/logo.png" alt="">
        <div class="title">项目前台</div>
      </div>
      <div class="front-header-center">
        <div class="front-header-nav">
          <el-menu :default-active="$route.path" mode="horizontal" router>
						<el-menu-item index="/front/home">首页</el-menu-item>
						<el-menu-item index="/front/person">个人中心</el-menu-item>
          </el-menu>
        </div>
      </div>
      <div class="front-header-right">
        <div v-if="!user.username">
          <el-button @click="$router.push('/login')">登录</el-button>
          <el-button @click="$router.push('/register')">注册</el-button>
        </div>
        <div v-else>
          <el-dropdown>
            <div class="front-header-dropdown">
              <ProxyImage :src="avatarSrc" alt="" />
              <div style="margin-left: 10px">
                <span>{{ user.name }}</span><i class="el-icon-arrow-down" style="margin-left: 5px"></i>
              </div>
            </div>
            <el-dropdown-menu slot="dropdown">
              <el-dropdown-item>
                <div style="text-decoration: none" @click="logout">退出</div>
              </el-dropdown-item>
            </el-dropdown-menu>
          </el-dropdown>
        </div>
      </div>
    </div>
    <!--主体-->
    <div class="main-body">
      <router-view ref="child" @update:user="updateUser" />
    </div>
  </div>

</template>

<script>
import ProxyImage from '@/components/ProxyImage.vue';

export default {
  name: "FrontLayout",
  components: {
    ProxyImage
  },
  data () {
    return {
      top: '',
      notice: [],
      user: JSON.parse(localStorage.getItem("xm-user") || '{}'),
    }
  },

  computed: {
    avatarSrc() {
      let avatar = this.user.avatar;
      
      // 默认头像
      const defaultAvatar = 'https://www.keaitupian.cn/cjpic/frombd/2/253/3810755577/3802575188.jpg';
      
      if (!avatar) return defaultAvatar;
      
      // 修复：后端返回的 localhost 地址在公网/ngrok 环境下无法访问
      if (avatar.includes('localhost:9090')) {
        return avatar.replace('http://localhost:9090', this.$baseUrl);
      }
      
      if (avatar.startsWith('http')) {
        return avatar;
      }
      
      let baseUrl = this.$baseUrl || '';
      if (!baseUrl.endsWith('/') && !avatar.startsWith('/')) {
        return baseUrl + '/' + avatar;
      }
      return baseUrl + avatar;
    }
  },

  mounted() {
    this.loadNotice()
  },
  methods: {
    loadNotice() {
      this.$request.get('/notice/selectAll').then(res => {
        this.notice = res.data
        let i = 0
        if (this.notice && this.notice.length) {
          this.top = this.notice[0].content
          setInterval(() => {
            this.top = this.notice[i].content
            i++
            if (i === this.notice.length) {
              i = 0
            }
          }, 2500)
        }
      })
    },
    updateUser() {
      this.user = JSON.parse(localStorage.getItem('xm-user') || '{}')   // 重新获取下用户的最新信息
    },
    // 退出登录
    logout() {
      localStorage.removeItem("xm-user");
      this.$router.push("/login");
    },
  }

}
</script>

<style scoped>
  @import "@/assets/css/front.css";
</style>