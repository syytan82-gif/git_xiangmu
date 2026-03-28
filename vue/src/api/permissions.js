import request from '@/utils/request'

/**
 * 获取权限规则组列表
 * @param {Number} adminId - 管理员ID
 */
export function getList(adminId) {
    return request({
        url: `/permission/group/list/${adminId}`,
        method: 'get'
    })
}

/**
 * 新增权限规则组
 * @param {Object} data - 权限规则组数据
 * @param {String} data.name - 规则组名称
 * @param {String} data.description - 规则组描述
 * @param {Number} data.adminId - 管理员ID
 * @param {Array<Number>} data.userIds - 绑定的用户ID列表
 * @param {Array<Object>} data.rules - 规则列表
 */
export function addPermissionGroup(data) {
    return request({
        url: '/permission/group/add',
        method: 'post',
        data
    })
}

/**
 * 更新权限规则组
 * @param {Object} data - 权限规则组数据
 * @param {Number} data.id - 规则组ID
 * @param {String} data.name - 规则组名称
 * @param {String} data.description - 规则组描述
 * @param {Number} data.adminId - 管理员ID
 * @param {Array<Number>} data.userIds - 绑定的用户ID列表
 * @param {Array<Object>} data.rules - 规则列表
 */
export function updatePermissionGroup(data) {
    return request({
        url: '/permission/group/update',
        method: 'put',
        data
    })
}

/**
 * 保存权限规则组（自动判断新增或更新）
 * @param {Object} data - 权限规则组数据
 */
export function savePermissions(data) {
    if (data.id) {
        return updatePermissionGroup(data)
    } else {
        return addPermissionGroup(data)
    }
}

/**
 * 删除权限规则组
 * @param {Number} id - 规则组ID
 */
export function delPermissions(id) {
    return request({
        url: `/permission/group/delete/${id}`,
        method: 'delete'
    })
}

/**
 * 获取规则组下的详细规则
 * @param {Number} groupId - 规则组ID
 */
export function getRuleList(groupId) {
    return request({
        url: `/permission/rule/list/${groupId}`,
        method: 'get'
    })
}

/**
 * 获取规则组已绑定用户
 * @param {Number} groupId - 规则组ID
 */
export function getUserList(groupId) {
    return request({
        url: `/permission/user/list/${groupId}`,
        method: 'get'
    })
}

/**
 * 获取数据源列表
 */
export function getDbConfigList() {
    return request({
        url: '/dbConfig/list',
        method: 'get'
    })
}

/**
 * 获取数据库表列表 (根据部门)
 * @param {Number} dbConfigId - 数据源ID
 * @param {String} departmentName - 部门名称
 */
export function getTables(dbConfigId, departmentName) {
    return request({
        url: `/permission/tables/${dbConfigId}`,
        method: 'get',
        params: {
            departmentName
        }
    })
}

/**
 * 获取数据库表字段列表
 * @param {Number} dbConfigId - 数据源ID
 * @param {String} tableName - 表名
 */
export function getColumns(dbConfigId, tableName) {
    return request({
        url: `/permission/columns/${dbConfigId}/${tableName}`,
        method: 'get'
    })
}

/**
 * 获取候选用户列表
 */
export function getCandidateUsers() {
    return request({
        url: '/user/selectAll',
        method: 'get'
    })
}

/**
 * 获取部门列表
 * @param {Number} dbConfigId
 */
export function getDepartmentList(dbConfigId) {
    return request({
        url: `/permission/departments/${dbConfigId}`,
        method: 'get'
    })
}

// getTablesByDept is replaced/merged into getTables or can be alias
/**
 * 根据数据源和部门获取数据表 (Alias for getTables)
 * @param {Number} dbConfigId
 * @param {String} departmentName
 */
export function getTablesByDept(dbConfigId, departmentName) {
    return getTables(dbConfigId, departmentName)
}

/**
 * 获取用户权限配置详情
 */
export function getUserListWithPermissions(params) {
    return request({
        url: '/permission/user-access',
        method: 'get',
        params
    })
}
/**
 * 启用权限规则组（含冲突检测）
 * @param {Number} groupId - 规则组ID
 */
export function enablePermissionGroup(groupId) {
    return request({
        url: `/permission/group/enable/${groupId}`,
        method: 'put'
    })
}

/**
 * 禁用权限规则组
 * @param {Number} groupId - 规则组ID
 */
export function disablePermissionGroup(groupId) {
    return request({
        url: `/permission/group/disable/${groupId}`,
        method: 'put'
    })
}
