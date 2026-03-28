import request from '@/utils/request'

/**
 * 获取用户列表
 * @param {Object} params - 查询参数
 * @param {Number} page - 页码
 * @param {Number} size - 每页数量
 */
export function getUserList(params = {}, page = 1, size = 1000) {
    return request({
        url: '/api/user/list',
        method: 'get',
        params: {
            ...params,
            page,
            size
        }
    })
}

/**
 * 工作空间用户列表（如果使用工作空间概念）
 * @param {Object} params - 查询参数
 * @param {Number} page - 页码
 * @param {Number} size - 每页数量
 */
export function workspaceUserList(params = {}, page = 1, size = 1000) {
    return request({
        url: '/api/workspace/users',
        method: 'get',
        params: {
            ...params,
            page,
            size
        }
    })
}
