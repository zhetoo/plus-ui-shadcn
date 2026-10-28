import {
  addClient,
  changeStatus as changeClientStatus,
  delClient,
  getClient,
  listClient,
  updateClient,
} from "@/api/system/client"
import {
  addConfig,
  delConfig,
  getConfig,
  getConfigKey,
  listConfig,
  refreshCache as refreshConfigCache,
  updateConfig,
} from "@/api/system/config"
import {
  addDept,
  delDept,
  getDept,
  listDept,
  listDeptExcludeChild,
  updateDept,
} from "@/api/system/dept"
import type { DeptQuery, DeptVO } from "@/api/system/dept/types"
import {
  addType,
  delType,
  getType,
  listType,
  updateType,
} from "@/api/system/dict/type"
import { getDicts } from "@/api/system/dict/data"
import {
  addMenu,
  cascadeDelMenu,
  delMenu,
  getMenu,
  listMenu,
  roleMenuTreeselect,
  tenantPackageMenuTreeselect,
  treeselect,
  updateMenu,
} from "@/api/system/menu"
import type { MenuQuery, MenuVO } from "@/api/system/menu/types"
import {
  addNotice,
  delNotice,
  getNotice,
  listNotice,
  updateNotice,
} from "@/api/system/notice"
import { delOss, listOss } from "@/api/system/oss"
import {
  addOssConfig,
  changeOssConfigStatus,
  delOssConfig,
  getOssConfig,
  listOssConfig,
  updateOssConfig,
} from "@/api/system/ossConfig"
import {
  addPost,
  delPost,
  deptTreeSelect as postDeptTreeSelect,
  getPost,
  listPost,
  optionselect as postOptionSelect,
  updatePost,
} from "@/api/system/post"
import {
  addRole,
  changeRoleStatus,
  dataScope,
  delRole,
  deptTreeSelect as roleDeptTreeSelect,
  getRole,
  listRole,
  optionSelect as roleOptionSelect,
  updateRole,
} from "@/api/system/role"
import {
  addTenant,
  changeTenantStatus,
  delTenant,
  getTenant,
  listTenant,
  syncTenantConfig,
  syncTenantDict,
  syncTenantPackage,
  updateTenant,
} from "@/api/system/tenant"
import {
  addTenantPackage,
  changePackageStatus,
  delTenantPackage,
  getTenantPackage,
  listTenantPackage,
  selectTenantPackage,
  updateTenantPackage,
} from "@/api/system/tenantPackage"
import {
  addUser,
  changeUserStatus,
  delUser,
  deptTreeSelect as userDeptTreeSelect,
  getUser,
  listUser,
  listUserByDeptId,
  resetUserPwd,
  updateUser,
} from "@/api/system/user"
import {
  addLeave,
  delLeave,
  getLeave,
  listLeave,
  updateLeave,
} from "@/api/workflow/leave"
import {
  addDemo,
  delDemo,
  getDemo,
  listDemo,
  updateDemo,
} from "@/api/demo/demo"
import {
  addTree,
  delTree,
  getTree,
  listTree,
  updateTree,
} from "@/api/demo/tree"
import { delTable, listTable } from "@/api/tool/gen"
import {
  cleanLoginInfo,
  delLoginInfo,
  list as listLoginInfo,
  unlockLoginInfo,
} from "@/api/monitor/loginInfo"
import { forceLogout, list as listOnline } from "@/api/monitor/online"
import type { OnlineQuery, OnlineVO } from "@/api/monitor/online/types"
import {
  cleanOperlog,
  delOperlog,
  list as listOperlog,
} from "@/api/monitor/operlog"
import {
  addCategory,
  categoryTree,
  delCategory,
  getCategory,
  listCategory,
  updateCategory,
} from "@/api/workflow/category"
import {
  active,
  add as addDefinition,
  copy as copyDefinition,
  deleteDefinition,
  edit as updateDefinition,
  getInfo as getDefinition,
  importDef,
  listDefinition,
  publish,
  unPublish,
} from "@/api/workflow/definition"
import {
  cancelProcessApply,
  deleteByInstanceIds,
  invalid,
  pageByCurrent,
  pageByRunning,
} from "@/api/workflow/instance"
import {
  addSpel,
  delSpel,
  getSpel,
  listSpel,
  updateSpel,
} from "@/api/workflow/spel"
import {
  pageByAllTaskWait,
  pageByTaskCopy,
  pageByTaskFinish,
  pageByTaskWait,
} from "@/api/workflow/task"
import {
  api,
  type CrudConfig,
  type CrudOption,
  STATUS_OPTIONS,
} from "@/lib/crud"
import request, { download, downloadGet } from "@/utils/request"

const statusField = {
  key: "status",
  label: "状态",
  type: "select" as const,
  options: STATUS_OPTIONS,
}
const remarkField = { key: "remark", label: "备注", type: "textarea" as const }
/**
 * 生成按 params[beginTime] / params[endTime] 查询的日期范围字段
 * @param label 字段标签
 */
const dateRangeFields = (label = "创建时间") => [
  {
    key: "params.beginTime",
    endKey: "params.endTime",
    label,
    type: "daterange" as const,
  },
]
const createTimeRangeFields = [
  {
    key: "params.beginCreateTime",
    endKey: "params.endCreateTime",
    label: "上传时间",
    type: "daterange" as const,
  },
]

interface TreeResponse<T> {
  data?: T[]
  rows?: T[]
  total?: number
}

function flattenTree<T extends { children?: T[] }>(rows: T[]): T[] {
  return rows.flatMap((row) => [row, ...flattenTree(row.children ?? [])])
}

interface TreeOptionNode {
  id: string | number
  label?: string
  deptName?: string
  menuName?: string
  categoryName?: string
  children?: TreeOptionNode[]
}

function toTreeOptions(rows: TreeOptionNode[], depth = 0): CrudOption[] {
  return rows.flatMap((item) => [
    {
      label: `${"　".repeat(depth)}${
        item.label ||
        item.deptName ||
        item.menuName ||
        item.categoryName ||
        String(item.id)
      }`,
      value: String(item.id),
    },
    ...toTreeOptions(item.children ?? [], depth + 1),
  ])
}

async function dictOptions(dictType: string) {
  const response = await getDicts(dictType)
  return response.data.map((item) => ({
    label: item.dictLabel,
    value: item.dictValue,
  }))
}

function withSpelPreview(form: Record<string, unknown>) {
  const component = String(form.componentName ?? "").trim()
  const method = String(form.methodName ?? "").trim()
  const params = String(form.methodParams ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
  let viewSpel = ""
  if (!component && !method && params.length === 1)
    viewSpel = `\${${params[0]}}`
  else if (component && method)
    viewSpel = `#{@${component}.${method}(${params.map((item) => `#${item}`).join(",")})}`
  else if (component || method || params.length)
    viewSpel = "请填写组件名称和方法名"
  return { ...form, viewSpel }
}

const listDeptFlat = api(async (...args: unknown[]) => {
  const response = await listDept(args[0] as DeptQuery)
  const body = response as unknown as TreeResponse<DeptVO>
  const rows = flattenTree(body.rows ?? body.data ?? [])
  return { ...body, rows, total: rows.length }
})

const listMenuFlat = api(async (...args: unknown[]) => {
  const response = await listMenu(args[0] as MenuQuery)
  const body = response as unknown as TreeResponse<MenuVO>
  const rows = flattenTree(body.rows ?? body.data ?? [])
  return { ...body, rows, total: rows.length }
})

const listOnlinePaged = api(async (...args: unknown[]) => {
  const query = args[0] as OnlineQuery
  const response = await listOnline(query)
  const body = response as unknown as TreeResponse<OnlineVO>
  const rows = body.rows ?? body.data ?? []
  const start = (query.pageNum - 1) * query.pageSize
  return {
    ...body,
    rows: rows.slice(start, start + query.pageSize),
    total: rows.length,
  }
})

const getUserDetail = api(async (...args: unknown[]) => {
  const response = await getUser(args[0] as string | number)
  return {
    ...response,
    data: {
      ...response.data.user,
      roleIds: response.data.roleIds,
      postIds: response.data.postIds,
    },
  }
})

const getRoleDetail = api(async (...args: unknown[]) => {
  const roleId = args[0] as string | number
  const [response, menuResponse] = await Promise.all([
    getRole(roleId),
    roleMenuTreeselect(roleId),
  ])
  return {
    ...response,
    data: { ...response.data, menuIds: menuResponse.data.checkedKeys },
  }
})

const getTenantPackageDetail = api(async (...args: unknown[]) => {
  const packageId = args[0] as string | number
  const [response, menuResponse] = await Promise.all([
    getTenantPackage(packageId),
    tenantPackageMenuTreeselect(packageId),
  ])
  return {
    ...response,
    data: { ...response.data, menuIds: menuResponse.data.checkedKeys },
  }
})

const getDefinitionDetail = api(async (...args: unknown[]) => {
  const response = await getDefinition(args[0] as string | number)
  const ext = response.data.ext
    ? (JSON.parse(response.data.ext) as { autoPass?: boolean })
    : {}
  return {
    ...response,
    data: { ...response.data, autoPass: Boolean(ext.autoPass) },
  }
})

function workflowHref(row: Record<string, unknown>, type: string) {
  const tasks = row.flowTaskList as Record<string, unknown>[] | undefined
  const task = tasks?.[0] ?? row
  const path = String(task.formPath || "/workflow/leaveEdit/index")
  const params = new URLSearchParams({
    id: String(row.businessId ?? task.businessId ?? row.id ?? ""),
    type,
  })
  if (task.id) params.set("taskId", String(task.id))
  return `${path}?${params}`
}

export const CRUD_CONFIGS: Record<string, CrudConfig> = {
  "/system/user": {
    path: "/system/user",
    title: "用户管理",
    description: "维护用户账号、部门、角色和岗位",
    idKey: "userId",
    permissionPrefix: "system:user",
    list: api(listUser),
    detail: getUserDetail,
    create: api(addUser),
    update: api(updateUser),
    remove: api(delUser),
    exportUrl: "/system/user/export",
    uploadUrl: "/system/user/importData",
    uploadPermission: "system:user:import",
    uploadAction: async (data) =>
      request.post(
        `/system/user/importData?updateSupport=${window.confirm("是否更新已经存在的用户数据？")}`,
        data
      ),
    toolbarActions: [
      {
        label: "下载导入模板",
        permission: "system:user:import",
        run: async () =>
          download(
            "/system/user/importTemplate",
            {},
            `user_template_${Date.now()}.xlsx`
          ),
      },
    ],
    statusChange: async (row, status) =>
      changeUserStatus(row.userId as string | number, status),
    rowActions: [
      {
        label: "重置密码",
        permission: "system:user:resetPwd",
        visible: (row) => Number(row.userId) !== 1,
        run: async (row) => {
          const password = window.prompt(
            `请输入 ${String(row.userName ?? "该用户")} 的新密码`
          )
          if (password)
            await resetUserPwd(row.userId as string | number, password)
        },
      },
      {
        label: "分配角色",
        permission: "system:user:edit",
        visible: (row) => Number(row.userId) !== 1,
        href: (row) => `/system/user-auth/role/${String(row.userId)}`,
      },
    ],
    queryFields: [
      { key: "userName", label: "用户名称" },
      { key: "nickName", label: "用户昵称" },
      { key: "phonenumber", label: "手机号码" },
      statusField,
      ...dateRangeFields(),
    ],
    columns: [
      { key: "userId", label: "编号" },
      { key: "userName", label: "用户名称" },
      { key: "nickName", label: "用户昵称" },
      { key: "deptName", label: "部门" },
      { key: "phonenumber", label: "手机号码" },
      { key: "status", label: "状态", format: "status" },
      { key: "loginDate", label: "最后登录", format: "datetime" },
    ],
    formFields: [
      {
        key: "deptId",
        label: "部门",
        type: "select",
        required: true,
        reloadOptionsOnChange: true,
        resetFieldsOnChange: { postIds: [] },
        loadOptions: async () => {
          const response = await userDeptTreeSelect()
          return toTreeOptions(response.data as unknown as TreeOptionNode[])
        },
      },
      {
        key: "userName",
        label: "用户名称",
        required: true,
        visible: (form) => !form.userId,
      },
      { key: "nickName", label: "用户昵称", required: true },
      {
        key: "password",
        label: "密码",
        type: "password",
        required: true,
        visible: (form) => !form.userId,
      },
      { key: "phonenumber", label: "手机号码" },
      { key: "email", label: "邮箱" },
      {
        key: "sex",
        label: "性别",
        type: "select",
        options: [
          { label: "男", value: "0" },
          { label: "女", value: "1" },
          { label: "未知", value: "2" },
        ],
      },
      {
        key: "roleIds",
        label: "角色",
        type: "array",
        loadOptions: async (form) => {
          const response = await roleOptionSelect(
            Array.isArray(form.roleIds) ? (form.roleIds as string[]) : []
          )
          return response.data.map((item) => ({
            label: item.roleName,
            value: String(item.roleId),
          }))
        },
      },
      {
        key: "postIds",
        label: "岗位",
        type: "array",
        loadOptions: async (form) => {
          const response = await postOptionSelect(
            form.deptId as string | number | undefined,
            Array.isArray(form.postIds) ? (form.postIds as string[]) : []
          )
          return response.data.map((item) => ({
            label: item.postName,
            value: String(item.postId),
          }))
        },
      },
      statusField,
      remarkField,
    ],
    defaultForm: { status: "0", sex: "2", roleIds: [], postIds: [] },
    loadDefaultForm: async () => {
      const response = await getConfigKey("sys.user.initPassword")
      return { password: response.data }
    },
    canEditRow: (row) => Number(row.userId) !== 1,
    canRemoveRow: (row) => Number(row.userId) !== 1,
  },
  "/system/role": {
    path: "/system/role",
    title: "角色管理",
    description: "维护角色标识、菜单和数据权限",
    idKey: "roleId",
    permissionPrefix: "system:role",
    list: api(listRole),
    detail: getRoleDetail,
    create: api(addRole),
    update: api(updateRole),
    remove: api(delRole),
    exportUrl: "/system/role/export",
    statusChange: async (row, status) =>
      changeRoleStatus(row.roleId as string | number, status),
    rowActions: [
      {
        label: "分配用户",
        permission: "system:role:edit",
        visible: (row) => Number(row.roleId) !== 1,
        href: (row) => `/system/role-auth/user/${String(row.roleId)}`,
      },
      {
        label: "数据权限",
        permission: "system:role:edit",
        visible: (row) => Number(row.roleId) !== 1,
        run: async (row) => {
          const [roleResponse, treeResponse] = await Promise.all([
            getRole(row.roleId as string | number),
            roleDeptTreeSelect(row.roleId as string | number),
          ])
          const scope = window.prompt(
            "数据范围：1全部、2自定义、3本部门、4本部门及以下、5仅本人、6部门及以下或本人",
            String(roleResponse.data.dataScope ?? "1")
          )
          if (!scope) return
          const deptIds =
            scope === "2"
              ? (
                  window.prompt(
                    "请输入部门 ID，多个用逗号分隔",
                    treeResponse.data.checkedKeys.join(",")
                  ) ?? ""
                )
                  .split(",")
                  .map((item) => item.trim())
                  .filter(Boolean)
              : []
          await dataScope({ ...roleResponse.data, dataScope: scope, deptIds })
        },
      },
    ],
    queryFields: [
      { key: "roleName", label: "角色名称" },
      { key: "roleKey", label: "权限字符" },
      statusField,
      ...dateRangeFields(),
    ],
    columns: [
      { key: "roleId", label: "编号" },
      { key: "roleName", label: "角色名称" },
      { key: "roleKey", label: "权限字符" },
      { key: "roleSort", label: "排序" },
      { key: "dataScope", label: "数据范围" },
      { key: "status", label: "状态", format: "status" },
      { key: "createTime", label: "创建时间", format: "datetime" },
    ],
    formFields: [
      { key: "roleName", label: "角色名称", required: true },
      { key: "roleKey", label: "权限字符", required: true },
      { key: "roleSort", label: "显示顺序", type: "number", required: true },
      {
        key: "menuIds",
        label: "菜单权限",
        type: "array",
        loadOptions: async () => {
          const response = await treeselect()
          return toTreeOptions(response.data as unknown as TreeOptionNode[])
        },
      },
      {
        key: "dataScope",
        label: "数据范围",
        type: "select",
        options: [
          { label: "全部数据", value: "1" },
          { label: "自定数据", value: "2" },
          { label: "本部门数据", value: "3" },
          { label: "本部门及以下", value: "4" },
          { label: "仅本人数据", value: "5" },
          { label: "部门及以下或本人", value: "6" },
        ],
      },
      {
        key: "deptIds",
        label: "部门权限",
        type: "array",
        loadOptions: async () => {
          const response = await userDeptTreeSelect()
          return toTreeOptions(response.data as unknown as TreeOptionNode[])
        },
      },
      { key: "menuCheckStrictly", label: "菜单父子联动", type: "boolean" },
      { key: "deptCheckStrictly", label: "部门父子联动", type: "boolean" },
      statusField,
      remarkField,
    ],
    defaultForm: {
      roleSort: 0,
      dataScope: "1",
      menuIds: [],
      deptIds: [],
      menuCheckStrictly: true,
      deptCheckStrictly: true,
      status: "0",
    },
    canEditRow: (row) => Number(row.roleId) !== 1,
    canRemoveRow: (row) => Number(row.roleId) !== 1,
  },
  "/system/dept": {
    path: "/system/dept",
    title: "部门管理",
    description: "维护组织机构树",
    idKey: "deptId",
    permissionPrefix: "system:dept",
    list: listDeptFlat,
    detail: api(getDept),
    create: api(addDept),
    update: api(updateDept),
    remove: api(delDept),
    bulkRemove: false,
    queryFields: [
      { key: "deptName", label: "部门名称" },
      {
        key: "deptCategory",
        label: "部门类别",
        type: "select",
        loadOptions: async () => dictOptions("sys_dept_category"),
      },
      statusField,
    ],
    columns: [
      { key: "deptId", label: "编号" },
      { key: "deptName", label: "部门名称" },
      { key: "parentName", label: "上级部门" },
      { key: "deptCategory", label: "类别" },
      { key: "orderNum", label: "排序" },
      { key: "leader", label: "负责人" },
      { key: "phone", label: "联系电话" },
      { key: "status", label: "状态", format: "status" },
    ],
    formFields: [
      {
        key: "parentId",
        label: "上级部门",
        type: "select",
        required: true,
        loadOptions: async (form) => {
          const response = form.deptId
            ? await listDeptExcludeChild(form.deptId as string | number)
            : await listDept()
          const rows = (response.data ??
            response.rows ??
            []) as unknown as DeptVO[]
          return [
            { label: "顶级部门", value: "0" },
            ...rows.map((item) => ({
              label: item.deptName,
              value: String(item.deptId),
            })),
          ]
        },
      },
      { key: "deptName", label: "部门名称", required: true },
      {
        key: "deptCategory",
        label: "部门类别",
        type: "select",
        loadOptions: async () => dictOptions("sys_dept_category"),
      },
      { key: "orderNum", label: "显示顺序", type: "number", required: true },
      {
        key: "leader",
        label: "负责人",
        type: "select",
        loadOptions: async (form) => {
          const deptId = (form.deptId || form.parentId || 0) as string | number
          const response = await listUserByDeptId(deptId)
          return response.data.map((item) => ({
            label: `${item.nickName}（${item.userName}）`,
            value: String(item.userId),
          }))
        },
      },
      { key: "phone", label: "联系电话" },
      { key: "email", label: "邮箱" },
      statusField,
    ],
    defaultForm: { parentId: 0, orderNum: 0, status: "0" },
  },
  "/system/menu": {
    path: "/system/menu",
    title: "菜单管理",
    description: "维护动态路由和按钮权限标识",
    idKey: "menuId",
    permissionPrefix: "system:menu",
    list: listMenuFlat,
    detail: api(getMenu),
    create: api(addMenu),
    update: api(updateMenu),
    remove: api(delMenu),
    bulkRemove: false,
    toolbarActions: [
      {
        label: "级联删除",
        permission: "system:menu:remove",
        run: async () => {
          const ids = window.prompt(
            "请输入需要级联删除的菜单 ID，多个用逗号分隔"
          )
          if (!ids) return
          await cascadeDelMenu(
            ids
              .split(",")
              .map((item) => item.trim())
              .filter(Boolean)
          )
        },
      },
    ],
    queryFields: [{ key: "menuName", label: "菜单名称" }, statusField],
    columns: [
      { key: "menuId", label: "编号" },
      { key: "menuName", label: "菜单名称" },
      { key: "parentName", label: "上级菜单" },
      { key: "menuType", label: "类型" },
      { key: "path", label: "路由地址" },
      { key: "component", label: "组件路径" },
      { key: "perms", label: "权限标识" },
      { key: "status", label: "状态", format: "status" },
    ],
    formFields: [
      {
        key: "parentId",
        label: "上级菜单",
        type: "select",
        required: true,
        loadOptions: async () => {
          const response = await treeselect()
          return [
            { label: "主类目", value: "0" },
            ...toTreeOptions(response.data as unknown as TreeOptionNode[]),
          ]
        },
      },
      {
        key: "menuType",
        label: "菜单类型",
        type: "select",
        required: true,
        options: [
          { label: "目录", value: "M" },
          { label: "菜单", value: "C" },
          { label: "按钮", value: "F" },
        ],
      },
      { key: "menuName", label: "菜单名称", required: true },
      { key: "orderNum", label: "显示顺序", type: "number", required: true },
      {
        key: "path",
        label: "路由地址",
        required: (form) => form.menuType === "M" || form.menuType === "C",
      },
      { key: "component", label: "组件路径" },
      { key: "queryParam", label: "路由参数" },
      { key: "perms", label: "权限标识" },
      { key: "icon", label: "图标" },
      {
        key: "isFrame",
        label: "外链",
        type: "select",
        options: [
          { label: "否", value: "1" },
          { label: "是", value: "0" },
        ],
      },
      {
        key: "isCache",
        label: "缓存",
        type: "select",
        options: [
          { label: "缓存", value: "0" },
          { label: "不缓存", value: "1" },
        ],
      },
      {
        key: "visible",
        label: "显示状态",
        type: "select",
        options: [
          { label: "显示", value: "0" },
          { label: "隐藏", value: "1" },
        ],
      },
      statusField,
      remarkField,
    ],
    defaultForm: {
      parentId: 0,
      menuType: "M",
      orderNum: 0,
      isFrame: "1",
      isCache: "0",
      visible: "0",
      status: "0",
      path: "",
    },
  },
  "/system/post": {
    path: "/system/post",
    title: "岗位管理",
    description: "维护组织岗位及启停状态",
    idKey: "postId",
    permissionPrefix: "system:post",
    list: api(listPost),
    detail: api(getPost),
    create: api(addPost),
    update: api(updatePost),
    remove: api(delPost),
    exportUrl: "/system/post/export",
    queryFields: [
      { key: "postCode", label: "岗位编码" },
      { key: "postName", label: "岗位名称" },
      {
        key: "postCategory",
        label: "岗位类别",
        type: "select",
        loadOptions: async () => dictOptions("sys_post_category"),
      },
      {
        key: "deptId",
        label: "部门",
        type: "select",
        loadOptions: async () => {
          const response = await postDeptTreeSelect()
          return toTreeOptions(response.data as unknown as TreeOptionNode[])
        },
      },
      statusField,
    ],
    columns: [
      { key: "postId", label: "编号" },
      { key: "postCode", label: "岗位编码" },
      { key: "postName", label: "岗位名称" },
      { key: "postCategory", label: "岗位类别" },
      { key: "deptName", label: "所属部门" },
      { key: "postSort", label: "排序" },
      { key: "status", label: "状态", format: "status" },
      { key: "createTime", label: "创建时间", format: "datetime" },
    ],
    formFields: [
      {
        key: "deptId",
        label: "所属部门",
        type: "select",
        required: true,
        loadOptions: async () => {
          const response = await postDeptTreeSelect()
          return toTreeOptions(response.data as unknown as TreeOptionNode[])
        },
      },
      { key: "postCode", label: "岗位编码", required: true },
      { key: "postName", label: "岗位名称", required: true },
      {
        key: "postCategory",
        label: "岗位类别",
        type: "select",
        required: true,
        loadOptions: async () => dictOptions("sys_post_category"),
      },
      { key: "postSort", label: "显示顺序", type: "number", required: true },
      statusField,
      remarkField,
    ],
    defaultForm: { postSort: 0, status: "0" },
  },
  "/system/config": {
    path: "/system/config",
    title: "参数设置",
    description: "维护系统运行参数",
    idKey: "configId",
    permissionPrefix: "system:config",
    list: api(listConfig),
    detail: api(getConfig),
    create: api(addConfig),
    update: api(updateConfig),
    remove: api(delConfig),
    exportUrl: "/system/config/export",
    toolbarActions: [
      {
        label: "刷新缓存",
        permission: "system:config:remove",
        confirm: "确认刷新全部参数缓存吗？",
        run: refreshConfigCache,
      },
    ],
    queryFields: [
      { key: "configName", label: "参数名称" },
      { key: "configKey", label: "参数键名" },
      {
        key: "configType",
        label: "系统内置",
        type: "select",
        options: [
          { label: "是", value: "Y" },
          { label: "否", value: "N" },
        ],
      },
      ...dateRangeFields(),
    ],
    columns: [
      { key: "configId", label: "编号" },
      { key: "configName", label: "参数名称" },
      { key: "configKey", label: "参数键名" },
      { key: "configValue", label: "参数键值" },
      { key: "configType", label: "系统内置" },
      { key: "createTime", label: "创建时间", format: "datetime" },
    ],
    formFields: [
      { key: "configName", label: "参数名称", required: true },
      { key: "configKey", label: "参数键名", required: true },
      { key: "configValue", label: "参数键值", required: true },
      {
        key: "configType",
        label: "系统内置",
        type: "select",
        options: [
          { label: "是", value: "Y" },
          { label: "否", value: "N" },
        ],
      },
      remarkField,
    ],
    defaultForm: { configType: "N" },
  },
  "/system/notice": {
    path: "/system/notice",
    title: "通知公告",
    description: "发布和维护系统通知",
    idKey: "noticeId",
    permissionPrefix: "system:notice",
    list: api(listNotice),
    detail: api(getNotice),
    create: api(addNotice),
    update: api(updateNotice),
    remove: api(delNotice),
    queryFields: [
      { key: "noticeTitle", label: "公告标题" },
      { key: "createByName", label: "操作人员" },
      {
        key: "noticeType",
        label: "公告类型",
        type: "select",
        options: [
          { label: "通知", value: "1" },
          { label: "公告", value: "2" },
        ],
      },
    ],
    columns: [
      { key: "noticeId", label: "编号" },
      { key: "noticeTitle", label: "公告标题" },
      { key: "noticeType", label: "类型" },
      { key: "status", label: "状态", format: "status" },
      { key: "createByName", label: "创建者" },
      { key: "createTime", label: "创建时间", format: "datetime" },
    ],
    formFields: [
      { key: "noticeTitle", label: "公告标题", required: true },
      {
        key: "noticeType",
        label: "公告类型",
        type: "select",
        required: true,
        options: [
          { label: "通知", value: "1" },
          { label: "公告", value: "2" },
        ],
      },
      statusField,
      {
        key: "noticeContent",
        label: "公告内容",
        type: "richtext",
        required: true,
      },
      remarkField,
    ],
    defaultForm: { noticeType: "1", status: "0" },
  },
  "/system/client": {
    path: "/system/client",
    title: "客户端管理",
    description: "维护 OAuth 客户端和令牌策略",
    idKey: "id",
    permissionPrefix: "system:client",
    list: api(listClient),
    detail: api(getClient),
    create: api(addClient),
    update: api(updateClient),
    remove: api(delClient),
    exportUrl: "/system/client/export",
    statusChange: async (row, status) =>
      changeClientStatus(String(row.clientId), status),
    queryFields: [
      { key: "clientId", label: "客户端 ID" },
      { key: "clientKey", label: "客户端 Key" },
      { key: "clientSecret", label: "客户端秘钥" },
      statusField,
    ],
    columns: [
      { key: "id", label: "编号" },
      { key: "clientId", label: "客户端 ID" },
      { key: "clientKey", label: "客户端 Key" },
      { key: "grantTypeList", label: "授权类型", format: "array" },
      { key: "deviceType", label: "设备类型" },
      { key: "activeTimeout", label: "活跃超时" },
      { key: "timeout", label: "固定超时" },
      { key: "status", label: "状态", format: "status" },
    ],
    formFields: [
      { key: "clientId", label: "客户端 ID", required: true },
      { key: "clientKey", label: "客户端 Key", required: true },
      {
        key: "clientSecret",
        label: "客户端秘钥",
        type: "password",
        required: true,
      },
      {
        key: "grantTypeList",
        label: "授权类型",
        type: "array",
        required: true,
        loadOptions: async () => dictOptions("sys_grant_type"),
      },
      {
        key: "deviceType",
        label: "设备类型",
        type: "select",
        required: true,
        loadOptions: async () => dictOptions("sys_device_type"),
      },
      { key: "activeTimeout", label: "活跃超时（秒）", type: "number" },
      { key: "timeout", label: "固定超时（秒）", type: "number" },
      statusField,
    ],
    defaultForm: { status: "0", activeTimeout: 1800, timeout: 604800 },
  },
  "/system/tenantPackage": {
    path: "/system/tenantPackage",
    title: "租户套餐管理",
    description: "维护租户可使用的菜单套餐",
    idKey: "packageId",
    permissionPrefix: "system:tenantPackage",
    list: api(listTenantPackage),
    detail: getTenantPackageDetail,
    create: api(addTenantPackage),
    update: api(updateTenantPackage),
    remove: api(delTenantPackage),
    exportUrl: "/system/tenant/package/export",
    statusChange: async (row, status) =>
      changePackageStatus(row.packageId as string | number, status),
    queryFields: [{ key: "packageName", label: "套餐名称" }],
    columns: [
      { key: "packageId", label: "套餐编号" },
      { key: "packageName", label: "套餐名称" },
      { key: "status", label: "状态", format: "status" },
      { key: "remark", label: "备注" },
      { key: "createTime", label: "创建时间", format: "datetime" },
    ],
    formFields: [
      { key: "packageName", label: "套餐名称", required: true },
      {
        key: "menuIds",
        label: "菜单权限",
        type: "tree",
        linkedKey: "menuCheckStrictly",
        loadTreeOptions: async (form) => {
          const response = await tenantPackageMenuTreeselect(
            (form.packageId as string | number | undefined) ?? 0
          )
          return response.data.menus
        },
      },
      statusField,
      remarkField,
    ],
    defaultForm: { menuCheckStrictly: true, status: "0", menuIds: [] },
  },
  "/system/tenant": {
    path: "/system/tenant",
    title: "租户管理",
    description: "维护多租户企业、套餐和账号额度",
    idKey: "id",
    permissionPrefix: "system:tenant",
    list: api(listTenant),
    detail: api(getTenant),
    create: api(addTenant),
    update: api(updateTenant),
    remove: api(delTenant),
    exportUrl: "/system/tenant/export",
    statusChange: async (row, status) =>
      changeTenantStatus(
        row.id as string | number,
        row.tenantId as string | number,
        status
      ),
    toolbarActions: [
      {
        label: "同步全部字典",
        permission: "system:tenant:edit",
        confirm: "确认同步所有租户字典吗？",
        run: syncTenantDict,
      },
      {
        label: "同步全部参数",
        permission: "system:tenant:edit",
        confirm: "确认同步所有租户参数配置吗？",
        run: syncTenantConfig,
      },
    ],
    rowActions: [
      {
        label: "同步套餐",
        permission: "system:tenant:edit",
        confirm: (row) => `确认同步租户 ${String(row.tenantId)} 的套餐吗？`,
        run: async (row) =>
          syncTenantPackage(
            row.tenantId as string | number,
            row.packageId as string | number
          ),
      },
    ],
    queryFields: [
      { key: "tenantId", label: "租户编号" },
      { key: "companyName", label: "企业名称" },
      { key: "contactUserName", label: "联系人" },
      { key: "contactPhone", label: "联系电话" },
    ],
    columns: [
      { key: "tenantId", label: "租户编号" },
      { key: "companyName", label: "企业名称" },
      { key: "contactUserName", label: "联系人" },
      { key: "contactPhone", label: "联系电话" },
      { key: "packageId", label: "套餐" },
      { key: "expireTime", label: "过期时间", format: "datetime" },
      { key: "accountCount", label: "账号数" },
      { key: "status", label: "状态", format: "status" },
    ],
    formFields: [
      { key: "companyName", label: "企业名称", required: true },
      { key: "licenseNumber", label: "企业信用代码" },
      { key: "contactUserName", label: "联系人", required: true },
      { key: "contactPhone", label: "联系电话", required: true },
      {
        key: "username",
        label: "管理员账号",
        required: true,
        visible: (form) => !form.id,
      },
      {
        key: "password",
        label: "管理员密码",
        type: "password",
        required: true,
        visible: (form) => !form.id,
      },
      {
        key: "packageId",
        label: "租户套餐",
        type: "select",
        required: true,
        loadOptions: async () => {
          const response = await selectTenantPackage()
          return response.data.map((item) => ({
            label: item.packageName,
            value: String(item.packageId),
          }))
        },
      },
      {
        key: "expireTime",
        label: "过期时间",
        placeholder: "YYYY-MM-DD HH:mm:ss",
        required: true,
      },
      {
        key: "accountCount",
        label: "账号额度",
        type: "number",
        required: true,
      },
      { key: "domain", label: "绑定域名" },
      { key: "address", label: "企业地址" },
      { key: "intro", label: "企业简介", type: "textarea" },
      statusField,
      remarkField,
    ],
    defaultForm: { status: "0", accountCount: 0 },
  },
  "/system/dict": {
    path: "/system/dict",
    title: "字典管理",
    description: "维护系统字典类型",
    idKey: "dictId",
    permissionPrefix: "system:dict",
    list: api(listType),
    detail: api(getType),
    create: api(addType),
    update: api(updateType),
    remove: api(delType),
    exportUrl: "/system/dict/type/export",
    queryFields: [
      { key: "dictName", label: "字典名称" },
      { key: "dictType", label: "字典类型" },
      ...dateRangeFields(),
    ],
    columns: [
      { key: "dictId", label: "编号" },
      { key: "dictName", label: "字典名称" },
      { key: "dictType", label: "字典类型" },
      { key: "remark", label: "备注" },
      { key: "createTime", label: "创建时间", format: "datetime" },
    ],
    formFields: [
      { key: "dictName", label: "字典名称", required: true },
      { key: "dictType", label: "字典类型", required: true },
      remarkField,
    ],
  },
  "/demo/demo": {
    path: "/demo/demo",
    title: "测试单表",
    description: "原工程单表 CRUD 示例",
    idKey: "id",
    permissionPrefix: "demo:demo",
    list: api(listDemo),
    detail: api(getDemo),
    create: api(addDemo),
    update: api(updateDemo),
    remove: api(delDemo),
    exportUrl: "/demo/demo/export",
    queryFields: [
      { key: "testKey", label: "测试键" },
      { key: "value", label: "测试值" },
    ],
    columns: [
      { key: "id", label: "编号" },
      { key: "deptId", label: "部门 ID" },
      { key: "userId", label: "用户 ID" },
      { key: "orderNum", label: "排序" },
      { key: "testKey", label: "测试键" },
      { key: "value", label: "测试值" },
    ],
    formFields: [
      { key: "deptId", label: "部门 ID" },
      { key: "userId", label: "用户 ID" },
      { key: "orderNum", label: "排序", type: "number" },
      { key: "testKey", label: "测试键", required: true },
      { key: "value", label: "测试值", required: true },
    ],
    defaultForm: { orderNum: 0 },
  },
  "/demo/tree": {
    path: "/demo/tree",
    title: "测试树表",
    description: "原工程树形 CRUD 示例",
    idKey: "id",
    permissionPrefix: "demo:tree",
    list: api(listTree),
    detail: api(getTree),
    create: api(addTree),
    update: api(updateTree),
    remove: api(delTree),
    exportUrl: "/demo/tree/export",
    queryFields: [{ key: "treeName", label: "节点名称" }],
    columns: [
      { key: "id", label: "编号" },
      { key: "parentId", label: "父节点" },
      { key: "deptId", label: "部门 ID" },
      { key: "userId", label: "用户 ID" },
      { key: "treeName", label: "节点名称" },
    ],
    formFields: [
      {
        key: "parentId",
        label: "父节点",
        type: "select",
        required: true,
        loadOptions: async () => {
          const response = await listTree()
          const rows = response.data ?? []
          return [
            { label: "顶级节点", value: "0" },
            ...rows.map((item) => ({
              label: item.treeName,
              value: String(item.id),
            })),
          ]
        },
      },
      { key: "deptId", label: "部门 ID", required: true },
      { key: "userId", label: "用户 ID", required: true },
      { key: "treeName", label: "节点名称", required: true },
    ],
    defaultForm: { parentId: 0 },
  },
  "/workflow/category": {
    path: "/workflow/category",
    title: "流程分类",
    description: "维护工作流分类层级",
    idKey: "categoryId",
    permissionPrefix: "workflow:category",
    list: api(listCategory),
    detail: api(getCategory),
    create: api(addCategory),
    update: api(updateCategory),
    remove: api(delCategory),
    queryFields: [{ key: "categoryName", label: "分类名称" }],
    columns: [
      { key: "categoryId", label: "编号" },
      { key: "categoryName", label: "分类名称" },
      { key: "parentId", label: "父级 ID" },
      { key: "orderNum", label: "排序" },
      { key: "createTime", label: "创建时间", format: "datetime" },
    ],
    formFields: [
      { key: "categoryName", label: "分类名称", required: true },
      {
        key: "parentId",
        label: "父级分类",
        type: "select",
        loadOptions: async () => {
          const response = await categoryTree()
          return [
            { label: "顶级分类", value: "0" },
            ...toTreeOptions(response.data as unknown as TreeOptionNode[]),
          ]
        },
      },
      { key: "orderNum", label: "显示顺序", type: "number" },
    ],
    defaultForm: { parentId: 0, orderNum: 0 },
  },
  "/workflow/spel": {
    path: "/workflow/spel",
    title: "流程表达式",
    description: "维护工作流 SpEL 调用配置",
    idKey: "id",
    permissionPrefix: "workflow:spel",
    list: api(listSpel),
    detail: api(getSpel),
    create: api(addSpel),
    update: api(updateSpel),
    remove: api(delSpel),
    queryFields: [
      { key: "componentName", label: "组件名称" },
      { key: "methodName", label: "方法名称" },
      statusField,
    ],
    columns: [
      { key: "id", label: "编号" },
      { key: "componentName", label: "组件名称" },
      { key: "methodName", label: "方法名称" },
      { key: "methodParams", label: "方法参数" },
      { key: "viewSpel", label: "表达式" },
      { key: "status", label: "状态", format: "status" },
    ],
    formFields: [
      { key: "componentName", label: "组件名称" },
      { key: "methodName", label: "方法名称" },
      { key: "methodParams", label: "方法参数" },
      { key: "viewSpel", label: "表达式预览", disabled: true },
      statusField,
      remarkField,
    ],
    deriveForm: withSpelPreview,
    defaultForm: { status: "0" },
  },
  "/monitor/logininfor": {
    path: "/monitor/logininfor",
    title: "登录日志",
    description: "查询用户登录记录",
    idKey: "infoId",
    permissionPrefix: "monitor:logininfor",
    list: api(listLoginInfo),
    remove: api(delLoginInfo),
    exportUrl: "/monitor/logininfor/export",
    toolbarActions: [
      {
        label: "清空日志",
        permission: "monitor:logininfor:remove",
        confirm: "确认清空全部登录日志吗？",
        run: cleanLoginInfo,
      },
    ],
    rowActions: [
      {
        label: "解除锁定",
        permission: "monitor:logininfor:unlock",
        confirm: (row) => `确认解除 ${String(row.userName)} 的登录锁定吗？`,
        run: async (row) => unlockLoginInfo(String(row.userName)),
      },
    ],
    queryFields: [
      { key: "ipaddr", label: "登录地址" },
      { key: "userName", label: "用户名称" },
      statusField,
      ...dateRangeFields("登录时间"),
    ],
    columns: [
      { key: "infoId", label: "编号" },
      { key: "userName", label: "用户名称" },
      { key: "ipaddr", label: "登录地址" },
      { key: "loginLocation", label: "登录地点" },
      { key: "browser", label: "浏览器" },
      { key: "os", label: "操作系统" },
      {
        key: "status",
        label: "状态",
        format: "status",
        statusLabels: ["成功", "失败"],
      },
      { key: "msg", label: "提示消息" },
      { key: "loginTime", label: "访问时间", format: "datetime" },
    ],
    formFields: [],
  },
  "/monitor/operlog": {
    path: "/monitor/operlog",
    title: "操作日志",
    description: "查询系统业务操作记录",
    idKey: "operId",
    permissionPrefix: "monitor:operlog",
    list: api(listOperlog),
    remove: api(delOperlog),
    exportUrl: "/monitor/operlog/export",
    toolbarActions: [
      {
        label: "清空日志",
        permission: "monitor:operlog:remove",
        confirm: "确认清空全部操作日志吗？",
        run: cleanOperlog,
      },
    ],
    rowActions: [
      {
        label: "详细",
        permission: "monitor:operlog:query",
        render: () => "dialog",
      },
    ],
    detailFields: [
      { key: "title", label: "操作模块" },
      { key: "businessType", label: "业务类型" },
      { key: "requestMethod", label: "请求方式" },
      { key: "operName", label: "操作人员" },
      { key: "deptName", label: "所属部门" },
      { key: "operUrl", label: "请求地址" },
      { key: "operIp", label: "操作地址" },
      { key: "operLocation", label: "操作地点" },
      { key: "operParam", label: "请求参数" },
      { key: "jsonResult", label: "返回参数" },
      { key: "errorMsg", label: "错误消息" },
      { key: "operTime", label: "操作时间" },
      { key: "costTime", label: "消耗时间（毫秒）" },
    ],
    queryFields: [
      { key: "title", label: "系统模块" },
      { key: "operName", label: "操作人员" },
      { key: "operIp", label: "操作地址" },
      {
        key: "businessType",
        label: "操作类型",
        type: "select",
        loadOptions: async () => dictOptions("sys_oper_type"),
      },
      statusField,
      ...dateRangeFields("操作时间"),
    ],
    columns: [
      { key: "operId", label: "编号" },
      { key: "title", label: "系统模块" },
      { key: "businessType", label: "操作类型" },
      { key: "requestMethod", label: "请求方式" },
      { key: "operName", label: "操作人员" },
      { key: "operIp", label: "操作地址" },
      {
        key: "status",
        label: "状态",
        format: "status",
        statusLabels: ["成功", "失败"],
      },
      { key: "operTime", label: "操作时间", format: "datetime" },
      { key: "costTime", label: "耗时(ms)" },
    ],
    formFields: [],
  },
  "/monitor/online": {
    path: "/monitor/online",
    title: "在线用户",
    description: "查看并强制退出在线会话",
    idKey: "tokenId",
    permissionPrefix: "monitor:online",
    list: listOnlinePaged,
    remove: api(forceLogout),
    removeLabel: "强制退出",
    removeConfirm: (row) =>
      `确认强制退出用户“${String(row.userName)}”的当前会话吗？`,
    bulkRemove: false,
    queryFields: [
      { key: "ipaddr", label: "登录地址" },
      { key: "userName", label: "用户名称" },
    ],
    columns: [
      { key: "tokenId", label: "会话编号" },
      { key: "userName", label: "用户名称" },
      { key: "clientKey", label: "客户端" },
      { key: "deviceType", label: "设备类型" },
      { key: "deptName", label: "部门" },
      { key: "ipaddr", label: "登录地址" },
      { key: "loginLocation", label: "登录地点" },
      { key: "browser", label: "浏览器" },
      { key: "os", label: "操作系统" },
      { key: "loginTime", label: "登录时间", format: "datetime" },
    ],
    formFields: [],
  },
  "/system/oss": {
    path: "/system/oss",
    title: "文件管理",
    description: "查询、访问和删除对象存储文件",
    idKey: "ossId",
    permissionPrefix: "system:oss",
    list: api(listOss),
    remove: api(delOss),
    uploadUrl: "/resource/oss/upload",
    exportUrl: "/resource/oss/export",
    toolbarActions: [
      {
        label: "配置管理",
        permission: "system:ossConfig:list",
        href: "/system/oss-config/index",
      },
    ],
    rowActions: [
      {
        label: "下载",
        permission: "system:oss:download",
        run: async (row) =>
          downloadGet(
            `/resource/oss/download/${String(row.ossId)}`,
            String(row.originalName || row.fileName || "download")
          ),
      },
    ],
    queryFields: [
      { key: "fileName", label: "文件名称" },
      { key: "originalName", label: "原始名称" },
      { key: "fileSuffix", label: "文件后缀" },
      { key: "service", label: "服务商" },
      ...createTimeRangeFields,
    ],
    columns: [
      { key: "ossId", label: "编号" },
      { key: "fileName", label: "文件名称" },
      { key: "originalName", label: "原始名称" },
      { key: "fileSuffix", label: "后缀" },
      { key: "url", label: "文件地址", format: "link" },
      { key: "service", label: "服务商" },
      { key: "createTime", label: "上传时间", format: "datetime" },
    ],
    formFields: [],
  },
  "/system/oss-config/index": {
    path: "/system/oss-config/index",
    title: "对象存储配置",
    description: "维护 OSS 服务连接参数",
    idKey: "ossConfigId",
    permissionPrefix: "system:ossConfig",
    list: api(listOssConfig),
    detail: api(getOssConfig),
    create: api(addOssConfig),
    update: api(updateOssConfig),
    remove: api(delOssConfig),
    statusChange: async (row, status) =>
      changeOssConfigStatus(
        row.ossConfigId as string | number,
        status,
        String(row.configKey)
      ),
    queryFields: [
      { key: "configKey", label: "配置键" },
      { key: "bucketName", label: "桶名称" },
      statusField,
    ],
    columns: [
      { key: "ossConfigId", label: "编号" },
      { key: "configKey", label: "配置键" },
      { key: "endpoint", label: "访问站点" },
      { key: "domain", label: "自定义域名" },
      { key: "bucketName", label: "桶名称" },
      { key: "region", label: "区域" },
      { key: "status", label: "状态", format: "status" },
    ],
    formFields: [
      { key: "configKey", label: "配置键", required: true },
      { key: "accessKey", label: "Access Key", required: true },
      {
        key: "secretKey",
        label: "Secret Key",
        type: "password",
        required: true,
      },
      { key: "bucketName", label: "桶名称", required: true },
      { key: "endpoint", label: "访问站点", required: true },
      { key: "domain", label: "自定义域名" },
      { key: "prefix", label: "前缀" },
      { key: "region", label: "区域" },
      {
        key: "isHttps",
        label: "HTTPS",
        type: "select",
        options: [
          { label: "是", value: "Y" },
          { label: "否", value: "N" },
        ],
      },
      {
        key: "accessPolicy",
        label: "访问策略",
        type: "select",
        options: [
          { label: "私有", value: "0" },
          { label: "公开", value: "1" },
          { label: "自定义", value: "2" },
        ],
      },
      statusField,
      remarkField,
    ],
    defaultForm: { isHttps: "Y", accessPolicy: "0", status: "0" },
  },
  "/workflow/leave": {
    path: "/workflow/leave",
    title: "请假申请",
    description: "维护并提交请假流程业务单",
    idKey: "id",
    permissionPrefix: "workflow:leave",
    list: api(listLeave),
    detail: api(getLeave),
    create: api(addLeave),
    update: api(updateLeave),
    remove: api(delLeave),
    bulkRemove: false,
    createHref: "/workflow/leaveEdit/index?type=add",
    editHref: (row) =>
      `/workflow/leaveEdit/index?id=${String(row.id)}&type=update`,
    canEditRow: (row) =>
      ["draft", "cancel", "back"].includes(String(row.status)),
    canRemoveRow: (row) =>
      ["draft", "cancel", "back"].includes(String(row.status)),
    rowActions: [
      {
        label: "查看",
        href: (row) =>
          `/workflow/leaveEdit/index?id=${String(row.id)}&type=view`,
      },
      {
        label: "撤销",
        visible: (row) => row.status === "waiting",
        confirm: () => "确认撤销当前请假申请吗？",
        run: async (row) =>
          cancelProcessApply({
            businessId: row.id,
            message: "申请人撤销流程！",
          }),
      },
    ],
    exportUrl: "/workflow/leave/export",
    queryFields: [
      { key: "startLeaveDays", label: "最少天数", type: "number" },
      { key: "endLeaveDays", label: "最多天数", type: "number" },
    ],
    columns: [
      { key: "id", label: "编号" },
      { key: "applyCode", label: "申请编号" },
      { key: "leaveType", label: "请假类型" },
      { key: "startDate", label: "开始时间", format: "datetime" },
      { key: "endDate", label: "结束时间", format: "datetime" },
      { key: "leaveDays", label: "请假天数" },
      { key: "status", label: "流程状态" },
      { key: "remark", label: "原因" },
    ],
    formFields: [
      {
        key: "leaveType",
        label: "请假类型",
        type: "select",
        required: true,
        options: [
          { label: "事假", value: "1" },
          { label: "调休", value: "2" },
          { label: "病假", value: "3" },
          { label: "婚假", value: "4" },
        ],
      },
      {
        key: "startDate",
        label: "开始时间",
        required: true,
        placeholder: "YYYY-MM-DD HH:mm:ss",
      },
      {
        key: "endDate",
        label: "结束时间",
        required: true,
        placeholder: "YYYY-MM-DD HH:mm:ss",
      },
      { key: "leaveDays", label: "请假天数", type: "number", required: true },
      remarkField,
    ],
    defaultForm: { leaveType: "1", leaveDays: 1 },
  },
  "/workflow/processDefinition": {
    path: "/workflow/processDefinition",
    title: "流程定义",
    description: "维护、发布和停用工作流定义",
    idKey: "id",
    permissionPrefix: "workflow:definition",
    list: api(listDefinition),
    detail: getDefinitionDetail,
    create: api(addDefinition),
    update: api(updateDefinition),
    remove: api(deleteDefinition),
    uploadUrl: "/workflow/definition/importDef",
    uploadPermission: "workflow:definition:import",
    uploadAction: importDef,
    uploadExtraFields: async () => {
      const category = window.prompt("请输入要部署到的流程分类 ID")
      return category ? { category } : null
    },
    rowActions: [
      {
        label: "流程设计",
        permission: "workflow:definition:query",
        href: (row) =>
          `/workflow/design/index?definitionId=${String(row.id)}&disabled=false&activeName=unpublished`,
        visible: (row) => String(row.isPublish) !== "1",
      },
      {
        label: "查看流程",
        permission: "workflow:definition:query",
        href: (row) =>
          `/workflow/design/index?definitionId=${String(row.id)}&disabled=true&activeName=published`,
        visible: (row) => String(row.isPublish) === "1",
      },
      {
        label: "发布",
        permission: "workflow:definition:publish",
        visible: (row) => String(row.isPublish) !== "1",
        confirm: (row) => `确认发布“${String(row.flowName)}”吗？`,
        run: async (row) => publish(String(row.id)),
      },
      {
        label: "取消发布",
        permission: "workflow:definition:publish",
        visible: (row) => String(row.isPublish) === "1",
        confirm: (row) => `确认取消发布“${String(row.flowName)}”吗？`,
        run: async (row) => unPublish(String(row.id)),
      },
      {
        label: "激活/挂起",
        permission: "workflow:definition:active",
        confirm: (row) => `确认切换“${String(row.flowName)}”的激活状态吗？`,
        run: async (row) =>
          active(String(row.id), Number(row.activityStatus) !== 1),
      },
      {
        label: "复制流程",
        permission: "workflow:definition:copy",
        run: async (row) => copyDefinition(String(row.id)),
      },
      {
        label: "导出定义",
        permission: "workflow:definition:export",
        run: async (row) =>
          downloadGet(
            `/workflow/definition/exportDef/${String(row.id)}`,
            `${String(row.flowCode || "workflow")}.json`
          ),
      },
    ],
    queryFields: [
      { key: "flowCode", label: "流程编码" },
      { key: "flowName", label: "流程名称" },
      {
        key: "category",
        label: "流程分类",
        type: "select",
        loadOptions: async () => {
          const response = await categoryTree()
          return toTreeOptions(response.data as unknown as TreeOptionNode[])
        },
      },
      {
        key: "isPublish",
        label: "发布状态",
        type: "select",
        options: [
          { label: "未发布", value: "0" },
          { label: "已发布", value: "1" },
        ],
      },
    ],
    columns: [
      { key: "id", label: "编号" },
      { key: "flowName", label: "流程名称" },
      { key: "flowCode", label: "流程编码" },
      { key: "version", label: "版本" },
      { key: "formPath", label: "表单路径" },
      { key: "isPublish", label: "发布状态" },
      { key: "activityStatus", label: "激活状态", format: "activity" },
      { key: "createTime", label: "创建时间", format: "datetime" },
    ],
    formFields: [
      { key: "flowName", label: "流程名称", required: true },
      { key: "flowCode", label: "流程编码", required: true },
      {
        key: "category",
        label: "流程分类",
        type: "select",
        required: true,
        loadOptions: async () => {
          const response = await categoryTree()
          return toTreeOptions(response.data as unknown as TreeOptionNode[])
        },
      },
      {
        key: "modelValue",
        label: "设计器模式",
        type: "select",
        required: true,
        options: [
          { label: "经典模式", value: "CLASSICS" },
          { label: "仿钉钉模式", value: "MIMIC" },
        ],
      },
      { key: "autoPass", label: "同一办理人自动审批", type: "boolean" },
      {
        key: "formCustom",
        label: "动态表单",
        type: "select",
        required: true,
        options: [
          { label: "否", value: "N" },
          { label: "是", value: "Y" },
        ],
      },
      { key: "formPath", label: "表单路径" },
    ],
    preparePayload: (payload) => {
      const { autoPass, ...rest } = payload
      return { ...rest, ext: JSON.stringify({ autoPass: Boolean(autoPass) }) }
    },
    defaultForm: { modelValue: "CLASSICS", formCustom: "N", autoPass: false },
  },
  "/workflow/processInstance": {
    path: "/workflow/processInstance",
    title: "流程实例",
    description: "查询运行中的工作流实例",
    idKey: "id",
    permissionPrefix: "workflow:instance",
    list: api(pageByRunning),
    remove: api(deleteByInstanceIds),
    rowActions: [
      { label: "查看", href: (row) => workflowHref(row, "view") },
      {
        label: "作废",
        permission: "workflow:instance:invalid",
        confirm: (row) => `确认作废“${String(row.businessTitle)}”吗？`,
        run: async (row) => {
          const comment = window.prompt("请输入作废原因", "管理员作废流程")
          if (!comment) return
          await invalid({ id: row.id, comment })
        },
      },
    ],
    queryFields: [
      {
        key: "category",
        label: "流程分类",
        type: "select",
        loadOptions: async () => {
          const response = await categoryTree()
          return toTreeOptions(response.data as unknown as TreeOptionNode[])
        },
      },
      {
        key: "createByIds",
        label: "申请人 ID",
        type: "array",
        placeholder: "多个 ID 用逗号分隔",
      },
      { key: "flowCode", label: "流程编码" },
      { key: "flowName", label: "流程名称" },
      { key: "nodeName", label: "当前节点" },
      { key: "businessId", label: "业务编号" },
    ],
    columns: [
      { key: "id", label: "实例编号" },
      { key: "businessCode", label: "业务编码" },
      { key: "businessTitle", label: "业务标题" },
      { key: "flowName", label: "流程名称" },
      { key: "flowCode", label: "流程编码" },
      { key: "categoryName", label: "流程分类" },
      { key: "nodeName", label: "当前节点" },
      { key: "createByName", label: "申请人" },
      { key: "version", label: "版本" },
      { key: "isSuspended", label: "实例状态", format: "suspension" },
      { key: "flowStatusName", label: "流程状态" },
      { key: "createTime", label: "发起时间", format: "datetime" },
    ],
    formFields: [],
  },
  "/tool/gen": {
    path: "/tool/gen",
    title: "代码生成",
    description: "管理已导入的数据库表和生成配置",
    idKey: "tableId",
    permissionPrefix: "tool:gen",
    list: api(listTable),
    remove: api(delTable),
    queryFields: [
      { key: "tableName", label: "表名称" },
      { key: "tableComment", label: "表描述" },
      { key: "dataName", label: "数据源" },
    ],
    columns: [
      { key: "tableId", label: "编号" },
      { key: "dataName", label: "数据源" },
      { key: "tableName", label: "表名称" },
      { key: "tableComment", label: "表描述" },
      { key: "className", label: "实体类" },
      { key: "createTime", label: "创建时间", format: "datetime" },
      { key: "updateTime", label: "更新时间", format: "datetime" },
    ],
    formFields: [],
  },
}

function taskConfig(path: string, title: string, list: unknown): CrudConfig {
  return {
    path,
    title,
    description: "查询工作流任务及业务状态",
    idKey: "id",
    permissionPrefix: "workflow:task",
    list: api(list),
    queryFields: [
      {
        key: "createByIds",
        label: "申请人 ID",
        type: "array",
        placeholder: "多个 ID 用逗号分隔",
      },
      { key: "flowCode", label: "流程编码" },
      { key: "flowName", label: "流程名称" },
      { key: "nodeName", label: "节点名称" },
    ],
    columns: [
      { key: "id", label: "任务编号" },
      { key: "flowName", label: "流程名称" },
      { key: "flowCode", label: "流程编码" },
      { key: "nodeName", label: "当前节点" },
      { key: "businessTitle", label: "业务标题" },
      { key: "flowStatus", label: "流程状态" },
      { key: "createTime", label: "创建时间", format: "datetime" },
    ],
    formFields: [],
    rowActions: [
      {
        label: title.includes("待办") ? "办理" : "查看",
        href: (row) =>
          workflowHref(row, title.includes("待办") ? "approval" : "view"),
      },
    ],
  }
}

CRUD_CONFIGS["/workflow/task/taskWaiting"] = taskConfig(
  "/workflow/task/taskWaiting",
  "我的待办",
  pageByTaskWait
)
CRUD_CONFIGS["/workflow/task/taskFinish"] = taskConfig(
  "/workflow/task/taskFinish",
  "我的已办",
  pageByTaskFinish
)
CRUD_CONFIGS["/workflow/task/taskCopyList"] = taskConfig(
  "/workflow/task/taskCopyList",
  "我的抄送",
  pageByTaskCopy
)
CRUD_CONFIGS["/workflow/task/allTaskWaiting"] = taskConfig(
  "/workflow/task/allTaskWaiting",
  "全部待办",
  pageByAllTaskWait
)
CRUD_CONFIGS["/workflow/task/myDocument"] = {
  ...taskConfig("/workflow/task/myDocument", "我的文档", pageByCurrent),
  permissionPrefix: "workflow:instance",
  rowActions: [
    {
      label: "编辑",
      visible: (row) =>
        ["draft", "cancel", "back"].includes(String(row.flowStatus)),
      href: (row) => workflowHref(row, "update"),
    },
    {
      label: "删除",
      visible: (row) =>
        ["draft", "cancel", "back"].includes(String(row.flowStatus)),
      confirm: () => "确认删除当前流程草稿吗？",
      run: async (row) => deleteByInstanceIds(row.id as string | number),
    },
    { label: "查看", href: (row) => workflowHref(row, "view") },
    {
      label: "撤销",
      visible: (row) => row.flowStatus === "waiting",
      confirm: () => "确认撤销当前流程吗？",
      run: async (row) =>
        cancelProcessApply({
          businessId: row.businessId,
          message: "申请人撤销流程！",
        }),
    },
  ],
}
