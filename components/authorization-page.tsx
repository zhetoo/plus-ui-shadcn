"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { LoaderCircle, Search } from "lucide-react"
import { toast } from "sonner"

import {
  allocatedUserList,
  authUserCancel,
  authUserCancelAll,
  authUserSelectAll,
  unallocatedUserList,
} from "@/api/system/role"
import { getAuthRole, updateAuthRole } from "@/api/system/user"
import { useAuth } from "@/components/auth-provider"
import { DataPagination } from "@/components/data-pagination"
import type { RoleVO } from "@/api/system/role/types"
import type { UserVO } from "@/api/system/user/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface UserListResponse {
  rows?: UserVO[]
  total?: number
}

function UserTable({
  rows,
  selected,
  onToggle,
  actionLabel,
  onAction,
  canAction,
}: {
  rows: UserVO[]
  selected: Set<string>
  onToggle: (userId: string, checked: boolean) => void
  actionLabel: string
  onAction: (user: UserVO) => Promise<void>
  canAction: boolean
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-12">选择</TableHead>
          <TableHead>用户名称</TableHead>
          <TableHead>用户昵称</TableHead>
          <TableHead>手机</TableHead>
          <TableHead>邮箱</TableHead>
          <TableHead>状态</TableHead>
          <TableHead className="text-right">操作</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 ? (
          <TableRow>
            <TableCell
              colSpan={7}
              className="h-28 text-center text-muted-foreground"
            >
              暂无数据
            </TableCell>
          </TableRow>
        ) : (
          rows.map((user) => {
            const id = String(user.userId)
            return (
              <TableRow key={id}>
                <TableCell>
                  <Checkbox
                    disabled={!canAction}
                    checked={selected.has(id)}
                    onCheckedChange={(checked) =>
                      onToggle(id, Boolean(checked))
                    }
                  />
                </TableCell>
                <TableCell>{user.userName}</TableCell>
                <TableCell>{user.nickName}</TableCell>
                <TableCell>{user.phonenumber || "-"}</TableCell>
                <TableCell>{user.email || "-"}</TableCell>
                <TableCell>
                  <Badge
                    variant={user.status === "0" ? "secondary" : "destructive"}
                  >
                    {user.status === "0" ? "正常" : "停用"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {canAction && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void onAction(user)}
                    >
                      {actionLabel}
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            )
          })
        )}
      </TableBody>
    </Table>
  )
}

export function RoleUserPage({ roleId }: { roleId: string }) {
  const router = useRouter()
  const { hasPermission } = useAuth()
  const canAdd = hasPermission("system:role:add")
  const canRemove = hasPermission("system:role:remove")
  const [queryDraft, setQueryDraft] = React.useState("")
  const [query, setQuery] = React.useState("")
  const [allocated, setAllocated] = React.useState<UserVO[]>([])
  const [available, setAvailable] = React.useState<UserVO[]>([])
  const [loading, setLoading] = React.useState(true)
  const [selectedAllocated, setSelectedAllocated] = React.useState<Set<string>>(
    new Set()
  )
  const [selectedAvailable, setSelectedAvailable] = React.useState<Set<string>>(
    new Set()
  )
  const [tab, setTab] = React.useState("allocated")
  const [pageNum, setPageNum] = React.useState(1)
  const [pageSize, setPageSize] = React.useState(10)
  const [totals, setTotals] = React.useState({ allocated: 0, available: 0 })

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const params = {
        pageNum,
        pageSize,
        roleId,
        userName: query || undefined,
      }
      const [current, candidates] = await Promise.all([
        allocatedUserList(params),
        canAdd
          ? unallocatedUserList(params)
          : Promise.resolve({ rows: [], total: 0 }),
      ])
      const currentBody = current as unknown as UserListResponse
      const candidateBody = candidates as unknown as UserListResponse
      setAllocated(currentBody.rows ?? [])
      setAvailable(candidateBody.rows ?? [])
      setTotals({
        allocated: currentBody.total ?? 0,
        available: candidateBody.total ?? 0,
      })
      setSelectedAllocated(new Set())
      setSelectedAvailable(new Set())
    } finally {
      setLoading(false)
    }
  }, [canAdd, pageNum, pageSize, query, roleId])

  React.useEffect(() => {
    void load()
  }, [load])

  async function cancel(user: UserVO) {
    if (!window.confirm(`确认取消用户“${user.userName}”的角色授权吗？`)) return
    await authUserCancel({ userId: user.userId, roleId })
    toast.success("取消授权成功")
    await load()
  }

  async function authorize(user: UserVO) {
    await authUserSelectAll({ roleId, userIds: user.userId })
    toast.success("授权成功")
    await load()
  }

  function toggle(
    setter: React.Dispatch<React.SetStateAction<Set<string>>>,
    id: string,
    checked: boolean
  ) {
    setter((current) => {
      const next = new Set(current)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  async function cancelSelected() {
    if (
      !selectedAllocated.size ||
      !window.confirm("确认批量取消选中用户的角色授权吗？")
    )
      return
    await authUserCancelAll({
      roleId,
      userIds: [...selectedAllocated].join(","),
    })
    toast.success("批量取消授权成功")
    await load()
  }

  async function authorizeSelected() {
    if (!selectedAvailable.size) return
    await authUserSelectAll({
      roleId,
      userIds: [...selectedAvailable].join(","),
    })
    toast.success("批量授权成功")
    await load()
  }

  return (
    <Card>
      <CardContent className="space-y-4">
        <form
          className="flex max-w-md gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            setPageNum(1)
            setQuery(queryDraft)
          }}
        >
          <Input
            value={queryDraft}
            placeholder="按用户名称查询"
            onChange={(event) => setQueryDraft(event.target.value)}
          />
          <Button type="submit">
            <Search />
            查询
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/system/role")}
          >
            返回
          </Button>
        </form>
        {loading ? (
          <LoaderCircle className="mx-auto my-16 animate-spin" />
        ) : (
          <Tabs
            value={tab}
            onValueChange={(value) => {
              setTab(value ?? "allocated")
              setPageNum(1)
            }}
          >
            <TabsList>
              <TabsTrigger value="allocated">
                已授权（{totals.allocated}）
              </TabsTrigger>
              {canAdd && (
                <TabsTrigger value="available">
                  待授权（{totals.available}）
                </TabsTrigger>
              )}
            </TabsList>
            <TabsContent value="allocated" className="space-y-3">
              {canRemove && (
                <Button
                  variant="outline"
                  disabled={!selectedAllocated.size}
                  onClick={() => void cancelSelected()}
                >
                  批量取消授权
                </Button>
              )}
              <UserTable
                rows={allocated}
                selected={selectedAllocated}
                onToggle={(id, checked) =>
                  toggle(setSelectedAllocated, id, checked)
                }
                actionLabel="取消授权"
                onAction={cancel}
                canAction={canRemove}
              />
            </TabsContent>
            {canAdd && (
              <TabsContent value="available" className="space-y-3">
                <Button
                  variant="outline"
                  disabled={!selectedAvailable.size}
                  onClick={() => void authorizeSelected()}
                >
                  批量授权
                </Button>
                <UserTable
                  rows={available}
                  selected={selectedAvailable}
                  onToggle={(id, checked) =>
                    toggle(setSelectedAvailable, id, checked)
                  }
                  actionLabel="授权"
                  onAction={authorize}
                  canAction
                />
              </TabsContent>
            )}
          </Tabs>
        )}
        <DataPagination
          pageNum={pageNum}
          pageSize={pageSize}
          total={totals[tab as keyof typeof totals]}
          onPageChange={setPageNum}
          onPageSizeChange={(size) => {
            setPageNum(1)
            setPageSize(size)
          }}
        />
      </CardContent>
    </Card>
  )
}

export function UserRolePage({ userId }: { userId: string }) {
  const router = useRouter()
  const { hasPermission } = useAuth()
  const [user, setUser] = React.useState<UserVO | null>(null)
  const [roles, setRoles] = React.useState<RoleVO[]>([])
  const [selected, setSelected] = React.useState<Set<string>>(new Set())
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    void getAuthRole(userId)
      .then((response) => {
        setUser(response.data.user)
        setRoles(response.data.roles)
        setSelected(
          new Set(
            response.data.roles
              .filter((role) => role.flag)
              .map((role) => String(role.roleId))
          )
        )
      })
      .finally(() => setLoading(false))
  }, [userId])

  async function save() {
    await updateAuthRole({ userId, roleIds: [...selected].join(",") })
    toast.success("角色授权成功")
    router.push("/system/user")
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>分配角色</CardTitle>
        <CardDescription>
          {user
            ? `${user.nickName}（${user.userName}）`
            : `用户编号：${userId}`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <LoaderCircle className="mx-auto my-16 animate-spin" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">选择</TableHead>
                <TableHead>角色编号</TableHead>
                <TableHead>角色名称</TableHead>
                <TableHead>权限字符</TableHead>
                <TableHead>状态</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roles.map((role) => {
                const key = String(role.roleId)
                return (
                  <TableRow key={key}>
                    <TableCell>
                      <Checkbox
                        checked={selected.has(key)}
                        disabled={role.status !== "0"}
                        onCheckedChange={(checked) =>
                          setSelected((current) => {
                            const next = new Set(current)
                            if (checked) next.add(key)
                            else next.delete(key)
                            return next
                          })
                        }
                      />
                    </TableCell>
                    <TableCell>{key}</TableCell>
                    <TableCell>{role.roleName}</TableCell>
                    <TableCell>{role.roleKey}</TableCell>
                    <TableCell>
                      {role.status === "0" ? "正常" : "停用"}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => router.push("/system/user")}>
            返回
          </Button>
          {hasPermission("system:user:edit") && (
            <Button disabled={loading} onClick={() => void save()}>
              保存授权
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
