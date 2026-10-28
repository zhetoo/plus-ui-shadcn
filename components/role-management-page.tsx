"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  CircleCheck,
  Download,
  Edit,
  LoaderCircle,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  UserRound,
} from "lucide-react"
import { toast } from "sonner"

import {
  addRole,
  changeRoleStatus,
  dataScope,
  delRole,
  deptTreeSelect,
  getRole,
  listRole,
  updateRole,
} from "@/api/system/role"
import type { RoleForm, RoleQuery, RoleVO } from "@/api/system/role/types"
import { roleMenuTreeselect, treeselect } from "@/api/system/menu"
import { useAuth } from "@/components/auth-provider"
import { DataPagination } from "@/components/data-pagination"
import { CheckboxTree, type TreeOption } from "@/components/tree-controls"
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
import { download } from "@/utils/request"

interface RoleListResponse {
  rows?: RoleVO[]
  total?: number
}

interface RoleListQuery extends RoleQuery {
  params?: { beginTime?: string; endTime?: string }
}

interface RoleFormState {
  roleId?: string | number
  roleName: string
  roleKey: string
  roleSort: number
  status: string
  menuCheckStrictly: boolean
  deptCheckStrictly: boolean
  remark: string
  dataScope: string
  menuIds: string[]
  deptIds: string[]
}

const EMPTY_QUERY = {
  roleName: "",
  roleKey: "",
  status: "",
  beginTime: "",
  endTime: "",
}

const EMPTY_FORM: RoleFormState = {
  roleName: "",
  roleKey: "",
  roleSort: 1,
  status: "0",
  menuCheckStrictly: true,
  deptCheckStrictly: true,
  remark: "",
  dataScope: "1",
  menuIds: [],
  deptIds: [],
}

const DATA_SCOPE_OPTIONS = [
  ["1", "全部数据权限"],
  ["2", "自定数据权限"],
  ["3", "本部门数据权限"],
  ["4", "本部门及以下数据权限"],
  ["5", "仅本人数据权限"],
  ["6", "部门及以下或本人数据权限"],
] as const

function formatDate(value?: string) {
  if (!value) return "-"
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString("zh-CN", { hour12: false })
}

export function RoleManagementPage() {
  const router = useRouter()
  const { hasPermission } = useAuth()
  const [queryDraft, setQueryDraft] = React.useState(EMPTY_QUERY)
  const [query, setQuery] = React.useState(EMPTY_QUERY)
  const [rows, setRows] = React.useState<RoleVO[]>([])
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set())
  const [pageNum, setPageNum] = React.useState(1)
  const [pageSize, setPageSize] = React.useState(10)
  const [total, setTotal] = React.useState(0)
  const [loading, setLoading] = React.useState(true)

  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [form, setForm] = React.useState<RoleFormState>(EMPTY_FORM)
  const [menuOptions, setMenuOptions] = React.useState<TreeOption[]>([])
  const [saving, setSaving] = React.useState(false)

  const [scopeOpen, setScopeOpen] = React.useState(false)
  const [scopeForm, setScopeForm] = React.useState<RoleFormState>(EMPTY_FORM)
  const [deptOptions, setDeptOptions] = React.useState<TreeOption[]>([])
  const [scopeSaving, setScopeSaving] = React.useState(false)

  const canAdd = hasPermission("system:role:add")
  const canEdit = hasPermission("system:role:edit")
  const canRemove = hasPermission("system:role:remove")
  const canExport = hasPermission("system:role:export")
  const selectedRows = rows.filter((row) => selectedIds.has(String(row.roleId)))

  const loadRoles = React.useCallback(async () => {
    setLoading(true)
    try {
      const params: RoleListQuery = {
        pageNum,
        pageSize,
        roleName: query.roleName,
        roleKey: query.roleKey,
        status: query.status,
        params: {
          beginTime: query.beginTime || undefined,
          endTime: query.endTime || undefined,
        },
      }
      const response = (await listRole(params)) as unknown as RoleListResponse
      setRows(response.rows ?? [])
      setTotal(response.total ?? 0)
      setSelectedIds(new Set())
    } finally {
      setLoading(false)
    }
  }, [pageNum, pageSize, query])

  React.useEffect(() => {
    void loadRoles()
  }, [loadRoles])

  async function openCreate() {
    const response = await treeselect()
    setMenuOptions(response.data ?? [])
    setForm({ ...EMPTY_FORM })
    setDialogOpen(true)
  }

  async function openEdit(row: RoleVO) {
    const [roleResponse, treeResponse] = await Promise.all([
      getRole(row.roleId),
      roleMenuTreeselect(row.roleId),
    ])
    const role = roleResponse.data
    setMenuOptions(treeResponse.data.menus ?? [])
    setForm({
      roleId: role.roleId,
      roleName: role.roleName,
      roleKey: role.roleKey,
      roleSort: Number(role.roleSort),
      status: role.status,
      menuCheckStrictly: role.menuCheckStrictly ?? true,
      deptCheckStrictly: role.deptCheckStrictly ?? true,
      remark: String(role.remark ?? ""),
      dataScope: role.dataScope ?? "1",
      menuIds: (treeResponse.data.checkedKeys ?? []).map(String),
      deptIds: (role.deptIds ?? []).map(String),
    })
    setDialogOpen(true)
  }

  async function saveRole() {
    if (!form.roleName.trim()) return toast.error("请填写角色名称")
    if (!form.roleKey.trim()) return toast.error("请填写权限字符")
    const payload = { ...form } as unknown as RoleForm
    setSaving(true)
    try {
      if (form.roleId) await updateRole(payload)
      else await addRole(payload)
      toast.success(form.roleId ? "修改成功" : "新增成功")
      setDialogOpen(false)
      await loadRoles()
    } finally {
      setSaving(false)
    }
  }

  async function openDataScope(row: RoleVO) {
    const [roleResponse, treeResponse] = await Promise.all([
      getRole(row.roleId),
      deptTreeSelect(row.roleId),
    ])
    const role = roleResponse.data
    setDeptOptions(treeResponse.data.depts ?? [])
    setScopeForm({
      ...EMPTY_FORM,
      roleId: role.roleId,
      roleName: role.roleName,
      roleKey: role.roleKey,
      roleSort: role.roleSort,
      status: role.status,
      dataScope: role.dataScope ?? "1",
      deptCheckStrictly: role.deptCheckStrictly ?? true,
      deptIds: (treeResponse.data.checkedKeys ?? []).map(String),
    })
    setScopeOpen(true)
  }

  async function saveDataScope() {
    setScopeSaving(true)
    try {
      await dataScope(scopeForm)
      toast.success("数据权限修改成功")
      setScopeOpen(false)
      await loadRoles()
    } finally {
      setScopeSaving(false)
    }
  }

  async function removeRoles(ids: Array<string | number>) {
    if (
      !ids.length ||
      !window.confirm(`确认删除选中的 ${ids.length} 个角色吗？`)
    )
      return
    await delRole(ids)
    toast.success("删除成功")
    await loadRoles()
  }

  async function toggleStatus(row: RoleVO, checked: boolean) {
    const status = checked ? "0" : "1"
    const action = checked ? "启用" : "停用"
    if (!window.confirm(`确认要${action}“${row.roleName}”角色吗？`)) return
    await changeRoleStatus(row.roleId, status)
    toast.success(`${action}成功`)
    await loadRoles()
  }

  return (
    <div className="space-y-4">
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
            <QueryField label="角色名称" htmlFor="role-query-name">
              <Input
                id="role-query-name"
                value={queryDraft.roleName}
                placeholder="请输入角色名称"
                onChange={(event) =>
                  setQueryDraft((current) => ({
                    ...current,
                    roleName: event.target.value,
                  }))
                }
              />
            </QueryField>
            <QueryField label="权限字符" htmlFor="role-query-key">
              <Input
                id="role-query-key"
                value={queryDraft.roleKey}
                placeholder="请输入权限字符"
                onChange={(event) =>
                  setQueryDraft((current) => ({
                    ...current,
                    roleKey: event.target.value,
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
                    className={queryDraft.status ? "" : "text-muted-foreground"}
                  >
                    {queryDraft.status
                      ? queryDraft.status === "0"
                        ? "正常"
                        : "停用"
                      : "角色状态"}
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
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setQueryDraft(EMPTY_QUERY)
                  setQuery(EMPTY_QUERY)
                  setPageNum(1)
                }}
              >
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
                onClick={() => void removeRoles([...selectedIds])}
              >
                <Trash2 />
                删除
              </Button>
            )}
            {canExport && (
              <Button
                variant="outline"
                onClick={() =>
                  void download(
                    "/system/role/export",
                    { ...query, pageNum, pageSize },
                    `role_${Date.now()}.xlsx`
                  )
                }
              >
                <Download />
                导出
              </Button>
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
                      rows.filter((row) => Number(row.roleId) !== 1).length >
                        0 &&
                      selectedIds.size ===
                        rows.filter((row) => Number(row.roleId) !== 1).length
                    }
                    onCheckedChange={(checked) =>
                      setSelectedIds(
                        checked
                          ? new Set(
                              rows
                                .filter((row) => Number(row.roleId) !== 1)
                                .map((row) => String(row.roleId))
                            )
                          : new Set()
                      )
                    }
                  />
                </TableHead>
                <TableHead>角色名称</TableHead>
                <TableHead>权限字符</TableHead>
                <TableHead>显示顺序</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>创建时间</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableSkeleton columns={7} rows={pageSize} />
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="h-32 text-center text-muted-foreground"
                  >
                    暂无数据
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => {
                  const id = String(row.roleId)
                  const protectedRow = Number(row.roleId) === 1
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
                      <TableCell>{row.roleName}</TableCell>
                      <TableCell>{row.roleKey}</TableCell>
                      <TableCell>{row.roleSort}</TableCell>
                      <TableCell>
                        {canEdit && !protectedRow ? (
                          <Switch
                            checked={row.status === "0"}
                            aria-label={`${row.roleName}状态`}
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
                                onClick={() => void removeRoles([row.roleId])}
                              >
                                <Trash2 />
                              </Button>
                            )}
                            {canEdit && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  title="数据权限"
                                  onClick={() => void openDataScope(row)}
                                >
                                  <CircleCheck />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  title="分配用户"
                                  onClick={() =>
                                    router.push(
                                      `/system/role-auth/user/${row.roleId}`
                                    )
                                  }
                                >
                                  <UserRound />
                                </Button>
                              </>
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{form.roleId ? "修改角色" : "新增角色"}</DialogTitle>
            <DialogDescription>配置角色基本信息与菜单权限。</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="role-form-name">角色名称 *</Label>
              <Input
                id="role-form-name"
                value={form.roleName}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    roleName: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role-form-key">权限字符 *</Label>
              <Input
                id="role-form-key"
                value={form.roleKey}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    roleKey: event.target.value,
                  }))
                }
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="role-form-sort">角色顺序 *</Label>
                <Input
                  id="role-form-sort"
                  type="number"
                  min={0}
                  value={form.roleSort}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      roleSort: Number(event.target.value),
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>状态</Label>
                <Select
                  value={form.status}
                  onValueChange={(value) =>
                    value &&
                    setForm((current) => ({ ...current, status: value }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <span>{form.status === "0" ? "正常" : "停用"}</span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">正常</SelectItem>
                    <SelectItem value="1">停用</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>菜单权限</Label>
              <CheckboxTree
                nodes={menuOptions}
                value={form.menuIds}
                linked={form.menuCheckStrictly}
                onLinkedChange={(checked) =>
                  setForm((current) => ({
                    ...current,
                    menuCheckStrictly: checked,
                  }))
                }
                onChange={(menuIds) =>
                  setForm((current) => ({ ...current, menuIds }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role-form-remark">备注</Label>
              <Textarea
                id="role-form-remark"
                value={form.remark}
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
            <Button disabled={saving} onClick={() => void saveRole()}>
              {saving && <LoaderCircle className="animate-spin" />}确定
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={scopeOpen} onOpenChange={setScopeOpen}>
        <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>分配数据权限</DialogTitle>
            <DialogDescription>
              配置“{scopeForm.roleName}”的数据范围。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>角色名称</Label>
                <Input value={scopeForm.roleName} disabled />
              </div>
              <div className="space-y-2">
                <Label>权限字符</Label>
                <Input value={scopeForm.roleKey} disabled />
              </div>
            </div>
            <div className="space-y-2">
              <Label>权限范围</Label>
              <Select
                value={scopeForm.dataScope}
                onValueChange={(value) =>
                  value &&
                  setScopeForm((current) => ({
                    ...current,
                    dataScope: value,
                    deptIds: value === "2" ? current.deptIds : [],
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <span>
                    {DATA_SCOPE_OPTIONS.find(
                      ([value]) => value === scopeForm.dataScope
                    )?.[1] ?? "请选择"}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {DATA_SCOPE_OPTIONS.map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {scopeForm.dataScope === "2" && (
              <div className="space-y-2">
                <Label>数据权限</Label>
                <CheckboxTree
                  nodes={deptOptions}
                  value={scopeForm.deptIds}
                  linked={scopeForm.deptCheckStrictly}
                  onLinkedChange={(checked) =>
                    setScopeForm((current) => ({
                      ...current,
                      deptCheckStrictly: checked,
                    }))
                  }
                  onChange={(deptIds) =>
                    setScopeForm((current) => ({ ...current, deptIds }))
                  }
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScopeOpen(false)}>
              取消
            </Button>
            <Button disabled={scopeSaving} onClick={() => void saveDataScope()}>
              {scopeSaving && <LoaderCircle className="animate-spin" />}确定
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
