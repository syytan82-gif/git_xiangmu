// 权限过滤条件操作符配置
export const allOptions = [
    { label: 'permission.equals', value: 'eq' },              // 等于
    { label: 'permission.not_equals', value: 'not_eq' },      // 不等于
    { label: 'permission.like', value: 'like' },              // 包含
    { label: 'permission.not_like', value: 'not_like' },      // 不包含
    { label: 'permission.greater', value: 'gt' },             // 大于
    { label: 'permission.greater_eq', value: 'gte' },         // 大于等于
    { label: 'permission.less', value: 'lt' },                // 小于
    { label: 'permission.less_eq', value: 'lte' },            // 小于等于
    { label: 'permission.is_null', value: 'null' },           // 为空
    { label: 'permission.not_null', value: 'not_null' },      // 不为空
    { label: 'permission.is_empty', value: 'empty' },         // 空字符串
    { label: 'permission.not_empty', value: 'not_empty' },    // 非空字符串
]

// 操作符显示文本（中文）
export const operatorLabels = {
    eq: '等于',
    not_eq: '不等于',
    like: '包含',
    not_like: '不包含',
    gt: '大于',
    gte: '大于等于',
    lt: '小于',
    lte: '小于等于',
    null: '为空',
    not_null: '不为空',
    empty: '空字符串',
    not_empty: '非空字符串'
}
