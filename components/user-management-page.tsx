"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  ChevronDown,
  ChevronRight,
  CircleCheck,
  Download,
  Edit,
  KeyRound,
  LoaderCircle,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Upload,
} from "lucide-react"
import { toast } from "sonner"

import { getConfigKey } from "@/api/system/config"
import type { DeptTreeVO } from "@/api/system/dept/types"
import { optionselect as postOptionSelect } from "@/api/system/post"
import type { PostVO } from "@/api/system/post/types"
import type { RoleVO } from "@/api/system/role/types"
import {
  addUser,
  changeUserStatus,
  delUser,
  deptTreeSelect,
  getUser,
  listUser,
  resetUserPwd,
  updateUser,
} from "@/api/system/user"
import type { UserForm, UserQuery, UserVO } from "@/api/system/user/types"
import { useAuth } from "@/components/auth-provider"
import { DataPagination } from "@/components/data-pagination"
import { MultiSelect, type MultiSelectOption } from "@/components/multi-select"
import {
  TableSkeleton,
  TABLE_ROW_ENTER_CLASS,
} from "@/components/table-skeleton"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { DateRangePicker } from "@/components/date-range-picker"
import {
  QUERY_GRID_CLASS,
  QueryActions,
  QueryField,
} from "@/components/query-field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import request, { download } from "@/utils/request"

interface UserListResponse {
  rows?: UserVO[]
  total?: number
}

interface UserListQuery extends UserQuery {
  params?: { beginTime?: string; endTime?: string }
}

interface EditableUserForm {
  userId?: string | number
  deptId?: string | number
  userName: string
  nickName: string
  password: string
  phonenumber: string
  email: string
  sex: string
  status: string
  remark: string
  postIds: string[]
  roleIds: string[]
}

const EMPTY_QUERY = {
  userName: "",
  nickName: "",
  phonenumber: "",
  status: "",
  beginTime: "",
  endTime: "",
}

const EMPTY_FORM: EditableUserForm = {
  userName: "",
  nickName: "",
  password: "",
  phonenumber: "",
  email: "",
  sex: "2",
  status: "0",
  remark: "",
  postIds: [],
  roleIds: [],
}

function filterDepartments(nodes: DeptTreeVO[], keyword: string): DeptTreeVO[] {
  const value = keyword.trim()
  if (!value) return nodes
  return nodes.flatMap((node) => {
    const children = filterDepartments(node.children ?? [], value)
    return node.label.includes(value) || children.length
      ? [{ ...node, children }]
      : []
  })
}

function flattenDepartments(
  nodes: DeptTreeVO[],
  depth = 0
): Array<{ label: string; value: string; disabled?: boolean }> {
  return nodes.flatMap((node) => [
    {
      label: `${"　".repeat(depth)}${node.label}`,
      value: String(node.id),
      disabled: node.disabled,
    },
    ...flattenDepartments(node.children ?? [], depth + 1),
  ])
}

function DepartmentNode({
  node,
  selectedId,
  onSelect,
  depth = 0,
}: {
  node: DeptTreeVO
  selectedId?: string
  onSelect: (id: string) => void
  depth?: number
}) {
  const [expanded, setExpanded] = React.useState(true)
  const hasChildren = Boolean(node.children?.length)
  const id = String(node.id)

  return (
    <div>
      <div className="flex items-center" style={{ paddingLeft: depth * 14 }}>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="shrink-0"
          disabled={!hasChildren}
          aria-label={expanded ? "收起部门" : "展开部门"}
          onClick={() => setExpanded((value) => !value)}
        >
          {hasChildren && (expanded ? <ChevronDown /> : <ChevronRight />)}
        </Button>
        <button
          type="button"
          className={`min-w-0 flex-1 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent ${
            selectedId === id
              ? "bg-accent font-medium text-accent-foreground"
              : ""
          }`}
          onClick={() => onSelect(id)}
        >
          <span className="block truncate">{node.label}</span>
        </button>
      </div>
      {expanded &&
        node.children?.map((child) => (
          <DepartmentNode
            key={String(child.id)}
            node={child}
            selectedId={selectedId}
            onSelect={onSelect}
            depth={depth + 1}
          />
        ))}
    </div>
  )
}

function formatDate(value?: string) {
  if (!value) return "-"
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString("zh-CN", { hour12: false })
}

export function UserManagementPage() {
  const router = useRouter()
  const { user: currentUser, hasPermission } = useAuth()
  const [departments, setDepartments] = React.useState<DeptTreeVO[]>([])
  const [deptKeyword, setDeptKeyword] = React.useState("")
  const [selectedDeptId, setSelectedDeptId] = React.useState<string>()
  const [queryDraft, setQueryDraft] = React.useState(EMPTY_QUERY)
  const [query, setQuery] = React.useState(EMPTY_QUERY)
  const [rows, setRows] = React.useState<UserVO[]>([])
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set())
  const [pageNum, setPageNum] = React.useState(1)
  const [pageSize, setPageSize] = React.useState(10)
  const [total, setTotal] = React.useState(0)
  const [loading, setLoading] = React.useState(true)

  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [form, setForm] = React.useState<EditableUserForm>(EMPTY_FORM)
  const [roles, setRoles] = React.useState<RoleVO[]>([])
  const [posts, setPosts] = React.useState<PostVO[]>([])
  const [saving, setSaving] = React.useState(false)

  const [importOpen, setImportOpen] = React.useState(false)
  const [importFile, setImportFile] = React.useState<File>()
  const [updateSupport, setUpdateSupport] = React.useState(false)
  const [importing, setImporting] = React.useState(false)

  const canAdd = hasPermission("system:user:add")
  const canEdit = hasPermission("system:user:edit")
  const canRemove = hasPermission("system:user:remove")
  const canResetPassword = hasPermission("system:user:resetPwd")
  const canImport = hasPermission("system:user:import")
  const canExport = hasPermission("system:user:export")
  const selectedRows = rows.filter((row) => selectedIds.has(String(row.userId)))
  const isSelfEdit = Boolean(
    form.userId && String(form.userId) === String(currentUser?.userId)
  )
  const departmentOptions = flattenDepartments(departments)
  const selectedDepartmentLabel = departmentOptions
    .find((option) => option.value === String(form.deptId ?? ""))
    ?.label.trim()
  const roleOptions: MultiSelectOption[] = roles.map((role) => ({
    label: role.roleName,
    value: String(role.roleId),
    disabled: role.status === "1",
  }))
  const postOptions: MultiSelectOption[] = posts.map((post) => ({
    label: post.postName,
    value: String(post.postId),
    disabled: post.status === "1",
  }))

  const loadUsers = React.useCallback(async () => {
    setLoading(true)
    try {
      const params: UserListQuery = {
        pageNum,
        pageSize,
        userName: query.userName || undefined,
        nickName: query.nickName || undefined,
        phonenumber: query.phonenumber || undefined,
        status: query.status || undefined,
        deptId: selectedDeptId || undefined,
        params: {
          beginTime: query.beginTime || undefined,
          endTime: query.endTime || undefined,
        },
      }
      const response = (await listUser(params)) as unknown as UserListResponse
      setRows(response.rows ?? [])
      setTotal(response.total ?? 0)
      setSelectedIds(new Set())
    } finally {
      setLoading(false)
    }
  }, [pageNum, pageSize, query, selectedDeptId])

  React.useEffect(() => {
    void deptTreeSelect().then((response) =>
      setDepartments(response.data ?? [])
    )
  }, [])

  React.useEffect(() => {
    void loadUsers()
  }, [loadUsers])

  function resetQuery() {
    setQueryDraft(EMPTY_QUERY)
    setQuery(EMPTY_QUERY)
    setSelectedDeptId(undefined)
    setPageNum(1)
  }

  async function openCreate() {
    const [userResponse, passwordResponse] = await Promise.all([
      getUser(),
      getConfigKey("sys.user.initPassword"),
    ])
    setRoles(userResponse.data.roles ?? [])
    setPosts(userResponse.data.posts ?? [])
    setForm({ ...EMPTY_FORM, password: String(passwordResponse.data ?? "") })
    setDialogOpen(true)
  }

  async function openEdit(row: UserVO) {
    const response = await getUser(row.userId)
    const data = response.data
    const roleMap = new Map(
      [...(data.roles ?? []), ...(data.user.roles ?? [])].map((role) => [
        String(role.roleId),
        role,
      ])
    )
    setRoles([...roleMap.values()])
    setPosts(data.posts ?? [])
    setForm({
      userId: data.user.userId,
      deptId: data.user.deptId,
      userName: data.user.userName,
      nickName: data.user.nickName ?? "",
      password: "",
      phonenumber: data.user.phonenumber ?? "",
      email: data.user.email ?? "",
      sex: data.user.sex ?? "2",
      status: data.user.status ?? "0",
      remark: data.user.remark ?? "",
      postIds: (data.postIds ?? []).map(String),
      roleIds: (data.roleIds ?? []).map(String),
    })
    setDialogOpen(true)
  }

  async function changeDepartment(value: string) {
    setForm((current) => ({ ...current, deptId: value, postIds: [] }))
    const response = await postOptionSelect(value, [])
    setPosts(response.data ?? [])
  }

  async function saveUser() {
    if (!form.nickName.trim()) return toast.error("请填写用户昵称")
    if (!form.userId && !form.userName.trim())
      return toast.error("请填写用户名称")
    if (!form.userId && (form.password.length < 5 || form.password.length > 20))
      return toast.error("用户密码长度必须介于 5 和 20 之间")
    if (!isSelfEdit && !form.deptId) return toast.error("请选择归属部门")
    if (!isSelfEdit && !form.roleIds.length)
      return toast.error("请选择用户角色")
    if (form.phonenumber && !/^1[3-9]\d{9}$/.test(form.phonenumber))
      return toast.error("请输入正确的手机号码")
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      return toast.error("请输入正确的邮箱")

    const payload: Record<string, unknown> = { ...form }
    if (isSelfEdit) {
      payload.deptId = null
      payload.postIds = null
      payload.roleIds = null
    }
    setSaving(true)
    try {
      if (form.userId) await updateUser(payload as unknown as UserForm)
      else await addUser(payload as unknown as UserForm)
      toast.success(form.userId ? "修改成功" : "新增成功")
      setDialogOpen(false)
      await loadUsers()
    } finally {
      setSaving(false)
    }
  }

  async function removeUsers(ids: Array<string | number>) {
    if (
      !ids.length ||
      !window.confirm(`确认删除选中的 ${ids.length} 个用户吗？`)
    )
      return
    await delUser(ids)
    toast.success("删除成功")
    await loadUsers()
  }

  async function toggleStatus(row: UserVO, checked: boolean) {
    const nextStatus = checked ? "0" : "1"
    const action = checked ? "启用" : "停用"
    if (!window.confirm(`确认要${action}“${row.userName}”用户吗？`)) return
    await changeUserStatus(row.userId, nextStatus)
    toast.success(`${action}成功`)
    await loadUsers()
  }

  async function resetPassword(row: UserVO) {
    const password = window.prompt(`请输入“${row.userName}”的新密码`)
    if (!password) return
    if (password.length < 5 || password.length > 20)
      return toast.error("用户密码长度必须介于 5 和 20 之间")
    await resetUserPwd(row.userId, password)
    toast.success("密码重置成功")
  }

  async function exportUsers() {
    await download(
      "/system/user/export",
      {
        ...query,
        deptId: selectedDeptId,
        pageNum,
        pageSize,
      },
      `user_${Date.now()}.xlsx`
    )
  }

  async function uploadUsers() {
    if (!importFile) return toast.error("请选择用户数据文件")
    const data = new FormData()
    data.append("file", importFile)
    setImporting(true)
    try {
      await request.post(
        `/system/user/importData?updateSupport=${updateSupport}`,
        data
      )
      toast.success("导入成功")
      setImportOpen(false)
      setImportFile(undefined)
      await loadUsers()
    } finally {
      setImporting(false)
    }
  }

  const filteredDepartments = filterDepartments(departments, deptKeyword)

  return (
    <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
      <Card className="h-fit">
        <CardContent className="space-y-3">
          <div className="relative">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              value={deptKeyword}
              placeholder="请输入部门名称"
              onChange={(event) => setDeptKeyword(event.target.value)}
            />
          </div>
          <div className="max-h-[calc(100svh-18rem)] overflow-y-auto">
            {filteredDepartments.map((node) => (
              <DepartmentNode
                key={String(node.id)}
                node={node}
                selectedId={selectedDeptId}
                onSelect={(id) => {
                  setSelectedDeptId(id)
                  setPageNum(1)
                }}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="min-w-0 space-y-4">
        <Card>
          <CardContent>
            <form
              className={QUERY_GRID_CLASS}
              onSubmit={(event) => {
                event.preventDefault()
                setPageNum(1)
                setQuery({ ...queryDraft })
              }}
            >
              <QueryField label="用户名称" htmlFor="user-query-name">
                <Input
                  id="user-query-name"
                  value={queryDraft.userName}
                  placeholder="请输入用户名称"
                  onChange={(event) =>
                    setQueryDraft((current) => ({
                      ...current,
                      userName: event.target.value,
                    }))
                  }
                />
              </QueryField>
              <QueryField label="用户昵称" htmlFor="user-query-nickname">
                <Input
                  id="user-query-nickname"
                  value={queryDraft.nickName}
                  placeholder="请输入用户昵称"
                  onChange={(event) =>
                    setQueryDraft((current) => ({
                      ...current,
                      nickName: event.target.value,
                    }))
                  }
                />
              </QueryField>
              <QueryField label="手机号码" htmlFor="user-query-phone">
                <Input
                  id="user-query-phone"
                  value={queryDraft.phonenumber}
                  placeholder="请输入手机号码"
                  onChange={(event) =>
                    setQueryDraft((current) => ({
                      ...current,
                      phonenumber: event.target.value,
                    }))
                  }
                />
              </QueryField>
              <QueryField label="状态">
                <Select
                  value={queryDraft.status || null}
                  onValueChange={(value) =>
                    setQueryDraft((current) => ({
                      ...current,
                      status: value ?? "",
                    }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <span
                      className={
                        queryDraft.status ? "" : "text-muted-foreground"
                      }
                    >
                      {queryDraft.status
                        ? queryDraft.status === "0"
                          ? "正常"
                          : "停用"
                        : "用户状态"}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">正常</SelectItem>
                    <SelectItem value="1">停用</SelectItem>
                  </SelectContent>
                </Select>
              </QueryField>
              <QueryField label="创建时间" wide>
                <DateRangePicker
                  value={[queryDraft.beginTime, queryDraft.endTime]}
                  onChange={([beginTime, endTime]) =>
                    setQueryDraft((current) => ({
                      ...current,
                      beginTime,
                      endTime,
                    }))
                  }
                />
              </QueryField>
              <QueryActions>
                <Button type="submit">
                  <Search />
                  查询
                </Button>
                <Button type="button" variant="outline" onClick={resetQuery}>
                  <RefreshCw />
                  重置
                </Button>
              </QueryActions>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row flex-wrap items-center justify-between gap-4">
            <div>
              <CardDescription>
                共 {total} 条记录，已选 {selectedIds.size} 条
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              {canAdd && (
                <Button onClick={() => void openCreate()}>
                  <Plus />
                  新增
                </Button>
              )}
              {canEdit && (
                <Button
                  variant="outline"
                  disabled={selectedRows.length !== 1}
                  onClick={() => void openEdit(selectedRows[0])}
                >
                  <Edit />
                  修改
                </Button>
              )}
              {canRemove && (
                <Button
                  variant="destructive"
                  disabled={!selectedIds.size}
                  onClick={() => void removeUsers([...selectedIds])}
                >
                  <Trash2 />
                  删除
                </Button>
              )}
              {(canImport || canExport) && (
                <DropdownMenu>
                  <DropdownMenuTrigger render={<Button variant="outline" />}>
                    <MoreHorizontal />
                    更多
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {canImport && (
                      <DropdownMenuItem
                        onClick={() =>
                          void download(
                            "/system/user/importTemplate",
                            {},
                            `user_template_${Date.now()}.xlsx`
                          )
                        }
                      >
                        <Download />
                        下载模板
                      </DropdownMenuItem>
                    )}
                    {canImport && (
                      <DropdownMenuItem onClick={() => setImportOpen(true)}>
                        <Upload />
                        导入数据
                      </DropdownMenuItem>
                    )}
                    {canExport && (
                      <DropdownMenuItem onClick={() => void exportUsers()}>
                        <Download />
                        导出数据
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={
                        rows.filter((row) => Number(row.userId) !== 1).length >
                          0 &&
                        selectedIds.size ===
                          rows.filter((row) => Number(row.userId) !== 1).length
                      }
                      onCheckedChange={(checked) =>
                        setSelectedIds(
                          checked
                            ? new Set(
                                rows
                                  .filter((row) => Number(row.userId) !== 1)
                                  .map((row) => String(row.userId))
                              )
                            : new Set()
                        )
                      }
                    />
                  </TableHead>
                  <TableHead>用户名称</TableHead>
                  <TableHead>用户昵称</TableHead>
                  <TableHead>部门</TableHead>
                  <TableHead>手机号码</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>创建时间</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableSkeleton columns={8} rows={pageSize} />
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="h-32 text-center text-muted-foreground"
                    >
                      暂无数据
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => {
                    const id = String(row.userId)
                    const protectedRow = Number(row.userId) === 1
                    return (
                      <TableRow key={id} className={TABLE_ROW_ENTER_CLASS}>
                        <TableCell>
                          <Checkbox
                            disabled={protectedRow}
                            checked={selectedIds.has(id)}
                            onCheckedChange={(checked) =>
                              setSelectedIds((current) => {
                                const next = new Set(current)
                                if (checked) next.add(id)
                                else next.delete(id)
                                return next
                              })
                            }
                          />
                        </TableCell>
                        <TableCell>{row.userName}</TableCell>
                        <TableCell>{row.nickName}</TableCell>
                        <TableCell>{row.deptName || "-"}</TableCell>
                        <TableCell>{row.phonenumber || "-"}</TableCell>
                        <TableCell>
                          {canEdit && !protectedRow ? (
                            <Switch
                              checked={row.status === "0"}
                              aria-label={`${row.userName}状态`}
                              onCheckedChange={(checked) =>
                                void toggleStatus(row, checked)
                              }
                            />
                          ) : (
                            <Badge variant="secondary">
                              {row.status === "0" ? "正常" : "停用"}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>{formatDate(row.createTime)}</TableCell>
                        <TableCell>
                          {!protectedRow && (
                            <div className="flex justify-end gap-1">
                              {canEdit && (
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  title="修改"
                                  onClick={() => void openEdit(row)}
                                >
                                  <Edit />
                                </Button>
                              )}
                              {canRemove && (
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  title="删除"
                                  onClick={() => void removeUsers([row.userId])}
                                >
                                  <Trash2 />
                                </Button>
                              )}
                              {canResetPassword && (
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  title="重置密码"
                                  onClick={() => void resetPassword(row)}
                                >
                                  <KeyRound />
                                </Button>
                              )}
                              {canEdit && (
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  title="分配角色"
                                  onClick={() =>
                                    router.push(
                                      `/system/user-auth/role/${row.userId}`
                                    )
                                  }
                                >
                                  <CircleCheck />
                                </Button>
                              )}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
            <div className="mt-4">
              <DataPagination
                pageNum={pageNum}
                pageSize={pageSize}
                total={total}
                onPageChange={setPageNum}
                onPageSizeChange={(size) => {
                  setPageNum(1)
                  setPageSize(size)
                }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{form.userId ? "修改用户" : "新增用户"}</DialogTitle>
            <DialogDescription>
              用户字段和提交接口保持与旧前端一致。
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="user-form-nickname">用户昵称 *</Label>
              <Input
                id="user-form-nickname"
                maxLength={30}
                value={form.nickName}
                placeholder="请输入用户昵称"
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    nickName: event.target.value,
                  }))
                }
              />
            </div>
            {!isSelfEdit && (
              <div className="space-y-2">
                <Label>归属部门 *</Label>
                <Select
                  value={form.deptId ? String(form.deptId) : null}
                  onValueChange={(value) =>
                    value && void changeDepartment(value)
                  }
                >
                  <SelectTrigger className="w-full">
                    <span
                      className={
                        selectedDepartmentLabel ? "" : "text-muted-foreground"
                      }
                    >
                      {selectedDepartmentLabel || "请选择归属部门"}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    {departmentOptions.map((option) => (
                      <SelectItem
                        key={option.value}
                        value={option.value}
                        disabled={option.disabled}
                      >
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="user-form-phone">手机号码</Label>
              <Input
                id="user-form-phone"
                maxLength={11}
                value={form.phonenumber}
                placeholder="请输入手机号码"
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    phonenumber: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="user-form-email">邮箱</Label>
              <Input
                id="user-form-email"
                maxLength={50}
                value={form.email}
                placeholder="请输入邮箱"
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    email: event.target.value,
                  }))
                }
              />
            </div>
            {!form.userId && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="user-form-name">用户名称 *</Label>
                  <Input
                    id="user-form-name"
                    maxLength={30}
                    value={form.userName}
                    placeholder="请输入用户名称"
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        userName: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="user-form-password">用户密码 *</Label>
                  <Input
                    id="user-form-password"
                    type="password"
                    maxLength={20}
                    value={form.password}
                    placeholder="请输入用户密码"
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        password: event.target.value,
                      }))
                    }
                  />
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label>用户性别</Label>
              <Select
                value={form.sex}
                onValueChange={(value) =>
                  value && setForm((current) => ({ ...current, sex: value }))
                }
              >
                <SelectTrigger className="w-full">
                  <span>
                    {form.sex === "0" ? "男" : form.sex === "1" ? "女" : "未知"}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">男</SelectItem>
                  <SelectItem value="1">女</SelectItem>
                  <SelectItem value="2">未知</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>状态</Label>
              <div className="flex h-8 items-center gap-2">
                <Switch
                  id="user-status"
                  checked={form.status === "0"}
                  onCheckedChange={(checked) =>
                    setForm((current) => ({
                      ...current,
                      status: checked ? "0" : "1",
                    }))
                  }
                />
                <Label htmlFor="user-status" className="font-normal">
                  {form.status === "0" ? "正常" : "停用"}
                </Label>
              </div>
            </div>
            {!isSelfEdit && (
              <>
                <div className="space-y-2">
                  <Label>岗位</Label>
                  <MultiSelect
                    value={form.postIds}
                    options={postOptions}
                    placeholder="请选择岗位"
                    onChange={(value) =>
                      setForm((current) => ({ ...current, postIds: value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>角色 *</Label>
                  <MultiSelect
                    value={form.roleIds}
                    options={roleOptions}
                    placeholder="请选择角色"
                    onChange={(value) =>
                      setForm((current) => ({ ...current, roleIds: value }))
                    }
                  />
                </div>
              </>
            )}
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="user-form-remark">备注</Label>
              <Textarea
                id="user-form-remark"
                value={form.remark}
                placeholder="请输入内容"
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    remark: event.target.value,
                  }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
            <Button disabled={saving} onClick={() => void saveUser()}>
              {saving && <LoaderCircle className="animate-spin" />}确定
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>用户导入</DialogTitle>
            <DialogDescription>仅支持 .xlsx 或 .xls 文件。</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              type="file"
              accept=".xlsx,.xls"
              onChange={(event) => setImportFile(event.target.files?.[0])}
            />
            <Label className="flex items-center gap-2 font-normal">
              <Checkbox
                checked={updateSupport}
                onCheckedChange={(checked) =>
                  setUpdateSupport(Boolean(checked))
                }
              />
              是否更新已经存在的用户数据
            </Label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportOpen(false)}>
              取消
            </Button>
            <Button disabled={importing} onClick={() => void uploadUsers()}>
              {importing && <LoaderCircle className="animate-spin" />}上传
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
