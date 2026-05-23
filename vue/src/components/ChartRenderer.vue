<template>
  <div class="chart-renderer-wrapper">
    <!-- 类似SQL代码块的头部栏 -->
    <div class="chart-header">
      <span class="chart-lang-tag">图表</span>
      <div class="header-actions">
        <!-- 移除筛选按钮，因为改为内联 -->
        <span class="action-btn" @click="handleExportChart" title="导出图表">
          <i class="el-icon-download"></i>
        </span>
        <span class="action-btn" @click="handleFullscreen" :title="isFullscreen ? '退出全屏' : '全屏显示'">
          <i :class="isFullscreen ? 'el-icon-crop' : 'el-icon-full-screen'"></i>
        </span>
        <span class="collapse-btn" @click="isCollapsed = !isCollapsed" :title="isCollapsed ? '展开图表' : '收起图表'">
          <i :class="isCollapsed ? 'el-icon-arrow-down' : 'el-icon-arrow-up'"></i>
        </span>
      </div>
    </div>
    
    <!-- 可折叠的图表内容区域 -->
    <transition name="chart-collapse">
      <div v-show="!isCollapsed" class="chart-renderer">
        <!-- Configuration Panel -->
        <div class="chart-config config-container" v-show="false">
          
          <!-- 第一行：图表类型 + X轴/分类 -->
          <div class="config-row">
             <!-- 图表类型 -->
             <div class="config-item">
               <span class="config-label">图表类型</span>
               <el-select 
                 v-model="config.chartType" 
                 popper-class="chart-select-popper" 
                 placeholder="请选择" 
                 @change="handleConfigChange" 
                 class="modern-input"
                 :popper-append-to-body="false"
               >
                 <el-option label="柱状图" value="bar"></el-option>
                 <el-option label="折线图" value="line"></el-option>
                 <el-option label="面积图" value="area"></el-option>
                 <el-option label="饼图" value="pie"></el-option>
                 <el-option label="雷达图" value="radar"></el-option>
               </el-select>
             </div>

             <!-- X轴配置 (移到第一行) -->
             <template v-if="['bar', 'line', 'area'].includes(config.chartType)">
               <div class="config-item">
                 <span class="config-label">X轴选择</span>
                 <el-select 
                   v-model="config.xAxisField" 
                   popper-class="chart-select-popper" 
                   placeholder="选择字段" 
                   @change="handleConfigChange" 
                   class="modern-input"
                   filterable
                   :popper-append-to-body="false"
                 >
                   <el-option v-for="col in columns" :key="col.name" :label="col.name" :value="col.name"></el-option>
                 </el-select>
               </div>
             </template>
             <template v-else-if="config.chartType === 'pie'">
                <div class="config-item">
                  <span class="config-label">分类选择</span>
                  <el-select 
                    v-model="config.xAxisField" 
                    placeholder="维度字段" 
                    @change="handleConfigChange" 
                    class="modern-input" 
                    popper-class="chart-select-popper" 
                    :popper-append-to-body="false"
                  >
                    <el-option v-for="col in columns" :key="col.name" :label="col.name" :value="col.name"></el-option>
                  </el-select>
                </div>
             </template>
             <template v-else-if="config.chartType === 'radar'">
                <div class="config-item">
                  <span class="config-label">维度选择</span>
                  <el-select 
                    v-model="config.xAxisField" 
                    placeholder="雷达图维度字段" 
                    @change="handleConfigChange" 
                    class="modern-input" 
                    popper-class="chart-select-popper" 
                    :popper-append-to-body="false"
                  >
                    <el-option v-for="col in columns" :key="col.name" :label="col.name" :value="col.name"></el-option>
                  </el-select>
                </div>
             </template>
          </div>

          <!-- 第二行：Y轴/数值 + 生成按钮 -->
          <div class="config-row main-row"> <!-- 复用 main-row 样式实现两端对齐 -->
             <!-- Y轴配置 -->
             <div class="row-left">
                <template v-if="['bar', 'line', 'area'].includes(config.chartType)">
                   <div class="config-item">
                     <span class="config-label">Y轴选择</span>
                     <el-select 
                       :key="'yaxis-' + config.chartType"
                       v-model="config.yAxisFields" 
                       popper-class="chart-select-popper" 
                       multiple 
                       placeholder="选择Y轴(可多选)" 
                       @change="handleConfigChange" 
                       class="modern-input is-wide"
                       :popper-append-to-body="false"
                     >
                       <el-option v-for="col in numericColumns" :key="col.name" :label="col.name" :value="col.name"></el-option>
                     </el-select>
                   </div>
                </template>
                <template v-else-if="config.chartType === 'pie'">
                   <div class="config-item">
                     <span class="config-label">数值字段</span>
                     <el-select 
                       v-model="config.activeYAxisFields" 
                       multiple 
                       placeholder="数值字段" 
                       @change="handleConfigChange" 
                       class="modern-input is-wide" 
                       popper-class="chart-select-popper" 
                       collapse-tags
                       :popper-append-to-body="false"
                     >
                       <el-option v-for="col in numericColumns" :key="col.name" :label="col.name" :value="col.name"></el-option>
                     </el-select>
                   </div>
                </template>
                <template v-else-if="config.chartType === 'radar'">
                   <div class="config-item">
                     <span class="config-label">指标选择</span>
                     <el-select 
                       :key="'yaxis-radar'"
                       v-model="config.yAxisFields" 
                       popper-class="chart-select-popper" 
                       multiple 
                       placeholder="选择数值字段(可多选)" 
                       @change="handleConfigChange" 
                       class="modern-input is-wide"
                       :popper-append-to-body="false"
                     >
                       <el-option v-for="col in numericColumns" :key="col.name" :label="col.name" :value="col.name"></el-option>
                     </el-select>
                   </div>
                </template>
             </div>

             <!-- 生成按钮 -->
             <div class="row-right">
               <!-- 聚合展示开关 -->
               <div class="aggregate-switch" style="margin-right: 15px; display: inline-flex; align-items: center;">
                 <span style="font-size: 13px; color: #606266; margin-right: 8px;">聚合展示</span>
                 <el-switch v-model="isAggregated" @change="handleAggregationChange"></el-switch>
               </div>
               <el-button type="primary" icon="el-icon-data-analysis" @click="renderChart" :loading="loading" size="small" class="render-btn">
                 生成图表
               </el-button>
             </div>
          </div>
        </div>

        <!-- Chart Container -->
        <div class="chart-wrapper">
          <!-- 图表左右切换导航 -->
          <div class="chart-navigation" v-if="charts && charts.length > 1">
            <el-button icon="el-icon-arrow-left" circle size="small" @click="prevChart" :disabled="currentChartIndex === 0" class="nav-btn"></el-button>
            <span class="nav-text">{{ currentChartIndex + 1 }} / {{ charts.length }}</span>
            <el-button icon="el-icon-arrow-right" circle size="small" @click="nextChart" :disabled="currentChartIndex === charts.length - 1" class="nav-btn"></el-button>
          </div>
          <!-- 只有当有图表数据时才显示图表区域 -->
          <div v-if="chartOption" v-loading="loading" ref="chartRef" class="chart-content" :style="{ height: actualHeight + 'px' }"></div>
          <!-- 空状态占位 -->
          <div v-else-if="!chartOption && currentData.length === 0" class="empty-chart">
            <i class="el-icon-picture-outline"></i>
            <span>请配置并生成图表</span>
          </div>
          <!-- 【优化】下钻后无数据状态 -->
          <div v-else-if="currentData.length === 0" class="empty-chart enhanced-empty">
            <div class="empty-illustration">
              <i class="el-icon-box"></i>
            </div>
            <div class="empty-content">
              <p class="empty-title">该条件下暂无数据</p>
              <p class="empty-hint">尝试返回上一级或调整筛选条件</p>
            </div>
            <el-button 
              v-if="drillStack.length > 0" 
              type="primary" 
              size="small" 
              @click="stepBack"
              class="empty-action-btn"
            >
              <i class="el-icon-back"></i> 返回上一级
            </el-button>
          </div>
        </div>
        

        
        <!-- Chart Footer: 包含筛选控制和面包屑 -->
        <div class="chart-footer-bar" v-if="chartOption" v-show="charts.length === 0">
           <div class="footer-content">
              <!-- 已生效筛选标签区 (新增位置) -->
              <div class="footer-tags-row" v-if="appliedFilters.length > 0 || filterHistory.length > 0">
                  <div class="tags-wrapper">
                    <el-tag
                      v-for="(filter, index) in appliedFilters"
                      :key="index"
                      closable
                      size="small"
                      @close="handleRemoveAppliedFilter(index)"
                      class="filter-tag"
                    >
                      {{ filter.field }} {{ getOperatorLabel(filter.operator) }} {{ filter.value }}
                    </el-tag>
                  </div>
                  <div class="filter-actions">
                    <el-button 
                      v-if="filterHistory.length > 0" 
                      type="text" 
                      size="mini" 
                      icon="el-icon-refresh-left" 
                      @click="handleUndoFilter"
                    >撤销</el-button>
                    <el-button 
                      v-if="appliedFilters.length > 0" 
                      type="text" 
                      size="mini" 
                      icon="el-icon-delete" 
                      @click="handleClearFilters"
                    >清空</el-button>
                  </div>
              </div>

              <!-- 内联筛选控件 -->
              <div class="inline-filter-group">
                 <span class="config-label">添加筛选</span>
                 
                 <!-- 字段选择 -->
                 <el-select 
                   v-model="newFilter.field" 
                   popper-class="chart-select-popper" 
                   placeholder="选择字段" 
                   size="small"
                   class="footer-input-field"
                   filterable
                   :popper-append-to-body="false"
                 >
                   <el-option v-for="col in columns" :key="col.name" :label="col.name" :value="col.name"></el-option>
                 </el-select>

                 <!-- 操作符选择 -->
                 <el-select 
                   v-model="newFilter.operator" 
                   popper-class="chart-select-popper" 
                   placeholder="操作符" 
                   size="small"
                   class="footer-input-op"
                   :popper-append-to-body="false"
                 >
                    <el-option label="=" value="EQ"></el-option>
                    <el-option label="!=" value="NE"></el-option>
                    <el-option label=">" value="GT"></el-option>
                    <el-option label=">=" value="GTE"></el-option>
                    <el-option label="<" value="LT"></el-option>
                    <el-option label="<=" value="LTE"></el-option>
                    <el-option label="包含" value="LIKE"></el-option>
                    <el-option label="不包含" value="NOT_LIKE"></el-option>
                    <el-option label="为空" value="IS_NULL"></el-option>
                    <el-option label="不为空" value="IS_NOT_NULL"></el-option>
                 </el-select>

                 <!-- 值输入 -->
                 <el-input 
                   v-if="!['IS_NULL', 'IS_NOT_NULL'].includes(newFilter.operator)"
                   v-model="newFilter.value" 
                   placeholder="输入值" 
                   size="small"
                   class="footer-input-value"
                   @keyup.enter.native="handleAddInlineFilter"
                 ></el-input>
                 <el-input 
                   v-else
                   disabled
                   placeholder="无需值" 
                   size="small"
                   class="footer-input-value"
                 ></el-input>

                 <el-button 
                   type="primary" 
                   size="small" 
                   icon="el-icon-plus" 
                   @click="handleAddInlineFilter"
                   :disabled="!newFilter.field"
                   class="add-filter-btn"
                 >添加</el-button>
              </div>
           </div>


        </div>
      </div>
    </transition>
  </div>
</template>

<script>
// Import ECharts
import * as echarts from 'echarts';
import axios from 'axios';

const request = axios.create({
  baseURL: process.env.VUE_APP_BASEURL,
  timeout: 300000
});

request.interceptors.request.use(config => {
  config.headers['Content-Type'] = 'application/json;charset=utf-8';
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
  return response;
}, error => {
  return Promise.reject(error);
});

export default {
  name: 'ChartRenderer',
  props: {
    messageId: {
      type: [String, Number],
      default: null
    },
    originalData: {
      type: Array,
      default: () => []
    },
    columns: {
      type: Array,
      default: () => []
    },
    suggestion: {
      type: Object,
      default: () => ({})
    },
    height: {
      type: Number,
      default: 450 // 【优化】默认高度改为450，为负数预留空间
    },
    charts: {
      type: Array,
      default: () => []
    },
    // 【新增】下钻功能所需的 props
    sql: {
      type: String,
      default: ''
    },
    dbConfigId: {
      type: [String, Number],
      default: null
    }
  },
  data() {
    return {
      chartInstance: null,
      loading: false,
      isCollapsed: true, // 【修改】默认收起图表，用户主动展开后才生成
      currentChartIndex: 0, // 当前展示的图表索引
      config: {
        chartType: 'bar',
        xAxisField: '',
        yAxisField: '', // 【保留】向后兼容旧代码
        yAxisFields: [], // 【新增】支持多Y轴选择
        drillable: false // 【新增】下钻模式开关，默认关闭
      },
      chartOption: null,
      isAggregated: false, // 【新增】是否聚合展示
      // 【新增】图表配色方案（与buildEChartsOption中的colorPalette保持一致）
      colorPalette: [
        '#3B82F6', // 科技蓝
        '#06B6D4', // 赛博青
        '#8B5CF6', // 霓虹紫
        '#F59E0B', // 活力橙
        '#10B981', // 极光绿
        '#6366F1', // 靛蓝
        '#EC4899', // 粉红
        '#14B8A6'  // 青绿
      ],
      dynamicHeight: 450, // 【新增】动态计算的图表高度
      // 【新增】下钻功能相关状态
      currentSql: '', // 当前 SQL(用于下钻)
      currentData: [], // 当前显示的数据
      currentColumns: [], // 【新增】当前显示数据的列元数据
      drillStack: [], // 下钻历史栈,用于面包屑导航 (完整的 DrillHistoryNode 结构)
      // 【新增】维度选择菜单状态
      showDimensionMenu: false, // 是否显示维度选择菜单
      menuPosition: { x: 0, y: 0 }, // 菜单位置
      pendingFilter: null, // 待应用的筛选条件 {column, operator, value, displayValue}
      hoverDimension: null, // 【新增】当前悬停的维度名称
      manualDrillValue: '', // 【新增】手动下钻选择值
      manualDrillField: '', // 【新增】手动下钻选择字段
      isFullscreen: false, // 【新增】全屏状态
      
      // 筛选功能状态
      newFilter: { field: '', operator: 'EQ', value: '' }, // 内联新筛选
      appliedFilters: [],
      filterHistory: [], // 历史栈，存储 appliedFilters 的快照
      filterLoading: false
    };
  },
  computed: {
    numericColumns() {
      if (!this.columns) return [];
      return this.columns.filter(c => {
        const type = (c.type || '').toUpperCase();
        return ['INT', 'INTEGER', 'DECIMAL', 'FLOAT', 'DOUBLE', 'NUMERIC', 'BIGINT', 'NUMBER'].some(t => type.includes(t)) || !type;
      });
    },
    // 【新增】计算实际使用的图表高度
    actualHeight() {
      return this.dynamicHeight;
    },
    // 【新增】统一获取Y轴字段列表（兼容单选和多选）
    activeYAxisFields() {
      // 优先使用新的多选字段
      if (Array.isArray(this.config.yAxisFields) && this.config.yAxisFields.length > 0) {
        return this.config.yAxisFields;
      }
      // 兼容旧的单选字段
      if (this.config.yAxisField) {
        return [this.config.yAxisField];
      }
      return [];
    },
    // 【优化】计算可用的下钻维度（使用当前列元数据 + 智能排序）
    availableDimensions() {
      // 优先使用 currentColumns (当前数据的列信息), 如果没有则回退到 columns (初始列信息)
      const cols = this.currentColumns.length > 0 ? this.currentColumns : this.columns;
      
      if (!cols || cols.length === 0) {
        console.warn('[ChartRenderer] 没有列元数据，无法计算下钻维度');
        return [];
      }
      
      console.log('[ChartRenderer] 计算下钻维度, 原始列:', cols.map(c => `${c.name}(${c.type})`));
      
      // 辅助函数：判断是否为数值类型
      const isNumericType = (type) => {
        if (!type) return false; // 类型未知，默认为非数值（保留）
        const t = type.toUpperCase();
        return ['INT', 'INTEGER', 'DECIMAL', 'FLOAT', 'DOUBLE', 'NUMERIC', 'BIGINT', 'NUMBER'].some(k => t.includes(k));
      };

      // 1. 筛选候选维度
      let candidates = cols.filter(col => {
        // 排除当前X轴
        if (col.name === this.config.xAxisField) return false;
        
        // 排除数值类型
        if (isNumericType(col.type)) return false;
        
        // 排除完全等于 'id' 的字段
        if (col.name.toLowerCase() === 'id') return false;
        
        return true;
      });
      
      // 【兜底策略】如果过滤太严格导致没有候选，且还有其他列，则尝试放宽限制
      if (candidates.length === 0 && cols.length > 1) {
        console.warn('[ChartRenderer] 严格过滤后无维度，启用兜底策略');
        
        candidates = cols.filter(col => {
          if (col.name === this.config.xAxisField) return false;
          
          // 如果字段有明确的数值类型，坚决排除
          const type = (col.type || '').toUpperCase();
          if (['INT', 'DECIMAL', 'FLOAT', 'DOUBLE', 'NUMERIC'].some(k => type.includes(k))) return false;
          
          // 【新增】根据名称关键词推断是否为指标 (针对类型缺失的情况)
          // 包含这些词的通常是数值指标，不适合做分类维度
          const name = col.name;
          const isLikelyMetric = ['金额', '数量', '额', '率', '利润', '销量', '价', '比', '数'].some(key => name.includes(key));
          
          if (isLikelyMetric) return false;
          
          return true;
        });
        
        // 如果再次过滤后连一个都没有了，哪还是把所有的（非X轴）都放出来吧，让用户自己选，总比没有好
        if (candidates.length === 0) {
           console.warn('[ChartRenderer] 关键词过滤后也无维度，完全放开限制');
           candidates = cols.filter(col => col.name !== this.config.xAxisField);
        }
      }
      
      console.log('[ChartRenderer] 最终候选维度:', candidates.map(c => c.name));
      
      // 2. 智能排序
      return candidates.sort((a, b) => {
        const typeA = (a.type || '').toUpperCase();
        const typeB = (b.type || '').toUpperCase();
        
        const getPriority = (type) => {
          if (type.includes('DATE') || type.includes('TIME') || type.includes('YEAR')) return 1;
          if (type.includes('VARCHAR') || type.includes('CHAR') || type.includes('TEXT')) return 2;
          return 3;
        };
        
        const priorityDiff = getPriority(typeA) - getPriority(typeB);
        if (priorityDiff === 0) return a.name.localeCompare(b.name);
        return priorityDiff;
      });
    },
    
    // 【新增】获取累积的所有筛选条件
    allAppliedFilters() {
      return this.drillStack.map(node => node.filter).filter(f => f != null);
    },
    
    // 【新增】获取当前下钻层级深度
    currentDrillLevel() {
      return this.drillStack.length;
    }
  },
  watch: {
    suggestion: {
      handler(val) {
        // 【新增】建议更新时重置聚合
        this.isAggregated = false;
        if (val && val.chartType) {
          this.config.chartType = val.chartType || 'bar';
          this.config.xAxisField = val.xAxis || '';
          // 【兼容】同时设置单选和多选字段
          this.config.yAxisField = val.yAxis || '';
          this.config.yAxisFields = val.yAxis ? [val.yAxis] : [];
          
          // 如果有完整的推荐配置和数据，自动渲染图表
          this.$nextTick(() => {
            this.autoRenderIfReady();
          });
        }
      },
      immediate: true
    },
    // 监听原始数据变化
    originalData: {
      handler(newData) {
        // 【新增】数据更新时重置聚合
        this.isAggregated = false;
        
        // 【修改】当 originalData 变化时,同步更新 currentData (如果没有下钻)
        if (this.drillStack.length === 0) {
          this.currentData = newData || [];
        }
        this.$nextTick(() => {
          this.autoRenderIfReady();
        });
      },
      immediate: true // 立即执行一次
    },
    // 【新增】监听 SQL 变化
    sql: {
      handler(newSql) {
        // 只在没有下钻时更新 currentSql
        if (this.drillStack.length === 0 && newSql) {
          this.currentSql = newSql;
        }
      },
      immediate: true
    },
    // 【新增】监听 columns 变化
    columns: {
      handler(newCols) {
        if (this.drillStack.length === 0) {
          this.currentColumns = newCols || [];
        }
      },
      immediate: true
    },
    charts: {
      handler(newCharts) {
        if (newCharts && newCharts.length > 0) {
          this.currentChartIndex = 0;
          this.$nextTick(() => {
            this.renderBackendChart();
          });
        }
      },
      immediate: true
    },
    currentChartIndex: {
      handler(newIdx, oldIdx) {
        if (newIdx !== oldIdx && this.charts && this.charts.length > 0) {
          this.renderBackendChart();
        }
      }
    }
  },
  mounted() {
    this.$nextTick(() => {
       // Lazy init: initChart will be called when user generates a chart
       window.addEventListener('resize', this.handleResize);
       
       // 【新增】初始化 SQL、数据和列元数据
       this.currentSql = this.sql || '';
       this.currentData = this.originalData || [];
       this.currentColumns = this.columns || [];
       
       // 组件挂载后检查是否需要自动渲染
       this.autoRenderIfReady();
    });
  },
  beforeDestroy() {
    if (this.chartInstance) {
      this.chartInstance.dispose();
    }
    window.removeEventListener('resize', this.handleResize);
    
    // 【新增】清理全屏事件监听器
    if (this.fullscreenChangeHandler) {
      document.removeEventListener('fullscreenchange', this.fullscreenChangeHandler);
      document.removeEventListener('webkitfullscreenchange', this.fullscreenChangeHandler);
      document.removeEventListener('mozfullscreenchange', this.fullscreenChangeHandler);
      document.removeEventListener('MSFullscreenChange', this.fullscreenChangeHandler);
    }
  },
  methods: {
    // 【新增】格式化列类型显示
    formatColumnType(type) {
      if (!type) return '文本';
      const upperType = type.toUpperCase();
      
      // 简化常见类型名称
      if (upperType.includes('VARCHAR') || upperType.includes('CHAR')) return '文本';
      if (upperType.includes('TEXT')) return '文本';
      if (upperType.includes('DATE')) return '日期';
      if (upperType.includes('TIME')) return '时间';
      if (upperType.includes('INT') || upperType.includes('BIGINT')) return '整数';
      if (upperType.includes('DECIMAL') || upperType.includes('FLOAT') || upperType.includes('DOUBLE')) return '数值';
      
      // 返回原始类型（截断过长的类型名）
      return type.length > 8 ? type.substring(0, 8) : type;
    },
    
    prevChart() {
      if (this.currentChartIndex > 0) {
        this.currentChartIndex--;
      }
    },
    nextChart() {
      if (this.currentChartIndex < this.charts.length - 1) {
        this.currentChartIndex++;
      }
    },
    
    // 【已禁用】自动渲染图表（现在只有用户点击"生成图表"按钮才渲染）
    autoRenderIfReady() {
      // 如果后端有直接返回的图表配置，则直接渲染
      if (this.charts && this.charts.length > 0) {
        this.renderBackendChart();
      }
      return;
    },
    
    renderBackendChart() {
      if (!this.charts || this.charts.length === 0) return;
      const chartInfo = this.charts[this.currentChartIndex];
      if (!chartInfo) return;

      // 自动展开图表区域
      this.isCollapsed = false;

      this.loading = true;
      try {
        // 设置内部状态以匹配后端返回的图表类型，让 buildEChartsOption 正常处理格式
        this.config.chartType = chartInfo.chartType || 'bar';

        // 复用完善的 buildEChartsOption 构建返回项
        this.chartOption = this.buildEChartsOption(chartInfo);

        // 如果后端有传入标题，则设置标题并调整 grid 顶部间距，防止重叠
        if (chartInfo.title) {
          this.chartOption.title = { text: chartInfo.title, left: 'center', top: 0, textStyle: { fontSize: 13, fontWeight: 600, color: '#303133' } };
          // 推离 grid 顶部，避免标题与柱状图重叠
          if (this.chartOption.grid) {
            const grids = Array.isArray(this.chartOption.grid) ? this.chartOption.grid : [this.chartOption.grid];
            grids.forEach(g => { g.top = '56px'; });
            this.chartOption.grid = grids.length === 1 ? grids[0] : grids;
          }
        }

        // 【修复】不再强制禁用 bar/line 的 label：buildEChartsOption 内的 formatter 已实现
        // "小值显示圆点、普通值隐藏" 的智能逻辑，此处强制 false 会把圆点也一起关掉
        // 仅对饼图/雷达图不做处理（它们本身就需要显示 label）

        this.$nextTick(() => {
          if (this.chartInstance) {
            this.chartInstance.dispose();
            this.chartInstance = null;
          }
          this.initChart();
        });
      } catch (err) {
        console.error('[ChartRenderer] 渲染后端图表配置失败:', err);
      } finally {
        this.loading = false;
      }
    },
    
    // 导出图表为图片
    handleExportChart() {
      if (!this.chartInstance) {
        this.$message.warning('请先生成图表');
        return;
      }
      
      try {
        // 获取图表的 base64 图片数据
        const imgData = this.chartInstance.getDataURL({
          type: 'png',
          pixelRatio: 2, // 高清导出
          backgroundColor: '#fff'
        });
        
        // 创建下载链接
        const link = document.createElement('a');
        link.download = `chart_${Date.now()}.png`;
        link.href = imgData;
        link.click();
        
        this.$message.success('图表已导出');
      } catch (e) {
        console.error('导出图表失败:', e);
        this.$message.error('导出图表失败');
      }
    },
    
    // 【新增】全屏显示图表
    handleFullscreen() {
      const chartWrapper = this.$el;
      
      if (!this.isFullscreen) {
        // 【新增】进入全屏前先展开图表区域
        if (this.isCollapsed) {
          this.isCollapsed = false;
        }
        
        // 进入全屏
        if (chartWrapper.requestFullscreen) {
          chartWrapper.requestFullscreen();
        } else if (chartWrapper.webkitRequestFullscreen) {
          chartWrapper.webkitRequestFullscreen();
        } else if (chartWrapper.mozRequestFullScreen) {
          chartWrapper.mozRequestFullScreen();
        } else if (chartWrapper.msRequestFullscreen) {
          chartWrapper.msRequestFullscreen();
        }
        
        this.isFullscreen = true;
        
        // 监听全屏退出事件
        this.fullscreenChangeHandler = () => {
          if (!document.fullscreenElement && !document.webkitFullscreenElement && 
              !document.mozFullScreenElement && !document.msFullscreenElement) {
            this.isFullscreen = false;
            this.$nextTick(() => {
              if (this.chartInstance) {
                this.chartInstance.resize();
              }
            });
          } else {
            // 进入全屏后调整图表大小
            this.$nextTick(() => {
              if (this.chartInstance) {
                this.chartInstance.resize();
              }
            });
          }
        };
        
        document.addEventListener('fullscreenchange', this.fullscreenChangeHandler);
        document.addEventListener('webkitfullscreenchange', this.fullscreenChangeHandler);
        document.addEventListener('mozfullscreenchange', this.fullscreenChangeHandler);
        document.addEventListener('MSFullscreenChange', this.fullscreenChangeHandler);
      } else {
        // 退出全屏
        if (document.exitFullscreen) {
          document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
          document.webkitExitFullscreen();
        } else if (document.mozCancelFullScreen) {
          document.mozCancelFullScreen();
        } else if (document.msExitFullscreen) {
          document.msExitFullscreen();
        }
        
        this.isFullscreen = false;
      }
    },
    
    initChart() {
       if (this.$refs.chartRef) {
         this.chartInstance = echarts.init(this.$refs.chartRef);
         if (this.chartOption) {
           this.chartInstance.setOption(this.chartOption, true);
         }
         
         // 【新增】绑定图表点击事件,实现下钻功能
         this.chartInstance.off('click'); // 先解绑避免重复
         this.chartInstance.on('click', (params) => {
           console.log('[ChartRenderer] 图表被点击:', params);
           
           // 只在数据点上才触发
           if (params.componentType !== 'series') return;
           
           // 只在下钻模式开启时才触发
           if (!this.config.drillable) {
             console.log('[ChartRenderer] 下钻模式未开启');
             return;
           }
           
           // 检查是否有可用维度
           if (this.availableDimensions.length === 0) {
             this.$message.warning('暂无可用的下钻维度');
             return;
           }
           
           // 记录点击位置（用于菜单定位）
           const chartContainer = this.$refs.chartRef;
           const rect = chartContainer.getBoundingClientRect();
           this.menuPosition = {
             x: params.event.event.clientX - rect.left + 10,
             y: params.event.event.clientY - rect.top + 10
           };
           
           // 准备筛选条件
           this.pendingFilter = {
             column: this.config.xAxisField,
             operator: 'EQ',
             value: params.name,
             displayValue: `${this.config.xAxisField} = ${params.name}`
           };
           
           // 显示维度选择菜单
           this.showDimensionMenu = true;
           
           console.log('[ChartRenderer] 显示维度选择菜单, 待筛选:', this.pendingFilter);
         });
         
         // 【新增】点击图表空白处关闭菜单
         this.chartInstance.getZr().on('click', (params) => {
           if (!params.target) {
             this.showDimensionMenu = false;
           }
         });
       }
    },
    handleConfigChange() {
      // 【新增】配置变更时自动关闭聚合
      this.isAggregated = false;

      // 【修复】切换图表类型时，清空Y轴选择，防止标签重复渲染
      // 强制Vue重新渲染选择器
      this.$nextTick(() => {
        if (this.$refs.yAxisSelect) {
          this.$refs.yAxisSelect.$forceUpdate();
        }
      });
    },
    handleResize() {
      if (this.chartInstance) {
        this.chartInstance.resize();
      }
    },
    handleResize() {
      if (this.chartInstance) {
        this.chartInstance.resize();
      }
    },

    // --- 筛选功能方法 ---

    getOperatorLabel(op) {
      const map = {
        'EQ': '=',
        'NE': '!=',
        'GT': '>',
        'GTE': '>=',
        'LT': '<',
        'LTE': '<=',
        'LIKE': '包含',
        'NOT_LIKE': '不包含',
        'IS_NULL': '为空',
        'IS_NOT_NULL': '不为空'
      };
      return map[op] || op;
    },

    async handleAddInlineFilter() {
      // 校验
      if (!this.newFilter.field) {
         this.$message.warning('请选择筛选字段');
         return;
      }
      if (!['IS_NULL', 'IS_NOT_NULL'].includes(this.newFilter.operator) && !this.newFilter.value) {
         this.$message.warning('请输入筛选值');
         return;
      }

      // 记录历史
      this.filterHistory.push(JSON.parse(JSON.stringify(this.appliedFilters)));

      // 添加到已应用
      this.appliedFilters.push({ ...this.newFilter });
      
      // 重置输入
      this.newFilter = { field: '', operator: 'EQ', value: '' };

      // 调用接口
      await this.apiFilterData();
    },

    async handleRemoveAppliedFilter(index) {
      // 记录历史
      this.filterHistory.push(JSON.parse(JSON.stringify(this.appliedFilters)));
      
      this.appliedFilters.splice(index, 1);
      await this.apiFilterData();
    },
    
    async handleUndoFilter() {
      if (this.filterHistory.length === 0) return;
      
      // 弹出上一个状态
      const previousState = this.filterHistory.pop();
      this.appliedFilters = previousState;
      
      await this.apiFilterData();
    },

    async handleClearFilters() {
      // 记录历史
      this.filterHistory.push(JSON.parse(JSON.stringify(this.appliedFilters)));
      
      this.appliedFilters = [];
      await this.apiFilterData();
    },

    async apiFilterData() {
      // 【新增】筛选条件变更时自动关闭聚合，恢复明细展示
      this.isAggregated = false;
      
      this.filterLoading = true;
      this.loading = true; // 同时开启图表 loading

      try {
        // 如果没有筛选条件，使用原始数据
        if (this.appliedFilters.length === 0) {
           this.currentData = this.originalData || [];
           // 【修复】通知父组件更新表格数据
           this.$emit('update-data', this.currentData);
           // 这里可以考虑是否需要重置 columns，暂时假设 columns 不变
           this.filterLoading = false;
           this.loading = false;
           this.$nextTick(() => {
             this.renderChart();
           });
           return;
        }

        const payload = {
            originalSql: this.currentSql || this.sql,
            dbConfigId: this.dbConfigId,
            filters: this.appliedFilters,
            // 【新增】将图表配置传给后端，后端直接返回 ECharts 数据
            chartType: this.config.chartType,
            xAxisField: this.config.xAxisField,
            yAxisField: this.activeYAxisFields[0] || this.config.yAxisField || '',
            yAxisFields: this.activeYAxisFields,
            // 【兼容】同时发送 xAxis/yAxis 字段名，确保后端能识别
            xAxis: this.config.xAxisField, 
            yAxis: this.activeYAxisFields[0] || this.config.yAxisField || ''
        };

        const res = await request.post('/analysis/filter', payload);
        
        if (res.data.code === '200') {
            const resultData = res.data.data;
            if (resultData) { // 后端可能只返回 data 和 chartData
                // 1. 更新表格数据
                if (resultData.data) {
                  this.currentData = resultData.data;
                  this.$message.success(`筛选成功，共 ${resultData.data.length} 条数据`);
                  this.$emit('update-data', resultData.data);
                }
                
                // 2. 直接使用后端返回的图表数据 (chartData)
                if (resultData.chartData) {
                   console.log('[ChartRenderer] 使用后端返回的 chartData 更新图表');
                   // 假设 resultData.chartData 就是完整的 option，或者只需简单处理
                   // 根据用户描述 "直接塞给 ECharts 组件"，我们尝试直接构建 option 或使用 convert 结果
                   // 如果 chartData 是 ECharts option 结构
                   this.chartOption = this.buildEChartsOption(resultData.chartData);
                   
                   this.$nextTick(() => {
                     // 【新增】如果开启了聚合，需要忽略后端返回的chartData (因为它可能未聚合)，强制走前端聚合流程
                     if (this.isAggregated) {
                        console.log('[ChartRenderer] 聚合模式开启，重新执行前端聚合渲染');
                        this.renderChart();
                     } else {
                        // 正常流程：使用后端返回的图表配置
                        // 重新初始化并设置 option
                        if (this.chartInstance) {
                          this.chartInstance.dispose();
                          this.chartInstance = null;
                        }
                        this.initChart();
                     }
                   });
                } else {
                   // 如果没有 chartData，还是回退到前端渲染 (虽然用户说不再需要)
                   this.$nextTick(() => {
                       this.renderChart();
                   });
                }
            }
        } else {
            this.$message.error(res.data.msg || '筛选失败');
        }

      } catch (err) {
        console.error('筛选请求异常:', err);
        this.$message.error('筛选请求异常');
      } finally {
        this.filterLoading = false;
        this.loading = false;
      }
    },

    // 【新增】数据聚合方法 (性能优化版)
    aggregateData(data) {
      if (!data || data.length === 0) return [];
      
      console.time('AggregationTime'); // 性能计时
      const xField = this.config.xAxisField;
      const yFields = this.activeYAxisFields;
      
      if (!xField || (!yFields || yFields.length === 0)) return data;
      
      // 辅助函数：安全解析数字（支持千分位）
      const parseVal = (v) => {
        if (v === null || v === undefined) return 0;
        if (typeof v === 'number') return v;
        const s = String(v).replace(/,/g, '');
        const n = Number(s);
        return isNaN(n) ? 0 : n;
      };

      const map = new Map();
      
      // 针对上万条数据，Map 的查找性能是 O(1)，整体为 O(N)
      // 在浏览器中，遍历处理 10万条简单对象通常仅需几十毫秒
      for (let i = 0; i < data.length; i++) {
        const item = data[i];
        const keyVal = item[xField];
        const key = keyVal === null || keyVal === undefined ? '__null__' : String(keyVal);
        
        if (!map.has(key)) {
          // 【优化】使用浅拷贝替代 JSON序列化
          const newItem = { ...item };
          // 初始化时确保 Y 轴字段为数值类型
          for (let j = 0; j < yFields.length; j++) {
             const field = yFields[j];
             newItem[field] = parseVal(item[field]);
          }
          map.set(key, newItem);
        } else {
          const existing = map.get(key);
          // 使用普通 for 循环替代 forEach，微小的性能提升
          for (let j = 0; j < yFields.length; j++) {
             const field = yFields[j];
             const val = parseVal(item[field]);
             // 累加
             existing[field] = existing[field] + val;
          }
        }
      }
      
      const result = Array.from(map.values());
      console.log(`[ChartRenderer] 聚合完成: ${data.length} -> ${result.length} 条`);
      console.timeEnd('AggregationTime');
      return result;
    },

    // 【新增】处理聚合开关变更
    handleAggregationChange() {
      // 只有在已经生成图表的情况下才自动重新生成
      if (this.chartOption) {
        this.renderChart();
      }
    },

    renderChart() {
       // 验证字段选择
       if (this.config.chartType !== 'radar') {
         if (!this.config.xAxisField || this.activeYAxisFields.length === 0) {
           this.$message.warning('请选择完整的坐标轴字段');
           return;
         }
       } else {
         // 雷达图也需要选择维度和数值字段
         if (!this.config.xAxisField || this.activeYAxisFields.length === 0) {
           this.$message.warning('请选择维度字段和数值字段');
           return;
         }
       }
       
       this.loading = true;
       
       
       // 【新增】根据聚合状态处理数据
       let processedData = this.currentData;
       if (this.isAggregated) {
         processedData = this.aggregateData(this.currentData);
         console.log('[ChartRenderer] 数据已聚合，原始条数:', this.currentData.length, '聚合后:', processedData.length);
       }
       
       // 构建请求载荷
        const payload = {
          messageId: this.messageId,
          data: processedData, // 使用处理后的数据
          chartType: this.config.chartType,
          xAxisField: this.config.xAxisField,
          yAxisField: this.activeYAxisFields[0] || this.config.yAxisField || '',
          yAxisFields: this.activeYAxisFields // 【新增】
        };
        
        console.log('[ChartRenderer] 请求图表转换:', payload);
        console.log('[ChartRenderer] 图表类型:', payload.chartType);
        console.log('[ChartRenderer] Y轴字段数量:', this.activeYAxisFields.length);
        console.log('[ChartRenderer] Y轴字段列表:', this.activeYAxisFields);

       this.$request.post('/analysis/convert', payload).then(res => {
         // request.js 拦截器已返回 response.data，直接访问属性即可
         const code = res.code || (res.data && res.data.code);
         const data = res.data || (res.data && res.data.data);
         const msg = res.msg || (res.data && res.data.msg) || '未知错误';

         if (code === '200') {
            const apiData = data;
            console.log('[ChartRenderer] ===== 后端返回的完整数据 =====');
            console.log('[ChartRenderer] 图表类型:', this.config.chartType);
            console.log('[ChartRenderer] 完整响应:', JSON.stringify(apiData, null, 2));
            
            if (this.config.chartType === 'radar') {
              console.log('[ChartRenderer] 雷达图indicator:', apiData.indicator);
              console.log('[ChartRenderer] 雷达图radarData:', apiData.radarData);
              console.log('[ChartRenderer] radarData是数组吗?', Array.isArray(apiData.radarData));
              console.log('[ChartRenderer] radarData长度:', apiData.radarData?.length);
              if (apiData.radarData && apiData.radarData.length > 0) {
                console.log('[ChartRenderer] 第一个系列:', apiData.radarData[0]);
                if (apiData.radarData.length > 1) {
                  console.log('[ChartRenderer] 第二个系列:', apiData.radarData[1]);
                }
              }
            }
            
            this.chartOption = this.buildEChartsOption(apiData);
            
            // 【新增】更新当前列元数据（如果后端返回了新的columns）
            if (apiData.columns && apiData.columns.length > 0) {
              console.log('[ChartRenderer] 从API响应中更新列元数据:', apiData.columns);
              this.currentColumns = apiData.columns;
            }
            
            console.log('[ChartRenderer] xAxisData:', apiData.xAxisData);
            console.log('[ChartRenderer] series:', apiData.series);
            console.log('[ChartRenderer] scatterData:', apiData.scatterData);
            console.log('[ChartRenderer] ==========================================');
            console.log('[ChartRenderer] 收到图表数据:', apiData);
            console.log('[ChartRenderer] xAxisData 长度:', apiData.xAxisData?.length);
            console.log('[ChartRenderer] seriesData 长度:', apiData.seriesData?.length);
            console.log('[ChartRenderer] theme.series:', apiData.theme?.series);
            this.chartOption = this.buildEChartsOption(apiData);
            this.$nextTick(() => {
              if (this.chartInstance) {
                // 【关键修复】完全销毁并重建图表实例，避免旧配置残留
                console.log('[ChartRenderer] 销毁旧图表实例，重新创建');
                this.chartInstance.dispose();
                this.chartInstance = null;
              }
              
              // 重新初始化图表实例
              this.initChart();
            });
            this.$message.success('图表生成成功');
         } else {
           this.$message.error('图表转换失败: ' + msg);
         }
        }).catch(err => {
          console.error('[ChartRenderer] 图表转换错误:', err);
          this.$message.error('生成图表失败');
        }).finally(() => {
          this.loading = false;
        });
     },
     
    // 【重构】执行下钻（使用用户选择的维度）
    async executeDrilldown(targetDimension) {
      // 【新增】下钻深度限制
      const MAX_DRILL_DEPTH = 5;
      if (this.drillStack.length >= MAX_DRILL_DEPTH) {
        this.$message.warning(`下钻深度已达上限 (${MAX_DRILL_DEPTH} 级),无法继续下钻`);
        this.showDimensionMenu = false;
        return;
      }
      
      // 关闭菜单
      this.showDimensionMenu = false;
      
      // 检查必要参数
      if (!this.currentSql) {
        this.$message.warning('无法下钻:缺少 SQL 信息');
        return;
      }
      
      if (!this.dbConfigId) {
        this.$message.warning('无法下钻:缺少数据源配置');
        return;
      }
      
      if (!this.pendingFilter) {
        this.$message.warning('无法下钻:缺少筛选条件');
        return;
      }
      
      console.log('[ChartRenderer] 执行下钻, filter:', this.pendingFilter, '目标维度:', targetDimension);
      
      this.loading = true;
      
      try {
        // 1. 调用下钻接口（应用筛选条件）
        const res = await this.$request.post('/analysis/drilldown', {
          sql: this.currentSql,
          dbConfigId: this.dbConfigId,
          filters: [this.pendingFilter]
        });
        
        if (res.code === '200' || (res.data && res.data.code === '200')) {
          const resData = res.data || res;
          const apiData = resData.data || resData;
          
          const newData = apiData.data || [];
          const newSql = apiData.sql || this.currentSql;
          const newColumns = apiData.columns || this.columns;
          
          console.log('[ChartRenderer] 下钻成功,新数据行数:', newData.length);
          
          // 2. 检查是否有数据
          if (newData.length === 0) {
            this.$message.warning('该条件下暂无数据');
            this.pendingFilter = null;
            return;
          }
          
          // 3. 保存到历史栈（保存下钻前的完整状态）
          const drillNode = {
            id: `drill_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // 唯一ID
            level: this.drillStack.length, // 层级深度 (0-based)
            title: this.pendingFilter.value, // 面包屑显示的标题
            
            // 数据上下文
            sql: this.currentSql,
            data: this.currentData,
            columns: this.currentColumns, // 【关键】保存当前列元数据
            
            // 视图配置
            chartType: this.config.chartType,
            xAxisField: this.config.xAxisField,
            yAxisField: this.config.yAxisField,
            chartOption: JSON.parse(JSON.stringify(this.chartOption || {})), // 深拷贝图表配置
            
            // 筛选上下文
            filter: this.pendingFilter, // 当前层级的筛选条件
            appliedFilters: [...this.allAppliedFilters, this.pendingFilter] // 【关键】累积的所有筛选条件
          };
          
          this.drillStack.push(drillNode);
          
          console.log('[ChartRenderer] 下钻节点已保存:', drillNode);
          
          // 4. 更新当前状态（包括列元数据）
          this.currentSql = newSql;
          this.currentData = newData;
          this.currentColumns = newColumns; // 【关键】更新列元数据
          
          // 5. 使用新维度调用转换接口生成图表
          const convertRes = await this.$request.post('/analysis/convert', {
            data: newData,
            chartType: this.config.chartType,
            xAxisField: targetDimension,  // 【关键】使用用户选择的新维度
            yAxisField: this.activeYAxisFields[0] || this.config.yAxisField || '' // 【修复】只发送第一个Y轴字段
          });
          
          if (convertRes.code === '200' || (convertRes.data && convertRes.data.code === '200')) {
            const convertData = convertRes.data || convertRes;
            const chartData = convertData.data || convertData;
            
            console.log('[ChartRenderer] 下钻后图表数据:', chartData);
            
            // 6. 更新配置（切换到新维度）
            this.config.xAxisField = targetDimension;
            
            // 7. 更新图表
            this.chartOption = this.buildEChartsOption(chartData);
            
            // 【新增】更新当前列元数据（如果后端返回了新的columns）
            if (chartData.columns && chartData.columns.length > 0) {
              console.log('[ChartRenderer] 下钻/convert后更新列元数据:', chartData.columns);
              this.currentColumns = chartData.columns;
            }
            
            this.$nextTick(() => {
              if (this.chartInstance) {
                this.chartInstance.dispose();
                this.chartInstance = null;
              }
              this.initChart();
            });
            
            this.$message.success(`已下钻至: ${this.pendingFilter.displayValue} → ${targetDimension}`);
          } else {
            this.$message.error('下钻后图表转换失败');
          }
        } else {
          const msg = (res.data && res.data.msg) || res.msg || '下钻失败';
          this.$message.error(msg);
        }
      } catch (err) {
        console.error('[ChartRenderer] 下钻错误:', err);
        this.$message.error('下钻请求失败');
      } finally {
        this.loading = false;
        this.pendingFilter = null;
      }
    },
    
    // 【新增】快速后退一步
    stepBack() {
      if (this.drillStack.length === 0) {
        this.$message.info('当前已是初始状态');
        return;
      }
      
      // 回退到上一层（即倒数第二个节点，如果有的话）
      const targetIndex = this.drillStack.length - 2;
      
      if (targetIndex >= 0) {
        // 有上一层，跳转到上一层
        this.resetToDrill(targetIndex);
      } else {
        // 没有上一层，回到初始状态
        this.resetChart();
      }
    },
    
    // 【新增】重置图表到初始状态
    resetChart() {
      if (this.drillStack.length === 0) {
        this.$message.info('当前已是初始状态');
        return;
      }
      
      console.log('[ChartRenderer] 重置到初始状态');
      
      // 恢复到最初的 SQL、数据和列元数据
      this.currentSql = this.sql || '';
      this.currentData = this.originalData || [];
      this.currentColumns = this.columns || [];
      this.drillStack = [];
      
      // 重新渲染图表
      this.renderChart();
      
      this.$message.success('已重置到初始视图');
    },
    
    // 【优化】面包屑导航:跳转到指定下钻层级(带缓存优化)
    resetToDrill(targetIndex) {
      console.log('[ChartRenderer] 跳转到层级:', targetIndex);
      
      if (targetIndex === -1) {
        // 点击"全部数据",重置到初始状态
        this.resetChart();
        return;
      }
      
      if (targetIndex < 0 || targetIndex >= this.drillStack.length) {
        return;
      }
      
      // 恢复到目标层级的完整状态
      const targetNode = this.drillStack[targetIndex];
      
      // 【新增】检查是否有缓存的图表配置
      if (targetNode.chartOption && Object.keys(targetNode.chartOption).length > 0) {
        console.log('[ChartRenderer] 使用缓存的图表配置,跳过API请求');
        
        // 直接恢复状态
        this.currentSql = targetNode.sql;
        this.currentData = targetNode.data;
        this.currentColumns = targetNode.columns || this.columns;
        
        // 恢复图表配置
        if (targetNode.chartType) {
          this.config.chartType = targetNode.chartType;
        }
        if (targetNode.xAxisField) {
          this.config.xAxisField = targetNode.xAxisField;
        }
        if (targetNode.yAxisField) {
          this.config.yAxisField = targetNode.yAxisField;
        }
        
        // 删除目标层级之后的历史
        this.drillStack = this.drillStack.slice(0, targetIndex);
        
        // 恢复图表
        this.chartOption = targetNode.chartOption;
        this.$nextTick(() => {
          if (this.chartInstance) {
            this.chartInstance.setOption(this.chartOption, true);
          } else {
            this.initChart();
          }
        });
        
        this.$message.success('已返回上一层级');
        return;
      }
      
      // 【原有逻辑】无缓存,重新请求
      this.currentSql = targetNode.sql;
      this.currentData = targetNode.data;
      this.currentColumns = targetNode.columns || this.columns; // 【关键】恢复列元数据
      
      // 恢复图表配置
      if (targetNode.chartType) {
        this.config.chartType = targetNode.chartType;
      }
      if (targetNode.xAxisField) {
        this.config.xAxisField = targetNode.xAxisField;
      }
      if (targetNode.yAxisField) {
        this.config.yAxisField = targetNode.yAxisField;
      }
      
      console.log('[ChartRenderer] 恢复到层级 ' + targetIndex + ', 节点:', targetNode);
      
      // 删除目标层级之后的历史
      this.drillStack = this.drillStack.slice(0, targetIndex);
      
      // 重新生成图表
      this.loading = true;
      this.$request.post('/analysis/convert', {
        data: this.currentData,
        chartType: this.config.chartType,
        xAxisField: this.config.xAxisField,
        yAxisField: this.activeYAxisFields[0] || this.config.yAxisField || '' // 【修复】只发送第一个Y轴字段
      }).then(res => {
        if (res.code === '200' || (res.data && res.data.code === '200')) {
          const resData = res.data || res;
          const chartData = resData.data || resData;
          
          this.chartOption = this.buildEChartsOption(chartData);
          this.$nextTick(() => {
            if (this.chartInstance) {
              this.chartInstance.dispose();
              this.chartInstance = null;
            }
            this.initChart();
          });
          
          this.$message.success('已返回上一层级');
        }
      }).catch(err => {
        console.error('[ChartRenderer] 返回层级失败:', err);
        this.$message.error('操作失败');
      }).finally(() => {
        this.loading = false;
      });
    },
    
    // 【新增】获取可用于筛选的列字段(第一级)
    getFilterableColumns() {
      // 使用 currentColumns 而不是 props.columns
      const cols = this.currentColumns.length > 0 ? this.currentColumns : this.columns;
      if (!cols || cols.length === 0) return [];
      
      // 返回所有非数值类型字段，或者包含当前X轴
      // 这里的逻辑可以根据需求调整，这里暂时只过滤掉明显的数值和ID
      return cols.filter(col => {
        const type = (col.type || '').toUpperCase();
        const isNumeric = ['INT', 'INTEGER', 'DECIMAL', 'FLOAT', 'DOUBLE', 'NUMERIC', 'BIGINT', 'NUMBER'].some(t => type.includes(t));
        
        // 允许文本、日期等
        // 如果是数值但不是ID，也可以允许？不，通常下钻是按分类逻辑
        if (isNumeric) return false;
        
        // 排除ID类字段（除非它是当前X轴，也许有特殊情况，但一般排除）
        if (col.name.toLowerCase().includes('id') && col.name !== 'id') return false;
        
        return true;
      });
    },
    
    // 【新增】获取选中字段的可用值(第二级)
    getFieldValues() {
      if (!this.manualDrillField || !this.currentData || this.currentData.length === 0) {
        return [];
      }
      
      const field = this.manualDrillField;
      
      try {
        // 提取该字段的所有唯一值
        const uniqueValues = [...new Set(this.currentData.map(row => row[field]))];
        
        // 过滤掉空值和undefined,并转为字符串
        const validValues = uniqueValues
          .filter(v => v != null && v !== '')
          .map(v => String(v));
          
        return validValues.sort(); // 简单的字母排序方便查找
      } catch (error) {
        console.error('[ChartRenderer] 获取字段值失败:', error);
        return [];
      }
    },
    
    // 【新增】处理字段变更
    handleFieldChange() {
      this.manualDrillValue = ''; // 清空已选值
    },
    
    // 【重构】手动下钻处理方法
    handleManualDrill(selectedValue) {
      // 验证选择值
      if (!selectedValue || !this.manualDrillField) {
        return;
      }
      
      console.log('[ChartRenderer] 手动下钻, 字段:', this.manualDrillField, '值:', selectedValue);
      
      // 清空选择(避免重复触发) - 但保留字段选择可能更好？
      // 这里如果清空 manualDrillValue，用户想选同字段另一个值就很方便
      // 但是为了避免重复触发问题，我们可以在 executeDrilldown 后清空，或者在这里做一个 flag
      // 以前的逻辑是清空 manualDrillValue，这里保持一致，或者在下钻开始前
      const drillValue = this.manualDrillValue;
      this.manualDrillValue = '';
      
      // 检查下钻模式是否开启
      if (!this.config.drillable) {
        this.$message.warning('请先开启下钻模式');
        return;
      }
      
      // 检查是否有可用维度 (用于下一步展示)
      if (this.availableDimensions.length === 0) {
        // 【优化】更具体的提示
        this.$message.warning('当前暂无更多维度可供下钻（剩余字段均为数值指标）');
        return;
      }
      
      // 构造筛选条件
      this.pendingFilter = {
        column: this.manualDrillField, // 使用手动选择的字段
        operator: 'EQ',
        value: drillValue,
        displayValue: `${this.manualDrillField} = ${drillValue}`
      };
      
      // 如果只有一个可用维度,直接下钻
      if (this.availableDimensions.length === 1) {
        const targetDimension = this.availableDimensions[0].name;
        // 注意：如果 targetDimension 和当前 manualDrillField 相同，可能会有问题（原地打转）
        // 但 availableDimensions 已经排除了 "config.xAxisField"。
        // 这里 manualDrillField 不一定是 current xAxisField。
        // 如果 manualDrillField != current xAxisField，且 we drill down to `targetDimension`.
        // 看起来是合理的。
        
        console.log('[ChartRenderer] 自动选择唯一维度:', targetDimension);
        this.executeDrilldown(targetDimension);
        return;
      }
      
      // 多个维度,显示选择菜单
      const chartContainer = this.$refs.chartRef;
      if (chartContainer) {
        const rect = chartContainer.getBoundingClientRect();
        // 【修改】计算相对于视口的坐标 (Fixed定位)
        this.menuPosition = {
          x: rect.left + rect.width / 2 - 120, // 居中: 左边距 + 半宽 - 半菜单宽
          y: rect.top + rect.height / 2 - 100   // 居中: 上边距 + 半高 - 半菜单高
        };
      } else {
        // 兜底位置 (屏幕中心)
        this.menuPosition = { 
          x: window.innerWidth / 2 - 120, 
          y: window.innerHeight / 2 - 100 
        };
      }
      
      this.showDimensionMenu = true;
      
      console.log('[ChartRenderer] 显示维度选择菜单(手动下钻), 坐标:', this.menuPosition);
      console.log('[ChartRenderer] 当前可用下钻维度:', this.availableDimensions.map(d => d.name));
    },
     
    // 构建 ECharts 配置项（严格遵循后端数据优先模式）
    buildEChartsOption(data) {
      const type = this.config.chartType;
      const theme = data.theme || {};
      
      const hexToRgba = (hex, opacity) => {
        let c;
        if(/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)){
            c= hex.substring(1).split('');
            if(c.length== 3){
                c= [c[0], c[0], c[1], c[1], c[2], c[2]];
            }
            c= '0x'+c.join('');
            return 'rgba('+[(c>>16)&255, (c>>8)&255, c&255].join(',')+','+opacity+')';
        }
        return hex;
      };

      // 【Tableau专业配色】鲜明、高对比度、易区分
      // 【科技感】未来科技配色 - 高饱和、冷色调为主
      const colorPalette = theme.color || [
        '#3B82F6', // 科技蓝 - 主色调
        '#06B6D4', // 赛博青 - 亮眼
        '#8B5CF6', // 霓虹紫 - 神秘
        '#F59E0B', // 活力橙 - 对比
        '#10B981', // 极光绿 - 清新
        '#6366F1', // 靛蓝
        '#EC4899', // 粉红
        '#14B8A6'  // 青绿
      ];

      const parseNum = (v) => {
        if (v === null || v === undefined) return null;
        // 兼容 ECharts 对象格式 {value: ..., ...}
        if (typeof v === 'object' && v !== null && 'value' in v) {
          v = v.value;
        }
        if (typeof v === 'number') return v;
        const cleanVal = String(v).replace(/,/g, '');
        const num = parseFloat(cleanVal);
        return isNaN(num) ? null : num;
      };

      // 基础配置
      const option = {
        // 通用 Tooltip 配置
        tooltip: {
          trigger: type === 'pie' ? 'item' : 'axis',
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          borderColor: '#E5E7EB',
          borderWidth: 1,
          padding: [10, 15],
          textStyle: {
            color: '#374151',
            fontSize: 13
          },
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '12%', // 【优化】给底部的图例保留适度空间，但比之前紧凑些
          top: '10%', // 【优化】恢复顶部标准留白
          containLabel: true
        },
        legend: {
          bottom: 0, // 【优化】底部没有了滚动条阻碍，恢复图例至最底部
          type: 'scroll',
          itemWidth: 14, // 【优化】图例图标大小
          itemHeight: 14,
          itemGap: 20, // 【优化】图例间距
          textStyle: { 
            color: '#606266',
            fontSize: 12,
            fontWeight: 500 // 【优化】字重
          },
          pageIconColor: '#4E79A7', // 【优化】使用主题色
          pageIconInactiveColor: '#aaa',
          pageTextStyle: {
            color: '#606266',
            fontSize: 11
          }
        },
        color: colorPalette
      };
      
      // 【新增】雷达图专用tooltip配置
      if (type === 'radar') {
        option.tooltip = {
          trigger: 'item',
          backgroundColor: 'rgba(255, 255, 255, 0.96)',
          borderColor: '#E5E7EB',
          borderWidth: 1,
          padding: [12, 16],
          textStyle: {
            color: '#374151',
            fontSize: 13
          },
          extraCssText: 'box-shadow: 0 6px 16px rgba(0,0,0,0.12); border-radius: 8px;',
          formatter: function(params) {
            const seriesName = params.seriesName || '';
            const dataValues = params.value || [];
            // 【修复】从params中获取indicator，而不是从option
            const indicators = this.radar && this.radar[0] && this.radar[0].indicator || [];
            
            let html = `<div style="font-weight: 600; margin-bottom: 8px; color: #1F2937;">${seriesName}</div>`;
            
            indicators.forEach((indicator, index) => {
              const value = dataValues[index];
              const color = params.color || '#3B82F6';
              
              // 格式化数值
              let formattedValue = value;
              if (typeof value === 'number') {
                if (value < 1 && value > 0) {
                  // 小数（如百分比）
                  formattedValue = (value * 100).toFixed(2) + '%';
                } else if (value >= 10000) {
                  // 大数值
                  formattedValue = (value / 10000).toFixed(2) + '万';
                } else {
                  formattedValue = value.toFixed(2);
                }
              }
              
              html += `
                <div style="display: flex; justify-content: space-between; align-items: center; margin: 6px 0;">
                  <span style="display: flex; align-items: center;">
                    <span style="display: inline-block; width: 10px; height: 10px; background: ${color}; border-radius: 50%; margin-right: 8px;"></span>
                    <span style="color: #6B7280;">${indicator.name}</span>
                  </span>
                  <span style="margin-left: 20px; font-weight: 600; color: #1F2937;">${formattedValue}</span>
                </div>
              `;
            });
            
            return html;
          }
        };
      }
      // Re-apply the original formatter for non-radar charts if needed, or adjust the initial tooltip
      // For now, assuming the generic tooltip is sufficient for non-radar, non-pie charts.
      // The original formatter was quite complex and specific to axis-triggered tooltips.
      // Let's integrate the original formatter into the generic tooltip if type is not 'pie' or 'radar'.
      if (type !== 'pie' && type !== 'radar') {
        option.tooltip.axisPointer = { type: 'shadow' };
        option.tooltip.extraCssText = 'box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15); border-radius: 8px;';
        option.tooltip.formatter = (params) => {
             if (!params || params.length === 0) return '';
             
             const formatValue = (val) => {
               if (val == null) return '—';
               const num = typeof val === 'number' ? val : parseFloat(val);
               if (isNaN(num)) return '—';
               const absNum = Math.abs(num);
               if (absNum >= 100000000) return (num / 100000000).toFixed(2) + '亿';
               if (absNum >= 10000) return (num / 10000).toFixed(2) + '万';
               if (absNum < 1 && absNum > 0) return num.toFixed(2);
               return Math.round(num).toLocaleString();
             };
             
             let result = '';
             let axisValue = '';
             
             const items = Array.isArray(params) ? params : [params];
             if (items.length > 0) {
                 axisValue = items[0].axisValueLabel || items[0].name;
                 result += `<div style="margin-bottom: 8px; font-weight: 600; font-size: 13px;">${axisValue}</div>`;
                 items.forEach(item => {
                     // 过滤掉空值或无关的项
                     if (item.value !== undefined && item.value !== null) {
                        const dot = item.marker || `<span style="display:inline-block;margin-right:4px;border-radius:10px;width:10px;height:10px;background-color:${item.color};"></span>`;
                        result += `<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; min-width: 150px;">
                                     <span style="color: #606266;">${dot} ${item.seriesName}</span>
                                     <span style="font-weight: 600; color: #303133;">${formatValue(item.value)}</span>
                                   </div>`;
                     }
                 });
             }
             if (this.config.drillable) {
               result += '<div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #ebeef5; color: #409EFF; font-size: 12px;">💡 点击可下钻查看详情</div>';
             }
             return result;
          };
      }
      
      // X 轴配置
      if (['bar', 'line', 'area'].includes(type)) {
        // 【新增】轴名称：优先使用后端传入的 xAxisName，否则不显示
        const xAxisName = data.xAxisName || '';
        // 【修复】有轴名称时加宽右侧 grid，避免名称被截断（直接用像素，不混用百分比）
        if (xAxisName) {
          const namePixelWidth = xAxisName.length * 14 + 20; // 每字符~14px + 余量
          option.grid.right = namePixelWidth + 'px';
        }
        option.xAxis = {
          type: 'category',
          data: data.xAxisData || [],
          name: xAxisName,
          nameLocation: 'end',
          nameGap: 8,
          nameTextStyle: {
            color: '#606266',
            fontSize: 11,
            padding: [0, 0, 0, 6]
          },
          boundaryGap: type === 'bar',
          axisTick: { show: false },
          axisLine: { 
            onZero: false,
            lineStyle: { color: '#DCDFE6' } 
          },
          axisLabel: {
            color: '#606266',
            fontSize: 11,
            interval: 0, 
            rotate: 30, 
            formatter: (value) => {
              if (!value) return '';
              
              const xField = this.config.xAxisField;
              const cols = this.currentColumns.length > 0 ? this.currentColumns : this.columns;
              const colInfo = cols.find(c => c.name === xField);
              
              if (colInfo) {
                  const type = (colInfo.type || '').toUpperCase();
                  const isTime = type.includes('DATE') || type.includes('TIME') || xField.toUpperCase().includes('日期') || xField.toUpperCase().includes('时间');
                  
                  if (isTime) {
                      if (typeof value === 'number' || (typeof value === 'string' && /^\d+$/.test(value))) {
                          const numVal = parseInt(value);
                          if (numVal > 1000000000000) {
                              const date = new Date(numVal);
                              const m = (date.getMonth() + 1).toString().padStart(2, '0');
                              const d = date.getDate().toString().padStart(2, '0');
                              return `${date.getFullYear()}-${m}-${d}`;
                          } else if (numVal > 1000000000) {
                              const date = new Date(numVal * 1000);
                              const m = (date.getMonth() + 1).toString().padStart(2, '0');
                              const d = date.getDate().toString().padStart(2, '0');
                              return `${date.getFullYear()}-${m}-${d}`; 
                          }
                      }
                      if (typeof value === 'string' && !isNaN(Date.parse(value))) {
                          const date = new Date(value);
                          if (!isNaN(date.getTime())) {
                              const y = date.getFullYear();
                              const m = (date.getMonth() + 1).toString().padStart(2, '0');
                              const d = date.getDate().toString().padStart(2, '0');
                              const h = date.getHours();
                              const min = date.getMinutes();
                              if (h === 0 && min === 0) {
                                  return `${y}-${m}-${d}`;
                              } else {
                                  return `${y}-${m}-${d}\n${h.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
                              }
                          }
                      }
                  }
              }
              if (value.toString().length > 12 && /^\d+$/.test(value)) {
                  return value.toString().substring(0, 12) + '...';
              }
              return value; 
            }
          }
        };
      }


      // Series配置
      let seriesList = [];
      // 【修复】饼图/雷达图的 seriesData 格式与柱状图不同（无 .data 数组），跳过通用处理由下方专属分支处理
      if (!['pie', 'radar'].includes(type) && data.seriesData && Array.isArray(data.seriesData) && data.seriesData.length > 0) {
        const isComplex = typeof data.seriesData[0] === 'object' && data.seriesData[0].name;
        
        // 【调试】输出后端返回的seriesData结构
        console.log('[ChartRenderer] 🔍 后端返回的seriesData:', JSON.stringify(data.seriesData, null, 2));
        if (isComplex) {
          seriesList = data.seriesData.map(s => ({
            ...s, 
            type: type === 'area' ? 'line' : type,
            data: s.data.map(parseNum),
            smooth: 0.35, // 【优化】降低平滑度，避免过度扭曲
            showSymbol: false, // 【优化】商业风格通常隐藏默认数据点
            symbolSize: 6,
            areaStyle: type === 'area' ? { opacity: 0.2 } : undefined
          }));
          console.log('[ChartRenderer] ✅ 使用复杂Series模式，生成了', seriesList.length, '个系列');
        } else {
          // 【修复】检查用户是否选择了多个Y轴字段
          const yFields = this.activeYAxisFields;
          console.log('[ChartRenderer] 🔧 用户选择的Y轴字段:', yFields);
          
          if (yFields.length > 1) {
            // 多Y轴模式：从原始数据中为每个字段提取值
            const sourceData = this.currentData.length > 0 ? this.currentData : this.originalData;
            console.log('[ChartRenderer] 📦 原始数据行数:', sourceData?.length);
            
            seriesList = yFields.map((fieldName, index) => {
              const values = (sourceData || []).map(row => parseNum(row[fieldName]));
              console.log(`[ChartRenderer] 📊 字段"${fieldName}"提取了${values.length}个数据点`);
              
              return {
                name: fieldName, // 【简化】保持图例简洁
                type: type === 'area' ? 'line' : type,
                yAxisIndex: index,
                data: values,
                smooth: 0.35,
                showSymbol: false,
                symbolSize: 6,
                areaStyle: type === 'area' ? { opacity: 0.35 } : undefined,
                // 【优化】存储轴位置信息供tooltip使用
                axisPosition: index % 2 === 0 ? '左轴' : '右轴'
              };
            });
            console.log('[ChartRenderer] ✅ 前端构建了', seriesList.length, '个Series（多Y轴模式）');
          } else {
            // 单Y轴模式
            seriesList = [{
              name: this.activeYAxisFields[0] || '数值',
              type: type === 'area' ? 'line' : type,
              yAxisIndex: 0,
              data: data.seriesData.map(parseNum),
              smooth: 0.35,
              showSymbol: false,
              symbolSize: 6,
              areaStyle: type === 'area' ? { opacity: 0.35 } : undefined
            }];
            console.log('[ChartRenderer] ⚠️ 单Y轴模式，数据长度:', data.seriesData.length);
          }
        }
      }
      console.log('[ChartRenderer] 📊 最终seriesList:', seriesList.map(s => ({ name: s.name, dataLength: s.data?.length })));
      option.series = seriesList;


      // Y 轴配置 (关键修正：移除手动min/max以修复刻度不美观问题)
      
      const yAxisFormatter = (value) => {
        if (value === 0) return '0';
        const absValue = Math.abs(value);
        const sign = value < 0 ? '-' : '';
        // 【优化】去除不必要的小数位 .0
        const formatNum = (num) => {
          const str = num.toFixed(1);
          return str.endsWith('.0') ? str.slice(0, -2) : str;
        };
        
        if (absValue >= 100000000) return sign + formatNum(absValue / 100000000) + '亿';
        if (absValue >= 10000) return sign + formatNum(absValue / 10000) + '万';
        if (absValue < 1 && absValue > 0) return value.toFixed(2);
        return Math.round(value).toLocaleString();
      };

      if (data.yAxis && Array.isArray(data.yAxis) && data.yAxis.length > 0) {
        // 使用后端配置
        option.yAxis = data.yAxis.map((axis, index) => ({
          type: 'value',
          name: axis.name || '',
          position: axis.position || (index % 2 === 0 ? 'left' : 'right'),
          offset: axis.offset || 0,
          axisLabel: { formatter: yAxisFormatter, color: '#909399' },
          splitLine: { 
             show: index === 0, 
             lineStyle: { type: 'dashed', color: '#EBEEF5' } // 更淡的网格线
          },
          axisLine: { show: false }, // 现代风格通常隐藏Y轴轴线
          axisTick: { show: false }
        }));
      } else {
        // 前端自动生成Y轴
        // 统计有多少个Y轴需求
        const maxIndex = seriesList.reduce((max, s) => Math.max(max, s.yAxisIndex || 0), 0);
        const yAxes = [];
        
        // 【优化】获取Y轴字段名称（用于多Y轴场景）
        const yFieldNames = this.activeYAxisFields || [];
        
        // 【关键】计算所有Y轴数据范围
        const allRanges = [];
        for (let i = 0; i <= maxIndex; i++) {
          const relevantSeries = seriesList.filter(s => s.yAxisIndex === i);
          const allValues = relevantSeries.flatMap(s => s.data || []).filter(v => v !== null && v !== undefined);
          
          if (allValues.length > 0) {
            allRanges.push({
              index: i,
              min: Math.min(...allValues),
              max: Math.max(...allValues)
            });
          } else {
            allRanges.push({ index: i, min: 0, max: 100 });
          }
        }
        
        // 【科学性优化】多Y轴严格对齐0刻度线
        // 1. 计算每个轴所需的 0点位置比例 (0在底部=0, 0在顶部=1)
        const axisRatios = allRanges.map(range => {
          if (range.min >= 0) return 0;
          if (range.max <= 0) return 1;
          return Math.abs(range.min) / (range.max - range.min);
        });

        // 2. 决策统一的0点位置
        let unifiedRatio = 0;
        const hasNegative = allRanges.some(r => r.min < 0);
        
        if (hasNegative) {
            if (Math.min(...allRanges.map(r=>r.min)) >= 0) {
                 unifiedRatio = 0;
            } else if (Math.max(...allRanges.map(r=>r.max)) <= 0) {
                 unifiedRatio = 1;
            } else {
                 // 混合情况，取最大Ratio以容纳最深的负值
                 const mixedRatios = axisRatios.filter(r => r > 0 && r < 1);
                 let candidate = 0.5;
                 if (mixedRatios.length > 0) {
                     candidate = Math.max(...mixedRatios);
                 }
                 unifiedRatio = candidate;
                 
                 // 如果同时存在纯正和纯负，且 calculated K < 0.5, 推到 0.5
                 if (allRanges.some(r=>r.max<=0) && allRanges.some(r=>r.min>=0)) {
                     unifiedRatio = Math.max(unifiedRatio, 0.5);
                 }
            }
        }
        
        console.log('[ChartRenderer] 🧪 科学对齐算法 计算出的统一0点位置 (0-1):', unifiedRatio);
        
        // 【新增】解析 yAxisName 字符串（逗号分隔，对应多Y轴）
        const yAxisNames = (data.yAxisName || '').split(',').map(s => s.trim()).filter(Boolean);
        
        for (let i = 0; i <= maxIndex; i++) {
          const axisColor = colorPalette[i % colorPalette.length];
          const range = allRanges[i];
          
          // 【修复】仅在存在负值时手动设置 min/max 来对齐0刻度线
          // 非负数据交给 ECharts 自动计算，避免出现如"115"之类超出实际数据的刻度
          const axisMinMax = {};
          if (hasNegative) {
              let finalMin = range.min;
              let finalMax = range.max;
              const K = unifiedRatio;
              if (K === 0) {
                  finalMin = 0; finalMax = range.max * 1.1;
              } else if (K === 1) {
                  finalMin = range.min * 1.1; finalMax = 0;
              } else {
                  const reqMax = -range.min * (1-K)/K;
                  const reqMin = -range.max * K/(1-K);
                  if (reqMax >= range.max) {
                      finalMax = reqMax;
                      finalMin = range.min;
                  } else {
                      finalMin = reqMin;
                      finalMax = range.max;
                  }
                  finalMax *= 1.1;
                  finalMin *= 1.1;
              }
              axisMinMax.min = finalMin;
              axisMinMax.max = finalMax;
          } else {
              // 非负数据且该轴确实没有负值时，固定 min:0 让柱从零开始
              // 【修复】额外校验当前轴的实际 range.min，防止 hasNegative 漏检导致负值被截断
              if (range && range.min >= 0) {
                  axisMinMax.min = 0;
              }
              // 若 range.min < 0（hasNegative 漏检的极端情况），不设 min，让 ECharts 自动处理
          }
          
          yAxes.push({
            type: 'value',
            name: yAxisNames[i] || '',
            nameTextStyle: {
              color: colorPalette[i % colorPalette.length],
              fontSize: 11,
              padding: [0, 0, 0, 6]
            },
            position: i % 2 === 0 ? 'left' : 'right',
            offset: Math.floor(i / 2) * 60,
            ...axisMinMax,
            axisLabel: { 
              formatter: yAxisFormatter, 
              color: axisColor, // 【关联】标签颜色与系列颜色一致
              fontSize: 11,
              fontWeight: 600, 
              margin: 12,
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
            },
            axisLine: { 
              show: true, // 【规范】显示轴线，明确坐标轴边界
              lineStyle: { 
                color: axisColor, // 【关联】轴线颜色与系列颜色一致
                width: 2, // 稍微加粗
                type: 'solid'
              } 
            },
            splitLine: { 
               show: i === 0,
               lineStyle: { 
                 type: 'dashed', 
                 color: 'rgba(229, 231, 235, 0.8)', 
               }
            },
            axisTick: { 
              show: true,
              length: 4,
              lineStyle: {
                color: axisColor, // 【关联】刻度颜色与系列颜色一致
                width: 1.5
              }
            },
            splitArea: {
              show: i === 0, 
              areaStyle: {
                color: ['rgba(250, 250, 250, 0.05)', 'rgba(245, 247, 250, 0.05)']
              }
            }
          });
        }
        
        option.yAxis = yAxes.length > 0 ? yAxes : [{ type: 'value' }];
        if (option.yAxis.length === 1) {
            option.yAxis[0].splitLine.show = true;
        }
      }

      // 【安全网】兜底修复：无论哪条路径设置了 yAxis，都扫描一遍 series 的实际最小值。
      // 若某轴真实数据存在负值但 yAxis.min 被设为 ≥0（hasNegative 漏检或 data.yAxis 路径），
      // 则删除 min/max 约束，让 ECharts 自动 scale（自动 scale 能生成干净的整数刻度，不会出现重复标签）。
      if (option.yAxis && option.series && option.series.length > 0) {
        const extractVal = (n) => {
          if (n === null || n === undefined) return null;
          if (typeof n === 'object' && 'value' in n) return n.value;
          return typeof n === 'number' ? n : parseFloat(n);
        };
        const yAxisArray = Array.isArray(option.yAxis) ? option.yAxis : [option.yAxis];
        yAxisArray.forEach((yAxis, axisIndex) => {
          const relevantSeries = option.series.filter(s => (s.yAxisIndex || 0) === axisIndex);
          const allVals = relevantSeries
            .flatMap(s => (s.data || []).map(extractVal))
            .filter(v => v !== null && !isNaN(v));
          
          if (allVals.length > 0) {
            const actualMin = Math.min(...allVals);
            console.log(`[ChartRenderer] 安全网检查 yAxis[${axisIndex}]: actualMin=${actualMin}, currentMin=${yAxis.min}`);
            if (actualMin < 0 && (yAxis.min === undefined || yAxis.min >= 0)) {
              // 有负值但 min 被设在 ≥0：删除约束，交给 ECharts 自动计算刻度
              // 这样 ECharts 会生成干净的整数/小数刻度，不会产生重复标签
              delete yAxis.min;
              delete yAxis.max;
              console.log(`[ChartRenderer] 安全网：已移除 yAxis[${axisIndex}] 的 min/max 约束，交由 ECharts 自动 scale`);
            }
          }
        });
      }
        
       // 【关键修复】预先计算每个Y轴的全局最大值，用于统一衡量"是否过小"
       const axisMaxValues = {};
       option.series.forEach(item => {
           const axisIdx = item.yAxisIndex || 0;
           const rawData = item.data || [];
           const getVal = (n) => (typeof n === 'object' && n !== null) ? (n.value ?? n) : n;
           // 必须考虑 absolute value
           const validValues = rawData.map(getVal).filter(v => v !== null && v !== undefined).map(Math.abs);
           const sMax = validValues.length > 0 ? Math.max(...validValues) : 0;
           if (axisMaxValues[axisIdx] === undefined || sMax > axisMaxValues[axisIdx]) {
               axisMaxValues[axisIdx] = sMax;
           }
       });

       // 【商业级优化】为柱状图/折线图添加数据标签、渐变色和阴影
       // 【清理】剔除后端冗余注入的 scatter 系列，防止它和我们自己的圆点逻辑冲突打架
       if (['bar', 'line', 'area'].includes(type)) {
         option.series = option.series.filter(item => item.type !== 'scatter');
       }
       option.series = option.series.map((item, index) => {
        if (item.type === 'bar') {
          const baseColor = colorPalette[index % colorPalette.length];
          const axisIdx = item.yAxisIndex || 0;
          
          // 【智能判定】通过名称或轴索引判断是否为百分比序列
          const isPercentage = (item.name && (item.name.includes('率') || item.name.includes('比') || item.name.includes('Rate'))) || axisIdx === 1;
          
          // 【数据解析】兼容对象型数据和数值型数据
          const rawData = item.data || [];
          const getVal = (n) => (typeof n === 'object' && n !== null) ? (n.value ?? n) : n;

          return {
            ...item,
            barMaxWidth: 60, // 【优化】略微放宽最大宽度
            barCategoryGap: '20%',
            barGap: '10%',
            // 【原生自适应】为非 0 的极小值提供原生保底厚度，取代错位的伪圆点
            barMinHeight: 3, 
            labelLayout: { hideOverlap: true }, // 【优化】防止标签重叠
            // 【重构】使用Label代替markPoint，确保自动对齐柱子
            label: {
              show: true, // 全局开启，通过formatter控制显示
              position: (params) => {
                // 0值居中显示在基线上方
                return params.value < 0 ? 'bottom' : 'top';
              },
              align: 'center', // 【用户需求】数字居中
              verticalAlign: 'bottom', // 配合position: top
              distance: 0, // 【用户需求】降低高度，贴近X轴
              color: '#374151', // 【新增】默认文字颜色
              fontFamily: 'Helvetica Neue, sans-serif',
              fontWeight: 600,
              fontSize: 12,
              formatter: (params) => {
                const val = getVal(params.value);
                if (val === null || val === undefined) return '';

                // 1. 0值：显示美化后的数字 (灰色小标签)
                if (val === 0) return '{zero|0}';
                
                // 2. 其余所有值均不再常驻显示文字或假圆点，由鼠标 Hover 时的 tooltip 负责详情展示
                //    (极小值已有 barMinHeight 保障视觉存在感)
                return '';
              },
              rich: {
                val: {
                  color: '#374151',
                  fontSize: 12,
                  fontFamily: 'Helvetica Neue, sans-serif',
                  fontWeight: 600,
                  backgroundColor: 'rgba(255,255,255,0.9)', 
                  borderColor: hexToRgba(baseColor, 0.2),
                  borderWidth: 1,
                  padding: [2, 6],
                  borderRadius: 10,
                  shadowBlur: 4,
                  shadowColor: 'rgba(0,0,0,0.1)'
                },
                zero: {
                  color: '#909399', // 浅灰色文字
                  fontSize: 11,
                  fontFamily: 'Helvetica Neue, sans-serif',
                  padding: [2, 6],
                  backgroundColor: 'rgba(240, 242, 245, 0.6)', // 极浅背景
                  borderRadius: 10 // 圆角
                }
              }
            },
            // 【万级数据防卡顿】开启 large 模式
            large: true,
            largeThreshold: 2000,
            // 【科技感】渐变柱体：柔和过渡
            itemStyle: {
              borderRadius: [4, 4, 0, 0],
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: baseColor },
                { offset: 1, color: hexToRgba(baseColor, 0.2) }
              ]),
              borderColor: 'transparent',
              borderWidth: 0
            },
            
            // 【悬停】高亮（变亮而非变黑）
            // 【悬停】高亮（变亮而非变黑）
            emphasis: {
              focus: 'series',
              scale: true,
              z: 100, // 【优化】悬停时层级置顶
              itemStyle: {
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                  { offset: 0, color: hexToRgba(baseColor, 0.8) },
                  { offset: 1, color: hexToRgba(baseColor, 0.4) }
                ]),
                shadowBlur: 15,
                shadowColor: hexToRgba(baseColor, 0.4)
              },
              label: { show: true, z: 100 }
            },
            // 【新增】标记0线，方便识别每个Y轴的基线
            markLine: {
              silent: true,
              symbol: 'none',
              lineStyle: {
                type: 'dashed', // 【优化】虚线更低调
                color: hexToRgba(baseColor, 0.15), // 【优化】降低透明度
                width: 1 // 【优化】减小宽度
              },
              label: {
                show: false // 【优化】隐藏"0"标签，线条即可
              },
              data: [{ yAxis: 0 }]
            }
          };
        }

        // 折线图和面积图也优化
        if (item.type === 'line' || item.type === 'area') {
          const baseColor = colorPalette[index % colorPalette.length];
          const axisIdx = item.yAxisIndex || 0;
          
          // 【智能判定】通过名称或轴索引判断是否为百分比序列
          const isPercentage = (item.name && (item.name.includes('率') || item.name.includes('比') || item.name.includes('Rate'))) || axisIdx === 1;
          
          // 【数据解析】兼容对象型数据和数值型数据
          const rawData = item.data || [];
          const getVal = (n) => (typeof n === 'object' && n !== null) ? (n.value ?? n) : n;

          // 【重构】彻底移除静态假圆点判定机制。采用原生 ECharts 行为：
          // 折线默认不显示大量圆点（保持干净），仅在鼠标悬停时原生显示圆点

          return {
            ...item,
            data: rawData.map(v => { // 还原为纯数值，不做对象包装
              const n = getVal(v);
              return (n === null || n === undefined) ? null : n;
            }),
            smooth: 0.35,
            // 全局关闭常驻 symbol 渲染，通过 ECharts 原生悬浮高亮来展示数据点
            showSymbol: false,
            symbol: 'circle',
            symbolSize: 6,
            itemStyle: {
              color: '#fff',
              borderColor: baseColor,
              borderWidth: 2
            },
            // 【万级数据防卡顿】开启数据降采样算法防止极其密集的点叠满屏幕
            sampling: 'lttb',
            labelLayout: { hideOverlap: true }, // 【优化】防止标签重叠
            lineStyle: {
              width: 2.5,
              color: baseColor   // 明确使用系列颜色，不依赖 ECharts 自动推导
            },
             // 【修复】补全折线图的悬停置顶逻辑
            emphasis: {
              focus: 'series',
              scale: true,
              z: 100, 
              label: { show: true, z: 100 },
              lineStyle: { width: 4 }
            },
            // 》数据标签：关闭常驻显示，具体数值仅通过 tooltip 悬浮显示
            label: { show: false },
            // 【新增】也为折线图添加0线标记，方便识别正负
            markLine: {
              silent: true,
              symbol: 'none',
              lineStyle: {
                type: 'dashed', 
                color: '#ccc',
                opacity: 0.6,
                width: 1
              },
              label: { show: false },
              data: [{ yAxis: 0 }]
            }
          };
        }
        
        return item;
      });

       // 【优化】智能缩放配置
       if (['bar', 'line', 'area'].includes(type) && seriesList.length > 0) {
          const dataLen = data.xAxisData ? data.xAxisData.length : 0;
          
          if (dataLen > 20) {
            // 【最终方案：无感化内嵌滚动提示】既去除突兀的常驻外置滚动条，又给用户留出可滑动的视觉暗示
            option.dataZoom = [
              {
                type: 'inside', 
                startValue: 0,
                endValue: 30, 
                zoomOnMouseWheel: true, 
                moveOnMouseWheel: true, 
                moveOnMouseMove: true   
              },
              {
                type: 'slider', // 用极其微弱的面貌重现，仅仅充当“其实这里还没到底”的进度条作用
                show: true,
                startValue: 0,
                endValue: 30, 
                bottom: '10%', // 【关键修改】不再单独占用网格外的空间，而是向内浮动在图表底部上面
                height: 4,     // 压缩到极限（4px）甚至像一条线
                xAxisIndex: [0], 
                
                // --- 终极隐形设置 ---
                borderColor: 'transparent',
                backgroundColor: 'rgba(240, 242, 245, 0.2)', // 极弱轨道
                fillerColor: 'rgba(144, 147, 153, 0.3)', // 若隐若现的进度颜色
                
                showDataShadow: false, 
                showDetail: false, 
                handleSize: '0%', // 完全摒弃把手，只需它看起来像个能拖拽的细条进度
                handleStyle: { opacity: 0 }, // 防止任何遗留残影
                
                dataBackground: { lineStyle: { opacity: 0 }, areaStyle: { opacity: 0 } },
                selectedDataBackground: { lineStyle: { opacity: 0 }, areaStyle: { opacity: 0 } },
                textStyle: { display: 'none' } 
              }
            ];
            // 维持正常底边距，因为滑动条现在是半透明内嵌悬浮的，不抢占额外布局
            option.grid.bottom = '12%'; 
          } else {
            // 数据量不大，仅内部滚轮缩放即可
            option.dataZoom = [
              {
                type: 'inside',
              }
            ];
            // 保持底部间距一致
            option.grid.bottom = '12%'; 
          }
      } else if (type === 'scatter') {
          // 【修复】处理后端返回的散点图数据格式
          // 支持三种格式：
          // 1. xAxisData + series (最新标准格式) ✅
          // 2. series: [{ data: [[x, y], ...] }] (坐标对格式)
          // 3. scatterData: [[x, y], ...] (兼容旧版)
          
          let xAxisData = [];
          let seriesList = [];
          
          // 【最新格式】xAxisData + series（其中data是简单数组）
          if (data.xAxisData && data.series && Array.isArray(data.series)) {
            console.log('[ChartRenderer] 使用xAxisData+series标准格式处理散点图');
            console.log('[ChartRenderer] xAxisData:', data.xAxisData);
            console.log('[ChartRenderer] series:', data.series);
            
            xAxisData = data.xAxisData;
            
            seriesList = data.series.map((s, index) => ({
              name: s.name || `系列${index + 1}`,
              type: 'scatter',
              data: s.data || [],  // 直接使用data数组
              symbolSize: 8,
              itemStyle: { 
                color: colorPalette[index % colorPalette.length], 
                opacity: 0.7,
                borderColor: '#fff',
                borderWidth: 1
              },
              emphasis: {
                scale: true,
                itemStyle: { 
                  shadowBlur: 10, 
                  shadowColor: 'rgba(0,0,0,0.3)',
                  opacity: 1
                }
              }
            }));
          }
          // 【坐标对格式】series: [{ data: [[x, y], ...] }]
          else if (data.series && Array.isArray(data.series) && data.series.length > 0 && !data.xAxisData) {
            console.log('[ChartRenderer] 使用series坐标对格式处理散点图');
            console.log('[ChartRenderer] 完整series数据:', JSON.stringify(data.series, null, 2));
            
            // 从第一个系列中提取X轴数据
            const firstSeries = data.series[0];
            
            if (firstSeries.data && Array.isArray(firstSeries.data)) {
              console.log('[ChartRenderer] data第一个元素:', firstSeries.data[0]);
              console.log('[ChartRenderer] data[0][0]:', firstSeries.data[0][0]);
              console.log('[ChartRenderer] data[0][1]:', firstSeries.data[0][1]);
              
              // 【修复】判断数据格式：检查[0]和[1]哪个是字符串/机构名称
              const firstPoint = firstSeries.data[0];
              const isReversed = typeof firstPoint[1] === 'string' || (typeof firstPoint[0] === 'number' && typeof firstPoint[1] !== 'number');
              
              if (isReversed) {
                console.log('[ChartRenderer] 数据格式为 [y值, x标签]，需要反转');
                xAxisData = firstSeries.data.map(point => point[1]); // X标签在索引1
              } else {
                console.log('[ChartRenderer] 数据格式为 [x标签, y值]，标准格式');
                xAxisData = firstSeries.data.map(point => point[0]); // X标签在索引0
              }
            }
            
            // 处理所有系列 - Y值提取也要根据格式调整
            seriesList = data.series.map((s, index) => {
              const firstPoint = s.data && s.data[0];
              const isReversed = firstPoint && (typeof firstPoint[1] === 'string' || (typeof firstPoint[0] === 'number' && typeof firstPoint[1] !== 'number'));
              
              return {
                name: s.name || `系列${index + 1}`,
                type: 'scatter',
                data: s.data ? s.data.map(point => isReversed ? point[0] : point[1]) : [],
                symbolSize: 8,
                itemStyle: { 
                  color: colorPalette[index % colorPalette.length], 
                  opacity: 0.7,
                  borderColor: '#fff',
                  borderWidth: 1
                },
                emphasis: {
                  scale: true,
                  itemStyle: { 
                    shadowBlur: 10, 
                    shadowColor: 'rgba(0,0,0,0.3)',
                    opacity: 1
                  }
                }
              };
            });
          } 
          // 【兼容旧格式】scatterData
          else if (data.scatterData && Array.isArray(data.scatterData) && data.scatterData.length > 0) {
            console.log('[ChartRenderer] 使用scatterData格式处理散点图');
            const scatterData = data.scatterData;
            
            // 提取X轴和Y轴数据
            xAxisData = scatterData.map(point => point[0]);
            const yAxisData = scatterData.map(point => point[1]);
            
            seriesList = [{
              name: (this.activeYAxisFields && this.activeYAxisFields[0]) || this.config.yAxisField || '数值',
              type: 'scatter',
              data: yAxisData,
              symbolSize: 8,
              itemStyle: { 
                color: colorPalette[0], 
                opacity: 0.7,
                borderColor: '#fff',
                borderWidth: 1
              },
              emphasis: {
                scale: true,
                itemStyle: { 
                  shadowBlur: 10, 
                  shadowColor: 'rgba(0,0,0,0.3)',
                  opacity: 1
                }
              }
            }];
          }
          // 【标准格式】xAxisData + seriesData
          else if (data.xAxisData && data.seriesData) {
            console.log('[ChartRenderer] 使用标准xAxisData+seriesData格式');
            xAxisData = data.xAxisData;
            
            const isComplex = typeof data.seriesData[0] === 'object' && data.seriesData[0].name;
            if (isComplex) {
              seriesList = data.seriesData.map((s, index) => ({
                ...s,
                type: 'scatter',
                data: s.data.map(parseNum),
                symbolSize: 8,
                itemStyle: { 
                  color: colorPalette[index % colorPalette.length], 
                  opacity: 0.7,
                  borderColor: '#fff',
                  borderWidth: 1
                },
                emphasis: {
                  scale: true,
                  itemStyle: { 
                    shadowBlur: 10, 
                    shadowColor: 'rgba(0,0,0,0.3)',
                    opacity: 1
                  }
                }
              }));
            } else {
              seriesList = [{
                name: (this.activeYAxisFields && this.activeYAxisFields[0]) || this.config.yAxisField || '数值',
                type: 'scatter',
                data: data.seriesData.map(parseNum),
                symbolSize: 8,
                itemStyle: { 
                  color: colorPalette[0], 
                  opacity: 0.7,
                  borderColor: '#fff',
                  borderWidth: 1
                },
                emphasis: {
                  scale: true,
                  itemStyle: { 
                    shadowBlur: 10, 
                    shadowColor: 'rgba(0,0,0,0.3)',
                    opacity: 1
                  }
                }
              }];
            }
          } else {
            console.warn('[ChartRenderer] 散点图数据格式不正确:', data);
          }
          
          console.log('[ChartRenderer] 散点图X轴数据:', xAxisData);
          console.log('[ChartRenderer] 散点图系列数据:', seriesList);
          
          option.xAxis = {
            type: 'category',
            data: xAxisData,
            axisTick: { alignWithLabel: true },
            axisLine: { lineStyle: { color: '#DCDFE6' } },
            axisLabel: { 
              color: '#606266', 
              interval: 0,
              rotate: 30,
              formatter: function(value) {
                 if (!value) return '';
                 return value.toString().length > 12 ? value.toString().substring(0, 12) + '...' : value;
              }
            }
          };
          
          option.yAxis = {
            type: 'value',
            scale: true,
            axisLabel: { formatter: yAxisFormatter, color: '#909399' },
            splitLine: { lineStyle: { type: 'dashed', color: '#EBEEF5' } },
            axisLine: { show: false },
            axisTick: { show: false }
          };

          option.series = seriesList;
      } else if (type === 'pie') {
          // 【优化】高级饼图配置
          // 【修复】后端实际返回 seriesData（[{name, value}] 格式），而非 pieData，增加兜底逻辑
          const pieRawData = data.pieData
            || (Array.isArray(data.seriesData) && data.seriesData.length > 0 && data.seriesData[0] && 'value' in data.seriesData[0]
                ? data.seriesData
                : []);

          // 饼图副标题：只展示 yAxisName（数值字段说明），不展示 xAxisName（饼图无 X 轴）
          const pieYAxisName = data.yAxisName || '';
          if (pieYAxisName) {
            option.title = Object.assign({}, option.title, {
              subtext: pieYAxisName,
              subtextStyle: { color: '#909399', fontSize: 11 }
            });
          }

          // 【修复】饼图使用内置多色调色盘（忽略 theme.color，防止后端只返回单色导致全部扇形颜色相同）
          // 内置12色，足够覆盖常见的扇形数量
          const PIE_PALETTE = [
            '#3B82F6', '#06B6D4', '#8B5CF6', '#F59E0B', '#10B981',
            '#6366F1', '#EC4899', '#14B8A6', '#F97316', '#A855F7',
            '#EF4444', '#22C55E'
          ];
          const pieColoredData = pieRawData.map((item, idx) => {
            const baseColor = PIE_PALETTE[idx % PIE_PALETTE.length];
            return {
              ...item,
              itemStyle: {
                ...(item.itemStyle || {}),
                color: new echarts.graphic.RadialGradient(0.5, 0.5, 1, [
                  { offset: 0, color: baseColor },
                  { offset: 1, color: hexToRgba(baseColor, 0.6) }
                ])
              }
            };
          });

          option.series = [{
              type: 'pie',
              radius: ['45%', '70%'], // 环形
              center: ['50%', '45%'], // 居中，底部留空给图例
              avoidLabelOverlap: true,
              data: pieColoredData,
              // 【优化】标签配置 - 恢复显示
              label: {
                show: true,
                formatter: '{b}\n{d}%', // 名称和百分比换行显示
                fontSize: 12,
                fontWeight: 600,
                color: '#374151',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
              },
              // 【优化】引导线
              labelLine: {
                show: true,
                length: 12,
                length2: 8,
                smooth: true,
                lineStyle: {
                  width: 1.5,
                  type: 'solid'
                }
              },
              // 【优化】每个扇形共用的边框/阴影样式（颜色已在数据项上单独设置）
              itemStyle: {
                borderRadius: 8,
                borderColor: '#fff',
                borderWidth: 2,
                shadowBlur: 10,
                shadowColor: 'rgba(0, 0, 0, 0.15)'
              },
              // 【优化】悬停效果 - 改善文字可见度
              emphasis: {
                scale: true,
                scaleSize: 10,
                itemStyle: {
                  shadowBlur: 20,
                  shadowColor: 'rgba(0, 0, 0, 0.3)'
                },
                label: {
                  show: true,
                  formatter: '{b}\n{d}%',
                  fontSize: 15,
                  fontWeight: 700,
                  color: '#1F2937', // 深色文字，更清晰
                  backgroundColor: 'rgba(255, 255, 255, 0.95)', // 白色半透明背景
                  borderColor: '#E5E7EB',
                  borderWidth: 1,
                  borderRadius: 4,
                  padding: [4, 8],
                  shadowBlur: 4,
                  shadowColor: 'rgba(0, 0, 0, 0.2)'
                }
              }
          }];
          
          // 【优化】图例配置 - 底部横向布局
          option.legend = {
            orient: 'horizontal',
            bottom: 8,
            left: 'center',
            type: 'scroll',
            itemWidth: 14,
            itemHeight: 14,
            itemGap: 20,
            textStyle: { 
              color: '#606266',
              fontSize: 12,
              fontWeight: 500
            },
            pageIconColor: colorPalette[0],
            pageIconInactiveColor: '#aaa',
            pageTextStyle: {
              color: '#606266',
              fontSize: 11
            }
          };
          
          delete option.xAxis;
          delete option.yAxis;
          delete option.grid;
      } else if (type === 'radar') {
          console.log('[ChartRenderer] 雷达图数据:', data);
          console.log('[ChartRenderer] indicator:', data.indicator);
          console.log('[ChartRenderer] radarData:', data.radarData);
          
          // 【新增】雷达图tooltip配置
          option.tooltip = {
            trigger: 'item',
            backgroundColor: 'rgba(255, 255, 255, 0.96)',
            borderColor: '#E5E7EB',
            borderWidth: 1,
            padding: [12, 16],
            textStyle: {
              color: '#374151',
              fontSize: 13
            },
            extraCssText: 'box-shadow: 0 6px 16px rgba(0,0,0,0.12); border-radius: 8px;'
          };
          
          // 【修复】确保indicator格式正确
          let indicators = data.indicator || [];
          
          // 如果indicator是简单字符串数组，转换为对象数组
          if (indicators.length > 0 && typeof indicators[0] === 'string') {
            console.log('[ChartRenderer] indicator是字符串数组，转换为对象格式');
            indicators = indicators.map(name => ({
              name: name,
              max: null // 让ECharts自动计算最大值
            }));
          }
          
          console.log('[ChartRenderer] 处理后的indicators:', indicators);
          console.log('[ChartRenderer] radarData系列数量:', data.radarData ? data.radarData.length : 0);
          
          // 【优化】高级雷达图配置
          option.radar = {
              indicator: indicators,
              splitNumber: 5, // 增加分割层数，更细腻
              shape: 'polygon', // 多边形
              radius: '70%', // 增大半径
              center: ['50%', '50%'],
              axisName: { 
                color: '#1F2937',
                fontSize: 13,
                fontWeight: 600,
                padding: [0, 5],
                backgroundColor: 'transparent',
                borderRadius: 4
              },
              splitLine: { 
                lineStyle: { 
                  color: 'rgba(59, 130, 246, 0.2)',
                  width: 2,
                  type: 'solid'
                } 
              },
              splitArea: { 
                show: true,
                areaStyle: {
                  color: [
                    'rgba(59, 130, 246, 0.03)',
                    'rgba(59, 130, 246, 0.06)',
                    'rgba(59, 130, 246, 0.09)',
                    'rgba(59, 130, 246, 0.12)',
                    'rgba(59, 130, 246, 0.15)'
                  ]
                }
              },
              axisLine: {
                lineStyle: {
                  color: 'rgba(59, 130, 246, 0.3)',
                  width: 2
                }
              }
          };
          
          // 【修复】处理多个系列的雷达数据：优先 radarData，后端可能返回 seriesData
          let radarSeries = [];
          const radarRawData = (data.radarData && data.radarData.length > 0)
            ? data.radarData
            : null; // seriesData 格式的雷达数据在下方单独处理

          if (radarRawData && Array.isArray(radarRawData) && radarRawData.length > 0) {
            console.log('[ChartRenderer] 处理雷达图系列（radarData），总数:', radarRawData.length);
            // 替换局部引用
            data = { ...data, radarData: radarRawData };
          } else if (data.seriesData && Array.isArray(data.seriesData) && data.seriesData.length > 0) {
            // 后端通过 seriesData 返回雷达数据，格式: [{name: '指标1,指标2,...', data: [v1,v2,...]}]
            console.log('[ChartRenderer] 雷达图使用 seriesData 兜底，seriesData:', data.seriesData);
            const firstSeries = data.seriesData[0] || {};
            const indicatorNames = (firstSeries.name || '').split(',').map(n => n.trim()).filter(Boolean);
            const indicatorValues = Array.isArray(firstSeries.data) ? firstSeries.data : [];
            if (indicatorNames.length > 0 && indicatorValues.length > 0) {
              // 构建 indicator
              const maxVal = Math.max(...indicatorValues.map(v => Math.abs(parseFloat(v) || 0))) * 1.2 || 100;
              data = {
                ...data,
                indicator: indicatorNames.map(n => ({ name: n, max: maxVal })),
                radarData: data.seriesData.map(s => ({
                  name: s.name,
                  value: Array.isArray(s.data) ? s.data : []
                }))
              };
              // update option.radar indicator
              option.radar.indicator = data.indicator;
            }
          }

          if (data.radarData && Array.isArray(data.radarData) && data.radarData.length > 0) {
            console.log('[ChartRenderer] 处理雷达图系列，总数:', data.radarData.length);
            
            // ECharts雷达图可以有多个系列，每个系列是一个独立的配置
            radarSeries = data.radarData.map((seriesItem, index) => {
              console.log(`[ChartRenderer] 系列${index + 1}:`, seriesItem.name, '数据点数:', seriesItem.value?.length);
              
              return {
                name: seriesItem.name || `系列${index + 1}`,
                type: 'radar',
                data: [{
                  value: seriesItem.value || [],
                  name: seriesItem.name || `系列${index + 1}`
                }],
                symbol: 'circle',
                symbolSize: 8,
                lineStyle: {
                  width: 3,
                  shadowBlur: 10,
                  shadowColor: 'rgba(0, 0, 0, 0.1)',
                  shadowOffsetY: 4,
                  color: colorPalette[index % colorPalette.length]
                },
                areaStyle: { 
                  opacity: 0.25,
                  color: {
                    type: 'radial',
                    x: 0.5,
                    y: 0.5,
                    r: 0.5,
                    colorStops: [
                      { offset: 0, color: `${colorPalette[index % colorPalette.length]}66` },
                      { offset: 1, color: `${colorPalette[index % colorPalette.length]}22` }
                    ]
                  }
                },
                itemStyle: {
                  color: colorPalette[index % colorPalette.length],
                  borderWidth: 2,
                  borderColor: '#fff',
                  shadowBlur: 8,
                  shadowColor: 'rgba(0, 0, 0, 0.2)'
                },
                emphasis: {
                  lineStyle: {
                    width: 4
                  },
                  areaStyle: {
                    opacity: 0.4
                  },
                  itemStyle: {
                    shadowBlur: 15
                  }
                }
              };
            });
            
            console.log('[ChartRenderer] 雷达图系列配置完成，系列数:', radarSeries.length);
          }
          
          option.series = radarSeries.length > 0 ? radarSeries : [{
              type: 'radar',
              data: (data.radarData || []).map ? (data.radarData || []) : [],
              symbol: 'circle',
              symbolSize: 8,
              lineStyle: {
                width: 3,
                shadowBlur: 10,
                shadowColor: 'rgba(0, 0, 0, 0.1)'
              },
              areaStyle: { 
                opacity: 0.25,
                color: {
                  type: 'radial',
                  x: 0.5,
                  y: 0.5,
                  r: 0.5,
                  colorStops: [
                    { offset: 0, color: `${colorPalette[0]}66` },
                    { offset: 1, color: `${colorPalette[0]}22` }
                  ]
                }
              },
              itemStyle: {
                color: colorPalette[0],
                borderWidth: 2,
                borderColor: '#fff',
                shadowBlur: 8
              }
          }];
          
          // 【优化】图例配置
          if (radarSeries.length > 1) {
            option.legend = {
              orient: 'horizontal',
              bottom: 15,
              itemGap: 20,
              textStyle: {
                fontSize: 13,
                color: '#606266'
              },
              itemWidth: 25,
              itemHeight: 14
            };
          }
          
          delete option.xAxis;
          delete option.yAxis;
          delete option.grid;
      }
      
      return option;
    },
    
    // 【新增】根据数据特点动态计算图表高度
    calculateDynamicHeight(data, type) {
      let baseHeight = 450; // 默认基础高度
      
      // 对于带坐标轴的图表，检测数据范围
      if (['bar', 'line', 'area', 'scatter'].includes(type)) {
        let values = [];
        
        // 提取数值数据
        if (type === 'scatter' && data.scatterData) {
          values = data.scatterData.map(item => parseFloat(item[1]));
        } else if (data.seriesData) {
          values = data.seriesData.map(v => parseFloat(v)).filter(v => !isNaN(v));
        }
        
        if (values.length > 0) {
          const minValue = Math.min(...values);
          const maxValue = Math.max(...values);
          const range = maxValue - minValue;
          
          // 如果有负数，增加高度以确保负数部分完整显示
          if (minValue < 0) {
            const negativeRatio = Math.abs(minValue) / range; // 负数占总范围的比例
            const extraHeight = Math.min(negativeRatio * 200, 150); // 最多额外增加150px
            baseHeight += extraHeight;
            console.log('[ChartRenderer] 检测到负数数据，调整高度:', baseHeight, '负数比例:', negativeRatio);
          }
          
          // 如果数据点很多（>15个），也适当增加高度
          if (values.length > 15) {
            baseHeight += 50;
          }
        }
      }
      
      this.dynamicHeight = Math.min(baseHeight, 700); // 最大不超过700px
      console.log('[ChartRenderer] 动态计算高度:', this.dynamicHeight);
    },
    
    // 【新增】获取当前下钻选项
    getCurrentDrillOptions() {
      if (!this.chartOption || !this.chartOption.xAxis) return [];
      let data = [];
      if (Array.isArray(this.chartOption.xAxis)) {
        data = this.chartOption.xAxis[0].data || [];
      } else {
        data = this.chartOption.xAxis.data || [];
      }
      return data;
    },

    // 【新增】手动下钻处理
    handleManualDrill(val) {
      if (!val) return;
      console.log('[ChartRenderer] 手动触发下钻:', val);
      
      this.pendingFilter = {
        column: this.config.xAxisField,
        value: val,
        displayValue: val
      };
      
      const cols = this.currentColumns && this.currentColumns.length > 0 ? this.currentColumns : this.columns;
      
      if (cols) {
         this.nextLevelDimensions = cols.filter(c => {
            if (c.name === this.config.xAxisField) return false;
            const type = (c.type || '').toUpperCase();
            const isNumeric = ['INT', 'INTEGER', 'DECIMAL', 'FLOAT', 'DOUBLE', 'NUMERIC', 'BIGINT', 'NUMBER'].some(t => type.includes(t));
            return !isNumeric;
         }).map(c => ({ name: c.name, type: c.type || 'text' }));
           
         if (this.nextLevelDimensions.length === 0) {
           this.$message.warning('没有更多维度可下钻');
           return;
         }
         
         this.menuPosition = { x: 200, y: 200 }; 
         this.showDimensionMenu = true;
         this.$nextTick(() => { this.manualDrillValue = ''; });
      }
    }
  }
};
</script>

<style scoped>
/* ========================================================
   空状态样式 - Enhanced Empty State
   ======================================================== */
.empty-chart {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  color: #909399;
  font-size: 14px;
}

.empty-chart i {
  font-size: 48px;
  margin-bottom: 16px;
  color: #dcdfe6;
}

/* 增强版空状态 */
.enhanced-empty {
  padding: 40px 20px;
  background: linear-gradient(135deg, #fafbfc 0%, #ffffff 100%);
  border-radius: 12px;
  border: 2px dashed #e4e7ed;
}

.enhanced-empty .empty-illustration {
  margin-bottom: 20px;
}

.enhanced-empty .empty-illustration i {
  font-size: 64px;
  color: #c0c4cc;
  animation: emptyPulse 2s ease-in-out infinite;
}

@keyframes emptyPulse {
  0%, 100% {
    transform: scale(1);
    opacity: 0.6;
  }
  50% {
    transform: scale(1.05);
    opacity: 0.8;
  }
}

.enhanced-empty .empty-content {
  text-align: center;
  margin-bottom: 24px;
}

.enhanced-empty .empty-title {
  font-size: 16px;
  font-weight: 600;
  color: #606266;
  margin: 0 0 8px 0;
}

.enhanced-empty .empty-hint {
  font-size: 13px;
  color: #909399;
  margin: 0;
}

.enhanced-empty .empty-action-btn {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  border: none;
  border-radius: 6px;
  padding: 10px 20px;
  font-weight: 500;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);
  transition: all 0.3s ease;
}

.enhanced-empty .empty-action-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(37, 99, 235, 0.3);
}

/* 外层容器 - 类似代码块的样式 */
.chart-renderer-wrapper {
  margin: 16px 0;
  border-radius: 8px;
  overflow: visible; /* 【修复】改为 visible 以显示下拉框 */
  background-color: #f5f5f5;
  border: 1px solid #e0e0e0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

/* 头部栏 - 模仿SQL代码块 */
.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #ededed;
  padding: 10px 16px;
  color: #5c6b7f;
  font-size: 13px;
  border-bottom: 1px solid #e0e0e0;
  border-radius: 8px 8px 0 0; /* 【修复】手动添加圆角 */
}

/* Chart 标签 - 带Mac窗口点 */
.chart-lang-tag {
  font-weight: 600;
  text-transform: uppercase;
  display: flex;
  align-items: center;
  gap: 8px;
  color: #5c6b7f;
}

.chart-lang-tag::before {
  content: '';
  display: block;
  width: 54px;
  height: 14px;
  background: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="54" height="14" viewBox="0 0 54 14"><circle cx="7" cy="7" r="6" fill="%23FF5F56"/><circle cx="27" cy="7" r="6" fill="%23FFBD2E"/><circle cx="47" cy="7" r="6" fill="%2327C93F"/></svg>') no-repeat center;
  margin-right: 12px;
}

/* 头部操作按钮 */
.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.action-btn,
.collapse-btn {
  cursor: pointer;
  color: #999;
  transition: color 0.2s ease;
  display: flex;
  align-items: center;
  padding: 4px;
}

.action-btn:hover,
.collapse-btn:hover {
  color: #3370ff;
}

/* 折叠动画 */
.chart-collapse-enter-active,
.chart-collapse-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}

.chart-collapse-enter,
.chart-collapse-leave-to {
  opacity: 0;
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
}

.chart-collapse-enter-to,
.chart-collapse-leave {
  opacity: 1;
  max-height: 1000px;
}

/* 内部图表渲染区域 */
.chart-renderer {
  padding: 16px;
  background: linear-gradient(to bottom, #ffffff, #fafbfc);
  border-radius: 0 0 8px 8px; /* 【修复】手动添加圆角 */
}

.chart-config {
  margin-bottom: 8px;
  padding: 12px;
  padding-bottom: 8px;
  border-bottom: 2px solid #f0f0f0;
  background: #fafafa;
  border-radius: 8px;
}

.chart-config ::v-deep .el-form-item {
  margin-bottom: 8px;
}

.chart-config ::v-deep .el-form-item__label {
  font-weight: 500;
  color: #262626;
  font-size: 13px;
}

/* =================================================================================
   【高级感重构】Chart Configuration Panel - Premium Design
   ================================================================================= */

/* 顶部配置栏布局优化 */
.chart-config {
  padding: 24px;
  background-color: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.04);
  /* 悬浮卡片效果 */
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.04);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-bottom: 20px;
  transition: all 0.3s ease;
}

.chart-config:hover {
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.06);
}

/* 通用行布局 */
.config-row {
  display: flex;
  align-items: center;
  width: 100%;
}

/* 第一行：图表类型 + 生成按钮 */
.main-row {
  justify-content: space-between;
  padding-bottom: 16px;
  border-bottom: 1px solid #f0f2f5;
}

.row-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

/* 第二行：坐标轴配置 */
.axis-row {
  justify-content: flex-start;
  gap: 32px; /* 增加间距 */
  flex-wrap: wrap;
  padding-top: 4px;
}

/* Y轴行特殊处理：让左侧容器自适应填充，实现输入框自动变宽 */
.main-row .row-left {
  flex: 1; /* 占据剩余空间 */
  margin-right: 20px; /* 与按钮保持距离 */
  min-width: 0; /* 防止溢出 */
}

/* 配置项单元 */
.config-item {
  display: flex;
  flex-direction: row; /* 【修复】改回左右结构 */
  align-items: center;
  gap: 12px;
  position: relative;
}

/* Y轴配置项：宽度自适应 */
.main-row .row-left .config-item {
  width: 100%;
}

/* Y轴选择框更宽 -> 改为占满容器 */
.config-item.is-wide .modern-input, 
.axis-row .config-item:nth-child(2) .modern-input,
.main-row .row-left .modern-input.is-wide { 
  width: 100% !important; /* 强制占满可用空间 */
  min-width: 200px;
  max-width: none;
}

/* 标签样式 - 微小、大写、精致 -> 更加清晰醒目 */
.config-label {
  font-weight: 700;
  color: #303133; /* 更深的颜色，提高对比度 */
  font-size: 13px; /* 字体稍微调大 */
  text-transform: none; /* 取消强制大写，适应中文 */
  margin-left: 0;
  min-width: 70px; /* 稍微加宽 */
  text-align: right;
  flex-shrink: 0;
}

/* 分割线 */
.divider {
  width: 1px;
  height: 32px;
  background-color: #eaeef2;
  margin: 0 12px;
}

/* 下钻开关区域 */
.drill-item {
  flex-direction: row; /* 开关保持左右结构 */
  align-items: center;
  gap: 12px;
  background: #f8fafc;
  padding: 6px 12px;
  border-radius: 8px;
}

.drill-item .config-label {
  margin-left: 0;
  margin-bottom: 0;
}

/* ========================================================
   输入框深度定制 - 去除边框，使用背景色
   ======================================================== */
.chart-config ::v-deep .el-input__inner {
  height: 40px;
  line-height: 40px;
  border: 1px solid transparent; /* 默认无边框 */
  background-color: #f5f7fa; /* 柔和背景 */
  border-radius: 8px;
  font-size: 13px;
  color: #2c3e50;
  font-weight: 500;
  padding-left: 12px;
  transition: all 0.25s ease;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.02);
}

.chart-config ::v-deep .el-input__inner:hover {
  background-color: #eef1f6;
}

.chart-config ::v-deep .el-input__inner:focus,
.chart-config ::v-deep .el-select .el-input.is-focus .el-input__inner {
  background-color: #ffffff;
  border-color: #409EFF;
  box-shadow: 0 0 0 3px rgba(64, 158, 255, 0.1);
}

/* 按钮高级化 */
.render-btn {
  height: 40px;
  padding: 0 24px;
  font-size: 13px;
  letter-spacing: 0.5px;
  font-weight: 600;
  border-radius: 8px;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);
  border: none;
}

.render-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(37, 99, 235, 0.35);
}

/* Modern Input Styling */
.modern-input {
  width: 220px;
}

/* Y轴选择框更宽 */
.config-item.is-wide .modern-input, /* 配合 dynamic class 使用，或者直接用 css */
.axis-row .config-item:nth-child(2) .modern-input { 
  width: 360px; /* 更加宽阔 */
}

/* 之前样式保留 */
/* Modern Input Styling */
.modern-input {
  width: 240px; /* 进一步加宽以容纳多选 */
}

/* 【关键修复】多选Tag横向排列，不换行，支持滚动 */
.modern-input ::v-deep .el-select__tags {
  flex-wrap: nowrap !important;
  overflow-x: auto;
  overflow-y: hidden;
  max-width: 100% !important;
  padding-right: 30px; /* 给右侧icon留位置 */
  
  /* 隐藏滚动条但保留功能 */
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE/Edge */
}

.modern-input ::v-deep .el-select__tags::-webkit-scrollbar {
  display: none; /* Chrome/Safari */
}

/* 【优化】Y轴选择器标签颜色 - 与图表系列颜色保持一致 */
.config-item .modern-input ::v-deep .el-tag:nth-of-type(8n+1) { background-color: rgba(59, 130, 246, 0.1); color: #3B82F6; border-color: rgba(59, 130, 246, 0.3); }
.config-item .modern-input ::v-deep .el-tag:nth-of-type(8n+2) { background-color: rgba(6, 182, 212, 0.1); color: #06B6D4; border-color: rgba(6, 182, 212, 0.3); }
.config-item .modern-input ::v-deep .el-tag:nth-of-type(8n+3) { background-color: rgba(139, 92, 246, 0.1); color: #8B5CF6; border-color: rgba(139, 92, 246, 0.3); }
.config-item .modern-input ::v-deep .el-tag:nth-of-type(8n+4) { background-color: rgba(245, 158, 11, 0.1); color: #F59E0B; border-color: rgba(245, 158, 11, 0.3); }
.config-item .modern-input ::v-deep .el-tag:nth-of-type(8n+5) { background-color: rgba(16, 185, 129, 0.1); color: #10B981; border-color: rgba(16, 185, 129, 0.3); }
.config-item .modern-input ::v-deep .el-tag:nth-of-type(8n+6) { background-color: rgba(99, 102, 241, 0.1); color: #6366F1; border-color: rgba(99, 102, 241, 0.3); }
.config-item .modern-input ::v-deep .el-tag:nth-of-type(8n+7) { background-color: rgba(236, 72, 153, 0.1); color: #EC4899; border-color: rgba(236, 72, 153, 0.3); }
.config-item .modern-input ::v-deep .el-tag:nth-of-type(8n+8) { background-color: rgba(20, 184, 166, 0.1); color: #14B8A6; border-color: rgba(20, 184, 166, 0.3); }

/* 优化 Tag 样式 */
.modern-input ::v-deep .el-tag {
  display: inline-flex;
  align-items: center;
  margin: 2px 4px 2px 0 !important;
  border-radius: 4px;
  height: 24px;
  line-height: 24px !important; /* 确保行高一致 */
  border-width: 1px;
  border-style: solid;
  flex-shrink: 0;
  font-weight: 400 !important;
  padding: 0 8px;
  text-shadow: none !important;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  backface-visibility: hidden; /* 防止3D渲染导致的模糊 */
  transform: translateZ(0); /* 强制GPU渲染 */
}

/* 【强力修复】移除所有可能导致重影的元素样式 */
.modern-input ::v-deep .el-tag span,
.modern-input ::v-deep .el-tag .el-select__tags-text,
.modern-input ::v-deep .el-tag > span {
  text-shadow: none !important;
  filter: none !important;
  font-weight: 400 !important;
  -webkit-font-smoothing: antialiased !important;
  -moz-osx-font-smoothing: grayscale !important;
  opacity: 1 !important; /* 防止透明度叠加 */
  backface-visibility: hidden !important;
  transform: translateZ(0) !important;
}

/* 【关键】移除标签关闭按钮的重影 */
.modern-input ::v-deep .el-tag .el-tag__close,
.modern-input ::v-deep .el-tag .el-icon-close {
  text-shadow: none !important;
  filter: none !important;
  -webkit-font-smoothing: antialiased !important;
}

.modern-input ::v-deep .el-input__inner {
  border-radius: 6px;
  border-color: #dcdfe6;
  transition: all 0.3s;
  padding-left: 8px; /* 调整内边距 */
}

.chart-config ::v-deep .el-select .el-input__inner:focus,
.chart-config ::v-deep .el-input__inner:focus {
  border-color: #1890FF;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.1);
}

.chart-config ::v-deep .el-button--primary {
  background: linear-gradient(135deg, #1890FF 0%, #096dd9 100%);
  border: none;
  border-radius: 6px;
  font-weight: 500;
  box-shadow: 0 2px 8px rgba(24, 144, 255, 0.3);
  transition: all 0.3s ease;
}

.chart-config ::v-deep .el-button--primary:hover {
  background: linear-gradient(135deg, #40a9ff 0%, #1890FF 100%);
  box-shadow: 0 4px 12px rgba(24, 144, 255, 0.4);
  transform: translateY(-1px);
}

.chart-wrapper {
  position: relative;
}

.chart-content {
  width: 100%;
  border-radius: 8px;
  background: #fff;
}

.empty-chart {
  height: 200px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  color: #8c8c8c;
  background: linear-gradient(135deg, #fafafa 0%, #f5f5f5 100%);
  border-radius: 8px;
  border: 2px dashed #d9d9d9;
}

.empty-chart i {
  font-size: 36px;
  margin-bottom: 8px;
  color: #bfbfbf;
  opacity: 0.6;
}

.empty-chart span {
  font-size: 13px;
  color: #595959;
  font-weight: 500;
}

/* 【新增】下钻面包屑导航样式 */
.drill-breadcrumb {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 16px;
  margin-top: 10px; /* 【优化】减少顶部间距 */
  margin-bottom: 0;
  background: linear-gradient(135deg, #f5f7fa 0%, #fff 100%);
  border: 1px solid #e4e7ed;
  border-left: 3px solid #409EFF;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
  transition: all 0.3s ease;
}

.drill-breadcrumb:hover {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.08);
}

.breadcrumb-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0; /* 允许内容收缩 */
}

.drill-level-tag {
  flex-shrink: 0;
  background: linear-gradient(135deg, #409EFF, #5B8FF9);
  color: white;
  border: none;
  padding: 6px 12px;
  font-weight: 500;
  box-shadow: 0 2px 6px rgba(64, 158, 255, 0.3);
}

.drill-level-tag i {
  margin-right: 4px;
}

.drill-path {
  flex: 1;
  min-width: 0; /* 允许内容收缩 */
}

.drill-breadcrumb ::v-deep .el-breadcrumb {
  font-size: 13px;
  line-height: 1.5;
}

.drill-breadcrumb ::v-deep .el-breadcrumb__separator {
  color: #c0c4cc;
  margin: 0 6px;
  font-weight: 400;
}

.breadcrumb-link {
  display: inline-flex;
  align-items: center;
  color: #606266;
  cursor: pointer;
  font-weight: 400;
  transition: all 0.2s ease;
  padding: 4px 8px;
  border-radius: 4px;
  max-width: 150px; /* 限制最大宽度 */
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.breadcrumb-link:hover {
  color: #409EFF;
  background: rgba(64, 158, 255, 0.1);
  transform: translateY(-1px);
}

.breadcrumb-root {
  font-weight: 500;
  color: #303133;
}

.breadcrumb-root i {
  margin-right: 4px;
  font-size: 14px;
}

.breadcrumb-active {
  color: #409EFF;
  font-weight: 500;
  background: rgba(64, 158, 255, 0.08);
}

.breadcrumb-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
  margin-left: 12px;
}

.action-link {
  color: #606266;
  font-size: 13px;
  padding: 6px 12px;
  transition: all 0.2s ease;
}

.action-link:hover {
  color: #409EFF;
  background: rgba(64, 158, 255, 0.1);
}

.action-link i {
  margin-right: 4px;
}

/* 【新增】维度选择菜单样式 */
.dimension-selector-menu {
  position: fixed; /* 改为fixed定位，防止被截断 */
  z-index: 9999;   /* 提高层级 */
  background: white;
  border: 1px solid #e4e7ed;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  border-radius: 12px;
  min-width: 220px;
  max-width: 300px;
  overflow: hidden;
  animation: menuSlideIn 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

@keyframes menuSlideIn {
  from {
    opacity: 0;
    transform: translateY(-8px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.dimension-selector-menu .menu-header {
  padding: 14px 16px;
  border-bottom: 1px solid #f0f0f0;
  font-weight: 600;
  font-size: 14px;
  color: #303133;
  background: linear-gradient(135deg, #f5f7fa 0%, #ffffff 100%);
  display: flex;
  align-items: center;
  gap: 8px;
}

.dimension-selector-menu .menu-header i {
  color: #409EFF;
  font-size: 16px;
}

.dimension-selector-menu .menu-body {
  padding: 4px 0;
  max-height: 300px;
  overflow-y: auto;
}

/* 美化滚动条 */
.dimension-selector-menu .menu-body::-webkit-scrollbar {
  width: 6px;
}

.dimension-selector-menu .menu-body::-webkit-scrollbar-thumb {
  background: #dcdfe6;
  border-radius: 3px;
}

.dimension-selector-menu .menu-body::-webkit-scrollbar-thumb:hover {
  background: #c0c4cc;
}

.dimension-selector-menu .dimension-item {
  padding: 12px 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 12px;
  transition: all 0.2s ease;
  border-bottom: 1px solid transparent;
  position: relative;
}

.dimension-selector-menu .dimension-item:last-child {
  border-bottom: none;
}

.dimension-selector-menu .dimension-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: #409EFF;
  transform: scaleY(0);
  transition: transform 0.2s ease;
}

.dimension-selector-menu .dimension-item.is-hover::before,
.dimension-selector-menu .dimension-item:hover::before {
  transform: scaleY(1);
}

.dimension-selector-menu .dimension-icon {
  color: #909399;
  font-size: 16px;
  flex-shrink: 0;
  transition: all 0.2s ease;
}

.dimension-selector-menu .dimension-info {
  flex: 1;
  min-width: 0;
}

.dimension-selector-menu .dimension-name {
  font-size: 13px;
  font-weight: 500;
  color: #303133;
  margin-bottom: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dimension-selector-menu .dimension-type {
  font-size: 11px;
  color: #909399;
}

.dimension-selector-menu .dimension-arrow {
  color: #c0c4cc;
  font-size: 14px;
  flex-shrink: 0;
  transition: all 0.2s ease;
  opacity: 0;
}

.dimension-selector-menu .dimension-item.is-hover,
.dimension-selector-menu .dimension-item:hover {
  background: linear-gradient(90deg, #f0f7ff 0%, #fff 100%);
  transform: translateX(3px);
}

.dimension-selector-menu .dimension-item.is-hover .dimension-icon,
.dimension-selector-menu .dimension-item:hover .dimension-icon {
  color: #409EFF;
  transform: scale(1.1);
}

.dimension-selector-menu .dimension-item.is-hover .dimension-name,
.dimension-selector-menu .dimension-item:hover .dimension-name {
  color: #409EFF;
}

.dimension-selector-menu .dimension-item.is-hover .dimension-arrow,
.dimension-selector-menu .dimension-item:hover .dimension-arrow {
  color: #409EFF;
  opacity: 1;
  transform: translateX(4px);
}

.dimension-selector-menu .no-dimensions {
  padding: 32px 20px;
  text-align: center;
  color: #909399;
  font-size: 13px;
}

.dimension-selector-menu .no-dimensions i {
  font-size: 36px;
  display: block;
  margin-bottom: 12px;
  color: #dcdfe6;
  animation: noDataPulse 2s ease-in-out infinite;
}

@keyframes noDataPulse {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}

.dimension-selector-menu .menu-footer {
  padding: 10px 12px;
  border-top: 1px solid #f0f0f0;
  text-align: right;
  background: #fafafa;
}

.dimension-selector-menu .menu-footer .el-button {
  color: #606266;
  font-size: 12px;
}

.dimension-selector-menu .menu-footer .el-button:hover {
  color: #409EFF;
}

.dimension-selector-menu .menu-footer .el-button i {
  margin-right: 4px;
}

/* 【UI 2.0】Modern CSS Styles */
.config-container {
  background: #ffffff;
  padding: 20px 24px;
  border-bottom: 1px solid #ebeef5;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
  margin-bottom: 12px;
}

.config-row {
  display: flex;
  align-items: center;
  margin-bottom: 24px;
}

.config-row:last-child {
  margin-bottom: 0;
}

.main-row {
  justify-content: space-between;
}

.row-left {
  display: flex;
  align-items: center;
}

.axis-row {
  display: flex;
  align-items: center;
  flex-wrap: nowrap; /* 强制不换行 */
  gap: 20px;
}

.config-item {
  display: flex;
  align-items: center;
}

.config-label {
  font-size: 13px;
  color: #606266;
  margin-right: 12px;
  font-weight: 500;
  white-space: nowrap;
}

/* 垂直分隔线 */
.divider {
  width: 1px;
  height: 24px;
  background-color: #dcdfe6;
  margin: 0 8px; 
}

/* Action Button */
.render-btn {
  font-weight: 500;
  border-radius: 6px;
  padding: 9px 18px;
}

/* Modern Input Style (Low-code / SaaS style) */
.modern-input ::v-deep .el-input__inner {
  background-color: #f5f7fa; /* 浅灰背景 */
  border: 1px solid transparent; /* 无边框 */
  border-radius: 8px; /* 大圆角 */
  color: #303133;
  font-weight: 500;
  height: 36px;
  line-height: 36px;
  transition: all 0.2s cubic-bezier(0.645, 0.045, 0.355, 1);
  box-shadow: none;
}

.modern-input ::v-deep .el-input__inner:hover {
  background-color: #e4e7ed; /* 悬停略深 */
}

.modern-input ::v-deep .el-input__inner:focus {
  background-color: #fff; /* 激活变白 */
  border-color: #409EFF;
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2); /* 柔和光晕 */
}

.modern-input ::v-deep .el-select__caret {
  color: #c0c4cc; /* 箭头颜色更淡 */
  font-weight: bold;
}

.modern-input.small-input {
  width: 160px;
}

.modern-input ::v-deep .el-tag.el-tag--info {
  background-color: #e9e9eb;
  border-color: #e9e9eb;
  color: #909399;
}
/* ========================================================
   Filter UI Styles
   ======================================================== */
.filter-tags-area {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 8px 12px;
  background-color: #f0f9eb;
  border: 1px solid #e1f3d8;
  border-radius: 6px;
  margin-bottom: 12px;
}

.tags-wrapper {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  flex: 1;
}

.filter-tag {
  background-color: #fff;
  border-color: #67c23a;
  color: #67c23a;
}

.filter-tag ::v-deep .el-icon-close {
  color: #67c23a;
}

.filter-tag ::v-deep .el-icon-close:hover {
  background-color: #67c23a;
  color: #fff;
}

.filter-actions {
  display: flex;
  gap: 8px;
  margin-left: 12px;
  flex-shrink: 0;
}

.filter-dialog-body {
  padding: 10px 0;
  max-height: 400px;
  overflow-y: auto;
}

.filter-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
  padding: 8px;
  background-color: #f5f7fa;
  border-radius: 6px;
  transition: background-color 0.2s;
}

.filter-row:hover {
  background-color: #eef1f6;
}

.filter-value {
    display: flex;
    align-items: center;
}

.chart-config ::v-deep .delete-btn {
  color: #f56c6c;
  padding: 4px;
}

.chart-config ::v-deep .delete-btn:hover {
  color: #ff4949;
  background-color: rgba(245, 108, 108, 0.1);
  border-radius: 4px;
}

/* ========================================================
   Chart Footer Design (Inline Filter)
   ======================================================== */
.chart-footer-bar {
  margin-top: 10px; /* 【优化】减少与图表的间距 */
  padding: 8px 12px; /* 【优化】减少内边距 */
  background-color: #f8fafc;
  border-radius: 8px;
  border: 1px solid #edf2f7;
}

.footer-content {
  width: 100%;
}

.footer-tags-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #edf2f7;
}

.inline-filter-group {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.footer-input-field {
  width: 140px;
}

.footer-input-op {
  width: 100px;
}

.footer-input-value {
  width: 160px;
}

.add-filter-btn {
  padding: 8px 15px;
  border-radius: 6px; 
}

/* 输入框统一样式 */
.footer-input-field ::v-deep .el-input__inner,
.footer-input-op ::v-deep .el-input__inner,
.footer-input-value ::v-deep .el-input__inner {
  height: 32px;
  line-height: 32px;
  background-color: #fff;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  font-size: 13px;
  padding-left: 10px;
}

.footer-input-field ::v-deep .el-input__inner:focus,
.footer-input-op ::v-deep .el-input__inner:focus,
.footer-input-value ::v-deep .el-input__inner:focus {
  border-color: #409EFF;
}

/* 隐藏不需要的 dialog 样式 */
.filter-dialog-body {
  display: none;
}


/* Breadcrumb Styling */
.drill-breadcrumb {
  display: flex;
  align-items: center;
  font-size: 13px;
  color: #606266;
}

.breadcrumb-item {
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 4px;
}

.breadcrumb-item.home {
  color: #409EFF;
  background: rgba(64, 158, 255, 0.1);
}

.breadcrumb-item.home:hover {
  background: rgba(64, 158, 255, 0.2);
}

.breadcrumb-separator {
  margin: 0 4px;
  color: #c0c4cc;
}

.breadcrumb-item.active {
  color: #303133;
  font-weight: 500;
  cursor: default;
}

/* 【新增】全屏样式 */
.chart-renderer-wrapper:fullscreen {
  background: #fff;
  padding: 20px;
  display: flex;
  flex-direction: column;
  width: 100vw;
  height: 100vh;
  overflow: auto;
}

.chart-renderer-wrapper:-webkit-full-screen {
  background: #fff;
  padding: 20px;
  display: flex;
  flex-direction: column;
  width: 100vw;
  height: 100vh;
  overflow: auto;
}

.chart-renderer-wrapper:-moz-full-screen {
  background: #fff;
  padding: 20px;
  display: flex;
  flex-direction: column;
  width: 100vw;
  height: 100vh;
  overflow: auto;
}

.chart-renderer-wrapper:-ms-fullscreen {
  background: #fff;
  padding: 20px;
  display: flex;
  flex-direction: column;
  width: 100vw;
  height: 100vh;
  overflow: auto;
}

/* 全屏时内容区域样式调整 */
.chart-renderer-wrapper:fullscreen .chart-renderer,
.chart-renderer-wrapper:-webkit-full-screen .chart-renderer,
.chart-renderer-wrapper:-moz-full-screen .chart-renderer,
.chart-renderer-wrapper:-ms-fullscreen .chart-renderer {
  display: flex !important;
  flex-direction: column;
  flex: 1;
  overflow: visible !important; /* 重要：允许下拉菜单溢出 */
  opacity: 1 !important;
  visibility: visible !important;
  height: auto !important;
  max-height: none !important;
  /* 【优化】全屏居中限制 */
  width: 100%;
  max-width: 1600px; /* 限制最大宽度，避免太宽 */
  margin: 0 auto;    /* 居中 */
}

/* 全屏时配置面板样式优化 */
.chart-renderer-wrapper:fullscreen .chart-config,
.chart-renderer-wrapper:-webkit-full-screen .chart-config,
.chart-renderer-wrapper:-moz-full-screen .chart-config,
.chart-renderer-wrapper:-ms-fullscreen .chart-config {
  flex-shrink: 0;
  margin-bottom: 20px;
  overflow: visible !important; /* 确保下拉框不被裁切 */
  z-index: 100;
  display: flex;
  flex-direction: column;
}

/* 修复行之间的层级冲突：确保第一行高于第二行 */
.chart-renderer-wrapper:fullscreen .config-row {
  position: relative;
}
.chart-renderer-wrapper:fullscreen .config-row:nth-child(1) {
  z-index: 10;
}
.chart-renderer-wrapper:fullscreen .config-row:nth-child(2) {
  z-index: 5;
}

/* 确保 Select 组件及其 Popper 具有极高层级且不被隐藏 */
.chart-renderer-wrapper:fullscreen .el-select,
.chart-renderer-wrapper:fullscreen .el-select-dropdown {
  overflow: visible !important;
  z-index: 10000 !important;
}

/* 深度选择器：处理局部挂载时的 Popper 样式 */
.chart-renderer-wrapper ::v-deep .el-select-dropdown {
  z-index: 10000 !important;
  background-color: #fff !important;
  border: 1px solid #e4e7ed !important;
  box-shadow: 0 2px 12px 0 rgba(0,0,0,0.1) !important;
}

/* 全屏时图表容器占满剩余空间 */
.chart-renderer-wrapper:fullscreen .chart-wrapper,
.chart-renderer-wrapper:-webkit-full-screen .chart-wrapper,
.chart-renderer-wrapper:-moz-full-screen .chart-wrapper,
.chart-renderer-wrapper:-ms-fullscreen .chart-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden; /* 图表区域保持隐藏溢出，防止干扰下拉框 */
}

/* 全屏时图表内容自适应高度 */
.chart-renderer-wrapper:fullscreen .chart-content,
.chart-renderer-wrapper:-webkit-full-screen .chart-content,
.chart-renderer-wrapper:-moz-full-screen .chart-content,
.chart-renderer-wrapper:-ms-fullscreen .chart-content {
  flex: 1;
  height: auto !important;
  min-height: 400px;
}

/* 全屏时页脚样式 */
.chart-renderer-wrapper:fullscreen .chart-footer-bar,
.chart-renderer-wrapper:-webkit-full-screen .chart-footer-bar,
.chart-renderer-wrapper:-moz-full-screen .chart-footer-bar,
.chart-renderer-wrapper:-ms-fullscreen .chart-footer-bar {
  flex-shrink: 0;
  margin-top: 20px;
  overflow: visible !important; /* 允许下钻下拉框溢出 */
}

/* 全屏时禁用折叠动画 */
.chart-renderer-wrapper:fullscreen .chart-collapse-enter-active,
.chart-renderer-wrapper:fullscreen .chart-collapse-leave-active,
.chart-renderer-wrapper:-webkit-full-screen .chart-collapse-enter-active,
.chart-renderer-wrapper:-webkit-full-screen .chart-collapse-leave-active,
.chart-renderer-wrapper:-moz-full-screen .chart-collapse-enter-active,
.chart-renderer:-moz-full-screen .chart-collapse-leave-active,
.chart-renderer-wrapper:-ms-fullscreen .chart-collapse-enter-active,
.chart-renderer-wrapper:-ms-fullscreen .chart-collapse-leave-active {
  transition: none !important;
}

/* 【修复】全屏时Element UI下拉菜单的z-index */
.chart-renderer-wrapper:fullscreen,
.chart-renderer-wrapper:-webkit-full-screen,
.chart-renderer-wrapper:-moz-full-screen,
.chart-renderer-wrapper:-ms-fullscreen {
  z-index: 99999;
}

.chart-navigation {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 10px;
}
.chart-navigation .nav-text {
  margin: 0 15px;
  font-size: 14px;
  color: #606266;
}
.chart-navigation .nav-btn {
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  transition: all 0.3s ease;
}
.chart-navigation .nav-btn:hover {
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.3);
}

</style>
