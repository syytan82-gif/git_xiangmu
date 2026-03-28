import request from '@/utils/request'

/**
 * 数据源相关 API
 */
export const datasourceApi = {
    /**
     * 获取数据源列表
     */
    list() {
        return request({
            url: '/api/datasource/list',
            method: 'get'
        })
    },

    /**
     * 获取数据源的表列表
     * @param {String|Number} datasourceId - 数据源ID
     */
    tableList(datasourceId) {
        return request({
            url: `/api/datasource/tables/${datasourceId}`,
            method: 'get'
        })
    },

    /**
     * 获取表的字段列表
     * @param {String|Number} tableId - 表ID
     */
    fieldList(tableId) {
        return request({
            url: `/api/datasource/fields/${tableId}`,
            method: 'get'
        })
    },

    /**
     * 获取表的列信息（用于列权限）
     * @param {String|Number} datasourceId - 数据源ID
     * @param {String} tableName - 表名
     */
    getTableColumns(datasourceId, tableName) {
        return request({
            url: `/api/datasource/columns/${datasourceId}/${tableName}`,
            method: 'get'
        })
    }
}
